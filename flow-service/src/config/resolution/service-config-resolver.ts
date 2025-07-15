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
import { mergeConfigs } from '../../utils/merge-configs.ts';
import { handleCaughtError } from '../../utils/logger.ts';

/**
 * Asynchronously resolves the service configuration by merging CLI options, environment variables, configuration files, and environment-specific defaults in a defined precedence order.
 *
 * Returns a context object containing both the merged input options and the default options, allowing for side-by-side comparison without merging them.
 *
 * @param cliOptions - Optional CLI-provided service options to override other configuration sources
 * @returns A context object with both input and default configuration options
 * @throws ConfigError if configuration resolution fails or an unexpected error occurs
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
      await handleCaughtError(error, `Service configuration resolution failed`);
      throw error;
    }

    await handleCaughtError(error, `Failed to resolve service configuration`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error : undefined;
    throw new ConfigError(`Failed to resolve service configuration: ${errorMessage}`, cause);
  }
}

/**
 * Validates that the provided log level is one of the allowed values.
 *
 * @param level - The log level to validate, as a string or LogLevel
 * @returns The validated log level as a LogLevel type
 * @throws ConfigError if the log level is not valid
 */
function validateLogLevel(level: string | LogLevel): LogLevel {
  const validLevels: LogLevel[] = ["debug", "info", "warn", "error"];
  if (!validLevels.includes(level as LogLevel)) {
    throw new ConfigError(`Invalid log level: ${level}. Must be one of: ${validLevels.join(", ")}`);
  }
  return level as LogLevel;
}

/**
 * Converts CLI-provided service options into the internal ServiceConfigInput format.
 *
 * Maps CLI options such as port, host, mesh paths, log level, and Sentry enablement to their corresponding configuration keys, constructing nested logging configuration objects as needed.
 *
 * @param cliOptions - The service options provided via the command line interface
 * @returns A partial service configuration object representing the CLI options in config format
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
    const loggingConfig = config["fsvc:hasLoggingConfig"] as Record<string, unknown>;
    loggingConfig["fsvc:hasSentryChannel"] = {
      "@type": "fsvc:LogChannelConfig",
      "fsvc:logChannelEnabled": cliOptions.sentryEnabled
    };
  }

  return config;
}

/**
 * Retrieves a configuration value from the context, returning the value from input options if defined, or falling back to the default options.
 *
 * @param context - The service configuration context containing both input and default options
 * @param inputKey - The key to look up in the input options
 * @param defaultKey - The key to look up in the default options if the input value is undefined
 * @returns The resolved configuration value
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
 * Merges the default and input options from the configuration context into a single resolved configuration object.
 *
 * Use this function when a fully merged configuration is required, rather than separate input and default options.
 *
 * @returns The complete configuration object with input options overriding defaults.
 */
export function mergeConfigContext(context: ServiceConfigContext): typeof PLATFORM_SERVICE_DEFAULTS {
  return mergeConfigs(context.defaultOptions, context.inputOptions as Partial<typeof PLATFORM_SERVICE_DEFAULTS>);
}

/**
 * Validates that required service configuration values are present and correctly formatted.
 *
 * Checks that the port is within the valid range, the host is a non-empty string, and if Sentry logging is enabled, ensures a valid Sentry DSN is configured.
 *
 * @throws ConfigError if any required configuration is missing or invalid.
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
    const consoleChannel = loggingConfig?.["fsvc:hasConsoleChannel"];
    return consoleChannel?.["fsvc:logLevel"] || "info";
  }

  get fileLogEnabled(): boolean {
    const loggingConfig = this.context.inputOptions["fsvc:hasLoggingConfig"] || this.context.defaultOptions["fsvc:hasLoggingConfig"];
    const fileChannel = loggingConfig?.["fsvc:hasFileChannel"];
    return fileChannel?.["fsvc:logChannelEnabled"] || false;
  }

  get fileLogLevel(): string {
    const loggingConfig = this.context.inputOptions["fsvc:hasLoggingConfig"] || this.context.defaultOptions["fsvc:hasLoggingConfig"];
    const fileChannel = loggingConfig?.["fsvc:hasFileChannel"];
    return fileChannel?.["fsvc:logLevel"] || "warn";
  }

  get sentryEnabled(): boolean {
    const loggingConfig = this.context.inputOptions["fsvc:hasLoggingConfig"] || this.context.defaultOptions["fsvc:hasLoggingConfig"];
    const sentryChannel = loggingConfig?.["fsvc:hasSentryChannel"];
    return sentryChannel?.["fsvc:logChannelEnabled"] || false;
  }

  get sentryLogLevel(): string {
    const loggingConfig = this.context.inputOptions["fsvc:hasLoggingConfig"] || this.context.defaultOptions["fsvc:hasLoggingConfig"];
    const sentryChannel = loggingConfig?.["fsvc:hasSentryChannel"];
    return sentryChannel?.["fsvc:logLevel"] || "error";
  }

  get sentryDsn(): string | undefined {
    const loggingConfig = this.context.inputOptions["fsvc:hasLoggingConfig"] || this.context.defaultOptions["fsvc:hasLoggingConfig"];
    const sentryChannel = loggingConfig?.["fsvc:hasSentryChannel"];
    return sentryChannel?.["fsvc:sentryDsn"];
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
