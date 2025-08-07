# Error Handling with LogContext Integration

This document describes how to use the enhanced error handling system in the Semantic Flow platform, which provides structured error reporting with comprehensive LogContext integration.

## Overview

The enhanced error handling system provides two main functions:
- `handleError(error, message, context)` - For handling Error objects
- `handleCaughtError(error, message, context)` - For handling any thrown value (errors, strings, objects, etc.)

Both functions accept an optional LogContext parameter that provides structured context information for better error tracking and debugging.

## Basic Usage

### Simple Error Handling

```typescript
import { handleError, handleCaughtError } from '@flow/core/utils/logger';

// Handle a known Error object
const error = new Error('Database connection failed');
await handleError(error, 'Failed to connect to database');

// Handle any caught error
try {
  // some operation
} catch (e) {
  await handleCaughtError(e, 'Operation failed');
}
```

### Error Handling with LogContext

```typescript
import { handleError, handleCaughtError, type LogContext } from '@flow/core/utils/logger';

// Define context for the operation
const context: LogContext = {
  operation: 'startup',
  component: 'database-connector',
  serviceContext: {
    serviceName: 'flow-service',
    serviceVersion: '1.0.0'
  },
  performanceMetrics: {
    duration: 5000
  },
  errorContext: {
    errorCode: 'DB_CONNECTION_TIMEOUT'
  },
  metadata: {
    connectionString: 'postgresql://localhost:5432/flow',
    retryAttempts: 3
  }
};

try {
  await connectToDatabase();
} catch (e) {
  await handleCaughtError(e, 'Database connection failed during startup', context);
}
```

## LogContext Structure

The LogContext interface provides comprehensive context information:

```typescript
interface LogContext {
  /** Operation being performed (e.g., 'startup', 'config-resolve', 'api-request') */
  operation?: string;
  
  /** Unique identifier for tracking related log entries */
  operationId?: string;
  
  /** Component or module generating the log entry */
  component?: string;
  
  /** Performance metrics for operation timing */
  performanceMetrics?: {
    startTime?: number;
    duration?: number;
    memoryUsage?: number;
  };
  
  /** Service-specific context */
  serviceContext?: {
    serviceName?: string;
    serviceVersion?: string;
    environment?: string;
    instanceId?: string;
  };
  
  /** Configuration context when dealing with config operations */
  configContext?: {
    configPath?: string;
    configType?: string;
    validationStage?: string;
  };
  
  /** Error context when logging errors */
  errorContext?: {
    errorType?: string;
    errorCode?: string;
    stackTrace?: string;
    originalError?: Error;
  };
  
  /** API request context for HTTP operations */
  apiContext?: {
    requestId?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    userAgent?: string;
    ip?: string;
  };
  
  /** Additional arbitrary metadata */
  metadata?: Record<string, unknown>;
}
```

## Common Usage Patterns

### Startup Error Handling

```typescript
const context: LogContext = {
  operation: 'startup',
  component: 'service-initialization',
  serviceContext: {
    serviceName: 'flow-service',
    serviceVersion: '1.0.0'
  }
};

try {
  await initializeService();
} catch (e) {
  await handleCaughtError(e, 'Service initialization failed', context);
  process.exit(1);
}
```

### Configuration Error Handling

```typescript
const context: LogContext = {
  operation: 'config-resolve',
  component: 'config-loader',
  configContext: {
    configPath: '/app/config.json',
    configType: 'file'
  },
  serviceContext: {
    serviceName: 'flow-service',
    serviceVersion: '1.0.0'
  }
};

try {
  const config = await loadConfiguration();
} catch (e) {
  await handleCaughtError(e, 'Failed to load configuration', context);
}
```

### API Request Error Handling

```typescript
const context: LogContext = {
  operation: 'api-request',
  component: 'api-handler',
  operationId: requestId,
  apiContext: {
    requestId,
    method: req.method,
    path: req.url,
    statusCode: 500,
    userAgent: req.headers['user-agent']
  },
  serviceContext: {
    serviceName: 'flow-service',
    serviceVersion: '1.0.0'
  },
  performanceMetrics: {
    duration: Date.now() - startTime
  }
};

try {
  const result = await processApiRequest(req);
  res.json(result);
} catch (e) {
  await handleCaughtError(e, 'API request processing failed', context);
  res.status(500).json({ error: 'Internal server error' });
}
```

### Mesh Processing Error Handling

