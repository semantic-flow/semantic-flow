import { assertEquals } from '../../../flow-core/src/deps.ts';

Deno.test('Health endpoint is reachable', async () => {
  const response = await fetch('http://localhost:8080/api/health');
  assertEquals(response.status, 200);
  await response.text(); // consume the body to avoid leaks
});
