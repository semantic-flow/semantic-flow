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
    //console.log(`Loading platform service defaults into graph:\n ${JSON.stringify(expandedPlatformServiceDefaults)}`);
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
 * Load input service config into Quadstore graphs (both into inputServiceConfig and as a base for mergedServiceConfig)
 */
export async function loadInputServiceConfig(inputConfig: ServiceConfigInput): Promise<void> {
  //console.log(inputConfig);
  const inputUri = getCurrentServiceUri(CONFIG_GRAPH_NAMES.inputServiceConfig);
  const mergedUri = getCurrentServiceUri(CONFIG_GRAPH_NAMES.mergedServiceConfig);

  const expandedInputServiceConfig = expandRelativeIds(inputConfig, inputUri);
  //console.log(expandedInputServiceConfig)
  await createNewGraphFromJsonLd(expandedInputServiceConfig, { graphName: inputUri });

  const expandedMergedServiceConfig = expandRelativeIds(inputConfig, mergedUri);
  await createNewGraphFromJsonLd(expandedMergedServiceConfig, { graphName: mergedUri });
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

  const mergedUri = getCurrentServiceUri(CONFIG_GRAPH_NAMES.mergedServiceConfig);
  const defaultUri = getCurrentServiceUri(CONFIG_GRAPH_NAMES.platformServiceDefaults);

  // Copy platform service defaults quads if not overridden
  const platformQuads = store.match(undefined, undefined, undefined, df.namedNode(defaultUri));
  let platformQuadsCopied = 0;
  for await (const q of platformQuads) {
    const existingQuads = await store.get({ subject: q.subject, predicate: q.predicate, object: undefined, graph: df.namedNode(mergedUri) });
    //console.log(`${existingQuads.items}\n`)

    if (existingQuads.items.length === 0) {
      //console.log(`platform quad copied: ${q.subject.value} ${q.predicate.value} ${q.object.value} in graph ${mergedUri}`);

      await store.put(df.quad(q.subject, q.predicate, q.object, df.namedNode(mergedUri)));
      platformQuadsCopied++;
    } else if (existingQuads.items.length > 1) {
      console.error(`Multiple quads found for ${q.subject.value} ${q.predicate.value} in graph ${mergedUri}. This may indicate a configuration error.`);
    }
  }
  //console.log(`platform quads copied: ${platformQuadsCopied}`);
}


