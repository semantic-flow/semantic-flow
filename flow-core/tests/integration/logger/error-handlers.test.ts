#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env

/**
 * Test script for the handleCaughtError function with LogContext integration
 * This demonstrates the comprehensive error handling capabilities
 */

import {
  handleCaughtError,
  handleError,
  createDefaultEnhancedLogger
} from '../../../src/utils/logger/index.ts';
import type { LogContext } from '../../../src/utils/logger/types.ts';

console.log('🧪 Testing handleCaughtError and handleError functions with LogContext...\n');

// Create logger for testing
const logger = createDefaultEnhancedLogger('flow-core-test', '1.0.0');

// Test 1: handleCaughtError with LogContext
console.log('=== Test 1: handleCaughtError with LogContext ===');
try {
  throw new Error('Service initialization failed');
} catch (e) {
  const context: LogContext = {
    operation: 'startup',
    component: 'mesh-scanner',
    serviceContext: {
      serviceName: 'flow-core-test',
      serviceVersion: '1.0.0'
    },
    metadata: {
      retryCount: 3
    }
  };
  await handleCaughtError(e, 'During service startup', context);
}

console.log('\n=== Test 2: handleCaughtError with complex LogContext ===');
try {
  throw new TypeError('Cannot read property of undefined');
} catch (e) {
  const context: LogContext = {
    operation: 'api-request',
    component: 'api-handler',
    operationId: 'req-123456',
    serviceContext: {
      serviceName: 'flow-core-test',
      serviceVersion: '1.0.0'
    },
    apiContext: {
      path: '/api/test',
      method: 'POST',
      statusCode: 500
    },
    performanceMetrics: {
      duration: 1250
    },
    errorContext: {
      errorCode: 'PROPERTY_ACCESS_ERROR'
    },
    metadata: {
      userId: 'test-user-123',
      requestBody: { test: 'data' }
    }
  };
  await handleCaughtError(e, 'Property access error', context);
}

console.log('\n=== Test 3: handleError with LogContext ===');
const error = new Error('Configuration validation failed');
const context: LogContext = {
  operation: 'config-resolve',
  component: 'config-resolver',
  serviceContext: {
    serviceName: 'flow-core-test',
    serviceVersion: '1.0.0'
  },
  configContext: {
    configPath: 'file:///test/config.json'
  },
  errorContext: {
    errorCode: 'CONFIG_VALIDATION_ERROR',
    errorType: 'ValidationError'
  },
  metadata: {
    violations: ['Missing required field: port', 'Invalid log level']
  }
};
await handleError(error, 'Config validation failed', context);

console.log('\n=== Test 4: handleCaughtError with minimal LogContext ===');
try {
  throw 'Something went wrong!';
} catch (e) {
  const context: LogContext = {
    operation: 'scan',
    component: 'mesh-scanner'
  };
  await handleCaughtError(e, 'String error thrown', context);
}

console.log('\n=== Test 5: Error with nested LogContext merge ===');
try {
  throw new Error('Database connection failed');
} catch (e) {
  const baseContext: LogContext = {
    operation: 'startup',
    component: 'database',
    serviceContext: {
      serviceName: 'flow-core-test',
      serviceVersion: '1.0.0'
    }
  };

  const additionalContext: LogContext = {
    performanceMetrics: {
      duration: 5000
    },
    errorContext: {
      errorCode: 'DB_CONNECTION_TIMEOUT'
    },
    metadata: {
      connectionString: 'postgresql://localhost:5432/test',
      retryAttempts: 3
    }
  };

  // Test context merging
  await handleCaughtError(e, 'Database connection error', {
    ...baseContext,
    ...additionalContext,
    serviceContext: {
      ...baseContext.serviceContext,
      ...additionalContext.serviceContext
    }
  });
}

console.log('\n=== Test 6: LogContext with all optional fields ===');
try {
  throw new Error('Complex operation failed');
} catch (e) {
  const fullContext: LogContext = {
    operation: 'weave',
    component: 'weave-processor',
    operationId: 'weave-op-789',
    serviceContext: {
      serviceName: 'flow-core-test',
      serviceVersion: '1.0.0',
      environment: 'test'
    },
    configContext: {
      configPath: 'memory://config',
      configType: 'memory'
    },
    apiContext: {
      path: '/api/weave',
      method: 'POST',
      statusCode: 500,
      userAgent: 'test-client/1.0'
    },
    performanceMetrics: {
      duration: 2500,
      memoryUsage: 128000000
    },
    errorContext: {
      errorCode: 'WEAVE_OPERATION_FAILED',
      errorType: 'OperationError'
    },
    metadata: {
      meshPath: '/test/mesh',
      nodeCount: 42,
      fileCount: 128,
      timestamp: new Date().toISOString(),
      severity: 'critical',
      retryable: false,
      violations: ['Invalid mesh structure', 'Missing required nodes']
    }
  };

  await handleCaughtError(e, 'Complex weave operation failed', fullContext);
}

console.log('\n✅ All LogContext-enhanced error handling tests completed!');
console.log('📋 Check the logs above to verify proper error handling and LogContext integration.');
