import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { OpenAPIHono } from '@hono/zod-openapi';
import { meshes } from '../../src/routes/meshes.ts';
import { stub } from "https://deno.land/std@0.224.0/testing/mock.ts";

const app = new OpenAPIHono();
app.route('/api', meshes);

Deno.test('Unit Tests for Mesh Management API', async (t) => {
  await t.step('POST /api/meshes - should register a new mesh', async () => {
    const DenoStatStub = stub(Deno, "stat", () => Promise.resolve({ isDirectory: true, isFile: false, isSymlink: false, size: 0, mtime: new Date(), atime: new Date(), birthtime: new Date(), dev: 0, ino: 0, mode: 0, nlink: 0, uid: 0, gid: 0, rdev: 0, blksize: 0, blocks: 0, ctime: new Date(), isBlockDevice: false, isCharDevice: false, isFifo: false, isSocket: false }));

    const req = new Request('http://localhost/api/meshes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-mesh', path: './test-mesh' }),
    });
    const res = await app.fetch(req);

    assertEquals(res.status, 201);
    const body = await res.json();
    assert(body.message.includes("Mesh 'test-mesh' registered successfully"));
    DenoStatStub.restore();
  });

  await t.step('POST /api/meshes/{meshName}/nodes - should create a root node', async () => {
    const DenoMkdirStub = stub(Deno, "mkdir", () => Promise.resolve());
    const DenoStatStub = stub(Deno, "stat", () => Promise.resolve({ isDirectory: true, isFile: false, isSymlink: false, size: 0, mtime: new Date(), atime: new Date(), birthtime: new Date(), dev: 0, ino: 0, mode: 0, nlink: 0, uid: 0, gid: 0, rdev: 0, blksize: 0, blocks: 0, ctime: new Date(), isBlockDevice: false, isCharDevice: false, isFifo: false, isSocket: false }));

    // First, register the mesh
    const regReq = new Request('http://localhost/api/meshes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test-mesh-for-node', path: './test-mesh-for-node' }),
    });
    await app.fetch(regReq);

    const req = new Request('http://localhost/api/meshes/test-mesh-for-node/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            path: '/',
            nodeType: 'Namespace',
            initialData: { title: 'Test Root Node' },
            options: { copyDefaultAssets: true },
        }),
    });
    const res = await app.fetch(req);

    assertEquals(res.status, 201);
    const body = await res.json();
    assertEquals(body.nodePath, '/test-mesh-for-node/');
    DenoMkdirStub.restore();
    DenoStatStub.restore();
  });
});
