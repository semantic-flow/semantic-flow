// Imports for QuadstoreBundle types
// usage: const bundle: QuadstoreBundle<MemoryLevel<string, string>> = { ... };
import type { Quadstore, DataFactory } from './deps.ts';
import type { AbstractLevel } from 'npm:abstract-level';
import { Engine } from 'npm:quadstore-comunica';

// Quadstore Bundle Type
export interface QuadstoreBundle<B extends AbstractLevel<any, any, any> = AbstractLevel<any, any, any>> {
  store: Quadstore;
  df: DataFactory;
  backend: B;
  engine?: Engine;
}
