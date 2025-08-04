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
 * Default configuration for URI building when config is not yet available
 */
export const DEFAULT_SERVICE_URI_CONFIG: ServiceUriConfig = {
  scheme: 'http',
  host: 'localhost',
  port: 3000,
};

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
 * Builds a JSON-LD context with dynamic local URI
 */
export function buildServiceContext(config: ServiceUriConfig) {
  const baseUri = buildServiceBaseUri(config);
  return {
    "fsvc": "https://semantic-flow.github.io/ontology/flow-service/",
    "mesh": "https://semantic-flow.github.io/ontology/mesh/",
    "node": "https://semantic-flow.github.io/ontology/node/",
    "flow": "https://semantic-flow.github.io/ontology/flow/",
    "conf": "https://semantic-flow.github.io/ontology/config-flow/",
    "meta": "https://semantic-flow.github.io/ontology/meta-flow/",
    "prov": "http://www.w3.org/ns/prov#",
    "dcterms": "http://purl.org/dc/terms/",
    "local": `${baseUri}/graph/mergedServiceConfig/`
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
  private _config: ServiceUriConfig = DEFAULT_SERVICE_URI_CONFIG;
  private _isInitialized = false;

  setConfig(config: ServiceUriConfig): void {
    this._config = config;
    this._isInitialized = true;
  }

  getConfig(): ServiceUriConfig {
    return this._config;
  }

  isInitialized(): boolean {
    return this._isInitialized;
  }

  reset(): void {
    this._config = DEFAULT_SERVICE_URI_CONFIG;
    this._isInitialized = false;
  }
}

export const serviceUriConfigManager = new ServiceUriConfigManager();

/**
 * Convenience functions that use the current service configuration
 */
export function getCurrentServiceBaseUri(): string {
  return buildServiceBaseUri(serviceUriConfigManager.getConfig());
}

export function getCurrentConfigGraphNames() {
  return buildConfigGraphNames(serviceUriConfigManager.getConfig());
}

export function getCurrentServiceContext() {
  return buildServiceContext(serviceUriConfigManager.getConfig());
}

export function getCurrentServiceUri(path: string): string {
  return buildServiceUri(serviceUriConfigManager.getConfig(), path);
}
