import type { QuadstoreBundle } from '../../../../flow-core/src/types.ts';
import { defaultQuadstoreBundle } from '../../quadstore-default-bundle.ts';
import { DataFactory } from '../../../../flow-core/src/deps.ts';
import { GRAPH_NAMES } from '../loaders/quadstore-loader.ts';

export const singletonServiceConfigAccessor = new (class ServiceConfigAccessor {
  private bundle: QuadstoreBundle;
  private df: DataFactory;

  constructor(bundle: QuadstoreBundle = defaultQuadstoreBundle) {
    this.bundle = bundle;
    this.df = bundle.df;
  }

  private async querySingleValue(sparql: string): Promise<string | undefined> {
    if (!this.bundle.engine) {
      throw new Error('SPARQL engine not initialized in Quadstore bundle');
    }
    const bindingsStream = await this.bundle.engine.queryBindings(sparql, { sources: [this.bundle.store] });
    for await (const binding of bindingsStream as any) {
      const value = binding.get('value');
      if (value) {
        return value.value;
      }
    }
    return undefined;
  }

  async getPort(): Promise<number | undefined> {
    const sparql = `
      PREFIX fsvc: <https://semantic-flow.github.io/ontology/flow-service/>
      SELECT ?value WHERE {
        GRAPH <${GRAPH_NAMES.mergedServiceConfig}> {
          ?s fsvc:port ?value .
        }
      } LIMIT 1
    `;
    const result = await this.querySingleValue(sparql);
    return result ? Number(result) : undefined;
  }

  async getHost(): Promise<string | undefined> {
    const sparql = `
      PREFIX fsvc: <https://semantic-flow.github.io/ontology/flow-service/>
      SELECT ?value WHERE {
        GRAPH <${GRAPH_NAMES.mergedServiceConfig}> {
          ?s fsvc:host ?value .
        }
      } LIMIT 1
    `;
    return this.querySingleValue(sparql);
  }

  async getMeshPaths(): Promise<string[]> {
    const sparql = `
      PREFIX fsvc: <https://semantic-flow.github.io/ontology/flow-service/>
      SELECT ?value WHERE {
        GRAPH <${GRAPH_NAMES.mergedServiceConfig}> {
          ?s fsvc:meshPaths ?value .
        }
      }
    `;
    if (!this.bundle.engine) {
      throw new Error('SPARQL engine not initialized in Quadstore bundle');
    }
    const values: string[] = [];
    const bindingsStream = await this.bundle.engine.queryBindings(sparql, { sources: [this.bundle.store] });
    for await (const binding of bindingsStream as any) {
      const value = binding.get('value');
      if (value) {
        values.push(value.value);
      }
    }
    return values;
  }

  // Additional getters for other config values can be implemented similarly
})();
