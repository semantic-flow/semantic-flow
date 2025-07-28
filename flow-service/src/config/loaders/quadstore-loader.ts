import { namedNode, literal, quad } from '../../../../flow-core/src/deps.ts';
import { quadstore } from '../../quadstore.ts';
import type { ServiceConfigInput, NodeConfigInput } from '../types.ts';
import { PLATFORM_SERVICE_DEFAULTS, PLATFORM_NODE_DEFAULTS } from '../defaults.ts';

/**
 * Named graph terms for Quadstore config graphs
 */
export const GRAPH_NAMES = {
  platformServiceDefaults: 'graph/platformServiceDefaults',
  platformImplicitNodeConfig: 'graph/platformImplicitNodeConfig',
  inputServiceConfig: 'graph/inputServiceConfig',
  inputNodeConfig: 'graph/inputNodeConfig',
  mergedServiceConfig: 'graph/mergedServiceConfig',
  // Per-node effective configs could be stored with dynamic graph names
};

/**
 * Load platform defaults into Quadstore graphs
 */
export async function loadPlatformDefaults(): Promise<void> {
  await loadConfigObjectToGraph(PLATFORM_SERVICE_DEFAULTS, GRAPH_NAMES.platformServiceDefaults);
  await loadConfigObjectToGraph(PLATFORM_NODE_DEFAULTS, GRAPH_NAMES.platformImplicitNodeConfig);
}

/**
 * Load input service config into Quadstore graph
 */
export async function loadInputServiceConfig(inputConfig: ServiceConfigInput): Promise<void> {
  await loadConfigObjectToGraph(inputConfig, GRAPH_NAMES.inputServiceConfig);
}

/**
 * Load input node config overrides into Quadstore graph
 */
export async function loadInputNodeConfig(inputNodeConfig: NodeConfigInput): Promise<void> {
  await loadConfigObjectToGraph(inputNodeConfig, GRAPH_NAMES.inputNodeConfig);
}

import { clearGraph, copyGraph } from '../../../../flow-core/src/utils/quadstore/quadstore-utils.ts';

/**
 * Merge input and platform graphs into merged service config graph
 */
export async function mergeServiceConfigGraphs(): Promise<void> {
  // Clear merged graph
  const count = await clearGraph(namedNode(GRAPH_NAMES.mergedServiceConfig));
  if (count > 0) {
    console.info(`Deleted ${count} quads from mergedServiceConfig graph`);
  }

  // Copy input service config quads
  await copyGraph(namedNode(GRAPH_NAMES.inputServiceConfig), namedNode(GRAPH_NAMES.mergedServiceConfig));

  // Copy platform service defaults quads if not overridden
  const platformQuads = quadstore.match(undefined, undefined, undefined, namedNode(GRAPH_NAMES.platformServiceDefaults));
  for await (const q of platformQuads as any) {
    const exists = await quadstore.countQuads(q.subject, q.predicate, undefined, namedNode(GRAPH_NAMES.mergedServiceConfig));
    if (exists === 0) {
      await quadstore.put(quad(q.subject, q.predicate, q.object, namedNode(GRAPH_NAMES.mergedServiceConfig)));
    }
  }
}

/**
 * Helper to convert a config object to RDF quads and load into a named graph
 * This is a simplified placeholder; a real implementation would convert JSON-LD fully.
 */
async function loadConfigObjectToGraph(configObj: object, graphName: string): Promise<void> {
  // Clear existing quads in the graph
  clearGraph(namedNode(graphName));

  // Convert configObj to quads and add to store
  const subject = namedNode((configObj as Record<string, unknown>)['@id'] || 'urn:config');
  for (const [key, value] of Object.entries(configObj)) {
    if (key === '@context' || key === '@type' || key === '@id') continue;
    const predicate = namedNode(key);
    const object = typeof value === 'string' ? literal(value) : literal(JSON.stringify(value));
    await quadstore.put(quad(subject, predicate, object, namedNode(graphName)));
  }
}
