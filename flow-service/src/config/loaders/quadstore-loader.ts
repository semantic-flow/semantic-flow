import { defaultQuadstoreBundle } from '../../quadstore-default-bundle.ts';
import type { ServiceConfigInput, MeshRootNodeConfigInput } from '../config-types.ts';
import { PLATFORM_SERVICE_DEFAULTS, PLATFORM_NODE_DEFAULTS } from '../defaults.ts';
import { createNewGraphFromJsonLd } from '../../../../flow-core/src/utils/quadstore/quadstore-utils.ts';
import { handleCaughtError } from '../../../../flow-core/src/utils/logger/error-handlers.ts';
import { CONFIG_GRAPH_NAMES } from '../index.ts';
import { expandRelativeQuads, relativizeQuads, expandRelativeJsonLd } from "../../../../flow-core/src/utils/rdfjs-utils.ts";
import { getCurrentServiceUri } from "../../utils/service-uri-builder.ts";
import { getComponentLogger } from "../../../../flow-core/src/utils/logger/component-logger.ts";

const logger = getComponentLogger(import.meta);

/**
 * Load platform defaults into Quadstore graphs
 */
export async function loadPlatformServiceDefaults(): Promise<void> {

  try {
    const uri = getCurrentServiceUri(CONFIG_GRAPH_NAMES.platformServiceDefaults);
    const expandedPlatformServiceDefaults = expandRelativeJsonLd(PLATFORM_SERVICE_DEFAULTS, uri);
    //logger.log(`Loading platform service defaults into graph:\n ${JSON.stringify(expandedPlatformServiceDefaults)}`);
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
  const expandedPlatformNodeDefaults = expandRelativeJsonLd(PLATFORM_NODE_DEFAULTS, uri);
  await createNewGraphFromJsonLd(expandedPlatformNodeDefaults, { graphName: uri });
}

/**
 * Load input service config into Quadstore graphs (both into inputServiceConfig and as a base for mergedServiceConfig)
 */
export async function loadInputServiceConfig(inputConfig: ServiceConfigInput): Promise<void> {
  //logger.log(inputConfig);
  const inputUri = getCurrentServiceUri(CONFIG_GRAPH_NAMES.inputServiceConfig);
  const mergedUri = getCurrentServiceUri(CONFIG_GRAPH_NAMES.mergedServiceConfig);

  const expandedInputServiceConfig = expandRelativeJsonLd(inputConfig, inputUri);
  //logger.log(expandedInputServiceConfig)
  await createNewGraphFromJsonLd(expandedInputServiceConfig, { graphName: inputUri });

  const expandedMergedServiceConfig = expandRelativeJsonLd(inputConfig, mergedUri);
  await createNewGraphFromJsonLd(expandedMergedServiceConfig, { graphName: mergedUri });
}

/**
 * Load input node config overrides into Quadstore graph
 */
export async function loadInputMeshRootNodeConfig(inputMeshRootNodeConfig: MeshRootNodeConfigInput): Promise<void> {
  const uri = getCurrentServiceUri(CONFIG_GRAPH_NAMES.inputMeshRootNodeConfig);
  const expandedInputMeshRootNodeConfig = expandRelativeJsonLd(inputMeshRootNodeConfig, uri);
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
  const originalPlatformQuads = await store.get({ subject: undefined, predicate: undefined, object: undefined, graph: df.namedNode(defaultUri) });
  const relativeizedPlatformQuads = relativizeQuads(originalPlatformQuads.items, defaultUri);
  const expandedForMergedPlatformQuads = expandRelativeQuads(relativeizedPlatformQuads, mergedUri);
  let platformQuadsCopied = 0;
  for await (const q of expandedForMergedPlatformQuads) {
    logger.debug(`platform subject: ${q.subject.value}`);
    const existingQuads = await store.get({ subject: q.subject, predicate: q.predicate, object: undefined, graph: df.namedNode(mergedUri) });
    logger.debug(`existing subject: ${existingQuads.items[0]?.subject.value}`);
    logger.debug(`${q.subject.value.split('/').pop()}-${q.predicate.value.split('/').pop()}: ${existingQuads.items.length}`);
    if (existingQuads.items.length === 0) {
      logger.debug(`platform quad copied: ${q.subject.value} ${q.predicate.value} ${q.object.value} in graph ${mergedUri}`);

      await store.put(df.quad(q.subject, q.predicate, q.object, df.namedNode(mergedUri)));
      platformQuadsCopied++;
    } else if (existingQuads.items.length === 1) {
      logger.debug(`Quad already exists in merged graph: ${q.subject.value} ${q.predicate.value} ${q.object.value}`);
    } else if (existingQuads.items.length > 1) {
      logger.error(`Multiple quads found for ${q.subject.value} ${q.predicate.value} in graph ${mergedUri}. This may indicate a configuration error.`);
    }
  }
  logger.debug(`platform quads copied: ${platformQuadsCopied}`);
}


