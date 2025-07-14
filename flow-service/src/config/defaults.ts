/**
 * Platform Default Configurations
 *
 * Complete default configurations used as fallbacks in the side-by-side pattern.
 * Based on the existing JSON-LD configuration files.
 */

import type { ServiceConfig, NodeConfig, JSONLDContext } from './types.ts';

// Standard JSON-LD Context
export const DEFAULT_CONTEXT: JSONLDContext = {
  fsvc: "https://semantic-flow.github.io/ontology/flow-service/",
  node: "https://semantic-flow.github.io/ontology/node-config/"
};

// Platform Node Configuration Defaults
export const PLATFORM_NODE_DEFAULTS: NodeConfig = {
  "@context": DEFAULT_CONTEXT,
  "@type": "node:NodeConfig",
  "@id": "node:defaultConfig",
  "node:versioningEnabled": true,
  "node:configInheritanceEnabled": true,
  "node:distributionFormats": [
    "application/trig",
    "application/ld+json"
  ],
  "node:templateMappings": {
    "@type": "node:TemplateMapping",
    "node:resourcePage": "/_assets/templates/default-resource-page.html"
  },
  "node:generateUnifiedDataset": false,
  "node:generateAggregatedDataset": false,
  "node:generateResourcePages": true,
  "node:stylesheetPath": "/_assets/css/default-resource-page.css"
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
      "fsvc:logFilePath": "./logs/flow-service.log"
    },
    "fsvc:hasSentryChannel": {
      "@type": "fsvc:LogChannelConfig",
      "fsvc:logChannelEnabled": false,
      "fsvc:logLevel": "error"
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
  "fsvc:nodeDefaults": {
    "@context": DEFAULT_CONTEXT,
    "@type": "node:NodeConfig",
    "node:versioningEnabled": true,
    "node:distributionFormats": [
      "application/trig",
      "application/ld+json"
    ],
    "node:templateMappings": {
      "@type": "node:TemplateMapping",
      "node:resourcePage": "templates/default-resource.html"
    },
    "node:configInheritanceEnabled": true,
    "node:generateUnifiedDataset": false,
    "node:generateAggregatedDataset": false
  }
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
      "fsvc:logFilePath": "./logs/flow-service-dev.log"
    },
    "fsvc:hasSentryChannel": {
      "@type": "fsvc:LogChannelConfig",
      "fsvc:logChannelEnabled": false,  // Disable Sentry in development by default
      "fsvc:logLevel": "error"
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
      "fsvc:logFilePath": "./logs/flow-service.log"
    },
    "fsvc:hasSentryChannel": {
      "@type": "fsvc:LogChannelConfig",
      "fsvc:logChannelEnabled": true,  // Enable Sentry in production
      "fsvc:logLevel": "error"
    }
  }
};

/**
 * Get environment-specific defaults
 */
export function getEnvironmentDefaults(environment?: string): ServiceConfig {
  const env = environment?.toLowerCase() || "development";

  let envOverrides: Partial<ServiceConfig> = {};

  switch (env) {
    case "production":
    case "prod":
      envOverrides = PRODUCTION_SERVICE_OVERRIDES;
      break;
    case "development":
    case "dev":
    default:
      envOverrides = DEVELOPMENT_SERVICE_OVERRIDES;
      break;
  }

  // Deep merge environment overrides with platform defaults
  return mergeConfigs(PLATFORM_SERVICE_DEFAULTS, envOverrides);
}

/**
 * Deep merge utility for configuration objects
 * Used for combining defaults with environment overrides
 */
function mergeConfigs<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const result = { ...base } as Record<string, any>;

  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value) && typeof result[key] === 'object' && !Array.isArray(result[key])) {
        result[key] = mergeConfigs(result[key], value);
      } else {
        result[key] = value;
      }
    }
  }

  return result as T;
}
