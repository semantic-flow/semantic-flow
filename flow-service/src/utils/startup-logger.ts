/**
 * Startup Configuration Logger
 *
 * Provides formatted logging for service startup configuration display
 */

import type { ServiceConfigAccessor } from "../config/resolution/service-config-resolver.ts";
import { MESH } from "../../../flow-core/src/mesh-constants.ts";
import { resolve } from "../../../flow-core/src/deps.ts";

/**
 * Logs the service startup configuration details with a timestamp in US locale.
 *
 * Outputs mesh paths, logging levels, and feature enablement statuses to the console for the provided configuration.
 */
export function logStartupConfiguration(config: ServiceConfigAccessor): void {
  const now = new Date();
  const timestamp = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }) + " " + now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).toLowerCase();

  console.log(
    `🔧 Flow Service initializing at ${timestamp} with configuration:`,
  );

  if (config.meshPaths.length > 0) {
    for (const meshPath of config.meshPaths) {
      const absolutePath = resolve(Deno.cwd(), meshPath);
      console.log(`   Configured mesh path: ${absolutePath}`);
    }
  } else {
    console.log(`   Mesh Paths: none configured`);
  }

  console.log(`   Console Logging: ${config.consoleLogLevel}`);
  console.log(
    `   File Logging: ${
      config.fileLogEnabled ? config.fileLogLevel : "disabled"
    }`,
  );
  console.log(
    `   Sentry Logging: ${
      config.sentryEnabled ? config.sentryLogLevel : "disabled"
    }`,
  );
  const enabledServices = [];
  if (config.apiEnabled) enabledServices.push("API");
  if (config.sparqlEnabled) enabledServices.push("SPARQL Endpoint");
  if (config.queryWidgetEnabled) enabledServices.push("SPARQL GUI");

  console.log(
    `   Services: ${
      enabledServices.length > 0 ? enabledServices.join(", ") : "none"
    }`,
  );
}

/**
 * Logs the root service URL and API documentation URL based on the provided configuration.
 *
 * @param config - The configuration accessor containing host and port information
 */
export function logStartupUrls(config: ServiceConfigAccessor): void {
  const baseUrl = `http://${config.host}:${config.port}`;

  console.log(`📍 Root: ${baseUrl}/`);
  console.log(`📚 API documentation: ${baseUrl}${MESH.API_PORTAL_ROUTE}`);
}
