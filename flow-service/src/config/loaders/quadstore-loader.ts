import { defaultQuadstoreBundle } from '../../quadstore-default-bundle.ts';
import type { ServiceConfigInput, MeshRootNodeConfigInput } from '../config-types.ts';
import { PLATFORM_SERVICE_DEFAULTS, PLATFORM_NODE_DEFAULTS } from '../defaults.ts';
import { clearGraph, copyGraph, createNewGraphFromJsonLd } from '../../../../flow-core/src/utils/quadstore/quadstore-utils.ts';
import { handleCaughtError } from '../../../../flow-core/src/utils/logger/error-handlers.ts';
import { CONFIG_GRAPH_NAMES } from '../index.ts';
import { expandRelativeIds } from "../../../../flow-core/src/utils/rdfjs-utils.ts";
import { getCurrentServiceUri } from "../../utils/service-uri-builder.ts";
/**
 * Load platform defaults into Quadstore graphs
 */
export async function loadPlatformServiceDefaults(): Promise<void> {

  try {
    const uri = getCurrentServiceUri(CONFIG_GRAPH_NAMES.platformServiceDefaults);
    const expandedPlatformServiceDefaults = expandRelativeIds(PLATFORM_SERVICE_DEFAULTS, uri);
    // use the Service URI for the graph name
    await createNewGraphFromJsonLd(expandedPlatformServiceDefaults, { graphName: uri });
  } catch (error) {
    await handleCaughtError(
      error,
      'Error loading platform service defaults into Quadstore',
      {
        operation: 'config-load',
        component: 'platform-default-loader',
        configContext: {
          configType: 'platform-defaults',
        },
      }
    );
    // Optionally rethrow or handle as needed
  }
}

export async function loadPlatformImplicitMeshRootNodeConfig(): Promise<void> {
  const uri = getCurrentServiceUri(CONFIG_GRAPH_NAMES.platformImplicitMeshRootNodeConfig);
  const expandedPlatformNodeDefaults = expandRelativeIds(PLATFORM_NODE_DEFAULTS, uri);
  await createNewGraphFromJsonLd(expandedPlatformNodeDefaults, { graphName: uri });
}

/**
 * Load input service config into Quadstore graph
 */
export async function loadInputServiceConfig(inputConfig: ServiceConfigInput): Promise<void> {
  //console.log(inputConfig);
  const uri = getCurrentServiceUri(CONFIG_GRAPH_NAMES.inputServiceConfig);
  const expandedInputServiceConfig = expandRelativeIds(inputConfig, uri);
  //console.log(expandedInputServiceConfig)
  await createNewGraphFromJsonLd(expandedInputServiceConfig, { graphName: uri });
}

/**
 * Load input node config overrides into Quadstore graph
 */
export async function loadInputMeshRootNodeConfig(inputMeshRootNodeConfig: MeshRootNodeConfigInput): Promise<void> {
  const uri = getCurrentServiceUri(CONFIG_GRAPH_NAMES.inputMeshRootNodeConfig);
  const expandedInputMeshRootNodeConfig = expandRelativeIds(inputMeshRootNodeConfig, uri);
  await createNewGraphFromJsonLd(expandedInputMeshRootNodeConfig, { graphName: uri });
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

  const inputUri = getCurrentServiceUri(CONFIG_GRAPH_NAMES.inputServiceConfig);
  const mergedUri = getCurrentServiceUri(CONFIG_GRAPH_NAMES.mergedServiceConfig);
  const defaultUri = getCurrentServiceUri(CONFIG_GRAPH_NAMES.platformServiceDefaults);
  // Clear merged graph
  await clearGraph(df.namedNode(mergedUri));

  // Copy input service config quads
  await copyGraph(df.namedNode(inputUri), df.namedNode(mergedUri));

  // Copy platform service defaults quads if not overridden
  const platformQuads = store.match(undefined, undefined, undefined, df.namedNode(defaultUri));
  for await (const q of platformQuads) {
    const exists = await store.countQuads(q.subject, q.predicate, undefined, df.namedNode(mergedUri));
    if (exists === 0) {
      console.log(`platform quad copied: ${q.subject.value} ${q.predicate.value} ${q.object.value} in graph ${mergedUri}`);

      await store.put(df.quad(q.subject, q.predicate, q.object, df.namedNode(mergedUri)));
    }
  }


}


