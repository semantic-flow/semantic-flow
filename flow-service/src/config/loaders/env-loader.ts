/**
 * Environment Variable Loader
 *
 * Maps environment variables to configuration structure using the cascading configuration pattern.
 * Supports FLOW_* prefixed environment variables.
 */

import type {
  EnvironmentConfig,
  LogLevel,
  ServiceConfigInput,
} from '../types.ts';
import { ConfigError } from '../types.ts';

/**
 * Loads environment variables prefixed with `FLOW_` and assembles them into a structured `ServiceConfigInput` object.
 *
 * Parses and validates environment variables for service settings, mesh paths, logging channels (console, file, Sentry), contained services, and node defaults. Only includes configuration sections for which relevant environment variables are set and valid. Throws a `ConfigError` if an invalid log level is provided.
 *
 * @returns A `ServiceConfigInput` object representing the configuration derived from environment variables.
 */
export function loadEnvConfig(): ServiceConfigInput {
  const env = getEnvironmentVariables();

  const configInput: ServiceConfigInput = {};

  // Basic service settings
  if (env.FLOW_SERVICE_PORT) {
    const port = parseInt(env.FLOW_SERVICE_PORT, 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      configInput['fsvc:port'] = port;
    }
  }

  if (env.FLOW_SERVICE_HOST) {
    configInput['fsvc:host'] = env.FLOW_SERVICE_HOST;
  }

  // Mesh paths configuration
  if (env.FLOW_MESH_PATHS) {
    const meshPaths = env.FLOW_MESH_PATHS.split(',').map((p) => p.trim())
      .filter((p) => p);
    if (meshPaths.length > 0) {
      configInput['fsvc:meshPaths'] = meshPaths;
    }
  }

  // Logging configuration (mutable for construction)
  const loggingConfig: Record<
    string,
    Record<string, string | boolean | number> | string
  > = {};
  let hasLoggingConfig = false;

  // Console logging
  if (env.FLOW_LOG_LEVEL) {
    try {
      const logLevel = validateLogLevel(env.FLOW_LOG_LEVEL);
      loggingConfig['fsvc:hasConsoleChannel'] = {
        '@type': 'fsvc:LogChannelConfig',
        'fsvc:logChannelEnabled': true,
        'fsvc:logLevel': logLevel,
      };
      hasLoggingConfig = true;
    } catch (error) {
      // Re-throw ConfigError, but wrap other errors
      if (error instanceof ConfigError) {
        throw error;
      }
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      throw new ConfigError(
        `Invalid FLOW_LOG_LEVEL environment variable: ${errorMessage}`,
      );
    }
  }

  // File logging
  if (env.FLOW_FILE_LOG_ENABLED) {
    const enabled = parseBoolean(env.FLOW_FILE_LOG_ENABLED);
    if (enabled !== undefined) {
      const fileChannel: Record<string, string | boolean | number> = {
        '@type': 'fsvc:LogChannelConfig',
        'fsvc:logChannelEnabled': enabled,
      };

      if (env.FLOW_FILE_LOG_LEVEL) {
        try {
          const logLevel = validateLogLevel(env.FLOW_FILE_LOG_LEVEL);
          fileChannel['fsvc:logLevel'] = logLevel;
        } catch (error) {
          // Re-throw ConfigError, but wrap other errors
          if (error instanceof ConfigError) {
            throw error;
          }
          const errorMessage = error instanceof Error
            ? error.message
            : String(error);
          throw new ConfigError(
            `Invalid FLOW_FILE_LOG_LEVEL environment variable: ${errorMessage}`,
          );
        }
      }

      if (env.FLOW_FILE_LOG_PATH) {
        fileChannel['fsvc:logFilePath'] = env.FLOW_FILE_LOG_PATH;
      }

      // Parse log retention settings
      if (env.FLOW_LOG_RETENTION_DAYS) {
        const retentionDays = parseInt(env.FLOW_LOG_RETENTION_DAYS, 10);
        if (
          !isNaN(retentionDays) && retentionDays > 0 && retentionDays <= 365
        ) {
          fileChannel['fsvc:logRetentionDays'] = retentionDays;
        }
      }

      if (env.FLOW_LOG_MAX_FILES) {
        const maxFiles = parseInt(env.FLOW_LOG_MAX_FILES, 10);
        if (!isNaN(maxFiles) && maxFiles > 0 && maxFiles <= 100) {
          fileChannel['fsvc:logMaxFiles'] = maxFiles;
        }
      }

      if (env.FLOW_LOG_MAX_FILE_SIZE) {
        const maxFileSize = parseInt(env.FLOW_LOG_MAX_FILE_SIZE, 10);
        if (!isNaN(maxFileSize) && maxFileSize >= 1048576) { // At least 1MB
          fileChannel['fsvc:logMaxFileSize'] = maxFileSize;
        }
      }

      if (env.FLOW_LOG_ROTATION_INTERVAL) {
        const interval = env.FLOW_LOG_ROTATION_INTERVAL.toLowerCase().trim();
        if (['daily', 'weekly', 'monthly', 'size-based'].includes(interval)) {
          fileChannel['fsvc:logRotationInterval'] = interval as
            | 'daily'
            | 'weekly'
            | 'monthly'
            | 'size-based';
        }
      }

      loggingConfig['fsvc:hasFileChannel'] = fileChannel;
      hasLoggingConfig = true;
    }
  }

  // Sentry logging
  if (env.FLOW_SENTRY_ENABLED) {
    const enabled = parseBoolean(env.FLOW_SENTRY_ENABLED);
    if (enabled !== undefined) {
      const sentryChannel: Record<string, string | boolean> = {
        '@type': 'fsvc:LogChannelConfig',
        'fsvc:logChannelEnabled': enabled,
      };

      if (env.FLOW_SENTRY_DSN) {
        sentryChannel['fsvc:sentryDsn'] = env.FLOW_SENTRY_DSN;
      }

      if (env.FLOW_SENTRY_LOGGING_ENABLED) {
        const loggingEnabled = parseBoolean(env.FLOW_SENTRY_LOGGING_ENABLED);
        if (loggingEnabled !== undefined) {
          sentryChannel['fsvc:sentryLoggingEnabled'] = loggingEnabled;
        }
      }

      loggingConfig['fsvc:hasSentryChannel'] = sentryChannel;
      hasLoggingConfig = true;
    }
  }

  if (hasLoggingConfig) {
    loggingConfig['@type'] = 'fsvc:LoggingConfig';
    configInput['fsvc:hasLoggingConfig'] = loggingConfig;
  }

  // Contained services
  const containedServices: Record<string, boolean | string> = {};
  let hasContainedServices = false;

  if (env.FLOW_API_ENABLED) {
    const enabled = parseBoolean(env.FLOW_API_ENABLED);
    if (enabled !== undefined) {
      containedServices['fsvc:apiEnabled'] = enabled;
      hasContainedServices = true;
    }
  }

  if (env.FLOW_SPARQL_ENABLED) {
    const enabled = parseBoolean(env.FLOW_SPARQL_ENABLED);
    if (enabled !== undefined) {
      containedServices['fsvc:sparqlEnabled'] = enabled;
      hasContainedServices = true;
    }
  }

  if (hasContainedServices) {
    containedServices['@type'] = 'fsvc:ContainedServicesConfig';
    configInput['fsvc:hasContainedServices'] = containedServices;
  }

  // Node defaults
  const nodeDefaults: Record<string, boolean | string | string[]> = {};
  let hasNodeDefaults = false;

  if (env.FLOW_DEFAULT_VERSIONING) {
    const enabled = parseBoolean(env.FLOW_DEFAULT_VERSIONING);
    if (enabled !== undefined) {
      nodeDefaults['conf:versioningEnabled'] = enabled;
      hasNodeDefaults = true;
    }
  }

  if (env.FLOW_DEFAULT_FORMATS) {
    const formats = env.FLOW_DEFAULT_FORMATS.split(',').map((f) => f.trim())
      .filter((f) => f);
    if (formats.length > 0) {
      nodeDefaults['conf:distributionFormats'] = formats;
      hasNodeDefaults = true;
    }
  }

  if (hasNodeDefaults) {
    nodeDefaults['@type'] = 'conf:NodeConfig';
    configInput['fsvc:nodeDefaults'] = nodeDefaults;
  }

  return configInput;
}

