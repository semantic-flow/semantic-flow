import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { health } from './src/routes/health.ts'
import { createMarkdownFromOpenApi } from '@scalar/openapi-to-markdown'
import { createServiceConfig } from './src/config/index.ts'
import { logStartupConfiguration, logStartupUrls } from './src/utils/startup-logger.ts'

// Initialize configuration system
const config = await createServiceConfig()

// Log service startup with configuration info
logStartupConfiguration(config)

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

const markdown = await createMarkdownFromOpenApi(JSON.stringify(content))

app.get('/llms.txt', (c) => {
  return c.text(markdown)
})

// Mount health routes
app.route('/api', health)


// Startup logging
logStartupUrls(config)

Deno.serve({
  port: config.port,
  hostname: config.host
}, app.fetch)
