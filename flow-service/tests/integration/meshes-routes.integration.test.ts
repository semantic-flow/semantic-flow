import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { OpenAPIHono } from '@hono/zod-openapi';
import { createMeshesRoutes } from '../../src/routes/meshes.ts';
import { initializeMeshRegistry } from '../../src/utils/mesh-utils.ts';
import { ServiceConfigAccessor } from '../../src/config/index.ts';
import { PLATFORM_SERVICE_DEFAULTS } from '../../src/config/defaults.ts';
import { join } from 'jsr:@std/path';

Deno.test('Mesh Management API', async (t) => {
  const testMeshName = 'test-ns-for-testing';
  const testMeshParentPath = './meshes';
  const testMeshPath = `${testMeshParentPath}/${testMeshName}`;

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

  await t.step('setup: create test mesh directory', async () => {
    await Deno.mkdir(testMeshPath, { recursive: true });
  });

  await t.step('POST /api/meshes - should register a new mesh', async () => {
    const req = new Request('http://localhost/api/meshes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testMeshName, parentPath: testMeshParentPath }),
    });
    const res = await app.request(req);
    assertEquals(res.status, 201);
    const body = await res.json();
    assert(body.message.includes(`Mesh '${testMeshName}' registered successfully`));
  });

  await t.step('POST /api/meshes - should return 404 for non-existent path', async () => {
    const invalidMeshName = 'invalid-mesh';
    const invalidMeshParentPath = './non-existent-path';
    const req = new Request('http://localhost/api/meshes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: invalidMeshName, parentPath: invalidMeshParentPath }),
    });
    const res = await app.request(req);
    assertEquals(res.status, 404);
    const body = await res.json();
    assertEquals(body.error, 'Not Found');
    assertEquals(body.message, `Path '${join(invalidMeshParentPath, invalidMeshName)}' does not exist.`);
  });

  await t.step('POST /api/meshes/{meshName}/nodes - should create a root node', async () => {
    const req = new Request(`http://localhost/api/meshes/${testMeshName}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiNodePath: '',
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
    assert(body.links, 'Response should include HATEOAS links');
    assert(Array.isArray(body.links), 'Links should be an array');
    const handleDir = await Deno.stat(`${testMeshPath}/_handle`);
    assert(handleDir.isDirectory);
    const metaFlowDir = await Deno.stat(`${testMeshPath}/_meta-flow/_next`);
    assert(metaFlowDir.isDirectory);
    const assetsDir = await Deno.stat(`${testMeshPath}/_assets`);
    assert(assetsDir.isDirectory);
    const snapshotFilePath = body.filesCreated.find((f: string) => f.endsWith('.jsonld'));
    assert(snapshotFilePath, 'No .jsonld file found in filesCreated');
    const snapshotFile = await Deno.readTextFile(snapshotFilePath);
    const snapshotData = JSON.parse(snapshotFile);
    assert(snapshotData['@graph'][0]['@type'] === 'meta:NodeCreation');
    assert(snapshotData['@graph'][0]['prov:wasAssociatedWith']['@id'] === 'https://example.com/test-attributor');
  });

  await t.step('POST /api/meshes/{meshName}/nodes - should return 409 when node already exists', async () => {
    const req = new Request(`http://localhost/api/meshes/${testMeshName}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiNodePath: '',
        nodeType: 'Namespace',
        initialData: { title: 'Test Root Node' },
        options: { copyDefaultAssets: true },
      }),
    });
    const res = await app.request(req);
    assertEquals(res.status, 409);
    const body = await res.json();
    assertEquals(body.error, 'Conflict');
    assert(body.message.includes('Node already exists'));
  });


  await t.step('teardown: remove test mesh directory', async () => {
    await Deno.remove('./meshes', { recursive: true });
  });
});
