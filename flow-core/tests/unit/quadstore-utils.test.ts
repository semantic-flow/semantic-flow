import { assertEquals } from '../../src/deps.ts';
import { clearGraph, copyGraph, isGraphEmpty, countQuadsInStream, putJsonLdToGraph, createNewGraphFromJsonLd } from '../../src/utils/quadstore/quadstore-utils.ts';
import { createQuadstoreBundle } from "../../../flow-core/src/utils/quadstore/quadstore-factory.ts";

Deno.test('countQuadsInStream counts quads correctly', async () => {
  const testQuadstoreBundle = await createQuadstoreBundle();
  const df = testQuadstoreBundle.df;
  const store = testQuadstoreBundle.store;

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
  const testQuadstoreBundle = await createQuadstoreBundle();
  const df = testQuadstoreBundle.df;
  const store = testQuadstoreBundle.store;

  const graph = df.namedNode('urn:testGraph2');
  await clearGraph(graph);

  let empty = await isGraphEmpty(graph, testQuadstoreBundle);
  assertEquals(empty, true);

  const quad = df.quad(df.namedNode('s'), df.namedNode('p'), df.literal('o'), graph);
  await store.put(quad);

  empty = await isGraphEmpty(graph, testQuadstoreBundle);
  assertEquals(empty, false);

  await clearGraph(graph);
});


Deno.test('clearGraph deletes all quads', async () => {
  const testQuadstoreBundle = await createQuadstoreBundle();
  const df = testQuadstoreBundle.df;
  const store = testQuadstoreBundle.store;

  const graph = df.namedNode('urn:testGraph3');

  const emptyBeforeClear = await isGraphEmpty(graph, testQuadstoreBundle);
  await clearGraph(graph);
  assertEquals(emptyBeforeClear, true);

  const quad = df.quad(df.namedNode('s'), df.namedNode('p'), df.literal('o'), graph);
  await store.put(quad);

  const emptyAfterPut = await isGraphEmpty(graph, testQuadstoreBundle);
  assertEquals(emptyAfterPut, false);

  await clearGraph(graph, testQuadstoreBundle);

  const matchStream = store.match(undefined, undefined, undefined, graph);
  const count = await countQuadsInStream(matchStream);
  console.log(`quads in graph ${graph.value}: ${count}`);

  const emptyAfterClear = await isGraphEmpty(graph, testQuadstoreBundle);
  assertEquals(emptyAfterClear, true);

});

Deno.test('copyGraph copies quads from source to target graph', async () => {
  const testQuadstoreBundle = await createQuadstoreBundle();
  const df = testQuadstoreBundle.df;
  const store = testQuadstoreBundle.store;

  const sourceGraph = df.namedNode('urn:sourceGraph');
  const targetGraph = df.namedNode('urn:targetGraph');

  await clearGraph(targetGraph, testQuadstoreBundle);

  const quad = df.quad(df.namedNode('s'), df.namedNode('p'), df.literal('o'), sourceGraph);
  await store.put(quad);

  await copyGraph(sourceGraph, targetGraph, testQuadstoreBundle);

  const countSource = await countQuadsInStream(store.match(undefined, undefined, undefined, sourceGraph));
  const countTarget = await countQuadsInStream(store.match(undefined, undefined, undefined, targetGraph));

  assertEquals(countSource, 1);
  assertEquals(countTarget, 1);
});
