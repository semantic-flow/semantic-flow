import type { ServiceConfigContext, ServiceConfigInput } from '../config-types.ts';
import { mergeConfigs } from '../../utils/merge-configs.ts';
import { PLATFORM_SERVICE_DEFAULTS } from '../defaults.ts';

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
  defaultKey: keyof typeof PLATFORM_SERVICE_DEFAULTS,
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
export function mergeConfigContext(
  context: ServiceConfigContext,
): typeof PLATFORM_SERVICE_DEFAULTS {
  return mergeConfigs(
    context.defaultOptions,
    context.inputOptions as Partial<typeof PLATFORM_SERVICE_DEFAULTS>,
  );
}
