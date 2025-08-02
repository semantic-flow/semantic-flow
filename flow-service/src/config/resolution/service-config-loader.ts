import type { ServiceConfigInput, ServiceOptions } from '../config-types.ts';
import { getServiceConfigPath, loadEnvConfig } from '../loaders/env-loader.ts';
import { loadServiceConfig } from '../loaders/jsonld-loader.ts';
import { mergeConfigs } from '../../utils/merge-configs.ts';
import { validateLogLevel } from '../../../../flow-core/src/platform-constants.ts';

/**
 * Loads and merges service configuration input options from CLI, environment variables, and config file.
 *
 * @param cliOptions - Optional CLI-provided service options
 * @returns Merged service configuration input options
 */

//TODO: dct:conformsTo

export async function loadServiceConfigInput(
  cliOptions?: ServiceOptions,
): Promise<ServiceConfigInput> {
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

  return inputOptions;
}

/**
 * Converts CLI-provided service options into the internal ServiceConfigInput format.
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
