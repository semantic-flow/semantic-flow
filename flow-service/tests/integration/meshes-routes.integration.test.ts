import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { OpenAPIHono } from '@hono/zod-openapi';
import { meshes } from '../../src/routes/meshes.ts';

const app = new OpenAPIHono();
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
    const metaFlowDir = await Deno.stat(`${testMeshPath}/_meta-flow`);
    assert(metaFlowDir.isDirectory);
    const assetsDir = await Deno.stat(`${testMeshPath}/_assets`);
    assert(assetsDir.isDirectory);
  });

  await t.step('teardown: remove test mesh directory', async () => {
    await Deno.remove(testMeshPath, { recursive: true });
  });
});
