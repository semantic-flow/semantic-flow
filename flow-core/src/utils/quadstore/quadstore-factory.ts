// quadstoreFactory.ts
import { Quadstore, MemoryLevel, DataFactory, Engine } from '../../deps.ts';
import { QuadstoreBundle } from '../../types.ts';

/**
 * Creates and opens a new in-memory QuadstoreBundle.
 */
export async function createQuadstoreBundle(): Promise<QuadstoreBundle> {
  const backend = new MemoryLevel();
  const df = new DataFactory();
  const store = new Quadstore({ backend, dataFactory: df });
  const engine = new Engine(store);


  try {
    await store.open();
  } catch (err) {
    // Use preferred error handling approach

    await handleCaughtError(err, 'Failed to open quadstore');
    throw new Error(`Failed to open quadstore: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { store, df, backend, engine };
}
