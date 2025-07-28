import { Quadstore, MemoryLevel, DataFactory } from '../../flow-core/src/deps.ts';

const db = new MemoryLevel();
const df = new DataFactory();
const quadstore = new Quadstore({ backend: db, dataFactory: df });

await quadstore.open();

export { quadstore, df };
