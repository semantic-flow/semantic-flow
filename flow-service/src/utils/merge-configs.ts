/**
 * Configuration Merge Utility
 *
 * Deep merge utility for configuration objects used throughout the config system
 */

/**
 * Recursively merges two configuration objects, with values from the override object taking precedence.
 *
 * Performs a deep merge: nested objects are merged recursively, while arrays and primitive values in the override replace those in the base. Null and undefined values in the override are ignored and do not overwrite base values.
 *
 * @param base - The base configuration object
 * @param override - An object containing override values to merge into the base
 * @returns A new configuration object resulting from merging override into base
 */
export function mergeConfigs<T extends object>(
  base: T,
  override: Partial<T>,
): T {
  const result = { ...base } as Record<string, unknown>;

  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined && value !== null) {
      if (
        typeof value === 'object' && !Array.isArray(value) &&
        typeof result[key] === 'object' && !Array.isArray(result[key]) &&
        result[key] !== null
      ) {
        // Deep merge objects
        result[key] = mergeConfigs(result[key] as object, value as object);
      } else {
        // Direct override for primitives, arrays, and null values
        result[key] = value;
      }
    }
  }

  return result as T;
}
