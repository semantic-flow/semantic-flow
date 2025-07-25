/**
 * Configuration Types for Semantic Flow Service
 *
 * Based on JSON-LD ontologies with side-by-side configuration context pattern.
 * Supports sparse input configurations that are validated against complete defaults.
 */

// JSON-LD Context and Type Definitions
export interface JSONLDContext {
  readonly fsvc: "https://semantic-flow.github.io/ontology/flow-service/";
  readonly mesh: "https://semantic-flow.github.io/ontology/mesh/";
  readonly node: "https://semantic-flow.github.io/ontology/node/";
  readonly flow: "https://semantic-flow.github.io/ontology/flow/";
  readonly conf: "https://semantic-flow.github.io/ontology/config-flow/";
}

export interface JSONLDBase {
  readonly "@context": JSONLDContext;
  readonly "@type": string;
  readonly "@id"?: string;
}

// Logging Configuration Types
export interface LogChannelConfig {
  readonly "@type": "fsvc:LogChannelConfig";
  readonly "fsvc:logChannelEnabled": boolean;
  readonly "fsvc:logLevel": "debug" | "info" | "warn" | "error";
  readonly "fsvc:logFormat"?: "json" | "pretty";
  readonly "fsvc:logFilePath"?: string;
  readonly "fsvc:sentryDsn"?: string;
  readonly "fsvc:sentryLoggingEnabled"?: boolean;
  readonly "fsvc:logRetentionDays"?: number;
  readonly "fsvc:logMaxFiles"?: number;
  readonly "fsvc:logMaxFileSize"?: number;
  readonly "fsvc:logRotationInterval"?: "daily" | "weekly" | "monthly" | "size-based";
}

export interface LoggingConfig {
  readonly "@type": "fsvc:LoggingConfig";
  readonly "fsvc:hasConsoleChannel": LogChannelConfig;
  readonly "fsvc:hasFileChannel": LogChannelConfig;
  readonly "fsvc:hasSentryChannel": LogChannelConfig;
}

// Contained Services Configuration
export interface ContainedServicesConfig {
  readonly "@type": "fsvc:ContainedServicesConfig";
  readonly "fsvc:apiEnabled": boolean;
  readonly "fsvc:sparqlEnabled": boolean;
  readonly "fsvc:queryWidgetEnabled": boolean;
  readonly "fsvc:staticServerEnabled": boolean;
  readonly "fsvc:apiDocsEnabled": boolean;
}

// Node Configuration Types (for service defaults)
export interface TemplateMapping {
  readonly "@type": "conf:TemplateMapping";
  readonly "conf:hasResourcePageTemplate": string;
}

export interface NodeConfig extends JSONLDBase {
  readonly "@type": "conf:NodeConfig";
  readonly "conf:versioningEnabled": boolean;
  readonly "conf:distributionFormats": string[];
  readonly "conf:templateMappings"?: TemplateMapping;
  readonly "conf:configInheritanceEnabled": boolean;
  readonly "conf:generateUnifiedDataset": boolean;
  readonly "conf:generateAggregatedDataset": boolean;
  readonly "conf:generateResourcePages"?: boolean;
  readonly "conf:stylesheetPath"?: string;
  readonly "conf:defaultAttribution"?: string;
}

// Complete Service Configuration
export interface ServiceConfig extends JSONLDBase {
  readonly "@type": "fsvc:ServiceConfig";
  readonly "fsvc:port": number;
  readonly "fsvc:host": string;
  readonly "fsvc:meshPaths"?: string[];
  readonly "fsvc:hasLoggingConfig": LoggingConfig;
  readonly "fsvc:hasContainedServices": ContainedServicesConfig;
  readonly "fsvc:nodeDefaults": NodeConfig;
  readonly "fsvc:defaultDelegationChain"?: DelegationChain;
  readonly "fsvc:defaultAttributedTo"?: AttributedTo;
}

// Attribution Configuration
export interface AttributedTo {
  readonly "@id": string;
}

// Delegation Chain Configuration
export interface DelegationStep {
  readonly "@type": "meta:DelegationStep";
  readonly "meta:stepOrder": number;
  readonly "prov:agent": {
    readonly "@id": string;
  };
}

export interface DelegationChain {
  readonly "@type": "meta:DelegationChain";
  readonly "meta:hasStep": DelegationStep[];
}

// Partial Types for Sparse Input Configuration (mutable for construction)
export interface ServiceConfigInput extends Partial<JSONLDBase> {
  "@type"?: "fsvc:ServiceConfig";
  "fsvc:port"?: number;
  "fsvc:host"?: string;
  "fsvc:meshPaths"?: string[];
  "fsvc:hasLoggingConfig"?: Partial<LoggingConfig>;
  "fsvc:hasContainedServices"?: Partial<ContainedServicesConfig>;
  "fsvc:nodeDefaults"?: Partial<NodeConfig>;
  "fsvc:defaultDelegationChain"?: Partial<DelegationChain>;
  "fsvc:defaultAttributedTo"?: Partial<AttributedTo>;
}

