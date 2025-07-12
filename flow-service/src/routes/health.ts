import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

const health = new OpenAPIHono()

const HealthResponse = z.object({
  status: z.string(),
  timestamp: z.string(),
  service: z.string(),
  version: z.string()
})

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['System'],
  summary: 'Service health check',
  description: 'Returns the current health status of the Flow Service',
  responses: {
    200: {
      description: 'Service health status',
      content: {
        'application/json': {
          schema: HealthResponse
        }
      }
    }
  }
})

health.openapi(healthRoute, (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'flow-service',
    version: '1.0.0'
  })
})

export { health }
