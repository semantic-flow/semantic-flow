/**
 * Configuration System Entry Point
 *
 * Exports the complete service configuration system with cascading configuration resolution
 * and side-by-side configuration context.
 */

// Core Types
export type {
  ServiceConfig,
  ServiceConfigInput,
  NodeConfig,
  NodeConfigInput,
  ServiceConfigContext,
  NodeConfigContext,
  ServiceOptions,
  LogLevel,
  JSONLDContext,
  LogChannelConfig,
  LoggingConfig,
  ContainedServicesConfig,
  TemplateMapping
} from './types.ts';

// Error Types
export {
  ConfigError,
  ConfigValidationError
} from './types.ts';

// Helper Functions
export {
  getServicePort,
  getServiceHost,
  getConsoleLogLevel,
  getFileLogEnabled,
  getSentryEnabled,
  getVersioningEnabled
} from './types.ts';

// Default Configurations
export {
  PLATFORM_SERVICE_DEFAULTS,
  PLATFORM_NODE_DEFAULTS,
  DEFAULT_CONTEXT,
  DEVELOPMENT_SERVICE_OVERRIDES,
  PRODUCTION_SERVICE_OVERRIDES,
  getEnvironmentDefaults
} from './defaults.ts';

// Environment Variable Loading
export {
  loadEnvConfig,
  getServiceConfigPath
} from './loaders/env-loader.ts';

// JSON-LD File Loading
export {
  loadServiceConfig,
  loadNodeConfig,
  saveServiceConfig,
  saveNodeConfig,
  configExists,
  getNodeHierarchy,
  isConfigInheritanceEnabled,
  validateJSONLD,
  cloneConfig
} from './loaders/jsonld-loader.ts';

// Service Configuration Resolution (Cascading Pattern)
export {
  resolveServiceConfig,
  getConfigValue,
  mergeConfigContext,
  validateServiceConfig,
  ServiceConfigAccessor
} from './resolution/service-config-resolver.ts';

// Shared Utilities
export { mergeConfigs } from '../utils/merge-configs.ts';

// Import the implementations for the helper functions
import type { ServiceOptions, ServiceConfig } from './types.ts';
import { resolveServiceConfig, validateServiceConfig, mergeConfigContext, ServiceConfigAccessor } from './resolution/service-config-resolver.ts';
import { handleCaughtError } from '../utils/logger.ts';

/**
 * Resolves and validates the service configuration context, returning a `ServiceConfigAccessor` for side-by-side configuration access.
 *
 * @param cliOptions - Optional command-line options to influence configuration resolution
 * @returns An accessor for retrieving configuration values from the resolved context
 */
export async function createServiceConfig(cliOptions?: ServiceOptions): Promise<ServiceConfigAccessor> {
  try {
    const context = await resolveServiceConfig(cliOptions);
    validateServiceConfig(context);
    return new ServiceConfigAccessor(context);
  } catch (error) {
    await handleCaughtError(error, `Failed to create service configuration`);
    throw error;
  }
}

/**
 * Resolves, validates, and returns a fully merged service configuration object.
 *
 * @param cliOptions - Optional command-line options to influence configuration resolution
 * @returns The complete, validated service configuration object with all context layers merged
 */
export async function getCompleteServiceConfig(cliOptions?: ServiceOptions): Promise<ServiceConfig> {
  try {
    const context = await resolveServiceConfig(cliOptions);
    validateServiceConfig(context);
    return mergeConfigContext(context);
  } catch (error) {
    await handleCaughtError(error, `Failed to get complete service configuration`);
    throw error;
  }
}