export interface NodeConfigInput extends Partial<JSONLDBase> {
  "@type"?: "conf:NodeConfig";
  "conf:versioningEnabled"?: boolean;
  "conf:distributionFormats"?: string[];
  "conf:templateMappings"?: Partial<TemplateMapping>;
  "conf:configInheritanceEnabled"?: boolean;
  "conf:generateUnifiedDataset"?: boolean;
  "conf:generateAggregatedDataset"?: boolean;
  "conf:generateResourcePages"?: boolean;
  "conf:stylesheetPath"?: string;
  "conf:defaultAttribution"?: string;
}

// Configuration Context Types (Side-by-Side Pattern)
export interface ServiceConfigContext {
  readonly inputOptions: ServiceConfigInput;
  readonly defaultOptions: ServiceConfig;
}

export interface NodeConfigContext {
  readonly inputOptions: NodeConfigInput;
  readonly defaultOptions: NodeConfig;
}

// CLI Options Type
export interface ServiceOptions {
  readonly configPath?: string;
  readonly port?: number;
  readonly host?: string;
  readonly meshPaths?: string[];
  readonly logLevel?: LogLevel;
  readonly sentryEnabled?: boolean;
}

// Environment Variable Mapping
export interface EnvironmentConfig {
  readonly FLOW_CONFIG_PATH?: string;
  readonly FLOW_SERVICE_PORT?: string;
  readonly FLOW_SERVICE_HOST?: string;
  readonly FLOW_MESH_PATHS?: string;
  readonly FLOW_LOG_LEVEL?: string;
  readonly FLOW_SENTRY_ENABLED?: string;
  readonly FLOW_SENTRY_DSN?: string;
  readonly FLOW_SENTRY_LOGGING_ENABLED?: string;
  readonly FLOW_FILE_LOG_ENABLED?: string;
  readonly FLOW_FILE_LOG_LEVEL?: string;
  readonly FLOW_FILE_LOG_PATH?: string;
  readonly FLOW_LOG_RETENTION_DAYS?: string;
  readonly FLOW_LOG_MAX_FILES?: string;
  readonly FLOW_LOG_MAX_FILE_SIZE?: string;
  readonly FLOW_LOG_ROTATION_INTERVAL?: string;
  readonly FLOW_DEFAULT_VERSIONING?: string;
  readonly FLOW_DEFAULT_FORMATS?: string;
  readonly FLOW_API_ENABLED?: string;
  readonly FLOW_SPARQL_ENABLED?: string;
}

// Configuration Error Types
export class ConfigError extends Error {
  constructor(message: string, public override readonly cause?: Error) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class ConfigValidationError extends ConfigError {
  constructor(message: string, public readonly errors: string[], cause?: Error) {
    super(message, cause);
    this.name = 'ConfigValidationError';
  }
}

// Utility Types for Configuration Access
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Retrieves the service port from the input options if specified; otherwise, returns the default port.
 *
 * @returns The configured service port number
 */
export function getServicePort(context: ServiceConfigContext): number {
  return context.inputOptions["fsvc:port"] ?? context.defaultOptions["fsvc:port"];
}

/**
 * Retrieves the service host from the input options if provided; otherwise, returns the default host.
 *
 * @returns The configured service host name or address.
 */
export function getServiceHost(context: ServiceConfigContext): string {
  return context.inputOptions["fsvc:host"] ?? context.defaultOptions["fsvc:host"];
}

/**
 * Retrieves the console log level from the service configuration context, preferring input options over defaults.
 *
 * @returns The log level for the console channel.
 */
export function getConsoleLogLevel(context: ServiceConfigContext): LogLevel {
  return context.inputOptions["fsvc:hasLoggingConfig"]?.["fsvc:hasConsoleChannel"]?.["fsvc:logLevel"]
    ?? context.defaultOptions["fsvc:hasLoggingConfig"]["fsvc:hasConsoleChannel"]["fsvc:logLevel"];
}

/**
 * Determines whether file logging is enabled, preferring the input options if specified, otherwise using the default options.
 *
 * @returns `true` if file logging is enabled; otherwise, `false`
 */
export function getFileLogEnabled(context: ServiceConfigContext): boolean {
  return context.inputOptions["fsvc:hasLoggingConfig"]?.["fsvc:hasFileChannel"]?.["fsvc:logChannelEnabled"]
    ?? context.defaultOptions["fsvc:hasLoggingConfig"]["fsvc:hasFileChannel"]["fsvc:logChannelEnabled"];
}

/**
 * Determines whether Sentry logging is enabled, preferring the input configuration if specified.
 *
 * @returns `true` if Sentry logging is enabled; otherwise, `false`
 */
export function getSentryEnabled(context: ServiceConfigContext): boolean {
  return context.inputOptions["fsvc:hasLoggingConfig"]?.["fsvc:hasSentryChannel"]?.["fsvc:logChannelEnabled"]
    ?? context.defaultOptions["fsvc:hasLoggingConfig"]["fsvc:hasSentryChannel"]["fsvc:logChannelEnabled"];
}

/**
 * Determines whether versioning is enabled for a node, preferring input options over defaults.
 *
 * @returns `true` if versioning is enabled; otherwise, `false`
 */
export function getVersioningEnabled(context: NodeConfigContext): boolean {
  return context.inputOptions["conf:versioningEnabled"] ?? context.defaultOptions["conf:versioningEnabled"];
}
