import { NamedNode, Stream } from '../deps.ts';
import { jsonld } from '../deps.ts';
import { defaultQuadstoreBundle } from '../../../flow-service/src/quadstoreDefaultBundle.ts';
import { jsonldToQuads } from './rdfjs-utils.ts'

export function countQuadsInStream(stream: Stream): Promise<number> {
  return new Promise((resolve, reject) => {
    let count = 0;
    stream.on('data', () => count++);
    stream.on('end', () => resolve(count));
    stream.on('error', (err) => reject(err));
  });
}


//  returns whether there are any quads in the specified named graph.

export async function isGraphEmpty(
  graph: NamedNode,
  {
    store
  } = defaultQuadstoreBundle
): Promise<boolean> {
  const matchStream = store.match(undefined, undefined, undefined, graph);
  const count = await countQuadsInStream(matchStream);

  return count === 0;
}


//  Clears all quads in the specified named graph. Returns the number of quads deleted.

export async function clearGraph(
  graph: NamedNode,
  {
    store
  } = defaultQuadstoreBundle
): Promise<number> {
  const matchStream = store.match(undefined, undefined, undefined, graph);
  const count = await countQuadsInStream(matchStream);

  if (count > 0) {
    const delStream = store.match(undefined, undefined, undefined, graph);
    await store.delStream(delStream as any);
  }

  return count;
}

// Copies all quads from source graph to target graph.

export async function copyGraph(
  sourceGraph: NamedNode,
  targetGraph: NamedNode,
  {
    store,
    df,
  } = defaultQuadstoreBundle
): Promise<void> {
  const stream = store.match(undefined, undefined, undefined, sourceGraph);
  // TODO: multiPut
  for await (const q of stream as any) {
    const newQuad = df.quad(q.subject, q.predicate, q.object, targetGraph);
    await store.put(newQuad);
  }
}


// Converts a JSON-LD object to quads and puts them into the specified graph with store.multiPut

export async function putJsonLdToGraph(
  obj: Record<string, unknown>,
  graphName: string,
  {
    store
  } = defaultQuadstoreBundle
): Promise<void> {
  // Convert JSON-LD to RDF quads
  const quads = await jsonldToQuads(obj, graphName);

  // Put quads into the store
  await store.multiPut(quads);
}

// For each (subject, predicate) in the jsonld, remove matching, then insert.
export async function patchJsonLdToGraph(
  obj: Record<string, unknown>,
  graphName: string,
  {
    store,
    df,
  } = defaultQuadstoreBundle
): Promise<void> {
  // Convert JSON-LD to RDF quads
  const quads = await jsonldToQuads(obj, graphName);

  // Remove matching quads for each subject-predicate pair
  for (const q of quads) {
    store.removeMatches(q.subject, q.predicate, undefined, df.namedNode(graphName));
  }

  // Insert new quads
  await store.multiPut(quads);
}

// Creates a new graph from a JSON-LD object, 
// By default, fails if target graph isn't empty, but can overwrite ALL existing quads if specified.
export async function createNewGraphFromJsonLd(
  obj: Record<string, unknown>,
  graphName: string,
  overwrite: boolean = false,
  {
    store,
    df,
  } = defaultQuadstoreBundle
): Promise<void> {
  if (!overwrite) {
    const isEmpty = await isGraphEmpty(df.namedNode(graphName));
    if (!isEmpty) {
      throw new Error(`Graph ${graphName} is not empty. Use overwrite option to clear it.`);
    }
  } else {
    await clearGraph(df.namedNode(graphName));
  }

  // Convert JSON-LD to RDF quads
  const quads = await jsonldToQuads(obj, graphName);

  // Put quads into the store
  await store.multiPut(quads);
}
