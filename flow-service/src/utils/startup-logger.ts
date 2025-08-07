/**
 * Startup Configuration Logger
 *
 * Provides formatted logging for service startup configuration display
 */

import { singletonServiceConfigAccessor as config } from '../config/index.ts';
import { MESH } from '../../../flow-core/src/mesh-constants.ts';
import { resolve } from '../../../flow-core/src/deps.ts';
import { getComponentLogger } from "../../../flow-core/src/utils/logger/component-logger.ts";

const logger = getComponentLogger(import.meta);

/**
 * Logs the service startup configuration details with a timestamp in US locale.
 *
 * Outputs mesh paths, logging levels, and feature enablement statuses to the console for the provided configuration.
 */
export async function logStartupConfiguration(): Promise<void> {
  if (!config.isInitialized()) {
    logger.error('Service configuration is not initialized.');
    Deno.exit(1);
  }


  const meshPaths = await config.getMeshPaths();
  if (meshPaths.length > 0) {
    let message = `Configured mesh paths:`;
    for (const meshPath of meshPaths) {
      const absolutePath = resolve(Deno.cwd(), meshPath);
      message += `\n - ${absolutePath}`;
    }
    logger.info(message);
  } else {
    logger.info(`   Mesh Paths: none configured`);
  }


  // Use custom config accessors for logging channels
  try {
    const consoleConfig = await config.getConsoleLoggingConfig();
    logger.info(`   Console Logging: ${consoleConfig.enabled ? (consoleConfig.level ?? 'enabled') : 'disabled'}`);
  } catch {
    logger.info(`   Console Logging: error fetching config`);
  }

  try {
    const fileConfig = await config.getFileLoggingConfig();
    logger.info(`   File Logging: ${fileConfig.enabled ? (fileConfig.level ?? 'enabled') : 'disabled'}`);
  } catch {
    logger.info(`   File Logging: error fetching config`);
  }

  try {
    const sentryConfig = await config.getSentryLoggingConfig();
    logger.info(`   Sentry Logging: ${sentryConfig.enabled ? (sentryConfig.level ?? 'enabled') : 'disabled'}`);
  } catch {
    logger.info(`   Sentry Logging: error fetching config`);
  }

  const enabledServices: string[] = [];
  // TODO: Query service enablement flags from config
  // if (await config.apiEnabled()) enabledServices.push('API');
  // if (await config.sparqlEnabled()) enabledServices.push('SPARQL Endpoint');
  // if (await config.queryWidgetEnabled()) enabledServices.push('SPARQL GUI');

  logger.info(
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

  logger.info(`📍 Root: ${baseUrl}/`);
  logger.info(`📍 API documentation: ${baseUrl}${MESH.API_PORTAL_ROUTE}`);
}
