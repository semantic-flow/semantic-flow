import { Quadstore, MemoryLevel, DataFactory } from '../../../flow-core/src/deps.ts';
import { quadstore, df } from '../../src/quadstore.ts';
import { Quad } from '../../../flow-core/src/deps.ts';


// Open the store
await quadstore.open();

// Put a single quad into the store using Quadstore's API
await quadstore.put(df.quad(
  df.namedNode('http://example.com/subject'),
  df.namedNode('http://example.com/predicate'),
  df.namedNode('http://example.com/object'),
  df.defaultGraph(),
));


// Retrieves all quads using RDF/JS Stream interfaces
const quadsStream = quadstore.match(undefined, undefined, undefined, df.defaultGraph());
quadsStream.on('data', (quad: Quad) => console.log(quad));


const quadsStream2 = quadstore.match(undefined, undefined, undefined, df.defaultGraph());
await quadstore.delStream(quadsStream2 as any);

console.log('All quads deleted');

const quadsStream3 = quadstore.match(undefined, undefined, undefined, df.defaultGraph());
quadsStream3.on('data', quad => console.log(quad));



// Retrieves all quads using Quadstore's API  
const { items } = await quadstore.get({});

for (const item of items) {
  console.log(item);
}
