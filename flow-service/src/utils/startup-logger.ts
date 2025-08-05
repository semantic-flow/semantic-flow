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

  // TODO: Add methods to accessor for these properties or query directly
  console.log(`   Console Logging: info`);
  console.log(`   File Logging: disabled`);
  console.log(`   Sentry Logging: disabled`);

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
  const baseUrl = `http://${host}:${port}`;

  console.log(`📍 Root: ${baseUrl}/`);
  console.log(`� API documentation: ${baseUrl}${MESH.API_PORTAL_ROUTE}`);
}
