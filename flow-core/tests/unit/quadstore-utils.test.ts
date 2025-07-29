import { assertEquals } from '../../src/deps.ts';
import { clearGraph, copyGraph, isGraphEmpty, countQuadsInStream, putJsonLdToGraph, patchJsonLdToGraph, createNewGraphFromJsonLd } from '../../src/utils/quadstore-utils.ts';
import { defaultQuadstoreBundle } from '../../../flow-service/src/quadstoreDefaultBundle.ts';

Deno.test('countQuadsInStream counts quads correctly', async () => {
  const { store, df } = defaultQuadstoreBundle;
  const graph = df.namedNode('urn:testGraph1');
  await clearGraph(graph);

  const quad1 = df.quad(df.namedNode('s1'), df.namedNode('p1'), df.literal('o1'), graph);
  const quad2 = df.quad(df.namedNode('s2'), df.namedNode('p2'), df.literal('o2'), graph);

  await store.put(quad1);
  await store.put(quad2);

  const stream = store.match(undefined, undefined, undefined, graph);
  const count = await countQuadsInStream(stream);
  assertEquals(count, 2);

  await clearGraph(graph);
});

Deno.test('isGraphEmpty returns true for empty graph and false otherwise', async () => {
  const { store, df } = defaultQuadstoreBundle;
  const graph = df.namedNode('urn:testGraph2');
  await clearGraph(graph);

  let empty = await isGraphEmpty(graph);
  assertEquals(empty, true);

  const quad = df.quad(df.namedNode('s'), df.namedNode('p'), df.literal('o'), graph);
  await store.put(quad);

  empty = await isGraphEmpty(graph);
  assertEquals(empty, false);

  await clearGraph(graph);
});

Deno.test('clearGraph deletes all quads and returns count', async () => {
  const { store, df } = defaultQuadstoreBundle;
  const graph = df.namedNode('urn:testGraph3');
  await clearGraph(graph);

  const quad = df.quad(df.namedNode('s'), df.namedNode('p'), df.literal('o'), graph);
  await store.put(quad);

  const count = await clearGraph(graph);
  assertEquals(count, 1);

  const empty = await isGraphEmpty(graph);
  assertEquals(empty, true);
});

Deno.test('copyGraph copies quads from source to target graph', async () => {
  const { store, df } = defaultQuadstoreBundle;
  const sourceGraph = df.namedNode('urn:sourceGraph');
  const targetGraph = df.namedNode('urn:targetGraph');

  await clearGraph(sourceGraph);
  await clearGraph(targetGraph);

  const quad = df.quad(df.namedNode('s'), df.namedNode('p'), df.literal('o'), sourceGraph);
  await store.put(quad);

  await copyGraph(sourceGraph, targetGraph);

  const countSource = await countQuadsInStream(store.match(undefined, undefined, undefined, sourceGraph));
  const countTarget = await countQuadsInStream(store.match(undefined, undefined, undefined, targetGraph));

  assertEquals(countSource, 1);
  assertEquals(countTarget, 1);

  await clearGraph(sourceGraph);
  await clearGraph(targetGraph);
});
