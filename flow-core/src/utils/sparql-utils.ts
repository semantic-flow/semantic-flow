// Utility functions for SPARQL queries used across the codebase
import type { QuadstoreBundle } from '../types.ts';
import { getComponentLogger } from '../utils/logger/component-logger.ts';
import { handleCaughtError } from "./logger/error-handlers.ts";

const logger = getComponentLogger(import.meta);

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
    handleCaughtError(error, `Failed to execute SPARQL query ${sparql}`);
  }
  if (values.length > 1) {
    logger.warn(`Expected single result but got ${values.length} values for query: ${sparql}`);
    //throw new Error('Expected single result but multiple values were returned');
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
    handleCaughtError(error, `Failed to execute SPARQL query ${sparql}`);
  }
  return values;
}
