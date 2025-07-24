import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { OpenAPIHono } from '@hono/zod-openapi';
import { createMeshesRoutes } from '../../src/routes/meshes.ts';
import { ServiceConfigAccessor } from '../../src/config/index.ts';
import { PLATFORM_SERVICE_DEFAULTS } from '../../src/config/defaults.ts';

const app = new OpenAPIHono();
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
const meshes = createMeshesRoutes(mockConfig);
app.route('/api', meshes);

Deno.test('Mesh Management API', async (t) => {
  const testMeshName = 'test-ns-for-testing';
  const testMeshPath = `./${testMeshName}`;

  await t.step('setup: create test mesh directory', async () => {
    await Deno.mkdir(testMeshPath, { recursive: true });
  });

  await t.step('POST /api/meshes - should register a new mesh', async () => {
    const req = new Request('http://localhost/api/meshes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testMeshName, path: testMeshPath }),
    });
    const res = await app.request(req);
    assertEquals(res.status, 201);
    const body = await res.json();
    assert(body.message.includes(`Mesh '${testMeshName}' registered successfully`));
    assert(body.links.some((link: { rel: string; }) => link.rel === 'create-root-node'));
  });

  await t.step('POST /api/meshes - should return 400 for invalid path', async () => {
    const invalidMeshName = 'invalid-mesh';
    const invalidMeshPath = './non-existent-path';
    const req = new Request('http://localhost/api/meshes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: invalidMeshName, path: invalidMeshPath }),
    });
    const res = await app.request(req);
    assertEquals(res.status, 400);
    const contentType = res.headers.get('Content-Type');
    assert(contentType && contentType.startsWith('application/json'), `Expected application/json but got ${contentType}`);
    const body = await res.json();
    assertEquals(body.error, 'Validation Error');
    assertEquals(body.message, `Path '${invalidMeshPath}' does not exist.`);
  });

  await t.step('POST /api/meshes/{meshName}/nodes - should create a root node', async () => {
    const req = new Request(`http://localhost/api/meshes/${testMeshName}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: '/',
        nodeType: 'Namespace',
        initialData: { title: 'Test Root Node' },
        options: { copyDefaultAssets: true },
      }),
    });
    const res = await app.request(req);
    assertEquals(res.status, 201);
    const body = await res.json();
    assertEquals(body.nodePath, `/${testMeshName}/`);
    assert(body.filesCreated.length > 0);
    const handleDir = await Deno.stat(`${testMeshPath}/_handle`);
    assert(handleDir.isDirectory);
    const metaFlowDir = await Deno.stat(`${testMeshPath}/_meta-flow/_next`);
    assert(metaFlowDir.isDirectory);
    const assetsDir = await Deno.stat(`${testMeshPath}/_assets`);
    assert(assetsDir.isDirectory);

    // Verify the snapshot file was created
    const snapshotFileName = `${testMeshName}_meta_next.jsonld`;
    const snapshotFilePath = `${testMeshPath}/_meta-flow/_next/${snapshotFileName}`;
    const snapshotFile = await Deno.readTextFile(snapshotFilePath);
    const snapshotData = JSON.parse(snapshotFile);

    // Verify the content of the snapshot file
    assertEquals(snapshotData['@graph'][0]['@type'], 'meta:NodeCreation');
    assertEquals(snapshotData['@graph'][0]['prov:wasAssociatedWith']['@id'], 'https://example.com/test-attributor');
    assertEquals(snapshotData['@graph'][1]['@type'], 'mesh:Node');
    assertEquals(snapshotData['@graph'][1]['node:hasSlug'], testMeshName);
    assertEquals(snapshotData['@graph'][2]['@type'], 'node:Handle');
    assertEquals(snapshotData['@graph'][3]['prov:wasAttributedTo']['@id'], 'https://example.com/test-attributor');
    assertEquals(snapshotData['@graph'][4]['dcat:distribution']['dcat:downloadURL'], snapshotFileName);
    assertEquals(snapshotData['@graph'][3]['meta:delegationChain']['@type'], 'meta:DelegationChain');
  });

  await t.step('POST /api/meshes/{meshName}/nodes - should use node-specific attribution', async () => {
    // Create a config file with a different attribution
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

    const req = new Request(`http://localhost/api/meshes/${testMeshName}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: '/sub-node',
        nodeType: 'Namespace',
        initialData: { title: 'Test Sub Node' },
      }),
    });
    const res = await app.request(req);
    assertEquals(res.status, 201);

    const body = await res.json();
    const snapshotFilePath = body.filesCreated.find((f: string) => f.endsWith('.jsonld'));
    const snapshotFile = await Deno.readTextFile(snapshotFilePath);
    const snapshotData = JSON.parse(snapshotFile);

    // Verify the content of the snapshot file uses the node-specific attribution
    assertEquals(snapshotData['@graph'][0]['prov:wasAssociatedWith']['@id'], 'https://orcid.org/0000-0001-2345-6789');
    assertEquals(snapshotData['@graph'][3]['prov:wasAttributedTo']['@id'], 'https://orcid.org/0000-0001-2345-6789');
  });

  await t.step('teardown: remove test mesh directory', async () => {
    await Deno.remove(testMeshPath, { recursive: true });
  });
});
