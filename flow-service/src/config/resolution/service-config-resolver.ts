import type {
  ServiceConfigContext,
  ServiceConfigInput,
  ServiceOptions,
} from '../config-types.ts';
import { getServiceConfigPath, loadEnvConfig } from '../loaders/env-loader.ts';
import { loadServiceConfig } from '../loaders/jsonld-loader.ts';
import {
  getEnvironmentDefaults,
} from '../defaults.ts';
import { ConfigError } from '../config-types.ts';
import { mergeConfigs } from '../../utils/merge-configs.ts';
import { handleCaughtError } from '../../utils/logger.ts';
import { validateLogLevel } from '../../../../flow-core/src/platform-constants.ts';
import { getConfigValue, mergeConfigContext } from './service-config-utils.ts';

/**
 * Asynchronously resolves the service configuration by merging CLI options, environment variables, configuration files, and environment-specific defaults in a defined precedence order.
 *
 * Returns a ServiceConfigContext object containing both the merged input options and the default options, allowing for side-by-side comparison without merging them.
 *
 * @param cliOptions - Optional CLI-provided service options to override other configuration sources
 * @returns A ServiceConfigContext object with both input and default configuration options
 * @throws ConfigError if configuration resolution fails or an unexpected error occurs
 */
export async function resolveServiceConfig(
  cliOptions?: ServiceOptions,
): Promise<ServiceConfigContext> {
  try {
    let inputOptions: ServiceConfigInput = {};

    const envConfig = loadEnvConfig();
    inputOptions = mergeConfigs(inputOptions, envConfig);

    const serviceConfigPath = getServiceConfigPath(cliOptions?.configPath);
    if (serviceConfigPath) {
      const fileConfig = await loadServiceConfig(serviceConfigPath);
      if (fileConfig) {
        inputOptions = mergeConfigs(inputOptions, fileConfig);
      }
    }

    if (cliOptions) {
      const cliConfig = convertCliOptionsToConfig(cliOptions);
      inputOptions = mergeConfigs(inputOptions, cliConfig);
    }

    const environment = Deno.env.get('FLOW_ENV') || 'development';
    const defaultOptions = getEnvironmentDefaults(environment);

    return {
      inputOptions,
      defaultOptions,
    };
  } catch (error) {
    if (error instanceof ConfigError) {
      await handleCaughtError(error, `Service configuration resolution failed`);
      throw error;
    }

    await handleCaughtError(error, `Failed to resolve service configuration`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error : undefined;
    throw new ConfigError(
      `Failed to resolve service configuration: ${errorMessage}`,
      cause,
    );
  }
}

/**
 * Converts CLI-provided service options into the internal ServiceConfigInput format.
 *
 * Maps CLI options such as port, host, mesh paths, log level, and Sentry enablement to their corresponding configuration keys, constructing nested logging configuration objects as needed.
 *
 * @param cliOptions - The service options provided via the command line interface
 * @returns A partial service configuration object representing the CLI options in config format
 */
function convertCliOptionsToConfig(
  cliOptions: ServiceOptions,
): ServiceConfigInput {
  const config: ServiceConfigInput = {};

  if (cliOptions.port !== undefined) {
    config['fsvc:port'] = cliOptions.port;
  }

  if (cliOptions.host !== undefined) {
    config['fsvc:host'] = cliOptions.host;
  }

  if (cliOptions.meshPaths !== undefined && cliOptions.meshPaths.length > 0) {
    config['fsvc:meshPaths'] = cliOptions.meshPaths;
  }

  if (cliOptions.logLevel !== undefined) {
    config['fsvc:hasLoggingConfig'] = {
      '@type': 'fsvc:LoggingConfig',
      'fsvc:hasConsoleChannel': {
        '@type': 'fsvc:LogChannelConfig',
        'fsvc:logChannelEnabled': true,
        'fsvc:logLevel': validateLogLevel(cliOptions.logLevel),
      },
    };
  }

  if (cliOptions.sentryEnabled !== undefined) {
    if (!config['fsvc:hasLoggingConfig']) {
      config['fsvc:hasLoggingConfig'] = {
        '@type': 'fsvc:LoggingConfig',
      };
    }
    const loggingConfig = config['fsvc:hasLoggingConfig'] as Record<
      string,
      unknown
    >;
    loggingConfig['fsvc:hasSentryChannel'] = {
      '@type': 'fsvc:LogChannelConfig',
      'fsvc:logChannelEnabled': cliOptions.sentryEnabled,
    };
  }

  return config;
}

export { getConfigValue, mergeConfigContext };
