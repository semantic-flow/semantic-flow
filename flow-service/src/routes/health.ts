import { Hono } from "@hono/hono";

const healthApp = new Hono()

healthApp.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'flow-service',
    version: '0.1.0'
  })
})

export { healthApp }