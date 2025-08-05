import { jsonld } from '../deps.ts';
import { NodeObject } from '../deps.ts';
import type { RDF } from '../deps.ts';
import { DataFactory } from 'npm:rdf-data-factory';

const df = new DataFactory();

// Converts a JSON-LD object to an array of RDFJS quads using a local DataFactory instance
// Uses jsonld.toRDF from https://github.com/digitalbazaar/jsonld.js
export async function jsonldToQuads(
  inputJsonLd: NodeObject,
  graph: RDF.NamedNode | RDF.DefaultGraph = df.defaultGraph(),
): Promise<RDF.Quad[]> {


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

export function expandRelativeIds(inputJsonLd: NodeObject, baseIRI: string): any {
  // Validate baseIRI format
  if (!baseIRI.startsWith("http://") && !baseIRI.startsWith("https://")) {
    throw new Error(`Invalid baseIRI: must start with http:// or https://, got: ${baseIRI}`);
  }
  if (!baseIRI.endsWith("/")) {
    throw new Error(`Invalid baseIRI: must end with "/", got: ${baseIRI}`);
  }

  const expanded = structuredClone(inputJsonLd);

  function rewrite(obj: any) {
    if (obj && typeof obj === "object") {
      if (typeof obj["@id"] === "string" && !obj["@id"].startsWith("http")) {
        obj["@id"] = baseIRI + obj["@id"];
      }
      for (const key of Object.keys(obj)) {
        if (Array.isArray(obj[key])) obj[key].forEach(rewrite);
        else if (typeof obj[key] === "object") rewrite(obj[key]);
      }
    }
  }

  rewrite(expanded);
  return expanded;
}
