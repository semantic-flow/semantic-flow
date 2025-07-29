import { defaultQuadstoreBundle } from '../../quadstoreDefaultBundle.ts';
import type { ServiceConfigInput, MeshNodeConfigInput } from '../config-types.ts';
import { PLATFORM_SERVICE_DEFAULTS, PLATFORM_NODE_DEFAULTS } from '../defaults.ts';
import { clearGraph, copyGraph, createNewGraphFromJsonLd } from '../../../../flow-core/src/utils/quadstore-utils.ts';

/**
 * Named graph terms for Quadstore config graphs
 */
export const GRAPH_NAMES = {
  platformServiceDefaults: 'graph/platformServiceDefaults',
  platformImplicitMeshNodeConfig: 'graph/platformImplicitMeshNodeConfig',
  inputServiceConfig: 'graph/inputServiceConfig',
  inputMeshNodeConfig: 'graph/inputMeshNodeConfig',
  mergedServiceConfig: 'graph/mergedServiceConfig',
  // Per-node effective configs could be stored with dynamic graph names
};

/**
 * Load platform defaults into Quadstore graphs
 */
export async function loadPlatformDefaults(): Promise<void> {
  await createNewGraphFromJsonLd(PLATFORM_SERVICE_DEFAULTS, { graphName: GRAPH_NAMES.platformServiceDefaults });
  await createNewGraphFromJsonLd(PLATFORM_NODE_DEFAULTS, { graphName: GRAPH_NAMES.platformImplicitMeshNodeConfig });
}

/**
 * Load input service config into Quadstore graph
 */
export async function loadInputServiceConfig(inputConfig: ServiceConfigInput): Promise<void> {
  await createNewGraphFromJsonLd(inputConfig, { graphName: GRAPH_NAMES.inputServiceConfig });
}

/**
 * Load input node config overrides into Quadstore graph
 */
export async function loadInputMeshNodeConfig(inputMeshNodeConfig: MeshNodeConfigInput): Promise<void> {
  await createNewGraphFromJsonLd(inputMeshNodeConfig, { graphName: GRAPH_NAMES.inputMeshNodeConfig });
}

/**
 * Merge input and platform graphs into merged service config graph
 */
export async function mergeServiceConfigGraphs(
  {
    store,
    df,
  } = defaultQuadstoreBundle
): Promise<void> {
  // Clear merged graph
  const count = await clearGraph(df.namedNode(GRAPH_NAMES.mergedServiceConfig));
  if (count > 0) {
    console.info(`Deleted ${count} quads from mergedServiceConfig graph`);
  }

  // Copy input service config quads
  await copyGraph(df.namedNode(GRAPH_NAMES.inputServiceConfig), df.namedNode(GRAPH_NAMES.mergedServiceConfig));

  // Copy platform service defaults quads if not overridden
  const platformQuads = store.match(undefined, undefined, undefined, df.namedNode(GRAPH_NAMES.platformServiceDefaults));
  for await (const q of platformQuads as any) {
    const exists = await store.countQuads(q.subject, q.predicate, undefined, df.namedNode(GRAPH_NAMES.mergedServiceConfig));
    if (exists === 0) {
      await store.put(df.quad(q.subject, q.predicate, q.object, df.namedNode(GRAPH_NAMES.mergedServiceConfig)));
    }
  }
}


