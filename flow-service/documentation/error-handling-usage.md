# Enhanced Error Handling with handleCaughtError

The `handleCaughtError` function provides comprehensive error handling that
integrates with the structured logging system. It handles different error types
appropriately.

## Usage

```typescript
import { handleCaughtError } from "./src/utils/logger.ts";
```

## Basic Usage

```typescript
try {
  // Some operation that might fail
  await riskyOperation();
} catch (e) {
  await handleCaughtError(e, "During risky operation");
}
```

## Examples by Error Type

### Custom Flow Service Errors

```typescript
import {
  ConfigurationError,
  FlowServiceError,
  ValidationError,
} from "./src/utils/errors.ts";

try {
  throw new FlowServiceError(
    "Service initialization failed",
    "INIT_ERROR",
    { component: "mesh-scanner", retryCount: 3 },
  );
} catch (e) {
  await handleCaughtError(e, "During service startup");
}

try {
  throw new ValidationError(
    "Invalid configuration field",
    "port",
    { providedValue: "invalid", expectedType: "number" },
  );
} catch (e) {
  await handleCaughtError(e, "Config validation failed");
}
```

### Standard JavaScript Errors

```typescript
try {
  throw new TypeError("Cannot read property of undefined");
} catch (e) {
  await handleCaughtError(e, "Property access error");
}
```

### Non-Error Values

```typescript
try {
  throw "Something went wrong!";
} catch (e) {
  await handleCaughtError(e, "String error thrown");
}

try {
  throw 404;
} catch (e) {
  await handleCaughtError(e, "HTTP status error");
}
```

## Features

- **Comprehensive Error Type Handling**: Handles Error objects, custom error
  classes, strings, numbers, null, undefined, and complex objects
- **Detailed Logging**: Provides stack traces, error causes, and comprehensive
  context
- **Structured Logging Integration**: Uses the existing LogContext interface for
  rich contextual information
- **Custom Message Support**: Optional custom message to provide additional
  context
- **Fallback Handling**: Graceful degradation if logging itself fails

## Log Output

The function produces structured logs with different levels:

- **ERROR**: Main error message with context
- **DEBUG**: Stack traces, error causes, and detailed error inspection

Example output:

```
[2025-07-15T01:26:03.238Z] ERROR During service startup FlowServiceError: Service initialization failed
[2025-07-15T01:26:03.241Z] DEBUG FlowServiceError stack trace: (op=error-handling)
[2025-07-15T01:26:03.243Z] DEBUG FlowServiceError context: (op=error-handling)
```

## Integration with Existing Systems

The function integrates seamlessly with:

- **File Logging**: Writes structured JSON logs to files when enabled
- **Console Logging**: Provides colorized console output in development
- **Sentry Integration**: Automatically reports errors to Sentry when configured
- **Custom Error Classes**: Special handling for FlowServiceError,
  ValidationError, ConfigurationError, etc.
