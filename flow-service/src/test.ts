import { Quadstore, MemoryLevel, DataFactory } from '../../flow-core/src/deps.ts';

// Any implementation of AbstractLevel can be used.
const backend = new MemoryLevel();

// Implementation of the RDF/JS DataFactory interface
const df = new DataFactory();

// Store and query engine are separate modules
const store = new Quadstore({ backend, dataFactory: df });

// Open the store
await store.open();

// Put a single quad into the store using Quadstore's API
await store.put(df.quad(
  df.namedNode('http://example.com/subject'),
  df.namedNode('http://example.com/predicate'),
  df.namedNode('http://example.com/object'),
  df.defaultGraph(),
));

// Retrieves all quads using Quadstore's API  
const { items } = await store.get({});

// Retrieves all quads using RDF/JS Stream interfaces
const quadsStream = store.match(undefined, undefined, undefined, undefined);
quadsStream.on('data', quad => console.log(quad));


const quadsStream2 = store.match(undefined, undefined, undefined, undefined);
await store.delStream(quadsStream2 as any);

console.log('All quads deleted');

const quadsStream3 = store.match(undefined, undefined, undefined, undefined);
quadsStream3.on('data', quad => console.log(quad));
