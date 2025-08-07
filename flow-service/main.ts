import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "npm:@scalar/hono-api-reference";
import { health } from "./src/routes/health.ts";
import { createMarkdownFromOpenApi } from "npm:@scalar/openapi-to-markdown";
import {
  createServiceConfig,
  singletonServiceConfigAccessor,
} from "./src/config/index.ts";
import {
  logStartupConfiguration,
  logStartupUrls,
} from "./src/utils/startup-logger.ts";
import { handleCaughtError } from "../flow-core/src/utils/logger/error-handlers.ts";
import type { LogContext } from "../flow-core/src/utils/logger/logger-types.ts";
import { createServiceLogContext } from "./src/utils/service-log-context.ts";
import { MESH } from "../flow-core/src/mesh-constants.ts";
import { setGlobalLoggerConfig } from "../flow-core/src/utils/logger/component-logger.ts";
import { SERVICE_LOGGER_DEFAULT_CONFIG } from "./src/utils/service-logger.ts";
import { getComponentLogger } from "../flow-core/src/utils/logger/component-logger.ts";

// initialize a logger with default config until we can process the service config
setGlobalLoggerConfig(SERVICE_LOGGER_DEFAULT_CONFIG);
let logger = getComponentLogger(import.meta);
logger.info("Starting Flow Service with initial logger configuration");

// Initialize configuration system
try {
  await createServiceConfig();
} catch (error) {
  const context: LogContext = createServiceLogContext({
    operation: "createServiceConfig",
  });
  await handleCaughtError(
    error,
    "Failed to initialize service configuration",
    context,
  );
  Deno.exit(1);
}

// now that config is loaded, reinitialize logger with service context
try {
  const { extractLoggingConfigFromService } = await import(
    "./src/config/logging-config-extractor.ts"
  );
  const loggingConfig = await extractLoggingConfigFromService();
  setGlobalLoggerConfig(loggingConfig);

  // Get a new logger instance with the updated configuration
  logger = getComponentLogger(import.meta);
  logger.info("Logger reinitialized with service configuration");
} catch (error) {
  const context: LogContext = createServiceLogContext({
    operation: "reinitialize-logger",
  });
  await handleCaughtError(
    error,
    "Failed to reinitialize logger with service configuration",
    context,
  );
}

// Log service startup with configuration info
try {
  logStartupConfiguration();
} catch (error) {
  const context: LogContext = createServiceLogContext({
    operation: "logStartupConfiguration",
  });
  await handleCaughtError(
    error,
    "Failed to log startup configuration",
    context,
  );
}

const app = new OpenAPIHono();

app.get("/", (c) => {
  return c.text("Flow Service - Semantic Mesh Management API");
});

// OpenAPI documentation
const content = {
  openapi: "3.1.0",
  info: {
    version: "0.1.0",
    title: "Flow Service API",
    description: "REST API for semantic mesh management and weave processes",
  },
  servers: [
    {
      url: `http://${await singletonServiceConfigAccessor
        .getHost()}:${await singletonServiceConfigAccessor.getPort()}`,
      description: "Configured server",
    },
  ],
};

app.doc("/openapi.json", content);

// Scalar API documentation
app.get(
  MESH.API_PORTAL_ROUTE,
  apiReference({
    spec: { url: "/openapi.json" },
    pageTitle: "Semantic Flow Service API Docs",
    theme: "default",
    layout: "classic",
  }),
);

let markdown;
try {
  markdown = await createMarkdownFromOpenApi(JSON.stringify(content));
} catch (error) {
  const context: LogContext = createServiceLogContext({
    operation: "startup",
  });
  await handleCaughtError(
    error,
    "Failed to generate markdown documentation",
    context,
  );
  markdown = "# API Documentation\n\nDocumentation generation failed.";
}

app.get("/llms.txt", (c) => {
  return c.text(markdown);
});

// Mount health routes
app.route("/api", health);
import { createMeshesRoutes } from "./src/routes/meshes.ts";
import { createWeaveRoutes } from "./src/routes/weave.ts";

const meshes = createMeshesRoutes();
const weave = createWeaveRoutes();

app.route("/api", meshes);
app.route("/api", weave);

// Startup logging
try {
  logStartupUrls();
} catch (error) {
  const context: LogContext = createServiceLogContext({
    operation: "startup",
  });
  await handleCaughtError(error, "Failed to log startup URLs", context);
}

try {
  Deno.serve({
    port: await singletonServiceConfigAccessor.getPort(),
    hostname: await singletonServiceConfigAccessor.getHost(),
  }, app.fetch);
} catch (error) {
  const context: LogContext = createServiceLogContext({
    operation: "startup",
    metadata: {
      serverEndpoint: `http://${await singletonServiceConfigAccessor
        .getHost()}:${await singletonServiceConfigAccessor.getPort()}`,
    },
  });
  await handleCaughtError(error, "Failed to start HTTP server", context);
  Deno.exit(1);
}
