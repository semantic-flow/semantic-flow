#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env

/**
 * Direct test of the formatting functions from flow-core
 */

import {
  formatConsoleMessage,
  formatStructuredMessage,
  createContextSummary,
  mergeLogContext
} from '../../../src/utils/logger/index.ts';
import type { LogContext } from '../../../src/utils/logger/types.ts';

console.log('🧪 Testing flow-core formatting functions...\n');

// Test basic console formatting
console.log('=== Test 1: Console Message Formatting ===');
const basicContext: LogContext = {
  operation: 'startup',
  component: 'config-resolver',
  serviceContext: {
    serviceName: 'flow-core-test',
    serviceVersion: '1.0.0'
  }
};

const consoleMsg = formatConsoleMessage('INFO', 'File logging test started', basicContext);
console.log('Formatted console message:', consoleMsg);

// Test structured message formatting
console.log('\n=== Test 2: Structured Message Formatting ===');
const complexContext: LogContext = {
  operation: 'scan',
  component: 'mesh-scanner',
  operationId: 'scan-123',
  serviceContext: {
    serviceName: 'flow-core-test',
    serviceVersion: '1.0.0',
    environment: 'test'
  },
  performanceMetrics: {
    duration: 1250,
    memoryUsage: 128000000
  },
  metadata: {
    meshPath: '/test/mesh',
    nodeCount: 42
  }
};

const structuredMsg = formatStructuredMessage('DEBUG', 'Processing mesh nodes', complexContext);
console.log('Formatted structured message:', JSON.stringify(structuredMsg, null, 2));

// Test context summary creation
console.log('\n=== Test 3: Context Summary Creation ===');
const summaryContext: LogContext = {
  operation: 'api-request',
  component: 'api-handler',
  operationId: 'req-456',
  apiContext: {
    path: '/api/test',
    method: 'POST',
    statusCode: 200
  },
  performanceMetrics: {
    duration: 250
  },
  errorContext: {
    errorCode: 'VALIDATION_ERROR',
    errorType: 'ValidationError'
  },
  metadata: {
    userId: 'test-user',
    requestId: 'req-456'
  }
};

const contextSummary = createContextSummary(summaryContext);
console.log('Context summary:', contextSummary);

// Test context merging
console.log('\n=== Test 4: LogContext Merging ===');
const baseContext: LogContext = {
  operation: 'config-resolve',
  component: 'config-loader',
  serviceContext: {
    serviceName: 'flow-core-test',
    serviceVersion: '1.0.0'
  }
};

const additionalContext: LogContext = {
  operationId: 'config-op-789',
  configContext: {
    configPath: '/test/config.json',
    configType: 'file'
  },
  performanceMetrics: {
    duration: 500
  },
  metadata: {
    configSize: 1024
  }
};

const mergedContext = mergeLogContext(baseContext, additionalContext);
console.log('Merged context:', JSON.stringify(mergedContext, null, 2));

// Test multiple context merges
console.log('\n=== Test 5: Multiple Context Merging ===');
const context1: LogContext = {
  operation: 'weave',
  component: 'weave-processor',
  serviceContext: {
    serviceName: 'flow-core-test',
    serviceVersion: '1.0.0'
  }
};

const context2: LogContext = {
  operationId: 'weave-op-101',
  performanceMetrics: {
    startTime: Date.now(),
    duration: 2000
  }
};

const context3: LogContext = {
  metadata: {
    meshCount: 5,
    nodeCount: 25,
    processingMode: 'parallel'
  },
  apiContext: {
    requestId: 'weave-req-101'
  }
};

const multiMergedContext = mergeLogContext(
  mergeLogContext(context1, context2),
  context3
);
console.log('Multi-merged context:', JSON.stringify(multiMergedContext, null, 2));

console.log('\n✅ All formatting function tests completed!');
console.log('📋 Check the output above to verify proper formatting functionality.');
