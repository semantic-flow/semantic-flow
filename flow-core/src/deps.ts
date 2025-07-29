export { normalize } from 'https://deno.land/std@0.224.0/path/mod.ts';
export {
  assertEquals,
  assertNotStrictEquals,
  assertThrows,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
export {
  basename,
  dirname,
  join,
  resolve,
} from 'https://deno.land/std@0.224.0/path/mod.ts';
export { existsSync } from 'https://deno.land/std@0.224.0/fs/mod.ts';
export { ensureDir } from 'https://deno.land/std@0.224.0/fs/ensure_dir.ts';

export { Quadstore } from 'npm:quadstore';
export { DataFactory } from 'npm:rdf-data-factory';
export { MemoryLevel } from 'npm:memory-level';

import jsonldDefault from "npm:jsonld";
export const jsonld = jsonldDefault;

export { Engine } from 'npm:quadstore-comunica';

// exported types

export type {
  JsonLdDocument,
  NodeObject,
  ValueObject,
  ContextDefinition,
} from "npm:@types/jsonld";

//RDF: Quad, NamedNode, Literal, Term, Stream, DefaultGraph, etc
export type * as RDF from 'npm:@rdfjs/types';
