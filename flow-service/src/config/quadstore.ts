import { Quadstore, MemoryLevel, DataFactory } from '../../../flow-core/src/deps.ts';

const db = new MemoryLevel();
const dataFactory = new DataFactory();
const quadstore = new Quadstore({ backend: db, dataFactory });

await quadstore.open();

export { quadstore };
