#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env

/**
 * Simple test to verify pretty formatting works without Sentry configuration issues
 */

// Disable Sentry for this test
Deno.env.set('SENTRY_ENABLED', 'false');
Deno.env.set('DENO_ENV', 'development');

import { logger } from './src/utils/logger.ts';

console.log('🧪 Testing pretty file logging format (Sentry disabled)...\n');

// Clear existing log file
try {
  await Deno.remove('./logs/flow-service-dev.log');
  console.log('📄 Cleared existing log file');
} catch (error) {
  console.log(`📄 No existing log file to clear:  ${error}`);
}

// Test different log levels with various contexts
await logger.info('File logging test started', {
  operation: 'startup',
  component: 'config-resolver'
});

await logger.warn('Configuration override detected', {
  operation: 'config-resolve',
  configSource: 'environment'
});

await logger.error('Database connection failed', undefined, {
  operation: 'startup',
  duration: 5000
});

console.log('\n✅ Test logging complete!');
console.log('📄 Checking log file content...\n');

// Read and display the log file contents
try {
  const logContent = await Deno.readTextFile('./logs/flow-service-dev.log');
  console.log('📋 Log file contents:');
  console.log('─'.repeat(80));
  console.log(logContent);
  console.log('─'.repeat(80));

  // Check if logs are in pretty format
  if (logContent.includes('[2025-') && !logContent.startsWith('{"timestamp"')) {
    console.log('✅ SUCCESS: Logs are in pretty format!');
  } else {
    console.log('❌ ISSUE: Logs are still in JSON format');
  }
} catch (error) {
  console.log('❌ Failed to read log file:', error instanceof Error ? error.message : String(error));
}