/**
 * Retrieves all relevant `FLOW_` environment variables and returns them as a typed configuration object.
 *
 * @returns An object containing the values of expected `FLOW_` environment variables, or `undefined` if not set.
 */
function getEnvironmentVariables(): EnvironmentConfig {
  return {
    FLOW_CONFIG_PATH: Deno.env.get('FLOW_CONFIG_PATH'),
    FLOW_SERVICE_PORT: Deno.env.get('FLOW_SERVICE_PORT'),
    FLOW_SERVICE_HOST: Deno.env.get('FLOW_SERVICE_HOST'),
    FLOW_MESH_PATHS: Deno.env.get('FLOW_MESH_PATHS'),
    FLOW_LOG_LEVEL: Deno.env.get('FLOW_LOG_LEVEL'),
    FLOW_SENTRY_ENABLED: Deno.env.get('FLOW_SENTRY_ENABLED'),
    FLOW_SENTRY_DSN: Deno.env.get('FLOW_SENTRY_DSN'),
    FLOW_SENTRY_LOGGING_ENABLED: Deno.env.get('FLOW_SENTRY_LOGGING_ENABLED'),
    FLOW_FILE_LOG_ENABLED: Deno.env.get('FLOW_FILE_LOG_ENABLED'),
    FLOW_FILE_LOG_LEVEL: Deno.env.get('FLOW_FILE_LOG_LEVEL'),
    FLOW_FILE_LOG_PATH: Deno.env.get('FLOW_FILE_LOG_PATH'),
    FLOW_LOG_RETENTION_DAYS: Deno.env.get('FLOW_LOG_RETENTION_DAYS'),
    FLOW_LOG_MAX_FILES: Deno.env.get('FLOW_LOG_MAX_FILES'),
    FLOW_LOG_MAX_FILE_SIZE: Deno.env.get('FLOW_LOG_MAX_FILE_SIZE'),
    FLOW_LOG_ROTATION_INTERVAL: Deno.env.get('FLOW_LOG_ROTATION_INTERVAL'),
    FLOW_DEFAULT_VERSIONING: Deno.env.get('FLOW_DEFAULT_VERSIONING'),
    FLOW_DEFAULT_FORMATS: Deno.env.get('FLOW_DEFAULT_FORMATS'),
    FLOW_API_ENABLED: Deno.env.get('FLOW_API_ENABLED'),
    FLOW_SPARQL_ENABLED: Deno.env.get('FLOW_SPARQL_ENABLED'),
  };
}

