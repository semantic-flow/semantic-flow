/**
 * JSON-LD Configuration File Loader
 *
 * Loads and validates JSON-LD configuration files from the filesystem.
 * Supports both service and node configuration formats.
 */

import type { ServiceConfigInput, NodeConfigInput } from '../types.ts';
import { ConfigError } from '../types.ts';

/**
 * Loads a service configuration from a JSON-LD file at the specified path.
 *
 * Reads and parses the file, validating that the `@type` property is `"fsvc:ServiceConfig"`. Returns the parsed configuration object, or `null` if the file does not exist. Throws `ConfigError` for invalid JSON, incorrect type, or other failures.
 *
 * @param configPath - Path to the service configuration JSON-LD file
 * @returns The parsed service configuration object, or `null` if the file is missing
 */
export async function loadServiceConfig(configPath: string): Promise<ServiceConfigInput | null> {
  try {
    const configContent = await Deno.readTextFile(configPath);
    const parsedConfig = JSON.parse(configContent);

    // Basic validation - ensure it's a service config
    if (parsedConfig["@type"] !== "fsvc:ServiceConfig") {
      throw new ConfigError(`Invalid service config type: expected "fsvc:ServiceConfig", got "${parsedConfig["@type"]}"`);
    }

    return parsedConfig as ServiceConfigInput;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // Config file doesn't exist - this is OK, return null
      return null;
    }

    if (error instanceof SyntaxError) {
      throw new ConfigError(`Invalid JSON in config file ${configPath}: ${error.message}`, error);
    }

    if (error instanceof ConfigError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error : undefined;
    throw new ConfigError(`Failed to load service config from ${configPath}: ${errorMessage}`, cause);
  }
}

/**
 * Loads a node configuration from a JSON-LD file at the specified node path.
 *
 * Reads and parses the node configuration file, validating that its `@type` is `"node:NodeConfig"`. Returns the parsed configuration object, or `null` if the file does not exist. Throws `ConfigError` if the file contains invalid JSON, has an incorrect type, or on other failures.
 *
 * @param nodePath - The directory path of the node whose configuration should be loaded
 * @returns The parsed node configuration object, or `null` if the configuration file does not exist
 */
export async function loadNodeConfig(nodePath: string): Promise<NodeConfigInput | null> {
  const configPath = getNodeConfigPath(nodePath);

  try {
    const configContent = await Deno.readTextFile(configPath);
    const parsedConfig = JSON.parse(configContent);

    // Basic validation - ensure it's a node config
    if (parsedConfig["@type"] !== "node:NodeConfig") {
      throw new ConfigError(`Invalid node config type: expected "node:NodeConfig", got "${parsedConfig["@type"]}"`);
    }

    return parsedConfig as NodeConfigInput;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // Node config doesn't exist - this is OK, return null
      return null;
    }

    if (error instanceof SyntaxError) {
      throw new ConfigError(`Invalid JSON in node config at ${configPath}: ${error.message}`, error);
    }

    if (error instanceof ConfigError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error : undefined;
    throw new ConfigError(`Failed to load node config from ${configPath}: ${errorMessage}`, cause);
  }
}

/**
 * Saves a service configuration object as a JSON-LD file at the specified path.
 *
 * Ensures the target directory exists before writing. Throws a ConfigError if saving fails.
 */
export async function saveServiceConfig(configPath: string, config: ServiceConfigInput): Promise<void> {
  try {
    // Ensure the directory exists
    const dir = configPath.substring(0, configPath.lastIndexOf('/'));
    if (dir) {
      await Deno.mkdir(dir, { recursive: true });
    }

    // Format JSON with proper indentation
    const configContent = JSON.stringify(config, null, 2);
    await Deno.writeTextFile(configPath, configContent);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error : undefined;
    throw new ConfigError(`Failed to save service config to ${configPath}: ${errorMessage}`, cause);
  }
}

/**
 * Saves a node configuration object as a JSON-LD file at the derived node config path.
 *
 * Ensures the target directory exists before writing. Throws a ConfigError if saving fails.
 */
