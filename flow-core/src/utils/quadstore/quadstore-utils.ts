import { NodeObject, Quadstore, DataFactory } from '../../deps.ts';
import { RDF } from '../../deps.ts';
import { defaultQuadstoreBundle } from '../../../../flow-service/src/quadstore-default-bundle.ts';
import { jsonldToQuads } from '../rdfjs-utils.ts';
import type { QuadstoreBundle } from '../../types.ts';
import { getComponentLogger } from '../logger/component-logger.ts';

const logger = getComponentLogger(import.meta);

export function countQuadsInStream(stream: RDF.Stream): Promise<number> {
  return new Promise((resolve, reject) => {
    let count = 0;
    stream.on('data', () => count++);
    stream.on('end', () => resolve(count));
    stream.on('error', (err) => reject(err));
  });
}


//  returns whether there are any quads in the specified named graph.

export async function isGraphEmpty(
  graph: RDF.NamedNode,
  {
    store
  } = defaultQuadstoreBundle
): Promise<boolean> {
  const matchStream = store.match(undefined, undefined, undefined, graph);
  const count = await countQuadsInStream(matchStream);

  return count === 0;
}


//  Clears all quads in the specified named graph.

export async function clearGraph(
  graph: RDF.NamedNode,
  {
    store
  }: { store: Quadstore } = defaultQuadstoreBundle
): Promise<number> {
  const matchStream = store.match(undefined, undefined, undefined, graph);
  const count = await countQuadsInStream(matchStream);
  //console.log(`Number of quads before delStream in graph ${graph.value}: ${count}`);
  const matchStream2 = store.match(undefined, undefined, undefined, graph);
  // deno-lint-ignore no-explicit-any
  await store.delStream(matchStream2 as any);
  /*const matchStream3 = store.match(undefined, undefined, undefined, graph);
  const count2 = await countQuadsInStream(matchStream3);
  console.log(`Number of quads in graph ${graph.value}: ${count2}`);
  */
  return count;
}


// Copies all quads from source graph to target graph.

export async function copyGraph(
  sourceGraph: RDF.NamedNode,
  targetGraph: RDF.NamedNode,
  {
    store,
    df,
  }: { store: Quadstore, df: DataFactory } = defaultQuadstoreBundle
): Promise<number> {
  const stream = store.match(undefined, undefined, undefined, sourceGraph);
  const quads = [];

  logger.info("COPIED QUADS:");
  // deno-lint-ignore no-explicit-any
  for await (const q of stream as any) {
    logger.info(`${q.subject.value} ${q.predicate.value} ${q.object.value} to graph ${targetGraph.value}`);
    const newQuad = df.quad(q.subject, q.predicate, q.object, targetGraph);
    quads.push(newQuad);
  }
  await store.multiPut(quads);
  return quads.length;
}


// Converts a JSON-LD object to quads and puts them into the specified graph with store.multiPut

export async function putJsonLdToGraph(
  inputJsonLd: NodeObject,
  graphName?: string,
  {
    store,
    df
  } = defaultQuadstoreBundle
): Promise<number> {
  // Convert JSON-LD to RDF quads
  const graph = graphName ? df.namedNode(graphName) : df.defaultGraph();
  const quads = await jsonldToQuads(inputJsonLd, graph);

  // Put quads into the store
  await store.multiPut(quads);

  return quads.length;
}

/**
 * Creates a new graph from a JSON-LD object, optionally overwriting existing quads.
 * If overwrite is false, it will throw an error if the target graph is not empty.
 *
 * @param obj - The JSON-LD object to convert to RDF quads
 * @param graphName - The name of the graph to create
 * @param overwrite - Whether to clear existing quads in the target graph
 * @param options - Optional store and data factory for quadstore operations
 * @returns numQuads - The number of quads created in the new graph
 */

export interface CreateGraphOptions {
  overwrite?: boolean;
  graphName?: string;
  bundle?: QuadstoreBundle;
}

export async function createNewGraphFromJsonLd(
  inputJsonLd: NodeObject,
  options: CreateGraphOptions = {}
): Promise<number> {
  const {
    overwrite = false,
    graphName = null,
    bundle = defaultQuadstoreBundle,
  } = options;

  const { store, df } = bundle;
  const graph = graphName ? df.namedNode(graphName) : df.defaultGraph();
  const quads = await jsonldToQuads(inputJsonLd, graph);
  for (const quad of quads) {
    if (quad.subject.value.startsWith("_:") || quad.object.value.startsWith("_:")) {
      console.warn(`Quad with blank node: ${quad.subject.value} ${quad.predicate.value} ${quad.object.value} in graph ${graph.value}`);
    }
    // Uncomment the next line to log each quad being processed
    //console.log(`Quad: ${quad.subject.value} ${quad.predicate.value} ${quad.object.value} in graph ${graph.value}`);
  }


  if (overwrite && graphName) clearGraph(df.namedNode(graphName));

  // Put quads into the store
  await store.multiPut(quads);

  return quads.length;
}
