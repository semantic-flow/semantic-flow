import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { health } from './src/routes/health.ts'
import { createMarkdownFromOpenApi } from '@scalar/openapi-to-markdown'
import { logger, initSentry } from './src/utils/logger.ts'


// Initialize Sentry with your DSN
initSentry()

// Log service startup
logger.info("Flow Service initializing", { version: "0.1.0" })

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
      url: 'http://localhost:8000',
      description: 'Local server'
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
logger.info('🚀 Flow Service starting...')
logger.info('📍 Root: http://localhost:8000/')
logger.info('❤️ Health check: http://localhost:8000/api/health')
logger.info('📚 API documentation: http://localhost:8000/docs')
logger.info('📋 OpenAPI spec: http://localhost:8000/openapi.json')
logger.info('📄 LLM-friendly docs: http://localhost:8000/llms.txt')

Deno.serve(app.fetch)
