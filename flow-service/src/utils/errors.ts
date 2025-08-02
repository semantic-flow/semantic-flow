import { handleError, logger } from './logger.ts';

// Define custom error types (simplified from your weave implementation)
export class FlowServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'FlowServiceError';
  }
}

export class ValidationError extends FlowServiceError {
  constructor(
    message: string,
    public readonly field?: string,
    context?: Record<string, unknown>,
  ) {
    super(message, 'VALIDATION_ERROR', { field, ...context });
    this.name = 'ValidationError';
  }
}

export class ConfigurationError extends FlowServiceError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', context);
    this.name = 'ConfigurationError';
  }
}

// Enhanced error handler 
export function handleServiceError(
  error: unknown,
  context?: string,
  meta?: Record<string, unknown>,
): void {
  if (error instanceof FlowServiceError) {
    // Log structured error with context
    logger.error(`${context ? context + ': ' : ''}${error.message}`, error, {
      code: error.code,
      context: error.context,
      ...meta,
    });
  } else {
    // Use the base error handler from logger
    handleError(error, context, meta);
  }
}

// Middleware-friendly error wrapper
export function wrapAsyncHandler<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>,
  context?: string,
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (error) {
      handleServiceError(error, context, { args: args.length });
      throw error; // Re-throw after logging
    }
  };
}
