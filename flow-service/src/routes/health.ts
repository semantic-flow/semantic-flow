import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { logger } from '../utils/logger.ts';
import { getUptimeInfo } from '../utils/uptime.ts';
import { Context } from 'jsr:@hono/hono';

const health = new OpenAPIHono();

const HealthResponse = z.object({
  status: z.string(),
  timestamp: z.string(),
  service: z.string(),
  version: z.string(),
  uptime: z.object({
    startTime: z.string(),
    uptimeSeconds: z.number(),
    uptimeFormatted: z.string()
  })
});

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
});

health.openapi(healthRoute, (c) => {
  logger.debug('Health check requested', {
    userAgent: c.req.header('user-agent'),
    ip: c.req.header('x-forwarded-for') || 'unknown'
  });

  const uptimeInfo = getUptimeInfo();

  const response = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'flow-service',
    version: '1.0.0',
    uptime: uptimeInfo
  };

  logger.info('Health check completed', { status: response.status });
  return c.json(response);
});

export { health };
