
import type { QuadstoreBundle } from '../../../../flow-core/src/types.ts';
import { defaultQuadstoreBundle } from '../../quadstore-default-bundle.ts';
import { CONFIG_GRAPH_NAMES } from '../index.ts';
import { getCurrentServiceUri } from '../../utils/service-uri-builder.ts';
import { querySingleValue, queryMultipleValues } from '../../../../flow-core/src/utils/sparql-utils.ts';

export const singletonServiceConfigAccessor = new (class ServiceConfigAccessor {
  private bundle: QuadstoreBundle;

  constructor(bundle: QuadstoreBundle = defaultQuadstoreBundle) {
    this.bundle = bundle;
  }

  async getPort(): Promise<number | undefined> {
    const sparql = `
      PREFIX fsvc: <https://semantic-flow.github.io/ontology/flow-service/>
      SELECT ?value WHERE {
        GRAPH <${getCurrentServiceUri(CONFIG_GRAPH_NAMES.mergedServiceConfig)}> {
          ?s fsvc:port ?value .
        }
      }
    `;
    const result = await querySingleValue(this.bundle, sparql);
    return result ? Number(result) : undefined;
  }

  async getHost(): Promise<string | undefined> {
    const sparql = `
      PREFIX fsvc: <https://semantic-flow.github.io/ontology/flow-service/>
      SELECT ?value WHERE {
        GRAPH <${getCurrentServiceUri(CONFIG_GRAPH_NAMES.mergedServiceConfig)}> {
          ?s fsvc:host ?value .
        }
      }
    `;
    return await querySingleValue(this.bundle, sparql);
  }

  async getScheme(): Promise<string | undefined> {
    const sparql = `
      PREFIX fsvc: <https://semantic-flow.github.io/ontology/flow-service/>
      SELECT ?value WHERE {
        GRAPH <${getCurrentServiceUri(CONFIG_GRAPH_NAMES.mergedServiceConfig)}> {
          ?s fsvc:scheme ?value .
        }
      }
    `;
    return await querySingleValue(this.bundle, sparql);
  }

  async getMeshPaths(): Promise<string[]> {
    const sparql = `
      PREFIX fsvc: <https://semantic-flow.github.io/ontology/flow-service/>
      SELECT ?value WHERE {
        GRAPH <${getCurrentServiceUri(CONFIG_GRAPH_NAMES.mergedServiceConfig)}> {
          ?s fsvc:meshPaths ?value .
        }
      }
    `;
    return await queryMultipleValues(this.bundle, sparql);
  }
})();

// Additional getters for other config values can be implemented similarly
