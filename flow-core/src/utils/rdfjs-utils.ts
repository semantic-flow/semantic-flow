import { jsonld } from '../deps.ts';
import { NodeObject } from '../deps.ts';
import type { RDF } from '../deps.ts';
import { DataFactory } from 'npm:rdf-data-factory';

const df = new DataFactory();

// Converts a JSON-LD object to an array of RDFJS quads using a local DataFactory instance
export async function jsonldToQuads(
  inputJsonLd: NodeObject,
  graph: RDF.NamedNode | RDF.DefaultGraph = df.defaultGraph(),
): Promise<RDF.Quad[]> {
  // Use jsonld.toRDF() to get quads directly - much simpler!
  const quads = await jsonld.toRDF(inputJsonLd) as RDF.Quad[];

  // If the desired graph is the default graph, return as-is
  if (graph.termType === 'DefaultGraph') {
    return quads;
  }

  // If a specific named graph is requested, update all quads to use that graph
  return quads.map(quad =>
    df.quad(quad.subject, quad.predicate, quad.object, graph)
  );
}
