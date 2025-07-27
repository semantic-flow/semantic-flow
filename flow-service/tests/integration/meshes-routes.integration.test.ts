import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("Health endpoint is reachable", async () => {
  const response = await fetch("http://localhost:8080/api/health");
  assertEquals(response.status, 200);
  await response.text(); // consume the body to avoid leaks
});
