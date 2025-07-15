#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env

/**
 * Test script for the handleCaughtError function
 * This demonstrates the comprehensive error handling capabilities
 */

import { handleCaughtError } from './src/utils/logger.ts';
import { FlowServiceError, ValidationError, ConfigurationError } from './src/utils/errors.ts';
import { ConfigError, ConfigValidationError } from './src/config/types.ts';

console.log('🧪 Testing handleCaughtError function...\n');

// Test 1: Custom FlowServiceError
console.log('=== Test 1: FlowServiceError ===');
try {
  throw new FlowServiceError(
    'Service initialization failed',
    'INIT_ERROR',
    { component: 'mesh-scanner', retryCount: 3 }
  );
} catch (e) {
  await handleCaughtError(e, 'During service startup');
}

console.log('\n=== Test 2: ValidationError ===');
try {
  throw new ValidationError(
    'Invalid configuration field',
    'port',
    { providedValue: 'invalid', expectedType: 'number' }
  );
} catch (e) {
  await handleCaughtError(e, 'Config validation failed');
}

console.log('\n=== Test 3: ConfigurationError ===');
try {
  throw new ConfigurationError(
    'Missing required configuration file',
    { configPath: '/missing/config.json' }
  );
} catch (e) {
  await handleCaughtError(e, 'Configuration loading');
}

console.log('\n=== Test 4: ConfigValidationError ===');
try {
  throw new ConfigValidationError(
    'Multiple configuration errors found',
    ['Invalid port number', 'Missing host field', 'Invalid log level'],
    new Error('Schema validation failed')
  );
} catch (e) {
  await handleCaughtError(e, 'Schema validation');
}

console.log('\n=== Test 5: Standard JavaScript Error ===');
try {
  throw new TypeError('Cannot read property of undefined');
} catch (e) {
  await handleCaughtError(e, 'Property access error');
}

console.log('\n=== Test 6: String Error ===');
try {
  throw 'Something went wrong!';
} catch (e) {
  await handleCaughtError(e, 'String error thrown');
}

console.log('\n=== Test 7: Numeric Error ===');
try {
  throw 404;
} catch (e) {
  await handleCaughtError(e, 'HTTP status error');
}

console.log('\n=== Test 8: Null Error ===');
try {
  throw null;
} catch (e) {
  await handleCaughtError(e, 'Null error case');
}

console.log('\n=== Test 9: Undefined Error ===');
try {
  throw undefined;
} catch (e) {
  await handleCaughtError(e, 'Undefined error case');
}

console.log('\n=== Test 10: Complex Object Error ===');
try {
  throw {
    error: 'Custom error object',
    code: 500,
    details: { nested: 'value' }
  };
} catch (e) {
  await handleCaughtError(e, 'Complex object error');
}

console.log('\n=== Test 11: Error with Cause Chain ===');
try {
  const rootCause = new Error('Root cause error');
  const middleError = new Error('Middle error', { cause: rootCause });
  throw new Error('Top-level error', { cause: middleError });
} catch (e) {
  await handleCaughtError(e, 'Error with cause chain');
}

console.log('\n✅ All handleCaughtError tests completed!');
console.log('📋 Check the logs above to verify proper error handling and formatting.');
