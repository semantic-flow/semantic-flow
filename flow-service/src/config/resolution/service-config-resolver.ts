import type {
  ServiceConfigInput,
  ServiceOptions,
} from '../config-types.ts';
import { getServiceConfigPath, loadEnvConfig } from '../loaders/env-loader.ts';
import { loadServiceConfig } from '../loaders/jsonld-loader.ts';
import { PLATFORM_SERVICE_DEFAULTS } from '../defaults.ts';
import { ConfigError } from '../config-types.ts';
import { mergeConfigs } from '../../utils/merge-configs.ts';
import { handleCaughtError } from '../../../../flow-core/src/utils/logger/error-handlers.ts';
import { LogContext } from '../../../../flow-core/src/utils/logger/types.ts';
import { validateLogLevel } from '../../../../flow-core/src/platform-constants.ts';
import { createServiceLogContext } from '../../utils/service-log-context.ts';
import { serviceUriConfigManager, type ServiceUriConfig } from '../../utils/service-uri-builder.ts';

/**
 * Asynchronously resolves the service configuration by merging CLI options, environment variables, configuration files, and environment-specific defaults in a defined precedence order.
 *
 * @param cliOptions - Optional CLI-provided service options to override other configuration sources
 * @throws ConfigError if configuration resolution fails or an unexpected error occurs
 */

import { loadPlatformServiceDefaults, loadInputServiceConfig, loadInputMeshRootNodeConfig, mergeServiceConfigGraphs } from '../loaders/quadstore-loader.ts';
import { singletonServiceConfigAccessor } from "./service-config-accessor.ts";

export async function resolveServiceConfig(
  cliOptions?: ServiceOptions,
): Promise<void> {
  // Define serviceConfigPath outside try block for error handling access
  const serviceConfigPath = getServiceConfigPath(cliOptions?.configPath);

  try {
    // Load environment config
    const envConfig = loadEnvConfig();
    //console.log(envConfig)
    // Load file config if specified
    let fileConfig: ServiceConfigInput | undefined;
    if (serviceConfigPath) {
      const loadedConfig = await loadServiceConfig(serviceConfigPath);
      fileConfig = loadedConfig === null ? undefined : loadedConfig;
    }

    // Convert CLI options to config
    const cliConfig = cliOptions ? convertCliOptionsToConfig(cliOptions) : {};

    // Merge input configs: env, file, CLI
    const mergedInputConfig = mergeConfigs(mergeConfigs(envConfig, fileConfig ?? {}), cliConfig);

    // Extract service URI configuration from merged config, using platform defaults as fallback
    // TODO: 
    const serviceUriConfig: ServiceUriConfig = {
      scheme: mergedInputConfig['fsvc:scheme'] ?? PLATFORM_SERVICE_DEFAULTS['fsvc:scheme'],
      host: mergedInputConfig['fsvc:host'] ?? PLATFORM_SERVICE_DEFAULTS['fsvc:host'],
      port: mergedInputConfig['fsvc:port'] ?? PLATFORM_SERVICE_DEFAULTS['fsvc:port'],
    };

    // Initialize the service URI configuration manager early, before any quadstore operations
    serviceUriConfigManager.setConfig(serviceUriConfig);

    // Load platform defaults into Quadstore graphs
    await loadPlatformServiceDefaults();

    // Load merged input config into Quadstore graph
    await loadInputServiceConfig(mergedInputConfig);

    // TODO: Load input mesh node config if applicable
    // await loadInputMeshRootNodeConfig(...);

    // Merge all graphs into mergedServiceConfig graph
    await mergeServiceConfigGraphs();

  } catch (error) {
    const context: LogContext = createServiceLogContext({
      operation: 'config-resolve',
      component: 'service-config-resolution',
      configContext: {
        configPath: serviceConfigPath || 'none',
        configType: 'service-config'
      }
    });

    if (error instanceof ConfigError) {
      await handleCaughtError(error, `Service configuration resolution failed`, context);
      throw error;
    } else {
      await handleCaughtError(error, `Failed to resolve service configuration`, context);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const cause = error instanceof Error ? error : undefined;
      throw new ConfigError(
        `Failed to resolve service configuration: ${errorMessage}`,
        cause,
      );
    }
  }
  // mark the singletonServiceConfigAccessor as initialized
  singletonServiceConfigAccessor.setInitialized(true);
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

  if (cliOptions.scheme !== undefined) {
    config['fsvc:scheme'] = cliOptions.scheme;
  }

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
