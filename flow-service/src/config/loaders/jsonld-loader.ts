/**
 * JSON-LD Configuration File Loader
 *
 * Loads and validates JSON-LD configuration files from the filesystem.
 * Supports both service and node configuration formats.
 */

import type { ServiceConfigInput, NodeConfigInput } from '../types.ts';
import { ConfigError } from '../types.ts';

/**
 * Load service configuration from JSON-LD file
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
 * Load node configuration from JSON-LD file
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
 * Save service configuration to JSON-LD file
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
 * Save node configuration to JSON-LD file
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
 * Get the configuration file path for a node
 */
function getNodeConfigPath(nodePath: string): string {
  // Node configs are stored as _config-component within the node directory
  return `${nodePath}/_config-component`;
}

/**
 * Check if a configuration file exists
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
 * Get node hierarchy for inheritance resolution
 * Returns paths from deepest to shallowest, excluding the current node
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
 * Check if config inheritance is enabled for a node
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
 * Validate JSON-LD structure
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
 * Deep clone a configuration object
 */
export function cloneConfig<T>(config: T): T {
  return JSON.parse(JSON.stringify(config));
}
