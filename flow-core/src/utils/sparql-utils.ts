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
  logger.debug(`Executing SPARQL query: ${sparql}`);
  const values: string[] = [];
  try {
    const bindingsStream = await bundle.engine.queryBindings(sparql, { sources: [bundle.store] });
    // deno-lint-ignore no-explicit-any
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
  logger.debug(`Executing SPARQL query: ${sparql}`);
  const values: string[] = [];
  try {
    const bindingsStream = await bundle.engine.queryBindings(sparql, { sources: [bundle.store] });
    // deno-lint-ignore no-explicit-any
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
