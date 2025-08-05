/**
 * Startup Configuration Logger
 *
 * Provides formatted logging for service startup configuration display
 */

import { singletonServiceConfigAccessor as config } from '../config/index.ts';
import { MESH } from '../../../flow-core/src/mesh-constants.ts';
import { resolve } from '../../../flow-core/src/deps.ts';


/**
 * Logs the service startup configuration details with a timestamp in US locale.
 *
 * Outputs mesh paths, logging levels, and feature enablement statuses to the console for the provided configuration.
 */
export async function logStartupConfiguration(): Promise<void> {
  if (!config.isInitialized()) {
    console.error('⚠️ Service configuration is not initialized. Skipping startup logging.');
    Deno.exit(0);
  }


  const now = new Date();
  const timestamp = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }) + ' ' + now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).toLowerCase();

  console.log(
    `🔧 Flow Service initializing at ${timestamp} with configuration:`,
  );

  const meshPaths = await config.getMeshPaths();
  if (meshPaths.length > 0) {
    for (const meshPath of meshPaths) {
      const absolutePath = resolve(Deno.cwd(), meshPath);
      console.log(`   Configured mesh path: ${absolutePath}`);
    }
  } else {
    console.log(`   Mesh Paths: none configured`);
  }


  // Use custom config accessors for logging channels
  try {
    const consoleConfig = await config.getConsoleLoggingConfig();
    console.log(`   Console Logging: ${consoleConfig.enabled ? (consoleConfig.level ?? 'enabled') : 'disabled'}`);
  } catch {
    console.log(`   Console Logging: error fetching config`);
  }

  try {
    const fileConfig = await config.getFileLoggingConfig();
    console.log(`   File Logging: ${fileConfig.enabled ? (fileConfig.level ?? 'enabled') : 'disabled'}`);
  } catch {
    console.log(`   File Logging: error fetching config`);
  }

  try {
    const sentryConfig = await config.getSentryLoggingConfig();
    console.log(`   Sentry Logging: ${sentryConfig.enabled ? (sentryConfig.level ?? 'enabled') : 'disabled'}`);
  } catch {
    console.log(`   Sentry Logging: error fetching config`);
  }

  const enabledServices: string[] = [];
  // TODO: Query service enablement flags from config
  // if (await config.apiEnabled()) enabledServices.push('API');
  // if (await config.sparqlEnabled()) enabledServices.push('SPARQL Endpoint');
  // if (await config.queryWidgetEnabled()) enabledServices.push('SPARQL GUI');

  console.log(
    `   Services: ${enabledServices.length > 0 ? enabledServices.join(', ') : 'none'}`,
  );
}

/**
 * Logs the root service URL and API documentation URL based on the provided configuration.
 *
 */
export async function logStartupUrls(): Promise<void> {
  const host = await config.getHost();
  const port = await config.getPort();
  const scheme = await config.getScheme() || 'http';
  const baseUrl = `${scheme}://${host}:${port}`;

  console.log(`📍 Root: ${baseUrl}/`);
  console.log(`📍 API documentation: ${baseUrl}${MESH.API_PORTAL_ROUTE}`);
}
