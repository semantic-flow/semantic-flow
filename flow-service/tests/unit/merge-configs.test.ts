/**
 * Unit Tests for mergeConfigs Utility
 *
 * Tests the deep merge functionality used throughout the configuration system.
 * Validates proper handling of nested objects, arrays, primitives, and edge cases.
 */

// @ts-nocheck - Unit tests intentionally test runtime behavior with various data types
import {
  assertEquals,
  assertNotStrictEquals,
} from "../../../flow-core/src/deps.ts";
import { mergeConfigs } from "../../src/utils/merge-configs.ts";

Deno.test("mergeConfigs - Basic object merging", () => {
  const base = {
    name: "base",
    value: 42,
    flag: true,
  };

  const override = {
    value: 100,
    newProp: "added",
  };

  const result = mergeConfigs(base, override);

  assertEquals(result, {
    name: "base",
    value: 100,
    flag: true,
    newProp: "added",
  });
});

Deno.test("mergeConfigs - Deep nested object merging", () => {
  const base = {
    server: {
      host: "localhost",
      port: 8080,
      options: {
        cors: true,
        timeout: 30000,
      },
    },
    database: {
      host: "db.example.com",
      port: 5432,
    },
  };

  const override = {
    server: {
      port: 3000,
      options: {
        timeout: 60000,
        compression: true,
      },
    },
  };

  const result = mergeConfigs(base, override);

  assertEquals(result, {
    server: {
      host: "localhost",
      port: 3000,
      options: {
        cors: true,
        timeout: 60000,
        compression: true,
      },
    },
    database: {
      host: "db.example.com",
      port: 5432,
    },
  });
});

Deno.test("mergeConfigs - Array replacement (not merging)", () => {
  const base = {
    items: ["a", "b", "c"],
    config: {
      values: [1, 2, 3],
    },
  };

  const override = {
    items: ["x", "y"],
    config: {
      values: [9, 8],
    },
  };

  const result = mergeConfigs(base, override);

  assertEquals(result, {
    items: ["x", "y"],
    config: {
      values: [9, 8],
    },
  });
});

Deno.test("mergeConfigs - Null and undefined handling", () => {
  const base = {
    keep: "this",
    replace: "original",
    nullValue: "will stay",
    undefinedValue: "will stay",
  };

  const override = {
    replace: "new value",
    nullValue: null,
    undefinedValue: undefined,
    newProp: "added",
  };

  const result = mergeConfigs(base, override);

  assertEquals(result, {
    keep: "this",
    replace: "new value",
    nullValue: "will stay",
    undefinedValue: "will stay",
    newProp: "added",
  });
});

Deno.test("mergeConfigs - Empty objects", () => {
  const base = { a: 1, b: 2 };
  const emptyOverride = {};

  const result1 = mergeConfigs(base, emptyOverride);
  assertEquals(result1, base);

  const emptyBase = {};
  const override = { x: 1, y: 2 };

  const result2 = mergeConfigs(emptyBase, override);
  assertEquals(result2, override);
});

Deno.test("mergeConfigs - Immutability (no input mutation)", () => {
  const base = {
    nested: {
      value: 42,
    },
  };

  const override = {
    nested: {
      value: 100,
    },
    newProp: "added",
  };

  const originalBase = JSON.parse(JSON.stringify(base));
  const originalOverride = JSON.parse(JSON.stringify(override));

  const result = mergeConfigs(base, override);

  // Verify inputs weren't mutated
  assertEquals(base, originalBase);
  assertEquals(override, originalOverride);

  // Verify result is a new object
  assertNotStrictEquals(result, base);
  assertNotStrictEquals(result, override);
  assertNotStrictEquals(result.nested, base.nested);
});

Deno.test("mergeConfigs - Service configuration merge scenario", () => {
  // Simulate a realistic service configuration merge
  const defaultConfig = {
    "fsvc:port": 8080,
    "fsvc:host": "localhost",
    "fsvc:hasLoggingConfig": {
      "@type": "fsvc:LoggingConfig",
      "fsvc:hasConsoleChannel": {
        "@type": "fsvc:LogChannelConfig",
        "fsvc:logChannelEnabled": true,
        "fsvc:logLevel": "info",
      },
      "fsvc:hasFileChannel": {
        "@type": "fsvc:LogChannelConfig",
        "fsvc:logChannelEnabled": false,
        "fsvc:logLevel": "warn",
      },
    },
  };

  const userConfig = {
    "fsvc:port": 3000,
    "fsvc:hasLoggingConfig": {
      "fsvc:hasConsoleChannel": {
        "fsvc:logLevel": "debug",
      },
      "fsvc:hasFileChannel": {
        "fsvc:logChannelEnabled": true,
        "fsvc:logFilePath": "/var/log/service.log",
      },
    },
  };

  const result = mergeConfigs(defaultConfig, userConfig);

  assertEquals(result, {
    "fsvc:port": 3000,
    "fsvc:host": "localhost",
    "fsvc:hasLoggingConfig": {
      "@type": "fsvc:LoggingConfig",
      "fsvc:hasConsoleChannel": {
        "@type": "fsvc:LogChannelConfig",
        "fsvc:logChannelEnabled": true,
        "fsvc:logLevel": "debug",
      },
      "fsvc:hasFileChannel": {
        "@type": "fsvc:LogChannelConfig",
        "fsvc:logChannelEnabled": true,
        "fsvc:logLevel": "warn",
        "fsvc:logFilePath": "/var/log/service.log",
      },
    },
  });
});

Deno.test("mergeConfigs - Mixed data types", () => {
  const base = {
    string: "text",
    number: 42,
    boolean: true,
    array: [1, 2, 3],
    object: { nested: "value" },
    nullValue: null,
  };

  const override = {
    string: "new text",
    number: 100,
    boolean: false,
    array: ["a", "b"],
    object: { nested: "new value", added: "prop" },
    nullValue: "not null anymore",
  };

  const result = mergeConfigs(base, override);

  assertEquals(result, {
    string: "new text",
    number: 100,
    boolean: false,
    array: ["a", "b"],
    object: { nested: "new value", added: "prop" },
    nullValue: "not null anymore",
  });
});

Deno.test("mergeConfigs - Edge case: Override with null nested object", () => {
  const base = {
    config: {
      enabled: true,
      settings: {
        timeout: 5000,
      },
    },
  };

  const override = {
    config: {
      settings: null,
    },
  };

  const result = mergeConfigs(base, override);

  // Null values are ignored, so settings remains unchanged
  assertEquals(result, {
    config: {
      enabled: true,
      settings: {
        timeout: 5000,
      },
    },
  });
});

Deno.test("mergeConfigs - Deep nesting with multiple levels", () => {
  const base = {
    level1: {
      level2: {
        level3: {
          value: "original",
          keep: "this",
        },
      },
    },
  };

  const override = {
    level1: {
      level2: {
        level3: {
          value: "updated",
        },
      },
    },
  };

  const result = mergeConfigs(base, override);

  assertEquals(result, {
    level1: {
      level2: {
        level3: {
          value: "updated",
          keep: "this",
        },
      },
    },
  });
});

Deno.test("mergeConfigs - Array within nested object", () => {
  const base = {
    config: {
      items: ["a", "b"],
      settings: {
        flags: [1, 2, 3],
      },
    },
  };

  const override = {
    config: {
      items: ["x", "y", "z"],
      settings: {
        flags: [8, 9],
      },
    },
  };

  const result = mergeConfigs(base, override);

  assertEquals(result, {
    config: {
      items: ["x", "y", "z"],
      settings: {
        flags: [8, 9],
      },
    },
  });
});
