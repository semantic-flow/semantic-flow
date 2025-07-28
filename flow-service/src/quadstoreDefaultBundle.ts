import { Quadstore, MemoryLevel, DataFactory } from '../../flow-core/src/deps.ts';

const backend = new MemoryLevel();
const df = new DataFactory();
const store = new Quadstore({ backend, dataFactory: df });

await store.open();

export const defaultQuadstoreBundle = { store, df, backend };
