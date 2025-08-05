#!/usr/bin/env -S deno run --allow-all

/**
 * Simple test script to verify file logging functionality
 */

import { createDefaultEnhancedLogger } from '../../../src/utils/logger/index.ts';

// Create logger instance for testing
const logger = createDefaultEnhancedLogger('flow-core-test', '1.0.0');

async function testFileLogging() {
  console.log('🧪 Testing file logging functionality...\n');

  // Test basic logging with context
  logger.info('File logging test started', {
    operation: 'startup',
    component: 'config-resolver',
    metadata: {
      testId: 'file-logging-test-001',
    },
  });

  logger.debug('Debug message with context', {
    operation: 'scan',
    component: 'mesh-scanner',
    performanceMetrics: {
      duration: 125,
    },
    metadata: {
      meshPath: '/test/path',
      nodeCount: 5,
    },
  });

  logger.warn('Warning message with context', {
    operation: 'config-resolve',
    component: 'config-resolver',
    configContext: {
      configPath: 'file',
    },
    metadata: {
      schemaVersion: '1.0.0',
    },
  });

  logger.error('Error message with context', new Error('Test error'), {
    operation: 'api-request',
    component: 'api-handler',
    apiContext: {
      path: '/api/test',
      statusCode: 500,
    },
    errorContext: {
      errorCode: 'TEST_ERROR',
    },
  });

  // Test contextual logger
  const meshLogger = logger.withContext({
    component: 'mesh-scanner',
    operation: 'scan',
    metadata: {
      meshPath: '/test/mesh',
    },
  });

  meshLogger.info('Processing nodes', {
    performanceMetrics: {
      duration: 250,
    },
    metadata: {
      nodeCount: 10,
    },
  });

  meshLogger.info('Scan completed', {
    performanceMetrics: {
      duration: 500,
    },
    metadata: {
      nodeCount: 10,
      fileCount: 25,
    },
  });

  console.log('\n✅ File logging test completed!');
  console.log('📁 Check the logs directory for the generated log file');
  console.log('📄 Log file should contain structured JSON entries');
}

if (import.meta.main) {
  await testFileLogging();
}
