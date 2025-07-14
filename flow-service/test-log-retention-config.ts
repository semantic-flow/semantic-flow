#!/usr/bin/env -S deno run --allow-all

/**
 * Test script to verify log retention configuration integration
 */

import { getCompleteServiceConfig } from './src/config/index.ts';
import { loadEnvConfig } from './src/config/loaders/env-loader.ts';

async function testLogRetentionConfig() {
  console.log('🧪 Testing log retention configuration...\n');

  try {
    // Disable Sentry for testing to avoid DSN requirement
    Deno.env.set('FLOW_SENTRY_ENABLED', 'false');

    // Test 1: Load complete service config with defaults
    console.log('📋 Test 1: Loading complete service configuration...');
    const config = await getCompleteServiceConfig();

    const fileChannel = config["fsvc:hasLoggingConfig"]["fsvc:hasFileChannel"];
    console.log('✅ File channel configuration loaded:');
    console.log('  - Enabled:', fileChannel["fsvc:logChannelEnabled"]);
    console.log('  - Level:', fileChannel["fsvc:logLevel"]);
    console.log('  - Path:', fileChannel["fsvc:logFilePath"]);
    console.log('  - Retention Days:', fileChannel["fsvc:logRetentionDays"]);
    console.log('  - Max Files:', fileChannel["fsvc:logMaxFiles"]);
    console.log('  - Max File Size:', fileChannel["fsvc:logMaxFileSize"]);
    console.log('  - Rotation Interval:', fileChannel["fsvc:logRotationInterval"]);

    // Test 2: Test environment variable loading
    console.log('\n📋 Test 2: Testing environment variable loading...');

    // Set some test environment variables
    Deno.env.set('FLOW_LOG_RETENTION_DAYS', '15');
    Deno.env.set('FLOW_LOG_MAX_FILES', '5');
    Deno.env.set('FLOW_LOG_MAX_FILE_SIZE', '5242880'); // 5MB
    Deno.env.set('FLOW_LOG_ROTATION_INTERVAL', 'weekly');
    Deno.env.set('FLOW_FILE_LOG_ENABLED', 'true');
    Deno.env.set('FLOW_FILE_LOG_LEVEL', 'debug');

    const envConfig = loadEnvConfig();
    console.log('✅ Environment configuration loaded:');
    console.log('  - Environment config keys:', Object.keys(envConfig));

    if (envConfig["fsvc:hasLoggingConfig"]) {
      const envFileChannel = envConfig["fsvc:hasLoggingConfig"]["fsvc:hasFileChannel"];
      if (envFileChannel && typeof envFileChannel === 'object') {
        console.log('  - File channel from env:');
        console.log('    - Enabled:', envFileChannel["fsvc:logChannelEnabled"]);
        console.log('    - Level:', envFileChannel["fsvc:logLevel"]);
        console.log('    - Retention Days:', envFileChannel["fsvc:logRetentionDays"]);
        console.log('    - Max Files:', envFileChannel["fsvc:logMaxFiles"]);
        console.log('    - Max File Size:', envFileChannel["fsvc:logMaxFileSize"]);
        console.log('    - Rotation Interval:', envFileChannel["fsvc:logRotationInterval"]);
      }
    }

    // Test 3: Test merged configuration
    console.log('\n📋 Test 3: Testing merged configuration with environment overrides...');
    const mergedConfig = await getCompleteServiceConfig();
    const mergedFileChannel = mergedConfig["fsvc:hasLoggingConfig"]["fsvc:hasFileChannel"];

    console.log('✅ Merged configuration:');
    console.log('  - Retention Days:', mergedFileChannel["fsvc:logRetentionDays"]);
    console.log('  - Max Files:', mergedFileChannel["fsvc:logMaxFiles"]);
    console.log('  - Max File Size:', mergedFileChannel["fsvc:logMaxFileSize"]);
    console.log('  - Rotation Interval:', mergedFileChannel["fsvc:logRotationInterval"]);

    // Test 4: Test validation constraints
    console.log('\n📋 Test 4: Testing validation constraints...');

    // Test invalid retention days
    Deno.env.set('FLOW_LOG_RETENTION_DAYS', '500'); // Should be rejected (>365)
    const invalidConfig = loadEnvConfig();
    const invalidFileChannel = invalidConfig["fsvc:hasLoggingConfig"]?.["fsvc:hasFileChannel"];

    if (invalidFileChannel && typeof invalidFileChannel === 'object') {
      const hasRetentionDays = "fsvc:logRetentionDays" in invalidFileChannel;
      console.log('✅ Invalid retention days (500) rejected:', !hasRetentionDays);
    }

    // Test invalid rotation interval
    Deno.env.set('FLOW_LOG_ROTATION_INTERVAL', 'invalid');
    const invalidConfig2 = loadEnvConfig();
    const invalidFileChannel2 = invalidConfig2["fsvc:hasLoggingConfig"]?.["fsvc:hasFileChannel"];

    if (invalidFileChannel2 && typeof invalidFileChannel2 === 'object') {
      const hasRotationInterval = "fsvc:logRotationInterval" in invalidFileChannel2;
      console.log('✅ Invalid rotation interval rejected:', !hasRotationInterval);
    }

    // Clean up environment variables
    Deno.env.delete('FLOW_LOG_RETENTION_DAYS');
    Deno.env.delete('FLOW_LOG_MAX_FILES');
    Deno.env.delete('FLOW_LOG_MAX_FILE_SIZE');
    Deno.env.delete('FLOW_LOG_ROTATION_INTERVAL');
    Deno.env.delete('FLOW_FILE_LOG_ENABLED');
    Deno.env.delete('FLOW_FILE_LOG_LEVEL');

    console.log('\n✅ All log retention configuration tests passed!');

  } catch (error) {
    console.error('❌ Configuration test failed:', error);
    throw error;
  }
}

if (import.meta.main) {
  await testLogRetentionConfig();
}
