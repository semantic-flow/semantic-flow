/**
 * @fileoverview Logging configuration extractor for converting ontology-based
 * configuration to LoggingConfig format for logger reinitialization.
 */

import type { LoggingConfig, LogLevel } from '../../../flow-core/src/utils/logger/logger-types.ts';
import { singletonServiceConfigAccessor } from './resolution/service-config-accessor.ts';
import { FLOW_SERVICE_VERSION, FLOW_SERVICE_NAME, FLOW_SERVICE_INSTANCE_ID } from '../service-constants.ts';
import { querySingleValue } from '../../../flow-core/src/utils/sparql-utils.ts';
import { defaultQuadstoreBundle } from '../quadstore-default-bundle.ts';
import { getCurrentServiceUri } from '../utils/service-uri-builder.ts';
import { CONFIG_GRAPH_NAMES } from './index.ts';

/**
 * Extracts and converts ontology-based logging configuration from the merged
 * service config to LoggingConfig interface format.
 *
 * @returns Promise<LoggingConfig> The converted logging configuration
 */
export async function extractLoggingConfigFromService(): Promise<LoggingConfig> {
  // Get service context information
  const serviceContext = {
    serviceName: FLOW_SERVICE_NAME,
    serviceVersion: Deno.env.get('FLOW_SERVICE_VERSION') || FLOW_SERVICE_VERSION,
    environment: Deno.env.get('FLOW_ENV') || 'development',
    instanceId: FLOW_SERVICE_INSTANCE_ID,
  };

  // Extract console channel configuration
  const consoleConfig = await extractConsoleChannelConfig();

  // Extract file channel configuration
  const fileConfig = await extractFileChannelConfig();

  // Extract sentry channel configuration
  const sentryConfig = await extractSentryChannelConfig();

  return {
    consoleChannel: consoleConfig,
    fileChannel: fileConfig,
    sentryChannel: sentryConfig,
    serviceContext,
  };
}

/**
 * Extracts console channel configuration from the merged service config
 */
async function extractConsoleChannelConfig() {
  try {
    const consoleLoggingConfig = await singletonServiceConfigAccessor.getConsoleLoggingConfig();

    // Get additional console-specific properties
    const logFormat = await getChannelProperty('fsvc:hasConsoleChannel', 'fsvc:logFormat') as 'json' | 'pretty' | undefined;

    return {
      logChannelEnabled: consoleLoggingConfig.enabled,
      logLevel: (consoleLoggingConfig.level as LogLevel) || 'info',
      logFormat: logFormat || 'pretty',
    };
  } catch (error) {
    // Provide sensible defaults if extraction fails
    console.warn('Failed to extract console logging config, using defaults:', error);
    return {
      logChannelEnabled: true,
      logLevel: 'info' as LogLevel,
      logFormat: 'pretty' as const,
    };
  }
}

/**
 * Extracts file channel configuration from the merged service config
 */
async function extractFileChannelConfig() {
  try {
    const fileLoggingConfig = await singletonServiceConfigAccessor.getFileLoggingConfig();

    // Get additional file-specific properties
    const logFormat = await getChannelProperty('fsvc:hasFileChannel', 'fsvc:logFormat') as 'json' | 'pretty' | undefined;
    const logFilePath = await getChannelProperty('fsvc:hasFileChannel', 'fsvc:logFilePath');
    const logRetentionDays = await getChannelProperty('fsvc:hasFileChannel', 'fsvc:logRetentionDays');
    const logMaxFiles = await getChannelProperty('fsvc:hasFileChannel', 'fsvc:logMaxFiles');
    const logMaxFileSize = await getChannelProperty('fsvc:hasFileChannel', 'fsvc:logMaxFileSize');
    const logRotationInterval = await getChannelProperty('fsvc:hasFileChannel', 'fsvc:logRotationInterval') as 'daily' | 'weekly' | 'monthly' | 'size-based' | undefined;

    return {
      logChannelEnabled: fileLoggingConfig.enabled,
      logLevel: (fileLoggingConfig.level as LogLevel) || 'warn',
      logFormat: logFormat || 'json',
      logFilePath: logFilePath || './logs/flow-service.log',
      logRetentionDays: logRetentionDays ? parseInt(logRetentionDays) : 30,
      logMaxFiles: logMaxFiles ? parseInt(logMaxFiles) : 10,
      logMaxFileSize: logMaxFileSize ? parseInt(logMaxFileSize) : 10485760, // 10MB
      logRotationInterval: logRotationInterval || 'daily',
    };
  } catch (error) {
    // Provide sensible defaults if extraction fails
    console.warn('Failed to extract file logging config, using defaults:', error);
    return {
      logChannelEnabled: false,
      logLevel: 'warn' as LogLevel,
      logFormat: 'json' as const,
      logFilePath: './logs/flow-service.log',
      logRetentionDays: 30,
      logMaxFiles: 10,
      logMaxFileSize: 10485760,
      logRotationInterval: 'daily' as const,
    };
  }
}

/**
 * Extracts sentry channel configuration from the merged service config
 */
async function extractSentryChannelConfig() {
  try {
    const sentryLoggingConfig = await singletonServiceConfigAccessor.getSentryLoggingConfig();

    // Get additional sentry-specific properties
    const sentryDsn = await getChannelProperty('fsvc:hasSentryChannel', 'fsvc:sentryDsn');

    return {
      logChannelEnabled: sentryLoggingConfig.enabled,
      logLevel: (sentryLoggingConfig.level as LogLevel) || 'error',
      sentryDsn: sentryDsn || Deno.env.get('FLOW_SENTRY_DSN'),
    };
  } catch (error) {
    // Provide sensible defaults if extraction fails
    console.warn('Failed to extract sentry logging config, using defaults:', error);
    return {
      logChannelEnabled: false,
      logLevel: 'error' as LogLevel,
      sentryDsn: Deno.env.get('FLOW_SENTRY_DSN'),
    };
  }
}

/**
 * Helper function to get channel-specific properties using SPARQL
 */
async function getChannelProperty(channelProperty: string, property: string): Promise<string | undefined> {
  const sparql = `
    PREFIX fsvc: <https://semantic-flow.github.io/ontology/flow-service/>
    SELECT ?value WHERE {
      GRAPH <${getCurrentServiceUri(CONFIG_GRAPH_NAMES.mergedServiceConfig)}> {
        ?s ${channelProperty} ?channel .
        ?channel ${property} ?value .
      }
    }
  `;

  try {
    return await querySingleValue(defaultQuadstoreBundle, sparql);
  } catch (error) {
    console.warn(`Failed to query ${property} for ${channelProperty}:`, error);
    return undefined;
  }
}
