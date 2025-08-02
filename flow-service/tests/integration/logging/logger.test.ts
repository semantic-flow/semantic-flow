#!/usr/bin/env -S deno run --allow-all

/**
 * Simple test script to verify file logging functionality
 */

import { logger } from '../../../src/utils/logger.ts';

async function testFileLogging() {
  console.log('🧪 Testing file logging functionality...\n');

  // Test basic logging with context
  await logger.info('File logging test started', {
    operation: 'startup',
    component: 'config-resolver',
    testId: 'file-logging-test-001',
  });

  await logger.debug('Debug message with context', {
    operation: 'scan',
    component: 'mesh-scanner',
    meshPath: '/test/path',
    nodeCount: 5,
    duration: 125,
  });

  await logger.warn('Warning message with context', {
    operation: 'config-resolve',
    component: 'config-resolver',
    configSource: 'file',
    schemaVersion: '1.0.0',
  });

  await logger.error('Error message with context', new Error('Test error'), {
    operation: 'api-request',
    component: 'api-handler',
    endpoint: '/api/test',
    statusCode: 500,
    errorCode: 'TEST_ERROR',
  });

  // Test contextual logger
  const meshLogger = logger.withContext({
    component: 'mesh-scanner',
    operation: 'scan',
    meshPath: '/test/mesh',
  });

  await meshLogger.info('Processing nodes', {
    nodeCount: 10,
    duration: 250,
  });

  await meshLogger.info('Scan completed', {
    nodeCount: 10,
    fileCount: 25,
    duration: 500,
  });

  console.log('\n✅ File logging test completed!');
  console.log('📁 Check the logs directory for the generated log file');
  console.log('📄 Log file should contain structured JSON entries');
}

if (import.meta.main) {
  await testFileLogging();
}
