import { defaultQuadstoreBundle } from '../../quadstore-default-bundle.ts';
import type { ServiceConfigInput, MeshRootNodeConfigInput } from '../config-types.ts';
import { PLATFORM_SERVICE_DEFAULTS, PLATFORM_NODE_DEFAULTS } from '../defaults.ts';
import { clearGraph, copyGraph, createNewGraphFromJsonLd } from '../../../../flow-core/src/utils/quadstore-utils.ts';
import { CONFIG_GRAPH_NAMES } from '../index.ts';
/**
 * Load platform defaults into Quadstore graphs
 */
export async function loadPlatformDefaults(): Promise<void> {
  await createNewGraphFromJsonLd(PLATFORM_SERVICE_DEFAULTS, { graphName: CONFIG_GRAPH_NAMES.platformServiceDefaults });
  await createNewGraphFromJsonLd(PLATFORM_NODE_DEFAULTS, { graphName: CONFIG_GRAPH_NAMES.platformImplicitMeshRootNodeConfig });
}

/**
 * Load input service config into Quadstore graph
 */
export async function loadInputServiceConfig(inputConfig: ServiceConfigInput): Promise<void> {
  await createNewGraphFromJsonLd(inputConfig, { graphName: CONFIG_GRAPH_NAMES.inputServiceConfig });
}

/**
 * Load input node config overrides into Quadstore graph
 */
export async function loadInputMeshRootNodeConfig(inputMeshRootNodeConfig: MeshRootNodeConfigInput): Promise<void> {
  await createNewGraphFromJsonLd(inputMeshRootNodeConfig, { graphName: CONFIG_GRAPH_NAMES.inputMeshRootNodeConfig });
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
  const count = await clearGraph(df.namedNode(CONFIG_GRAPH_NAMES.mergedServiceConfig));
  if (count > 0) {
    console.info(`Deleted ${count} quads from mergedServiceConfig graph`);
  }

  // Copy input service config quads
  await copyGraph(df.namedNode(CONFIG_GRAPH_NAMES.inputServiceConfig), df.namedNode(CONFIG_GRAPH_NAMES.mergedServiceConfig));

  // Copy platform service defaults quads if not overridden
  const platformQuads = store.match(undefined, undefined, undefined, df.namedNode(CONFIG_GRAPH_NAMES.platformServiceDefaults));
  for await (const q of platformQuads as any) {
    const exists = await store.countQuads(q.subject, q.predicate, undefined, df.namedNode(CONFIG_GRAPH_NAMES.mergedServiceConfig));
    if (exists === 0) {
      await store.put(df.quad(q.subject, q.predicate, q.object, df.namedNode(CONFIG_GRAPH_NAMES.mergedServiceConfig)));
    }
  }
}


