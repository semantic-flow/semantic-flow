// Utility functions for SPARQL queries used across the codebase

import type { QuadstoreBundle } from '../types.ts';

export async function querySingleValue(
  bundle: QuadstoreBundle,
  sparql: string,
): Promise<string | undefined> {
  if (!bundle.engine) {
    throw new Error('SPARQL engine not initialized in Quadstore bundle');
  }
  const values: string[] = [];
  try {
    const bindingsStream = await bundle.engine.queryBindings(sparql, { sources: [bundle.store] });
    for await (const binding of bindingsStream as any) {
      const value = binding.get('value');
      if (value) {
        values.push(value.value);
      }
    }
  } catch (error) {
    throw new Error(`Failed to execute SPARQL query: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (values.length > 1) {
    throw new Error('Expected single result but multiple values were returned');
  }
  return values.length === 1 ? values[0] : undefined;
}

export async function queryMultipleValues(
  bundle: QuadstoreBundle,
  sparql: string,
): Promise<string[]> {
  if (!bundle.engine) {
    throw new Error('SPARQL engine not initialized in Quadstore bundle');
  }
  const values: string[] = [];
  try {
    const bindingsStream = await bundle.engine.queryBindings(sparql, { sources: [bundle.store] });
    for await (const binding of bindingsStream as any) {
      const value = binding.get('value');
      if (value) {
        values.push(value.value);
      }
    }
  } catch (error) {
    throw new Error(`Failed to execute SPARQL query: ${error instanceof Error ? error.message : String(error)}`);
  }
  return values;
}
