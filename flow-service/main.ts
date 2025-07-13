import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { health } from './src/routes/health.ts'
import { createMarkdownFromOpenApi } from '@scalar/openapi-to-markdown'

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

console.log('🚀 Flow Service starting...')
console.log('📍 Root: http://localhost:8000/')
console.log('❤️ Health check: http://localhost:8000/api/health')
console.log('📚 API documentation: http://localhost:8000/docs')
console.log('📋 OpenAPI spec: http://localhost:8000/openapi.json')

Deno.serve(app.fetch)
