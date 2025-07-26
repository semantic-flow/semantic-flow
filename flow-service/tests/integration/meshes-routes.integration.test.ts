import { superoak } from "https://deno.land/x/superoak@4.7.0/mod.ts";
import { createMeshesRoutes } from '../../src/routes/meshes.ts';
import { ServiceConfigAccessor } from '../../src/config/index.ts';
import { PLATFORM_SERVICE_DEFAULTS } from '../../src/config/defaults.ts';
import { OpenAPIHono } from '@hono/zod-openapi';

Deno.test('Mesh Management API', async (t) => {
  const mockConfig = new ServiceConfigAccessor({
    inputOptions: {
      "fsvc:defaultDelegationChain": {
        "@type": "meta:DelegationChain",
        "meta:hasStep": [
          {
            "@type": "meta:DelegationStep",
            "meta:stepOrder": 1,
            "prov:agent": {
              "@id": "https://example.com/agents/test-agent"
            }
          }
        ]
      },
      "fsvc:defaultAttributedTo": {
        "@id": "https://example.com/test-attributor"
      }
    },
    defaultOptions: PLATFORM_SERVICE_DEFAULTS,
  });

  const app = new OpenAPIHono();
  const meshes = createMeshesRoutes(mockConfig);
  app.route('/api', meshes);

  const testMeshName = 'test-ns-for-testing';
  const testMeshPath = `./${testMeshName}`;

  await t.step('setup: create test mesh directory', async () => {
    await Deno.mkdir(testMeshPath, { recursive: true });
  });

  await t.step('POST /api/meshes - should register a new mesh', async () => {
    const request = await superoak(app);
    await request.post('/api/meshes')
      .send({ name: testMeshName, path: testMeshPath })
      .set('Content-Type', 'application/json')
      .expect(201)
      .expect('Content-Type', /json/)
      .expect((res: { body: { message: string; links: Array<{ rel: string }> } }) => {
        if (!res.body.message.includes(`Mesh '${testMeshName}' registered successfully`)) {
          throw new Error('Expected success message');
        }
        if (!res.body.links.some(link => link.rel === 'create-root-node')) {
          throw new Error('Expected create-root-node link');
        }
      });
  });

  await t.step('POST /api/meshes - should return 404 for non-existent path', async () => {
    const invalidMeshName = 'invalid-mesh';
    const invalidMeshPath = './non-existent-path';
    const request = await superoak(app);
    await request.post('/api/meshes')
      .send({ name: invalidMeshName, path: invalidMeshPath })
      .set('Content-Type', 'application/json')
      .expect(404)
      .expect('Content-Type', /json/)
      .expect((res: { body: { error: string; message: string } }) => {
        if (res.body.error !== 'Not Found') {
          throw new Error('Expected Not Found error');
        }
        if (res.body.message !== `Path '${invalidMeshPath}' does not exist.`) {
          throw new Error('Expected correct error message');
        }
      });
  });

  await t.step('POST /api/meshes/{meshName}/nodes - should create a root node', async () => {
    const request = await superoak(app);
    await request.post(`/api/meshes/${testMeshName}/nodes`)
      .send({
        path: '/',
        nodeType: 'Namespace',
        initialData: { title: 'Test Root Node' },
        options: { copyDefaultAssets: true },
      })
      .set('Content-Type', 'application/json')
      .expect(201)
      .expect('Content-Type', /json/)
      .expect(async (res: { body: { nodePath: string; filesCreated: string[] } }) => {
        if (res.body.nodePath !== `/${testMeshName}/`) {
          throw new Error('Node path mismatch');
        }
        if (res.body.filesCreated.length === 0) {
          throw new Error('Expected files to be created');
        }
        const handleDir = await Deno.stat(`${testMeshPath}/_handle`);
        if (!handleDir.isDirectory) {
          throw new Error('_handle directory missing');
        }
        const metaFlowDir = await Deno.stat(`${testMeshPath}/_meta-flow/_next`);
        if (!metaFlowDir.isDirectory) {
          throw new Error('_meta-flow/_next directory missing');
        }
        const assetsDir = await Deno.stat(`${testMeshPath}/_assets`);
        if (!assetsDir.isDirectory) {
          throw new Error('_assets directory missing');
        }
        const snapshotFileName = `meta-flow.jsonld`;
        const snapshotFilePath = `${testMeshPath}/_meta-flow/_next/${snapshotFileName}`;
        const snapshotFile = await Deno.readTextFile(snapshotFilePath);
        const snapshotData = JSON.parse(snapshotFile);
        if (snapshotData['@graph'][0]['@type'] !== 'meta:NodeCreation') {
          throw new Error('Snapshot file content invalid');
        }
        if (snapshotData['@graph'][0]['prov:wasAssociatedWith']['@id'] !== 'https://example.com/test-attributor') {
          throw new Error('Snapshot attribution mismatch');
        }
      });
  });

  await t.step('POST /api/meshes/{meshName}/nodes - should use node-specific attribution', async () => {
    const subNodePath = `${testMeshPath}/sub-node`;
    const nodeConfigDir = `${subNodePath}/_config-flow`;
    await Deno.mkdir(nodeConfigDir, { recursive: true });
    const nodeConfigFile = `${nodeConfigDir}/flow-config.jsonld`;
    const nodeConfigContent = {
      "@context": {
        "conf": "https://semantic-flow.github.io/ontology/config-flow/"
      },
      "@type": "flow:ConfigDistribution",
      "conf:defaultAttribution": "https://orcid.org/0000-0001-2345-6789"
    };
    await Deno.writeTextFile(nodeConfigFile, JSON.stringify(nodeConfigContent));

    const request = await superoak(app);
    await request.post(`/api/meshes/${testMeshName}/nodes`)
      .send({
        path: '/sub-node',
        nodeType: 'Namespace',
        initialData: { title: 'Test Sub Node' },
      })
      .set('Content-Type', 'application/json')
      .expect(201)
      .expect('Content-Type', /json/)
      .expect(async (res: { body: { filesCreated: string[] } }) => {
        const snapshotFilePath = res.body.filesCreated.find(f => f.endsWith('.jsonld'));
        if (!snapshotFilePath) {
          throw new Error('Snapshot file path missing');
        }
        const snapshotFile = await Deno.readTextFile(snapshotFilePath);
        const snapshotData = JSON.parse(snapshotFile);
        if (snapshotData['@graph'][0]['prov:wasAssociatedWith']['@id'] !== 'https://orcid.org/0000-0001-2345-6789') {
          throw new Error('Snapshot attribution mismatch');
        }
      });
  });

  await t.step('teardown: remove test mesh directory', async () => {
    await Deno.remove(testMeshPath, { recursive: true });
  });
});
