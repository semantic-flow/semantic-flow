import { assertEquals, assert } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { singletonServiceConfigAccessor as config } from "../../../src/config/resolution/service-config-accessor.ts";
import { loadEnvConfig } from "../../../src/config/loaders/env-loader.ts";

// TODO: log retention/rotation tests
