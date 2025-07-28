import type { NamedNode, Stream } from '../../deps.ts';
import { quadstore, df } from '../../../../flow-service/src/quadstore.ts';

/**
 * Clears all quads in the specified named graph.
 *
 * @param store - The Quadstore instance
 * @param graph - The named graph to clear
 * @param countOnly - If true, only count quads without deleting
 * @returns The number of quads counted or deleted
 */
/**
 * Delete all quads in the given graph and return the count of deleted quads.
 * If `countOnly` is true, it does not delete but still counts.
 */
export async function clearGraph(
  graph: NamedNode,
): Promise<number> {
  const matchStream = quadstore.match(undefined, undefined, undefined, graph);
  const count = await countQuads(matchStream);

  if (count > 0) {
    //TODO maybe delStream would be better
    quadstore.removeMatches(undefined, undefined, undefined, graph);
  }

  return count;
}
async function countQuads(stream: Stream): Promise<number> {
  return new Promise((resolve, reject) => {
    let count = 0;
    stream.on('data', () => count++);
    stream.on('end', () => resolve(count));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Copies all quads from source graph to target graph.
 *
 * @param store - The Quadstore instance
 * @param sourceGraph - The source named graph
 * @param targetGraph - The target named graph
 */
export async function copyGraph(
  sourceGraph: NamedNode,
  targetGraph: NamedNode
): Promise<void> {
  const stream = quadstore.match(undefined, undefined, undefined, sourceGraph);
  for await (const q of stream as any) {
    const newQuad = df.quad(q.subject, q.predicate, q.object, targetGraph);
    await quadstore.put(newQuad);
  }
}
