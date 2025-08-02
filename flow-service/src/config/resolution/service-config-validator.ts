
import { defaultQuadstoreBundle } from '../../quadstore-default-bundle.ts';
import { DataFactory } from '../../../../flow-core/src/deps.ts';
import { ConfigError } from '../config-types.ts';
import { CONFIG_GRAPH_NAMES } from '../index.ts';

/**
 * Validates essential service configuration values in the merged config graph.
 * Throws ConfigError if validation fails.
 */
export async function validateServiceConfig(): Promise<void> {
  const { store, df } = defaultQuadstoreBundle;
  const graph = df.namedNode(CONFIG_GRAPH_NAMES.mergedServiceConfig);

  // Validate port
  const portQuads = store.match(undefined, df.namedNode('https://semantic-flow.github.io/ontology/flow-service/port'), undefined, graph);
  for await (const quad of portQuads) {
    const port = Number(quad.object.value);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new ConfigError(`Invalid port number: ${quad.object.value}. Must be between 1 and 65535.`);
    }
  }

  // Validate host presence
  const hostQuads = store.match(undefined, df.namedNode('https://semantic-flow.github.io/ontology/flow-service/host'), undefined, graph);
  let hostFound = false;
  for await (const _ of hostQuads) {
    hostFound = true;
    break;
  }
  if (!hostFound) {
    throw new ConfigError('Host is missing in service configuration.');
  }

  // Additional validations can be added here as needed
}
