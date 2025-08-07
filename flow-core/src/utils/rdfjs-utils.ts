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


export function relativizeQuads(inputQuads: RDF.Quad[], baseIRI: string): RDF.Quad[] {
  // Validate baseIRI format
  if (!baseIRI.startsWith("http://") && !baseIRI.startsWith("https://")) {
    throw new Error(`Invalid baseIRI: must start with http:// or https://, got: ${baseIRI}`);
  }
  if (!baseIRI.endsWith("/")) {
    throw new Error(`Invalid baseIRI: must end with "/", got: ${baseIRI}`);
  }

  return inputQuads.map(quad => {
    const subject = quad.subject.termType === 'NamedNode' ? quad.subject.value.replace(baseIRI, '') : quad.subject.value;
    const predicate = quad.predicate.termType === 'NamedNode' ? quad.predicate.value.replace(baseIRI, '') : quad.predicate.value;
    let object;
    if (quad.object.termType === 'NamedNode') {
      object = df.namedNode(quad.object.value.replace(baseIRI, ''));
    } else if (quad.object.termType === 'Literal') {
      object = df.literal(quad.object.value, quad.object.datatype);
    } else {
      object = quad.object;
    }
    const graph = quad.graph && quad.graph.termType === 'NamedNode' ? df.namedNode(quad.graph.value.replace(baseIRI, '')) : quad.graph.termType === 'DefaultGraph' ? df.defaultGraph() : undefined;
    return df.quad(
      quad.subject.termType === 'NamedNode' ? df.namedNode(subject) : quad.subject,
      quad.predicate.termType === 'NamedNode' ? df.namedNode(predicate) : quad.predicate,
      object,
      graph
    );
  });
}


export function expandRelativeQuads(inputQuads: RDF.Quad[], baseIRI: string): RDF.Quad[] {
  // Validate baseIRI format
  if (!baseIRI.startsWith("http://") && !baseIRI.startsWith("https://")) {
    throw new Error(`Invalid baseIRI: must start with http:// or https://, got: ${baseIRI}`);
  }
  if (!baseIRI.endsWith("/")) {
    throw new Error(`Invalid baseIRI: must end with "/", got: ${baseIRI}`);
  }

  return inputQuads.map(quad => {
    const subject = quad.subject.termType === 'NamedNode' ? (quad.subject.value.startsWith("http") ? quad.subject.value : baseIRI + quad.subject.value) : quad.subject.value;
    const predicate = quad.predicate.termType === 'NamedNode' ? (quad.predicate.value.startsWith("http") ? quad.predicate.value : baseIRI + quad.predicate.value) : quad.predicate.value;
    let object;
    if (quad.object.termType === 'NamedNode') {
      object = df.namedNode(quad.object.value.startsWith("http") ? quad.object.value : baseIRI + quad.object.value);
    } else if (quad.object.termType === 'Literal') {
      object = df.literal(quad.object.value, quad.object.datatype);
    } else {
      object = quad.object;
    }
    const graph = quad.graph && quad.graph.termType === 'NamedNode' ? df.namedNode(quad.graph.value.startsWith("http") ? quad.graph.value : baseIRI + quad.graph.value) : quad.graph.termType === 'DefaultGraph' ? df.defaultGraph() : undefined;
    return df.quad(
      quad.subject.termType === 'NamedNode' ? df.namedNode(subject) : quad.subject,
      quad.predicate.termType === 'NamedNode' ? df.namedNode(predicate) : quad.predicate,
      object,
      graph
    );
  });
}

export function expandRelativeJsonLd(inputJsonLd: NodeObject, baseIRI: string): NodeObject {
  // Validate baseIRI format
  if (!baseIRI.startsWith("http://") && !baseIRI.startsWith("https://")) {
    throw new Error(`Invalid baseIRI: must start with http:// or https://, got: ${baseIRI}`);
  }
  if (!baseIRI.endsWith("/")) {
    throw new Error(`Invalid baseIRI: must end with "/", got: ${baseIRI}`);
  }

  const expanded = structuredClone(inputJsonLd);
  // deno-lint-ignore no-explicit-any
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
