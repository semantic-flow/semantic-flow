/**
 * Service URI Builder Utility
 * 
 * Provides dynamic URI construction for service-related resources based on
 * configured host, port, and scheme. This ensures URIs are properly qualified
 * for quadstore operations while remaining configurable.
 */

export interface ServiceUriConfig {
  readonly scheme: string;
  readonly host: string;
  readonly port: number;
}


/**
 * Builds a base service URI from the given configuration
 */
export function buildServiceBaseUri(config: ServiceUriConfig): string {
  const port = (config.scheme === 'https' && config.port === 443) ||
    (config.scheme === 'http' && config.port === 80)
    ? ''
    : `:${config.port}`;

  return `${config.scheme}://${config.host}${port}`;
}

/**
 * Builds a service graph URI for the given graph name
 */
export function buildServiceGraphUri(config: ServiceUriConfig, graphName: string): string {
  const baseUri = buildServiceBaseUri(config);
  return `${baseUri}/graph/${graphName}`;
}

/**
 * Builds the complete set of config graph names based on service configuration
 */
export function buildConfigGraphNames(config: ServiceUriConfig) {
  return {
    platformServiceDefaults: buildServiceGraphUri(config, 'platformServiceDefaults'),
    platformImplicitMeshRootNodeConfig: buildServiceGraphUri(config, 'platformImplicitMeshRootNodeConfig'),
    inputServiceConfig: buildServiceGraphUri(config, 'inputServiceConfig'),
    inputMeshRootNodeConfig: buildServiceGraphUri(config, 'inputMeshRootNodeConfig'),
    mergedServiceConfig: buildServiceGraphUri(config, 'mergedServiceConfig'),
  };
}


/**
 * Builds a service-relative URI for the given path
 */
export function buildServiceUri(config: ServiceUriConfig, path: string): string {
  const baseUri = buildServiceBaseUri(config);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUri}${cleanPath}`;
}

/**
 * Singleton holder for current service URI configuration
 * This is updated during service configuration resolution
 */
class ServiceUriConfigManager {
  private _config: ServiceUriConfig | null = null;
  private _cachedGraphNames: ReturnType<typeof buildConfigGraphNames> | null = null;
  private _cachedBaseUri: string | null = null;

  setConfig(config: ServiceUriConfig): void {
    this._config = config;
    // Update cached values when config changes
    this._cachedGraphNames = buildConfigGraphNames(config);
    this._cachedBaseUri = buildServiceBaseUri(config);
  }

  getConfig(): ServiceUriConfig {
    if (!this._config) {
      throw new Error('Service URI configuration not initialized. Call setConfig() first.');
    }
    return this._config;
  }

  getConfigGraphNames() {
    if (!this._cachedGraphNames) {
      throw new Error('Service URI configuration not initialized. Call setConfig() first.');
    }
    return this._cachedGraphNames;
  }

  getServiceBaseUri(): string {
    if (!this._cachedBaseUri) {
      throw new Error('Service URI configuration not initialized. Call setConfig() first.');
    }
    return this._cachedBaseUri;
  }

  isInitialized(): boolean {
    return this._config !== null;
  }

  reset(): void {
    this._config = null;
    this._cachedGraphNames = null;
    this._cachedBaseUri = null;
  }
}

export const serviceUriConfigManager = new ServiceUriConfigManager();

/**
 * Convenience functions that use the current service configuration
 */
export function getCurrentServiceBaseUri(): string {
  return serviceUriConfigManager.getServiceBaseUri();
}

export function getCurrentConfigGraphNames() {
  return serviceUriConfigManager.getConfigGraphNames();
}

export function getCurrentServiceUri(path: string): string {
  return buildServiceUri(serviceUriConfigManager.getConfig(), path);
}

