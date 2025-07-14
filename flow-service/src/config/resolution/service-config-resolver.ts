/**
 * Service Configuration Resolver
 *
 * Implements cascading configuration resolution for service configs.
 * Merges CLI options → Environment variables → Config file → Platform defaults
 */

import type { ServiceConfigContext, ServiceConfigInput, ServiceOptions, LogLevel } from '../types.ts';
import { loadEnvConfig, getServiceConfigPath } from '../loaders/env-loader.ts';
import { loadServiceConfig } from '../loaders/jsonld-loader.ts';
import { PLATFORM_SERVICE_DEFAULTS, getEnvironmentDefaults } from '../defaults.ts';
import { ConfigError } from '../types.ts';

/**
 * Resolve service configuration using cascading configuration pattern
 * Returns side-by-side configuration context (not merged)
 */
export async function resolveServiceConfig(cliOptions?: ServiceOptions): Promise<ServiceConfigContext> {
  try {
    // 1. Start with empty input options
    let inputOptions: ServiceConfigInput = {};

    // 2. Merge environment variables (cascading pattern)
    const envConfig = loadEnvConfig();
    inputOptions = mergeConfigs(inputOptions, envConfig);

    // 3. Load and merge service config file (cascading pattern)
    const serviceConfigPath = getServiceConfigPath(cliOptions?.configPath);
    if (serviceConfigPath) {
      const fileConfig = await loadServiceConfig(serviceConfigPath);
      if (fileConfig) {
        inputOptions = mergeConfigs(inputOptions, fileConfig);
      }
    }

    // 4. Apply CLI overrides (cascading pattern)
    if (cliOptions) {
      const cliConfig = convertCliOptionsToConfig(cliOptions);
      inputOptions = mergeConfigs(inputOptions, cliConfig);
    }

    // 5. Get environment-specific defaults
    const environment = Deno.env.get("DENO_ENV") || "development";
    const defaultOptions = getEnvironmentDefaults(environment);

    // 6. Return side-by-side context (no merge)
    return {
      inputOptions,
      defaultOptions
    };
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error : undefined;
    throw new ConfigError(`Failed to resolve service configuration: ${errorMessage}`, cause);
  }
}

/**
 * Validate log level input and return typed result
 */
function validateLogLevel(level: string | LogLevel): LogLevel {
  const validLevels: LogLevel[] = ["debug", "info", "warn", "error"];
  if (!validLevels.includes(level as LogLevel)) {
    throw new ConfigError(`Invalid log level: ${level}. Must be one of: ${validLevels.join(", ")}`);
  }
  return level as LogLevel;
}

/**
 * Convert CLI options to ServiceConfigInput format
 */
function convertCliOptionsToConfig(cliOptions: ServiceOptions): ServiceConfigInput {
  const config: ServiceConfigInput = {};

  if (cliOptions.port !== undefined) {
    config["fsvc:port"] = cliOptions.port;
  }

  if (cliOptions.host !== undefined) {
    config["fsvc:host"] = cliOptions.host;
  }

  if (cliOptions.meshPaths !== undefined && cliOptions.meshPaths.length > 0) {
    config["fsvc:meshPaths"] = cliOptions.meshPaths;
  }

  if (cliOptions.logLevel !== undefined) {
    config["fsvc:hasLoggingConfig"] = {
      "@type": "fsvc:LoggingConfig",
      "fsvc:hasConsoleChannel": {
        "@type": "fsvc:LogChannelConfig",
        "fsvc:logChannelEnabled": true,
        "fsvc:logLevel": validateLogLevel(cliOptions.logLevel)
      }
    };
  }

  if (cliOptions.sentryEnabled !== undefined) {
    if (!config["fsvc:hasLoggingConfig"]) {
      config["fsvc:hasLoggingConfig"] = {
        "@type": "fsvc:LoggingConfig"
      };
    }
    const loggingConfig = config["fsvc:hasLoggingConfig"] as any;
    loggingConfig["fsvc:hasSentryChannel"] = {
      "@type": "fsvc:LogChannelConfig",
      "fsvc:logChannelEnabled": cliOptions.sentryEnabled
    };
  }

  return config;
}

/**
 * Deep merge utility for configuration objects (cascading pattern)
 * Later values override earlier values
 */
export function mergeConfigs<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const result = { ...base } as Record<string, any>;

  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value) &&
        typeof result[key] === 'object' && !Array.isArray(result[key]) &&
        result[key] !== null) {
        // Deep merge objects
        result[key] = mergeConfigs(result[key], value);
      } else {
        // Direct override for primitives, arrays, and null values
        result[key] = value;
      }
    }
  }

  return result as T;
}

/**
 * Get resolved configuration value with fallback
 * Implements the side-by-side pattern decision logic
 */
export function getConfigValue<T>(
  context: ServiceConfigContext,
  inputKey: keyof ServiceConfigInput,
  defaultKey: keyof typeof PLATFORM_SERVICE_DEFAULTS
): T {
  const inputValue = context.inputOptions[inputKey];
  const defaultValue = context.defaultOptions[defaultKey];

  return (inputValue !== undefined ? inputValue : defaultValue) as T;
}

