/**
 * Configuration Types for Semantic Flow Service
 *
 * Based on JSON-LD ontologies with side-by-side configuration context pattern.
 * Supports sparse input configurations that are validated against complete defaults.
 */

import { NodeObject, ContextDefinition } from "../../../flow-core/src/deps.ts";

// JSON-LD Context and Type Definitions
export interface FlowServiceContext extends ContextDefinition {
  readonly fsvc: "https://semantic-flow.github.io/ontology/flow-service/";
  readonly mesh: "https://semantic-flow.github.io/ontology/mesh/";
  readonly node: "https://semantic-flow.github.io/ontology/node/";
  readonly flow: "https://semantic-flow.github.io/ontology/flow/";
  readonly conf: "https://semantic-flow.github.io/ontology/config-flow/";
}

// Logging Configuration Types
export interface LogChannelConfig extends NodeObject {
  readonly "@type": "fsvc:LogChannelConfig";
  readonly "fsvc:logChannelEnabled": boolean;
  readonly "fsvc:logLevel": "debug" | "info" | "warn" | "error";
  readonly "fsvc:logFormat"?: "json" | "pretty";
  readonly "fsvc:logFilePath"?: string;
  readonly "fsvc:sentryDsn"?: string;
  readonly "fsvc:logRetentionDays"?: number;
  readonly "fsvc:logMaxFiles"?: number;
  readonly "fsvc:logMaxFileSize"?: number;
  readonly "fsvc:logRotationInterval"?:
  | "daily"
  | "weekly"
  | "monthly"
  | "size-based";
}

export interface LoggingConfig extends NodeObject {
  readonly "@type": "fsvc:LoggingConfig";
  readonly "fsvc:hasConsoleChannel": LogChannelConfig;
  readonly "fsvc:hasFileChannel": LogChannelConfig;
  readonly "fsvc:hasSentryChannel": LogChannelConfig;
}

// Contained Services Configuration
export interface ContainedServicesConfig extends NodeObject {
  readonly "@type": "fsvc:ContainedServicesConfig";
  readonly "fsvc:apiEnabled": boolean;
  readonly "fsvc:sparqlEnabled": boolean;
  readonly "fsvc:queryWidgetEnabled": boolean;
  readonly "fsvc:staticServerEnabled": boolean;
  readonly "fsvc:apiDocsEnabled": boolean;
}

// Node Configuration Types (for service defaults)
export interface TemplateMapping extends NodeObject {
  readonly "@type": "conf:TemplateMapping";
  readonly "conf:hasResourcePageTemplate": string;
}
// TODO rename to 
export interface MeshRootNodeConfig extends NodeObject {
  readonly "@type": "conf:MeshRootNodeConfig";
  readonly "conf:versioningEnabled": boolean;
  readonly "conf:distributionFormats": string[];
  readonly "conf:templateMappings"?: TemplateMapping;
  readonly "conf:configInheritanceEnabled": boolean;
  readonly "conf:generateUnifiedDataset": boolean;
  readonly "conf:generateAggregatedDataset": boolean;
  readonly "conf:generateResourcePages"?: boolean;
  readonly "conf:stylesheetPath"?: string;
  readonly "conf:defaultAttributedTo"?: string;
}

// Complete Service Configuration
export interface ServiceConfig extends NodeObject {
  readonly "@type": "fsvc:ServiceConfig";
  readonly "fsvc:scheme": "http" | "https";
  readonly "fsvc:port": number;
  readonly "fsvc:host": string;
  readonly "fsvc:meshPaths"?: string[];
  readonly "fsvc:hasLoggingConfig": LoggingConfig;
  readonly "fsvc:hasContainedServices": ContainedServicesConfig;
  readonly "fsvc:rootMeshRootNodeConfigTemplate"?: MeshRootNodeConfig;
  readonly "fsvc:defaultDelegationChain"?: DelegationChain;
  readonly "fsvc:defaultAttributedTo"?: string;
  readonly "fsvc:defaultRights"?: string[];
  readonly "fsvc:defaultRightsHolder"?: string;
}

// Delegation Chain Configuration
export interface DelegationStep extends NodeObject {
  readonly "@type": "meta:DelegationStep";
  readonly "meta:stepOrder": number;
  readonly "prov:agent": {
    readonly "@id": string;
  };
}

export interface DelegationChain extends NodeObject {
  readonly "@type": "meta:DelegationChain";
  readonly "meta:hasStep": DelegationStep[];
}

// Partial Types for Sparse Input Configuration (mutable for construction)
export interface ServiceConfigInput extends Partial<NodeObject> {
  "@type"?: "fsvc:ServiceConfig";
  "fsvc:scheme"?: "http" | "https";
  "fsvc:port"?: number;
  "fsvc:host"?: string;
  "fsvc:meshPaths"?: string[];
  "fsvc:hasLoggingConfig"?: Partial<LoggingConfig>;
  "fsvc:hasContainedServices"?: Partial<ContainedServicesConfig>;
  "fsvc:nodeDefaults"?: Partial<MeshRootNodeConfig>;
  "fsvc:defaultDelegationChain"?: Partial<DelegationChain>;
  "fsvc:defaultAttributedTo"?: string;
}

export interface MeshRootNodeConfigInput extends Partial<NodeObject> {
  "@type"?: "conf:MeshRootNodeConfig";
  "conf:versioningEnabled"?: boolean;
  "conf:distributionFormats"?: string[];
  "conf:templateMappings"?: Partial<TemplateMapping>;
  "conf:configInheritanceEnabled"?: boolean;
  "conf:generateUnifiedDataset"?: boolean;
  "conf:generateAggregatedDataset"?: boolean;
  "conf:generateResourcePages"?: boolean;
  "conf:stylesheetPath"?: string;
  "conf:defaultAttributedTo"?: string;
}

export interface MeshRootNodeConfigContext {
  readonly inputOptions: MeshRootNodeConfigInput;
  readonly defaultOptions: MeshRootNodeConfig;
}

// CLI Options Type
export interface ServiceOptions {
  readonly configPath?: string;
  readonly scheme?: "http" | "https";
  readonly port?: number;
  readonly host?: string;
  readonly meshPaths?: string[];
  readonly logLevel?: LogLevel;
  readonly sentryEnabled?: boolean;
}


// Environment Variable Mapping
export interface EnvironmentConfig {
  readonly FLOW_CONFIG_PATH?: string;
  readonly FLOW_SERVICE_SCHEME?: string;
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
    this.name = "ConfigError";
  }
}

export class ConfigValidationError extends ConfigError {
  constructor(
    message: string,
    public readonly errors: string[],
    cause?: Error,
  ) {
    super(message, cause);
    this.name = "ConfigValidationError";
  }
}

// Utility Types for Configuration Access
export type LogLevel = "debug" | "info" | "warn" | "error";

