/**
 * Startup Configuration Logger
 *
 * Provides formatted logging for service startup configuration display
 */

import type { ServiceConfigAccessor } from '../config/resolution/service-config-resolver.ts';

/**
 * Log service startup configuration with timestamp
 */
export function logStartupConfiguration(config: ServiceConfigAccessor): void {
  const now = new Date();
  const timestamp = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }) + ' ' + now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).toLowerCase();

  console.log(`🔧 Flow Service initializing at ${timestamp} with configuration:`);
  console.log(`   Mesh Paths: ${config.meshPaths.length > 0 ? config.meshPaths.join(', ') : 'none configured'}`);
  console.log(`   Console Logging: ${config.consoleLogLevel}`);
  console.log(`   File Logging: ${config.fileLogEnabled ? config.fileLogLevel : 'disabled'}`);
  console.log(`   Sentry Logging: ${config.sentryEnabled ? config.sentryLogLevel : 'disabled'}`);
  console.log(`   API: ${config.apiEnabled ? 'enabled' : 'disabled'}`);
  console.log(`   SPARQL Endpoint: ${config.sparqlEnabled ? 'enabled' : 'disabled'}`);
  console.log(`   SPARQL GUI: ${config.queryWidgetEnabled ? 'enabled' : 'disabled'}`);
}

/**
 * Log service startup URLs
 */
export function logStartupUrls(config: ServiceConfigAccessor): void {
  const baseUrl = `http://${config.host}:${config.port}`;

  console.log(`📍 Root: ${baseUrl}/`);
  console.log(`📚 API documentation: ${baseUrl}/docs`);
}
