#!/usr/bin/env -S deno run --allow-all

/**
 * Test script to verify Sentry logging integration with log retention configuration
 */

import { logger } from "../../src/utils/logger.ts";
import { getCompleteServiceConfig } from "../../src/config/index.ts";

async function testSentryLogging() {
  console.log("🧪 Testing Sentry logging integration...\n");

  try {
    // Set environment variables for Sentry
    Deno.env.set("FLOW_SENTRY_ENABLED", "true");

    // Get DSN from environment (should be loaded from .env file)
    const sentryDsn = Deno.env.get("FLOW_SENTRY_DSN");
    if (!sentryDsn) {
      throw new Error(
        "FLOW_SENTRY_DSN not found in environment. Please check your .env file.",
      );
    }

    // Ensure the DSN is set in the environment for this test
    Deno.env.set("FLOW_SENTRY_DSN", sentryDsn);

    // Test 1: Load service configuration to verify Sentry is enabled
    console.log("📋 Test 1: Loading service configuration...");
    const config = await getCompleteServiceConfig();

    const sentryChannel =
      config["fsvc:hasLoggingConfig"]["fsvc:hasSentryChannel"];
    console.log("✅ Sentry channel configuration:");
    console.log("  - Enabled:", sentryChannel["fsvc:logChannelEnabled"]);
    console.log("  - Level:", sentryChannel["fsvc:logLevel"]);
    console.log(
      "  - DSN:",
      sentryChannel["fsvc:sentryDsn"] ? "configured" : "not configured",
    );

    // Test 2: Test logging at various levels
    console.log("\n📋 Test 2: Testing log levels...");

    console.log(
      "🔍 Sending INFO message (should NOT go to Sentry - below warn level)",
    );
    await logger.info("Test info message for log retention config", {
      operation: "config-resolve",
      component: "config-resolver",
      testId: "sentry-info-test",
    });

    console.log(
      "⚠️  Sending WARN message (should go to Sentry - at warn level)",
    );
    await logger.warn("Test warning message for log retention config", {
      operation: "config-resolve",
      component: "config-resolver",
      testId: "sentry-warn-test",
      logRetentionDays: 30,
      logMaxFiles: 10,
      logRotationInterval: "daily",
    });

    console.log(
      "❌ Sending ERROR message (should go to Sentry - above warn level)",
    );
    await logger.error(
      "Test error message for log retention config",
      new Error("Test error for log retention system"),
      {
        operation: "config-resolve",
        component: "config-resolver",
        testId: "sentry-error-test",
        logRetentionDays: 30,
        logMaxFiles: 10,
        logRotationInterval: "daily",
      },
    );

    // Test 3: Test with contextual logger
    console.log("\n📋 Test 3: Testing contextual logger...");

    const contextualLogger = logger.withContext({
      component: "config-resolver",
      operation: "startup",
      logRetentionDays: 15,
      logMaxFiles: 5,
    });

    await contextualLogger.warn("Log retention configuration test warning", {
      testId: "contextual-warn-test",
      logRotationInterval: "weekly",
    });

    await contextualLogger.error(
      "Log retention configuration test error",
      new Error("Test contextual error"),
      {
        testId: "contextual-error-test",
        logMaxFileSize: 10485760,
      },
    );

    console.log("\n✅ Sentry logging tests completed!");
    console.log("📊 Check your Sentry dashboard for the test messages");
    console.log("🔍 Expected messages in Sentry:");
    console.log("  - 1 WARN message (test warning)");
    console.log("  - 2 ERROR messages (test error + contextual error)");
    console.log("  - 1 contextual WARN message");
    console.log("  - INFO message should NOT appear in Sentry");
  } catch (error) {
    console.error("❌ Sentry logging test failed:", error);
    throw error;
  }
}

if (import.meta.main) {
  await testSentryLogging();
}
