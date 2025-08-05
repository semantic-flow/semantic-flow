import { Quadstore, MemoryLevel, DataFactory, Engine } from '../../flow-core/src/deps.ts';
import { QuadstoreBundle } from '../../flow-core/src/types.ts';

const backend = new MemoryLevel();
const df = new DataFactory();
const store = new Quadstore({ backend, dataFactory: df });
const engine = new Engine(store);

await store.open();

export const defaultQuadstoreBundle: QuadstoreBundle = { store, df, backend, engine };