/**
 * Validates and normalizes a log level string from an environment variable.
 *
 * @param level - The log level string to validate
 * @returns The normalized log level if valid
 * @throws ConfigError if the log level is not one of "debug", "info", "warn", or "error"
 */
function validateLogLevel(level: string): LogLevel {
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  const normalized = level.toLowerCase().trim() as LogLevel;

  if (!validLevels.includes(normalized)) {
    throw new ConfigError(
      `Invalid log level in environment variable: ${level}. Must be one of: ${
        validLevels.join(', ')
      }`,
    );
  }
  return normalized;
}

/**
 * Parses a string into a boolean value, supporting common true/false representations.
 *
 * Recognizes "true", "1", "yes", "on" as `true`, and "false", "0", "no", "off" as `false`.
 *
 * @param value - The string to parse as a boolean
 * @returns The parsed boolean value, or `undefined` if the input is unrecognized
 */
function parseBoolean(value: string): boolean | undefined {
  const normalized = value.toLowerCase().trim();

  switch (normalized) {
    case 'true':
    case '1':
    case 'yes':
    case 'on':
      return true;
    case 'false':
    case '0':
    case 'no':
    case 'off':
      return false;
    default:
      return undefined;
  }
}

/**
 * Returns the service configuration file path from the CLI argument if provided, or from the `FLOW_CONFIG_PATH` environment variable.
 *
 * @param cliConfigPath - Optional path to the configuration file specified via CLI
 * @returns The resolved configuration file path, or `undefined` if neither is set
 */
export function getServiceConfigPath(
  cliConfigPath?: string,
): string | undefined {
  return cliConfigPath || Deno.env.get('FLOW_CONFIG_PATH');
}
