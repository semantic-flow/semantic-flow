/**
 * Configuration System Entry Point
 *
 * Exports the complete service configuration system with cascading configuration resolution
 * and side-by-side configuration context.
 */

import { createServiceLogContext } from "../utils/service-log-context.ts";

/**
 * Named graph terms for Quadstore config graphs
 */
export const CONFIG_GRAPH_NAMES = {
  platformServiceDefaults: 'platformServiceDefaults',
  platformImplicitMeshRootNodeConfig: 'platformImplicitMeshRootNodeConfig',
  inputServiceConfig: 'inputServiceConfig',
  inputMeshRootNodeConfig: 'inputMeshRootNodeConfig',
  mergedServiceConfig: 'mergedServiceConfig',
}


// Core Types
export type {
  ContainedServicesConfig,
  FlowServiceContext,
  LogChannelConfig,
  LoggingConfig,
  LogLevel,
  MeshRootNodeConfig,
  MeshRootNodeConfigContext,
  MeshRootNodeConfigInput,
  ServiceConfig,
  ServiceConfigInput,
  ServiceOptions,
  TemplateMapping,
} from './config-types.ts';

// Error Types
export { ConfigError, ConfigValidationError } from './config-types.ts';


// Default Configurations
export {
  DEFAULT_CONTEXT,
  DEVELOPMENT_SERVICE_OVERRIDES,
  getEnvironmentDefaults,
  PLATFORM_NODE_DEFAULTS,
  PLATFORM_SERVICE_DEFAULTS,
  PRODUCTION_SERVICE_OVERRIDES,
} from './defaults.ts';

// Environment Variable Loading
export { getServiceConfigPath, loadEnvConfig } from './loaders/env-loader.ts';

// JSON-LD File Loading
export {
  configExists,
  getNodeHierarchy,
  isConfigInheritanceEnabled,
  loadMeshRootNodeConfig,
  loadServiceConfig,
  saveMeshRootNodeConfig,
  saveServiceConfig,
  validateJsonLd,
} from './loaders/jsonld-loader.ts';

// Service Configuration Resolution (Cascading Pattern)
export {
  resolveServiceConfig,
} from './resolution/service-config-resolver.ts';

export { validateServiceConfig } from './resolution/service-config-validator.ts';

export { singletonServiceConfigAccessor } from './resolution/service-config-accessor.ts';

// Shared Utilities
export { mergeConfigs } from '../utils/merge-configs.ts';

// Import the implementations for the helper functions
import type { ServiceOptions } from './config-types.ts';
import { resolveServiceConfig } from './resolution/service-config-resolver.ts';
import { validateServiceConfig } from './resolution/service-config-validator.ts';
import { handleCaughtError } from '../../../flow-core/src/utils/logger/error-handlers.ts';
import { LogContext } from '../../../flow-core/src/utils/logger/types.ts';

/**
 * Resolves and validates the service configuration.
 *
 * @param cliOptions - Optional command-line options to influence configuration resolution
 */
export async function createServiceConfig(
  cliOptions?: ServiceOptions,
): Promise<void> {
  try {
    await resolveServiceConfig(cliOptions);
    await validateServiceConfig();
  } catch (error) {
    const context = createServiceLogContext({
      operation: 'config-create',
      component: 'service-config-creation',
      metadata: { cliOptions }

    });
    await handleCaughtError(error, `Failed to create service configuration`, context);
    throw error;
  }
}

