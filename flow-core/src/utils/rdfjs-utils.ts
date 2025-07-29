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
  // Expand the JSON-LD object to full form
  const expanded = await jsonld.expand(inputJsonLd);

  // Convert expanded JSON-LD to RDFJS quads
  const quads: RDF.Quad[] = [];

  for (const node of expanded) {
    const subject = df.namedNode(node['@id'] as string);

    for (const [key, values] of Object.entries(node)) {
      if (key === '@id' || key === '@type' || key === '@context') continue;

      for (const value of values as any[]) {
        let object;

        if (value['@id']) {
          object = df.namedNode(value['@id']);
        } else if (value['@value'] !== undefined) {
          const datatype = value['@type'] ? df.namedNode(value['@type']) : undefined;
          const language = value['@language'];
          object = df.literal(value['@value'], language || datatype);
        } else {
          // For complex nested objects, serialize as JSON string literal
          object = df.literal(JSON.stringify(value));
        }

        const predicate = df.namedNode(key);
        const quadObj = df.quad(subject, predicate, object, graph);
        quads.push(quadObj);
      }
    }
  }

  return quads;
}