/**
 * Merge configuration context into a complete resolved configuration
 * Use this when you need a complete config object instead of the side-by-side pattern
 */
export function mergeConfigContext(context: ServiceConfigContext): typeof PLATFORM_SERVICE_DEFAULTS {
  return mergeConfigs(context.defaultOptions, context.inputOptions as any);
}

/**
 * Validate that required configuration values are present
 */
export function validateServiceConfig(context: ServiceConfigContext): void {
  const port = getConfigValue<number>(context, "fsvc:port", "fsvc:port");
  const host = getConfigValue<string>(context, "fsvc:host", "fsvc:host");

  if (!port || port <= 0 || port > 65535) {
    throw new ConfigError(`Invalid port number: ${port}. Must be between 1 and 65535.`);
  }

  if (!host || host.trim().length === 0) {
    throw new ConfigError(`Invalid host: ${host}. Host cannot be empty.`);
  }

  // Validate Sentry configuration if enabled
  const loggingConfig = context.inputOptions["fsvc:hasLoggingConfig"] || context.defaultOptions["fsvc:hasLoggingConfig"];
  const sentryChannel = loggingConfig["fsvc:hasSentryChannel"];

  if (sentryChannel && sentryChannel["fsvc:logChannelEnabled"]) {
    const sentryDsn = sentryChannel["fsvc:sentryDsn"];
    if (!sentryDsn || !sentryDsn.startsWith("https://")) {
      throw new ConfigError("Sentry is enabled but no valid DSN is configured. Please set FLOW_SENTRY_DSN environment variable or configure it in the service config file.");
    }
  }
}

/**
 * Get a typed configuration accessor for common service config values
 */
export class ServiceConfigAccessor {
  constructor(private context: ServiceConfigContext) { }

  get port(): number {
    return getConfigValue<number>(this.context, "fsvc:port", "fsvc:port");
  }

  get host(): string {
    return getConfigValue<string>(this.context, "fsvc:host", "fsvc:host");
  }

  get meshPaths(): string[] {
    return this.context.inputOptions["fsvc:meshPaths"] || [];
  }

  get consoleLogLevel(): string {
    const loggingConfig = this.context.inputOptions["fsvc:hasLoggingConfig"] || this.context.defaultOptions["fsvc:hasLoggingConfig"];
    return loggingConfig["fsvc:hasConsoleChannel"]?.["fsvc:logLevel"] || "info";
  }

  get fileLogEnabled(): boolean {
    const loggingConfig = this.context.inputOptions["fsvc:hasLoggingConfig"] || this.context.defaultOptions["fsvc:hasLoggingConfig"];
    return loggingConfig["fsvc:hasFileChannel"]?.["fsvc:logChannelEnabled"] || false;
  }

  get fileLogLevel(): string {
    const loggingConfig = this.context.inputOptions["fsvc:hasLoggingConfig"] || this.context.defaultOptions["fsvc:hasLoggingConfig"];
    return loggingConfig["fsvc:hasFileChannel"]?.["fsvc:logLevel"] || "warn";
  }

  get sentryEnabled(): boolean {
    const loggingConfig = this.context.inputOptions["fsvc:hasLoggingConfig"] || this.context.defaultOptions["fsvc:hasLoggingConfig"];
    return loggingConfig["fsvc:hasSentryChannel"]?.["fsvc:logChannelEnabled"] || false;
  }

  get sentryLogLevel(): string {
    const loggingConfig = this.context.inputOptions["fsvc:hasLoggingConfig"] || this.context.defaultOptions["fsvc:hasLoggingConfig"];
    return loggingConfig["fsvc:hasSentryChannel"]?.["fsvc:logLevel"] || "error";
  }

  get sentryDsn(): string | undefined {
    const loggingConfig = this.context.inputOptions["fsvc:hasLoggingConfig"] || this.context.defaultOptions["fsvc:hasLoggingConfig"];
    return loggingConfig["fsvc:hasSentryChannel"]?.["fsvc:sentryDsn"];
  }

  get apiEnabled(): boolean {
    const containedServices = this.context.inputOptions["fsvc:hasContainedServices"] || this.context.defaultOptions["fsvc:hasContainedServices"];
    return containedServices["fsvc:apiEnabled"] ?? true;
  }

  get sparqlEnabled(): boolean {
    const containedServices = this.context.inputOptions["fsvc:hasContainedServices"] || this.context.defaultOptions["fsvc:hasContainedServices"];
    return containedServices["fsvc:sparqlEnabled"] ?? true;
  }

  get queryWidgetEnabled(): boolean {
    const containedServices = this.context.inputOptions["fsvc:hasContainedServices"] || this.context.defaultOptions["fsvc:hasContainedServices"];
    return containedServices["fsvc:queryWidgetEnabled"] ?? true;
  }
}
