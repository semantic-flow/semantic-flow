import { assertEquals } from '../../../flow-core/src/deps.ts';
import { singletonServiceConfigAccessor } from '../../src/config/resolution/service-config-accessor.ts';
import { createServiceConfig } from '../../src/config/index.ts';
import { buildServiceBaseUri } from '../../src/utils/service-uri-builder.ts';

let baseUrl: string;

Deno.test({
  name: 'Setup service base URL',
  fn: async () => {
    await createServiceConfig();
    const host = await singletonServiceConfigAccessor.getHost();
    const port = await singletonServiceConfigAccessor.getPort();
    const scheme = await singletonServiceConfigAccessor.getScheme() ?? 'http';
    if (!host || !port) {
      throw new Error('Service config could not be resolved');
    }
    baseUrl = buildServiceBaseUri({ scheme, host, port });
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test('Health endpoint is reachable', async () => {
  if (!baseUrl) {
    throw new Error('Base URL not initialized');
  }
  const response = await fetch(`${baseUrl}api/health`);
  assertEquals(response.status, 200);
  await response.text(); // consume the body to avoid leaks
});
