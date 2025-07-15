#!/usr/bin/env -S deno run --allow-all

/**
 * Test script to verify Sentry initialization and logging
 */

import { logger, initSentry } from '../../src/utils/logger.ts';
import { getCompleteServiceConfig } from '../../src/config/index.ts';

async function testSentryInit() {
  console.log('🧪 Testing Sentry initialization and logging...\n');

  try {
    // Set environment variables for Sentry
    Deno.env.set('FLOW_SENTRY_ENABLED', 'true');
    Deno.env.set('FLOW_SENTRY_DSN', 'https://5b31ce060f1ccbf2d8cd83efa37f33e8@o4509659529150464.ingest.us.sentry.io/4509659530592256');

    // Also set the old environment variables that the logger expects
    Deno.env.set('SENTRY_ENABLED', 'true');
    Deno.env.set('SENTRY_DSN', 'https://5b31ce060f1ccbf2d8cd83efa37f33e8@o4509659529150464.ingest.us.sentry.io/4509659530592256');

    console.log('📋 Step 1: Loading service configuration...');
    const config = await getCompleteServiceConfig();

    const sentryChannel = config["fsvc:hasLoggingConfig"]["fsvc:hasSentryChannel"];
    console.log('✅ Sentry channel configuration:');
    console.log('  - Enabled:', sentryChannel["fsvc:logChannelEnabled"]);
    console.log('  - Level:', sentryChannel["fsvc:logLevel"]);
    console.log('  - DSN:', sentryChannel["fsvc:sentryDsn"] ? 'configured' : 'not configured');

    console.log('\n📋 Step 2: Explicitly initializing Sentry...');
    initSentry(sentryChannel["fsvc:sentryDsn"] as string);

    // Wait a moment for Sentry to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n📋 Step 3: Testing log levels with explicit Sentry init...');

    console.log('⚠️  Sending WARN message to Sentry...');
    await logger.warn('Sentry test warning with log retention config', {
      operation: 'config-resolve',
      component: 'config-resolver',
      testId: 'sentry-init-warn-test',
      logRetentionDays: 30,
      logMaxFiles: 10,
      logRotationInterval: 'daily'
    });

    console.log('❌ Sending ERROR message to Sentry...');
    await logger.error('Sentry test error with log retention config',
      new Error('Test error for Sentry with log retention'), {
      operation: 'config-resolve',
      component: 'config-resolver',
      testId: 'sentry-init-error-test',
      logRetentionDays: 30,
      logMaxFiles: 10,
      logRotationInterval: 'daily'
    });

    // Force a flush of any pending Sentry events
    console.log('\n📋 Step 4: Waiting for Sentry events to be sent...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n✅ Sentry initialization test completed!');
    console.log('📊 Check your Sentry dashboard for the test messages');
    console.log('🔍 Expected in Sentry: 1 WARN message and 1 ERROR message');

  } catch (error) {
    console.error('❌ Sentry initialization test failed:', error);
    throw error;
  }
}

if (import.meta.main) {
  await testSentryInit();
}
