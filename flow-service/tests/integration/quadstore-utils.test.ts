import { assertEquals } from '../../../flow-core/src/deps.ts';
import { MemoryLevel, DataFactory, Quadstore } from '../../../flow-core/src/deps.ts';
import { RDF } from '../../../flow-core/src/deps.ts';
import { countQuadsInStream, clearGraph, copyGraph } from '../../../flow-core/src/utils/quadstore/quadstore-utils.ts';

Deno.test('Quadstore clearGraph and copyGraph utilities', async () => {
  const backend = new MemoryLevel();
  const df = new DataFactory();
  const store = new Quadstore({ backend, dataFactory: df });
  await store.open();

  const testQuadstoreBundle = { store, df, backend };

  const graphA: RDF.NamedNode = df.namedNode('urn:graphA');
  const graphB: RDF.NamedNode = df.namedNode('urn:graphB');

  // Clear both graphs before test
  await clearGraph(graphA, testQuadstoreBundle);
  await clearGraph(graphB, testQuadstoreBundle);

  // Add quads to graphA
  const subject = df.namedNode('http://example.com/subject');
  const predicate = df.namedNode('http://example.com/predicate');
  const object = df.namedNode('http://example.com/object');

  await store.put(df.quad(subject, predicate, object, graphA));

  // Verify graphA has 1 quad
  let count = await countQuadsInGraph(graphA, store);
  assertEquals(count, 1);

  // Copy graphA to graphB
  await copyGraph(graphA, graphB, testQuadstoreBundle);

  // Verify graphB has 1 quad
  count = await countQuadsInGraph(graphB, store);
  assertEquals(count, 1);

  // Clear graphA
  const deletedCount = await clearGraph(graphA, testQuadstoreBundle);
  assertEquals(deletedCount, 1);

  // Verify graphA is empty
  count = await countQuadsInGraph(graphA, store);
  assertEquals(count, 0);

  // Verify graphB still has 1 quad
  count = await countQuadsInGraph(graphB, store);
  assertEquals(count, 1);
});

function countQuadsInGraph(graph: RDF.NamedNode, store: Quadstore): Promise<number> {
  const stream = store.match(undefined, undefined, undefined, graph);
  return countQuadsInStream(stream);
}
