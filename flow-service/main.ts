import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { health } from './src/routes/health.ts'
import { createMarkdownFromOpenApi } from '@scalar/openapi-to-markdown'
import { createServiceConfig } from './src/config/index.ts'
import { logStartupConfiguration, logStartupUrls } from './src/utils/startup-logger.ts'
import { handleCaughtError } from './src/utils/logger.ts'

// Initialize configuration system
let config;
try {
  config = await createServiceConfig()
} catch (error) {
  await handleCaughtError(error, 'Failed to initialize service configuration');
  console.error('❌ Service startup failed due to configuration error. Exiting...');
  Deno.exit(1);
}

// Log service startup with configuration info
try {
  logStartupConfiguration(config)
} catch (error) {
  await handleCaughtError(error, 'Failed to log startup configuration');
  console.error('⚠️  Configuration logging failed, but continuing startup...');
}

const app = new OpenAPIHono()

app.get('/', (c) => {
  return c.text('Flow Service - Semantic Mesh Management API')
})

// OpenAPI documentation
const content = {
  openapi: '3.1.0',
  info: {
    version: '0.1.0',
    title: 'Flow Service API',
    description: 'REST API for semantic mesh management and weave processes'
  },
  servers: [
    {
      url: `http://${config.host}:${config.port}`,
      description: 'Configured server'
    }
  ]
}

app.doc('/openapi.json', content)

// Scalar API documentation
app.get('/docs', Scalar({
  url: '/openapi.json',
  pageTitle: 'Semantic Flow Service API',
  theme: 'default',
  layout: 'classic'
}))

let markdown;
try {
  markdown = await createMarkdownFromOpenApi(JSON.stringify(content))
} catch (error) {
  await handleCaughtError(error, 'Failed to generate markdown documentation');
  console.error('⚠️  Markdown generation failed, but continuing startup...');
  markdown = '# API Documentation\n\nDocumentation generation failed.';
}

app.get('/llms.txt', (c) => {
  return c.text(markdown)
})

// Mount health routes
app.route('/api', health)


// Startup logging
try {
  logStartupUrls(config)
} catch (error) {
  await handleCaughtError(error, 'Failed to log startup URLs');
  console.error('⚠️  URL logging failed, but continuing startup...');
}

try {
  Deno.serve({
    port: config.port,
    hostname: config.host
  }, app.fetch)
} catch (error) {
  await handleCaughtError(error, 'Failed to start HTTP server');
  console.error('❌ Server startup failed. Exiting...');
  Deno.exit(1);
}
