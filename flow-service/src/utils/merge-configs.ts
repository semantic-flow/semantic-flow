/**
 * Configuration Merge Utility
 *
 * Deep merge utility for configuration objects used throughout the config system
 */

/**
 * Deep merge utility for configuration objects
 * Later values override earlier values in the cascading pattern
 *
 * @param base - Base configuration object
 * @param override - Override configuration to merge in
 * @returns Merged configuration with overrides applied
 */
export function mergeConfigs<T extends object>(base: T, override: Partial<T>): T {
  const result = { ...base } as Record<string, unknown>;

  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value) &&
        typeof result[key] === 'object' && !Array.isArray(result[key]) &&
        result[key] !== null) {
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