```typescript
const context: LogContext = {
  operation: 'scan',
  component: 'mesh-scanner',
  operationId: `scan-${Date.now()}`,
  serviceContext: {
    serviceName: 'flow-service',
    serviceVersion: '1.0.0'
  },
  performanceMetrics: {
    startTime: Date.now()
  },
  metadata: {
    meshPath: '/data/meshes',
    scanDepth: 'recursive'
  }
};

try {
  const meshes = await scanMeshDirectory('/data/meshes');
} catch (e) {
  await handleCaughtError(e, 'Mesh scanning failed', {
    ...context,
    performanceMetrics: {
      ...context.performanceMetrics,
      duration: Date.now() - context.performanceMetrics!.startTime!
    }
  });
}
```

## Error Types and Handling

### Custom Flow Service Errors

```typescript
import { FlowServiceError, ValidationError, ConfigurationError } from '@flow/service/utils/errors';

// These errors provide additional structured information
try {
  throw new ValidationError('Invalid field value', 'port', { 
    providedValue: 'invalid', 
    expectedType: 'number' 
  });
} catch (e) {
  const context: LogContext = {
    operation: 'config-validate',
    component: 'validator',
    errorContext: {
      errorCode: 'FIELD_VALIDATION_ERROR'
    }
  };
  await handleCaughtError(e, 'Configuration validation failed', context);
}
```

### JavaScript Built-in Errors

```typescript
// Standard JavaScript errors are handled gracefully
try {
  JSON.parse('invalid json');
} catch (e) {
  const context: LogContext = {
    operation: 'config-parse',
    component: 'json-parser',
    errorContext: {
      errorType: 'SyntaxError'
    }
  };
  await handleCaughtError(e, 'JSON parsing failed', context);
}
```

### Non-Error Values

```typescript
// The system handles thrown strings, numbers, objects, etc.
try {
  throw "Something went wrong!";
} catch (e) {
  const context: LogContext = {
    operation: 'unknown',
    component: 'string-error-handler'
  };
  await handleCaughtError(e, 'String error caught', context);
}
```

## Context Merging

LogContext objects can be merged to combine different sources of context:

```typescript
import { mergeLogContext } from '@flow/core/utils/logger';

const baseContext: LogContext = {
  operation: 'weave',
  component: 'weave-processor',
  serviceContext: {
    serviceName: 'flow-service',
    serviceVersion: '1.0.0'
  }
};

const operationContext: LogContext = {
  operationId: 'weave-123',
  performanceMetrics: {
    startTime: Date.now()
  }
};

const mergedContext = mergeLogContext(baseContext, operationContext);

try {
  await processWeaveOperation();
} catch (e) {
  await handleCaughtError(e, 'Weave processing failed', mergedContext);
}
```

## Best Practices

### 1. Always Provide Operation Context
```typescript
// Good
const context: LogContext = {
  operation: 'config-load',
  component: 'config-loader'
};

// Avoid
const context: LogContext = {
  metadata: { someData: true }
};
```

### 2. Include Performance Metrics for Long Operations
```typescript
const startTime = Date.now();
try {
  await longRunningOperation();
} catch (e) {
  const context: LogContext = {
    operation: 'data-processing',
    component: 'processor',
    performanceMetrics: {
      duration: Date.now() - startTime
    }
  };
  await handleCaughtError(e, 'Processing failed', context);
}
```

### 3. Use Unique Operation IDs for Tracking
```typescript
const operationId = `scan-${Date.now()}-${Math.random()}`;
const context: LogContext = {
  operation: 'scan',
  operationId,
  component: 'mesh-scanner'
};
```

### 4. Include Relevant Request Context for API Operations
```typescript
const context: LogContext = {
  operation: 'api-request',
  component: 'api-handler',
  apiContext: {
    requestId: req.id,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent')
  }
};
```

### 5. Add Debugging Metadata
```typescript
const context: LogContext = {
  operation: 'mesh-process',
  component: 'mesh-processor',
  metadata: {
    meshCount: meshes.length,
    processingMode: 'parallel',
    memoryBefore: process.memoryUsage().heapUsed
  }
};
```

## Integration with Logging and Monitoring

The error handling system integrates with:

- **Console Logging**: Formatted error messages with context
- **File Logging**: Structured JSON logs with full context 
- **Sentry Integration**: Automatic error reporting with context as tags
- **Performance Monitoring**: Duration and memory usage tracking

## Error Handler Configuration

Error handlers can be configured through logger configuration:

```typescript
import { createEnhancedLogger } from '@flow/core/utils/logger';

const logger = createEnhancedLogger({
  enableConsole: true,
  enableFile: true, 
  enableSentry: true,
  serviceContext: {
    serviceName: 'my-service',
    serviceVersion: '1.0.0',
    environment: 'production'
  }
});
```

This ensures all error handling uses the configured service context and integrates with the appropriate logging destinations (console, file, Sentry).
