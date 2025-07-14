/**
 * Environment Variable Loader
 *
 * Maps environment variables to configuration structure using the cascading configuration pattern.
 * Supports FLOW_* prefixed environment variables.
 */

import type { ServiceConfigInput, EnvironmentConfig, LogLevel } from '../types.ts';
import { ConfigError } from '../types.ts';

/**
 * Load environment variables and convert to ServiceConfigInput format
 */
export function loadEnvConfig(): ServiceConfigInput {
  const env = getEnvironmentVariables();

  const configInput: ServiceConfigInput = {};

  // Basic service settings
  if (env.FLOW_SERVICE_PORT) {
    const port = parseInt(env.FLOW_SERVICE_PORT, 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      configInput["fsvc:port"] = port;
    }
  }

  if (env.FLOW_SERVICE_HOST) {
    configInput["fsvc:host"] = env.FLOW_SERVICE_HOST;
  }

  // Mesh paths configuration
  if (env.FLOW_MESH_PATHS) {
    const meshPaths = env.FLOW_MESH_PATHS.split(',').map(p => p.trim()).filter(p => p);
    if (meshPaths.length > 0) {
      configInput["fsvc:meshPaths"] = meshPaths;
    }
  }

  // Logging configuration
  const loggingConfig: any = {};
  let hasLoggingConfig = false;

  // Console logging
  if (env.FLOW_LOG_LEVEL) {
    try {
      const logLevel = validateLogLevel(env.FLOW_LOG_LEVEL);
      loggingConfig["fsvc:hasConsoleChannel"] = {
        "@type": "fsvc:LogChannelConfig",
        "fsvc:logChannelEnabled": true,
        "fsvc:logLevel": logLevel
      };
      hasLoggingConfig = true;
    } catch (error) {
      // Re-throw ConfigError, but wrap other errors
      if (error instanceof ConfigError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ConfigError(`Invalid FLOW_LOG_LEVEL environment variable: ${errorMessage}`);
    }
  }

  // File logging
  if (env.FLOW_FILE_LOG_ENABLED) {
    const enabled = parseBoolean(env.FLOW_FILE_LOG_ENABLED);
    if (enabled !== undefined) {
      const fileChannel: any = {
        "@type": "fsvc:LogChannelConfig",
        "fsvc:logChannelEnabled": enabled
      };

      if (env.FLOW_FILE_LOG_LEVEL) {
        try {
          const logLevel = validateLogLevel(env.FLOW_FILE_LOG_LEVEL);
          fileChannel["fsvc:logLevel"] = logLevel;
        } catch (error) {
          // Re-throw ConfigError, but wrap other errors
          if (error instanceof ConfigError) {
            throw error;
          }
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new ConfigError(`Invalid FLOW_FILE_LOG_LEVEL environment variable: ${errorMessage}`);
        }
      }

      if (env.FLOW_FILE_LOG_PATH) {
        fileChannel["fsvc:logFilePath"] = env.FLOW_FILE_LOG_PATH;
      }

      loggingConfig["fsvc:hasFileChannel"] = fileChannel;
      hasLoggingConfig = true;
    }
  }

  // Sentry logging
  if (env.FLOW_SENTRY_ENABLED) {
    const enabled = parseBoolean(env.FLOW_SENTRY_ENABLED);
    if (enabled !== undefined) {
      const sentryChannel: any = {
        "@type": "fsvc:LogChannelConfig",
        "fsvc:logChannelEnabled": enabled
      };

      if (env.FLOW_SENTRY_DSN) {
        sentryChannel["fsvc:sentryDsn"] = env.FLOW_SENTRY_DSN;
      }

      loggingConfig["fsvc:hasSentryChannel"] = sentryChannel;
      hasLoggingConfig = true;
    }
  }

  if (hasLoggingConfig) {
    loggingConfig["@type"] = "fsvc:LoggingConfig";
    configInput["fsvc:hasLoggingConfig"] = loggingConfig;
  }

  // Contained services
  const containedServices: any = {};
  let hasContainedServices = false;

  if (env.FLOW_API_ENABLED) {
    const enabled = parseBoolean(env.FLOW_API_ENABLED);
    if (enabled !== undefined) {
      containedServices["fsvc:apiEnabled"] = enabled;
      hasContainedServices = true;
    }
  }

  if (env.FLOW_SPARQL_ENABLED) {
    const enabled = parseBoolean(env.FLOW_SPARQL_ENABLED);
    if (enabled !== undefined) {
      containedServices["fsvc:sparqlEnabled"] = enabled;
      hasContainedServices = true;
    }
  }

  if (hasContainedServices) {
    containedServices["@type"] = "fsvc:ContainedServicesConfig";
    configInput["fsvc:hasContainedServices"] = containedServices;
  }

  // Node defaults
  const nodeDefaults: any = {};
  let hasNodeDefaults = false;

  if (env.FLOW_DEFAULT_VERSIONING) {
    const enabled = parseBoolean(env.FLOW_DEFAULT_VERSIONING);
    if (enabled !== undefined) {
      nodeDefaults["node:versioningEnabled"] = enabled;
      hasNodeDefaults = true;
    }
  }

  if (env.FLOW_DEFAULT_FORMATS) {
    const formats = env.FLOW_DEFAULT_FORMATS.split(',').map(f => f.trim()).filter(f => f);
    if (formats.length > 0) {
      nodeDefaults["node:distributionFormats"] = formats;
      hasNodeDefaults = true;
    }
  }

  if (hasNodeDefaults) {
    nodeDefaults["@type"] = "node:NodeConfig";
    configInput["fsvc:nodeDefaults"] = nodeDefaults;
  }

  return configInput;
}

/**
 * Get environment variables with type safety
 */
function getEnvironmentVariables(): EnvironmentConfig {
  return {
    FLOW_CONFIG_PATH: Deno.env.get("FLOW_CONFIG_PATH"),
    FLOW_SERVICE_PORT: Deno.env.get("FLOW_SERVICE_PORT"),
    FLOW_SERVICE_HOST: Deno.env.get("FLOW_SERVICE_HOST"),
    FLOW_MESH_PATHS: Deno.env.get("FLOW_MESH_PATHS"),
    FLOW_LOG_LEVEL: Deno.env.get("FLOW_LOG_LEVEL"),
    FLOW_SENTRY_ENABLED: Deno.env.get("FLOW_SENTRY_ENABLED"),
    FLOW_SENTRY_DSN: Deno.env.get("FLOW_SENTRY_DSN"),
    FLOW_FILE_LOG_ENABLED: Deno.env.get("FLOW_FILE_LOG_ENABLED"),
    FLOW_FILE_LOG_LEVEL: Deno.env.get("FLOW_FILE_LOG_LEVEL"),
    FLOW_FILE_LOG_PATH: Deno.env.get("FLOW_FILE_LOG_PATH"),
    FLOW_DEFAULT_VERSIONING: Deno.env.get("FLOW_DEFAULT_VERSIONING"),
    FLOW_DEFAULT_FORMATS: Deno.env.get("FLOW_DEFAULT_FORMATS"),
    FLOW_API_ENABLED: Deno.env.get("FLOW_API_ENABLED"),
    FLOW_SPARQL_ENABLED: Deno.env.get("FLOW_SPARQL_ENABLED")
  };
}

/**
 * Validate log level from environment variable
 */
function validateLogLevel(level: string): LogLevel {
  const validLevels: LogLevel[] = ["debug", "info", "warn", "error"];
  const normalized = level.toLowerCase().trim() as LogLevel;

  if (!validLevels.includes(normalized)) {
    throw new ConfigError(`Invalid log level in environment variable: ${level}. Must be one of: ${validLevels.join(", ")}`);
  }
  return normalized;
}

/**
 * Parse boolean from string (supports common boolean representations)
 */
function parseBoolean(value: string): boolean | undefined {
  const normalized = value.toLowerCase().trim();

  switch (normalized) {
    case "true":
    case "1":
    case "yes":
    case "on":
      return true;
    case "false":
    case "0":
    case "no":
    case "off":
      return false;
    default:
      return undefined;
  }
}

/**
 * Get service config path from environment or CLI options
 */
export function getServiceConfigPath(cliConfigPath?: string): string | undefined {
  return cliConfigPath || Deno.env.get("FLOW_CONFIG_PATH");
}