export async function saveNodeConfig(nodePath: string, config: NodeConfigInput): Promise<void> {
  const configPath = getNodeConfigPath(nodePath);

  try {
    // Ensure the directory exists
    const dir = configPath.substring(0, configPath.lastIndexOf('/'));
    if (dir) {
      await Deno.mkdir(dir, { recursive: true });
    }

    // Format JSON with proper indentation
    const configContent = JSON.stringify(config, null, 2);
    await Deno.writeTextFile(configPath, configContent);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error ? error : undefined;
    throw new ConfigError(`Failed to save node config to ${configPath}: ${errorMessage}`, cause);
  }
}

/**
 * Returns the configuration file path for a given node directory.
 *
 * Appends `/_config-component` to the provided node path to construct the config file location.
 *
 * @param nodePath - The file system path to the node directory
 * @returns The full path to the node's configuration file
 */
function getNodeConfigPath(nodePath: string): string {
  // Node configs are stored as _config-component within the node directory
  return `${nodePath}/_config-component`;
}

/**
 * Determines whether a configuration file exists at the specified path.
 *
 * @param configPath - The file system path to the configuration file
 * @returns `true` if the file exists and is a regular file; otherwise, `false`
 */
export async function configExists(configPath: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(configPath);
    return stat.isFile;
  } catch {
    return false;
  }
}

/**
 * Returns an array of ancestor node paths for the given node, ordered from deepest to shallowest, excluding the current node itself.
 *
 * @param nodePath - The path of the node whose hierarchy is to be determined
 * @returns An array of ancestor node paths, from deepest ancestor to root
 */
export function getNodeHierarchy(nodePath: string): string[] {
  const parts = nodePath.split('/').filter(part => part);
  const hierarchy: string[] = [];

  // Build hierarchy paths from deepest to shallowest
  for (let i = parts.length - 1; i >= 0; i--) {
    const ancestorPath = parts.slice(0, i).join('/');
    if (ancestorPath && ancestorPath !== nodePath) {
      hierarchy.push(ancestorPath);
    }
  }

  return hierarchy;
}

/**
 * Determines whether configuration inheritance is enabled for the specified node.
 *
 * Loads the node's configuration and checks the "node:configInheritanceEnabled" property. Returns its boolean value if present; otherwise, defaults to `true`. If the configuration cannot be loaded, also defaults to `true`.
 *
 * @param nodePath - The file system path to the node directory
 * @returns `true` if config inheritance is enabled or unspecified; `false` if explicitly disabled
 */
export async function isConfigInheritanceEnabled(nodePath: string): Promise<boolean> {
  try {
    const nodeConfig = await loadNodeConfig(nodePath);

    // If the node has explicit inheritance setting, use it
    if (nodeConfig?.["node:configInheritanceEnabled"] !== undefined) {
      return nodeConfig["node:configInheritanceEnabled"];
    }

    // Default to true if not specified
    return true;
  } catch {
    // If we can't load config, default to inheritance enabled
    return true;
  }
}

/**
 * Validates that the input is a JSON-LD object containing both "@type" and "@context" properties.
 *
 * Throws a ConfigError if the input is not an object or if required properties are missing.
 */
export function validateJSONLD(data: unknown): void {
  if (!data || typeof data !== 'object') {
    throw new ConfigError('Configuration must be a valid JSON object');
  }

  const obj = data as Record<string, unknown>;
  
  if (!obj["@type"]) {
    throw new ConfigError('Configuration must have an "@type" property');
  }

  if (!obj["@context"]) {
    throw new ConfigError('Configuration must have an "@context" property');
  }
}

/**
 * Creates a deep copy of the given configuration object using JSON serialization.
 *
 * @param config - The configuration object to clone
 * @returns A new object that is a deep clone of the input configuration
 */
export function cloneConfig<T>(config: T): T {
  return JSON.parse(JSON.stringify(config));
}
