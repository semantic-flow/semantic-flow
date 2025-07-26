import { superoak } from "https://deno.land/x/superoak@4.7.0/mod.ts";
import { createWeaveRoutes } from "../../src/routes/weave.ts";
import { createServiceConfig } from "../../src/config/index.ts";
import { OpenAPIHono } from "@hono/zod-openapi";

Deno.test("POST /api/weave/:nodeSpecifier - valid node specifier", async () => {
  const config = await createServiceConfig();
  const app = new OpenAPIHono();
  const weaveRoutes = createWeaveRoutes(config);
  app.route("/api", weaveRoutes);

  const request = await superoak(app);

  await request.post("/api/weave/test-ns~djradon~underbrush")
    .expect(200)
    .expect("Content-Type", /json/)
    .expect((res: { body: { message: string; nodeSpecifier: string } }) => {
      if (!res.body.message.includes("Weave process completed successfully")) {
        throw new Error("Expected success message");
      }
      if (res.body.nodeSpecifier !== "test-ns~djradon~underbrush") {
        throw new Error("Node specifier mismatch");
      }
    });
});

Deno.test("POST /api/weave/:nodeSpecifier - invalid node specifier", async () => {
  const config = await createServiceConfig();
  const app = new OpenAPIHono();
  const weaveRoutes = createWeaveRoutes(config);
  app.route("/api", weaveRoutes);

  const request = await superoak(app);

  await request.post("/api/weave/invalid!node@specifier")
    .expect(400)
    .expect("Content-Type", /json/)
    .expect((res: { body: { error: string } }) => {
      if (res.body.error !== "Bad Request") {
        throw new Error("Expected Bad Request error");
      }
    });
});
