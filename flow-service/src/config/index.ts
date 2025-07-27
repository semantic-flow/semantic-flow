/**
 * Configuration System Entry Point
 *
 * Exports the complete service configuration system with cascading configuration resolution
 * and side-by-side configuration context.
 */

// Core Types
export type {
  ContainedServicesConfig,
  JSONLDContext,
  LogChannelConfig,
  LoggingConfig,
  LogLevel,
  NodeConfig,
  NodeConfigContext,
  NodeConfigInput,
  ServiceConfig,
  ServiceConfigContext,
  ServiceConfigInput,
  ServiceOptions,
  TemplateMapping,
} from "./types.ts";

// Error Types
export { ConfigError, ConfigValidationError } from "./types.ts";

// Helper Functions
export {
  getConsoleLogLevel,
  getFileLogEnabled,
  getSentryEnabled,
  getServiceHost,
  getServicePort,
  getVersioningEnabled,
} from "./types.ts";

// Default Configurations
export {
  DEFAULT_CONTEXT,
  DEVELOPMENT_SERVICE_OVERRIDES,
  getEnvironmentDefaults,
  PLATFORM_NODE_DEFAULTS,
  PLATFORM_SERVICE_DEFAULTS,
  PRODUCTION_SERVICE_OVERRIDES,
} from "./defaults.ts";

// Environment Variable Loading
export { getServiceConfigPath, loadEnvConfig } from "./loaders/env-loader.ts";

// JSON-LD File Loading
export {
  cloneConfig,
  configExists,
  getNodeHierarchy,
  isConfigInheritanceEnabled,
  loadNodeConfig,
  loadServiceConfig,
  saveNodeConfig,
  saveServiceConfig,
  validateJSONLD,
} from "./loaders/jsonld-loader.ts";

// Service Configuration Resolution (Cascading Pattern)
export {
  getConfigValue,
  mergeConfigContext,
  resolveServiceConfig,
  ServiceConfigAccessor,
  validateServiceConfig,
} from "./resolution/service-config-resolver.ts";

// Shared Utilities
export { mergeConfigs } from "../utils/merge-configs.ts";

// Import the implementations for the helper functions
import type { ServiceConfig, ServiceOptions } from "./types.ts";
import {
  mergeConfigContext,
  resolveServiceConfig,
  ServiceConfigAccessor,
  validateServiceConfig,
} from "./resolution/service-config-resolver.ts";
import { handleCaughtError } from "../utils/logger.ts";

/**
 * Resolves and validates the service configuration context, returning a `ServiceConfigAccessor` for side-by-side configuration access.
 *
 * @param cliOptions - Optional command-line options to influence configuration resolution
 * @returns An accessor for retrieving configuration values from the resolved context
 */
export async function createServiceConfig(
  cliOptions?: ServiceOptions,
): Promise<ServiceConfigAccessor> {
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
export async function getCompleteServiceConfig(
  cliOptions?: ServiceOptions,
): Promise<ServiceConfig> {
  try {
    const context = await resolveServiceConfig(cliOptions);
    validateServiceConfig(context);
    return mergeConfigContext(context);
  } catch (error) {
    await handleCaughtError(
      error,
      `Failed to get complete service configuration`,
    );
    throw error;
  }
}
