
import type { QuadstoreBundle } from '../../../../flow-core/src/types.ts';
import { defaultQuadstoreBundle } from '../../quadstore-default-bundle.ts';
import { CONFIG_GRAPH_NAMES } from '../index.ts';
import { getCurrentServiceUri } from '../../utils/service-uri-builder.ts';
import { querySingleValue, queryMultipleValues } from '../../../../flow-core/src/utils/sparql-utils.ts';


export const singletonServiceConfigAccessor = new (class ServiceConfigAccessor {
  private bundle: QuadstoreBundle;
  private initialized: boolean = false;

  constructor(bundle: QuadstoreBundle = defaultQuadstoreBundle) {
    this.bundle = bundle;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  setInitialized(value: boolean): void {
    this.initialized = value;
  }

  async getConfigValue(property: string): Promise<string | undefined> {
    const sparql = `
      PREFIX fsvc: <https://semantic-flow.github.io/ontology/flow-service/>
      SELECT ?value WHERE {
        GRAPH <${getCurrentServiceUri(CONFIG_GRAPH_NAMES.mergedServiceConfig)}> {
          ?s ${property} ?value .
        }
      }
    `;
    return await querySingleValue(this.bundle, sparql);
  }

  async getMultipleConfigValues(property: string): Promise<string[]> {
    const sparql = `
      PREFIX fsvc: <https://semantic-flow.github.io/ontology/flow-service/>
      SELECT ?value WHERE {
        GRAPH <${getCurrentServiceUri(CONFIG_GRAPH_NAMES.mergedServiceConfig)}> {
          ?s ${property} ?value .
        }
      }
    `;
    return await queryMultipleValues(this.bundle, sparql);
  }

  async getPort(): Promise<number | undefined> {
    const result = await this.getConfigValue('fsvc:port');
    return result ? Number(result) : undefined;
  }

  async getHost(): Promise<string | undefined> {
    return this.getConfigValue('fsvc:host');
  }

  async getScheme(): Promise<string | undefined> {
    return this.getConfigValue('fsvc:scheme');
  }

  async getMeshPaths(): Promise<string[]> {
    return this.getMultipleConfigValues('fsvc:meshPaths');
  }

  // Custom accessors for logging channels

  async getConsoleLoggingConfig(): Promise<{ enabled: boolean; level?: string }> {
    const sparql = `
      PREFIX fsvc: <https://semantic-flow.github.io/ontology/flow-service/>
      SELECT ?enabled ?level WHERE {
        GRAPH <${getCurrentServiceUri(CONFIG_GRAPH_NAMES.mergedServiceConfig)}> {
          ?s fsvc:hasConsoleChannel ?channel .
          ?channel fsvc:logChannelEnabled ?enabled .
          OPTIONAL { ?channel fsvc:logLevel ?level . }
        }
      }
    `;
    const enabledStr = await this.getConfigValueFromSparql(sparql, 'enabled');
    const level = await this.getConfigValueFromSparql(sparql, 'level');
    return { enabled: enabledStr === 'true', level: level ?? undefined };
  }

  async getFileLoggingConfig(): Promise<{ enabled: boolean; level?: string }> {
    const sparql = `
      PREFIX fsvc: <https://semantic-flow.github.io/ontology/flow-service/>
      SELECT ?enabled ?level WHERE {
        GRAPH <${getCurrentServiceUri(CONFIG_GRAPH_NAMES.mergedServiceConfig)}> {
          ?s fsvc:hasFileChannel ?channel .
          ?channel fsvc:logChannelEnabled ?enabled .
          OPTIONAL { ?channel fsvc:logLevel ?level . }
        }
      }
    `;
    const enabledStr = await this.getConfigValueFromSparql(sparql, 'enabled');
    const level = await this.getConfigValueFromSparql(sparql, 'level');
    return { enabled: enabledStr === 'true', level: level ?? undefined };
  }

  async getSentryLoggingConfig(): Promise<{ enabled: boolean; level?: string }> {
    const sparql = `
      PREFIX fsvc: <https://semantic-flow.github.io/ontology/flow-service/>
      SELECT ?enabled ?level WHERE {
        GRAPH <${getCurrentServiceUri(CONFIG_GRAPH_NAMES.mergedServiceConfig)}> {
          ?s fsvc:hasSentryChannel ?channel .
          ?channel fsvc:logChannelEnabled ?enabled .
          OPTIONAL { ?channel fsvc:logLevel ?level . }
        }
      }
    `;
    const enabledStr = await this.getConfigValueFromSparql(sparql, 'enabled');
    const level = await this.getConfigValueFromSparql(sparql, 'level');
    return { enabled: enabledStr === 'true', level: level ?? undefined };
  }

  private async getConfigValueFromSparql(sparql: string, variable: string): Promise<string | undefined> {
    if (!this.bundle.engine) {
      throw new Error('SPARQL engine not initialized in Quadstore bundle');
    }
    try {
      const bindingsStream = await this.bundle.engine.queryBindings(sparql, { sources: [this.bundle.store] });
      for await (const binding of bindingsStream as any) {
        const value = binding.get(variable);
        if (value) {
          return value.value;
        }
      }
    } catch (error) {
      throw new Error(`Failed to execute SPARQL query: ${error instanceof Error ? error.message : String(error)}`);
    }
    return undefined;
  }
})();

// Additional getters for other config values can be implemented similarly
