import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from 'npm:@scalar/hono-api-reference';
import { health } from './src/routes/health.ts';
import { createMarkdownFromOpenApi } from 'npm:@scalar/openapi-to-markdown';
import { createServiceConfig, singletonServiceConfigAccessor } from './src/config/index.ts';
import {
  logStartupConfiguration,
  logStartupUrls,
} from './src/utils/startup-logger.ts';
import { handleCaughtError } from '../flow-core/src/utils/logger/error-handlers.ts';
import { LogContext } from '../flow-core/src/utils/logger/types.ts';
import { MESH } from '../flow-core/src/mesh-constants.ts';

// Initialize configuration system
try {
  await createServiceConfig();
} catch (error) {
  const context: LogContext = {
    operation: 'startup',
    component: 'service-config-init',
    serviceContext: {
      serviceName: 'flow-service',
      serviceVersion: '0.1.0'
    }
  };
  await handleCaughtError(error, 'Failed to initialize service configuration', context);
  console.error(
    '❌ Service startup failed due to configuration error. Exiting...',
  );
  Deno.exit(1);
}

// Log service startup with configuration info
try {
  logStartupConfiguration();
} catch (error) {
  const context: LogContext = {
    operation: 'startup',
    component: 'startup-config-logging',
    serviceContext: {
      serviceName: 'flow-service',
      serviceVersion: '0.1.0'
    }
  };
  await handleCaughtError(error, 'Failed to log startup configuration', context);
  console.error('⚠️  Configuration logging failed, but continuing startup...');
}

const app = new OpenAPIHono();

app.get('/', (c) => {
  return c.text('Flow Service - Semantic Mesh Management API');
});

// OpenAPI documentation
const content = {
  openapi: '3.1.0',
  info: {
    version: '0.1.0',
    title: 'Flow Service API',
    description: 'REST API for semantic mesh management and weave processes',
  },
  servers: [
    {
      url: `http://${await singletonServiceConfigAccessor.getHost()}:${await singletonServiceConfigAccessor.getPort()}`,
      description: 'Configured server',
    },
  ],
};

app.doc('/openapi.json', content);

// Scalar API documentation
app.get(
  MESH.API_PORTAL_ROUTE,
  apiReference({
    spec: { url: '/openapi.json' },
    pageTitle: 'Semantic Flow Service API',
    theme: 'default',
    layout: 'classic',
  }),
);

let markdown;
try {
  markdown = await createMarkdownFromOpenApi(JSON.stringify(content));
} catch (error) {
  const context: LogContext = {
    operation: 'startup',
    component: 'markdown-generation',
    serviceContext: {
      serviceName: 'flow-service',
      serviceVersion: '0.1.0'
    }
  };
  await handleCaughtError(error, 'Failed to generate markdown documentation', context);
  console.error('⚠️  Markdown generation failed, but continuing startup...');
  markdown = '# API Documentation\n\nDocumentation generation failed.';
}

app.get('/llms.txt', (c) => {
  return c.text(markdown);
});

// Mount health routes
app.route('/api', health);
import { createMeshesRoutes } from './src/routes/meshes.ts';
import { createWeaveRoutes } from './src/routes/weave.ts';

const meshes = createMeshesRoutes();
const weave = createWeaveRoutes();

app.route('/api', meshes);
app.route('/api', weave);

// Startup logging
try {
  logStartupUrls();
} catch (error) {
  const context: LogContext = {
    operation: 'startup',
    component: 'startup-url-logging',
    serviceContext: {
      serviceName: 'flow-service',
      serviceVersion: '0.1.0'
    }
  };
  await handleCaughtError(error, 'Failed to log startup URLs', context);
  console.error('⚠️  URL logging failed, but continuing startup...');
}

try {
  Deno.serve({
    port: await singletonServiceConfigAccessor.getPort(),
    hostname: await singletonServiceConfigAccessor.getHost(),
  }, app.fetch);
} catch (error) {
  const context: LogContext = {
    operation: 'startup',
    component: 'http-server-start',
    serviceContext: {
      serviceName: 'flow-service',
      serviceVersion: '0.1.0'
    },
    metadata: {
      serverEndpoint: `http://${await singletonServiceConfigAccessor.getHost()}:${await singletonServiceConfigAccessor.getPort()}`
    }
  };
  await handleCaughtError(error, 'Failed to start HTTP server', context);
  console.error('❌ Server startup failed. Exiting...');
  Deno.exit(1);
}
