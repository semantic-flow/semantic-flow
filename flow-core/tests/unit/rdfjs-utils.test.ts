import { DataFactory } from 'npm:rdf-data-factory';
import { relativizeQuads, expandRelativeQuads } from '../../src/utils/rdfjs-utils.ts';
import type { RDF } from '../../src/deps.ts';
import { assertEquals, describe, it } from '../../src/deps.ts';

const df = new DataFactory();

describe('relativizeQuads', () => {
  const baseIRI = 'http://example.org/';

  it('should relativize namedNode components correctly', () => {
    const quads: RDF.Quad[] = [
      df.quad(
        df.namedNode('http://example.org/subject'),
        df.namedNode('http://example.org/predicate'),
        df.namedNode('http://example.org/object'),
        df.namedNode('http://example.org/graph')
      )
    ];
    const result = relativizeQuads(quads, baseIRI);
    assertEquals(result[0].subject.value, 'subject');
    assertEquals(result[0].predicate.value, 'predicate');
    assertEquals(result[0].object.value, 'object');
    assertEquals(result[0].graph?.value, 'graph');
  });

  it('should preserve literals in object', () => {
    const quads: RDF.Quad[] = [
      df.quad(
        df.namedNode('http://example.org/subject'),
        df.namedNode('http://example.org/predicate'),
        df.literal('literal value', df.namedNode('http://www.w3.org/2001/XMLSchema#string')),
        df.defaultGraph()
      )
    ];
    const result = relativizeQuads(quads, baseIRI);
    assertEquals(result[0].object.termType, 'Literal');
    assertEquals(result[0].object.value, 'literal value');
  });
});

describe('expandRelativeQuads', () => {
  const baseIRI = 'http://example.org/';

  it('should expand namedNode components correctly', () => {
    const quads: RDF.Quad[] = [
      df.quad(
        df.namedNode('subject'),
        df.namedNode('predicate'),
        df.namedNode('object'),
        df.namedNode('graph')
      )
    ];
    const result = expandRelativeQuads(quads, baseIRI);
    assertEquals(result[0].subject.value, 'http://example.org/subject');
    assertEquals(result[0].predicate.value, 'http://example.org/predicate');
    assertEquals(result[0].object.value, 'http://example.org/object');
    assertEquals(result[0].graph?.value, 'http://example.org/graph');
  });

  it('should preserve literals in object', () => {
    const quads: RDF.Quad[] = [
      df.quad(
        df.namedNode('subject'),
        df.namedNode('predicate'),
        df.literal('literal value', df.namedNode('http://www.w3.org/2001/XMLSchema#string')),
        df.defaultGraph()
      )
    ];
    const result = expandRelativeQuads(quads, baseIRI);
    assertEquals(result[0].object.termType, 'Literal');
    assertEquals(result[0].object.value, 'literal value');
  });
});
