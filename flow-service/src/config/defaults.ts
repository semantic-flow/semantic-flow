/**
 * Platform Default Configurations
 *
 * Complete default configurations used as fallbacks in the side-by-side pattern.
 * Based on the existing JSON-LD configuration files.
 */

import type { ServiceConfig, NodeConfig, JSONLDContext } from './types.ts';
import { mergeConfigs } from '../utils/merge-configs.ts';

// Standard JSON-LD Context
export const DEFAULT_CONTEXT: JSONLDContext = {
  fsvc: "https://semantic-flow.github.io/ontology/flow-service/",
  mesh: "https://semantic-flow.github.io/ontology/mesh/",
  node: "https://semantic-flow.github.io/ontology/node/",
  flow: "https://semantic-flow.github.io/ontology/flow/",
  conf: "https://semantic-flow.github.io/ontology/config-flow/"
};

// Platform Node Configuration Defaults
export const PLATFORM_NODE_DEFAULTS: NodeConfig = {
  "@context": DEFAULT_CONTEXT,
  "@type": "conf:NodeConfig",
  "@id": "conf:defaultConfig",
  "conf:versioningEnabled": true,
  "conf:configInheritanceEnabled": true,
  "conf:distributionFormats": [
    "application/trig",
    "application/ld+json"
  ],
  "conf:templateMappings": {
    "@type": "conf:TemplateMapping",
    "conf:hasResourcePageTemplate": "/_assets/templates/default-resource-page.html"
  },
  "conf:generateUnifiedDataset": false,
  "conf:generateAggregatedDataset": false,
  "conf:generateResourcePages": true,
  "conf:stylesheetPath": "/_assets/css/default-resource-page.css"
};

/**
 * Service-specific Node Configuration Defaults
 *
 * This configuration extends the platform defaults with service-specific overrides.
 * The main differences from PLATFORM_NODE_DEFAULTS:
 * - Template path is relative to service root (no leading slash)
 * - Excludes resource page generation settings (handled at service level)
 * - Omits @id to avoid conflicts in service context
 */
export const SERVICE_NODE_DEFAULTS: Omit<NodeConfig, "@id" | "conf:generateResourcePages" | "conf:stylesheetPath"> = {
  "@context": DEFAULT_CONTEXT,
  "@type": "conf:NodeConfig",
  "conf:versioningEnabled": true,
  "conf:configInheritanceEnabled": true,
  "conf:distributionFormats": [
    "application/trig",
    "application/ld+json"
  ],
  "conf:templateMappings": {
    "@type": "conf:TemplateMapping",
    "conf:hasResourcePageTemplate": "templates/default-resource.html"  // Service-relative path
  },
  "conf:generateUnifiedDataset": false,
  "conf:generateAggregatedDataset": false
};

// Platform Service Configuration Defaults
export const PLATFORM_SERVICE_DEFAULTS: ServiceConfig = {
  "@context": DEFAULT_CONTEXT,
  "@type": "fsvc:ServiceConfig",
  "@id": "fsvc:defaultConfig",
  "fsvc:port": 3000,
  "fsvc:host": "localhost",
  "fsvc:hasLoggingConfig": {
    "@type": "fsvc:LoggingConfig",
    "fsvc:hasConsoleChannel": {
      "@type": "fsvc:LogChannelConfig",
      "fsvc:logChannelEnabled": true,
      "fsvc:logLevel": "info"
    },
    "fsvc:hasFileChannel": {
      "@type": "fsvc:LogChannelConfig",
      "fsvc:logChannelEnabled": false,
      "fsvc:logLevel": "warn",
      "fsvc:logFormat": "pretty",
      "fsvc:logFilePath": "./logs/flow-service.log",
      "fsvc:logRetentionDays": 30,
      "fsvc:logMaxFiles": 10,
      "fsvc:logMaxFileSize": 10485760,
      "fsvc:logRotationInterval": "daily"
    },
    "fsvc:hasSentryChannel": {
      "@type": "fsvc:LogChannelConfig",
      "fsvc:logChannelEnabled": false,
      "fsvc:logLevel": "error",
      "fsvc:sentryLoggingEnabled": true
    }
  },
  "fsvc:hasContainedServices": {
    "@type": "fsvc:ContainedServicesConfig",
    "fsvc:apiEnabled": true,
    "fsvc:sparqlEnabled": true,
    "fsvc:queryWidgetEnabled": true,
    "fsvc:staticServerEnabled": true,
    "fsvc:apiDocsEnabled": true
  },
  // Reference the service-specific node defaults to avoid duplication
  "fsvc:nodeDefaults": SERVICE_NODE_DEFAULTS
};

// Development Environment Overrides
export const DEVELOPMENT_SERVICE_OVERRIDES: Partial<ServiceConfig> = {
  "fsvc:hasLoggingConfig": {
    "@type": "fsvc:LoggingConfig",
    "fsvc:hasConsoleChannel": {
      "@type": "fsvc:LogChannelConfig",
      "fsvc:logChannelEnabled": true,
      "fsvc:logLevel": "debug"  // More verbose logging in development
    },
    "fsvc:hasFileChannel": {
      "@type": "fsvc:LogChannelConfig",
      "fsvc:logChannelEnabled": true,
      "fsvc:logLevel": "info",
      "fsvc:logFormat": "pretty",
      "fsvc:logFilePath": "./logs/flow-service-dev.log",
      "fsvc:logRetentionDays": 7,
      "fsvc:logMaxFiles": 5,
      "fsvc:logMaxFileSize": 5242880,
      "fsvc:logRotationInterval": "daily"
    },
    "fsvc:hasSentryChannel": {
      "@type": "fsvc:LogChannelConfig",
      "fsvc:logChannelEnabled": true,
      "fsvc:logLevel": "warn",
      "fsvc:sentryLoggingEnabled": true
    }
  }
};

// Production Environment Overrides
export const PRODUCTION_SERVICE_OVERRIDES: Partial<ServiceConfig> = {
  "fsvc:hasLoggingConfig": {
    "@type": "fsvc:LoggingConfig",
    "fsvc:hasConsoleChannel": {
      "@type": "fsvc:LogChannelConfig",
      "fsvc:logChannelEnabled": true,
      "fsvc:logLevel": "info"  // Less verbose in production
    },
    "fsvc:hasFileChannel": {
      "@type": "fsvc:LogChannelConfig",
      "fsvc:logChannelEnabled": true,
      "fsvc:logLevel": "warn",
      "fsvc:logFormat": "pretty",
      "fsvc:logFilePath": "./logs/flow-service.log",
      "fsvc:logRetentionDays": 90,
      "fsvc:logMaxFiles": 20,
      "fsvc:logMaxFileSize": 52428800,
      "fsvc:logRotationInterval": "daily"
    },
    "fsvc:hasSentryChannel": {
      "@type": "fsvc:LogChannelConfig",
      "fsvc:logChannelEnabled": true,  // Enable Sentry in production
      "fsvc:logLevel": "error",
      "fsvc:sentryLoggingEnabled": true
    }
  }
};

/**
 * Returns the merged service configuration for the specified environment.
 *
 * If the environment is "production" or "prod", production overrides are applied; otherwise, development overrides are used by default. The result is a deep merge of the platform service defaults with the selected environment-specific overrides.
 *
 * @param environment - Optional environment name ("production", "prod", "development", or "dev")
 * @returns The effective service configuration for the given environment
 */
export function getEnvironmentDefaults(environment?: string): ServiceConfig {
  const env = environment?.toLowerCase() || "development";

  let envOverrides: Partial<ServiceConfig> = {};

  switch (env) {
    case "production":
    case "prod":
      envOverrides = PRODUCTION_SERVICE_OVERRIDES;
      break;
    default:
      envOverrides = DEVELOPMENT_SERVICE_OVERRIDES;
      break;
  }

  // Deep merge environment overrides with platform defaults
  return mergeConfigs(PLATFORM_SERVICE_DEFAULTS, envOverrides);
}
