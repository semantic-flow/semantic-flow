/**
 * @fileoverview Enhanced error handling utilities with LogContext integration.
 * Provides comprehensive error handling with structured logging context for
 * better error tracking and debugging across the platform.
 */

import type { LogContext, ErrorHandlingOptions } from './logger-types.ts';
import { createEnhancedLogger } from './structured-logger.ts';
import { mergeLogContext } from './formatters.ts';

/**
 * Default logger instance for error handling
 */
const errorLogger = createEnhancedLogger();

/**
 * Enhanced error handler that accepts LogContext for structured error reporting.
 * Replaces the basic handleError function with LogContext-aware error handling.
 * 
 * @param error - The error to handle (unknown type for maximum flexibility)
 * @param context - Optional context string describing where the error occurred
 * @param logContext - Optional LogContext with structured information about the operation
 * @param meta - Optional additional metadata
 * @param options - Optional error handling options
 */
export async function handleError(
  error: unknown,
  context?: string,
  logContext?: LogContext,
  meta?: Record<string, unknown>,
  options?: ErrorHandlingOptions,
): Promise<void> {
  try {
    const contextMessage = context ? `${context}: ` : '';

    // Extract error information for structured context
    const errorContext = error instanceof Error ? {
      errorType: error.constructor.name,
      errorCode: (error as any).code,
      stackTrace: error.stack,
      originalError: error
    } : {
      errorType: typeof error,
    };

    // Create comprehensive error context
    const enhancedContext: LogContext = mergeLogContext(
      logContext,
      {
        operation: logContext?.operation || 'error-handling',
        errorContext,
        metadata: {
          ...meta,
          errorValue: error instanceof Error ? error.message : String(error),
        },
      },
    );

    if (error instanceof Error) {
      await errorLogger.error(
        `${contextMessage}${error.message}`,
        error,
        enhancedContext,
      );
    } else {
      await errorLogger.error(
        `${contextMessage}Unknown error occurred`,
        undefined,
        enhancedContext,
      );
    }

    // Handle additional options if provided
    if (options?.rethrow) {
      throw error;
    }
  } catch (loggingError) {
    // Fallback error handling if logging itself fails
    console.error('Failed to log error properly:', loggingError);
    console.error('Original error was:', error);

    if (options?.rethrow) {
      throw error;
    }
  }
}

/**
 * Comprehensive error handler following weave application pattern with LogContext support.
 * Handles different error types with detailed logging including stack traces, causes, and context.
 * Enhanced version of handleCaughtError with LogContext integration.
 *
 * @param e - The caught error of unknown type
 * @param customMessage - Optional custom message to prefix error details
 * @param logContext - Optional LogContext with structured information about the operation
 * @param options - Optional error handling options
 */
export async function handleCaughtError(
  e: unknown,
  customMessage?: string,
  logContext?: LogContext,
  options?: ErrorHandlingOptions,
): Promise<void> {
  try {
    // Create base context for error handling
    const baseContext: LogContext = mergeLogContext(
      logContext,
      {
        operation: logContext?.operation || 'error-handling',
        metadata: { customMessage },
      },
    );

    // Format error message with context if provided
    const formatErrorMsg = (errorType: string, msg: string) => {
      if (customMessage) {
        return `${customMessage} ${errorType}: ${msg}`;
      }
      return `${errorType}: ${msg}`;
    };

    // Log detailed error information with enhanced context
    const logDetailedError = async (error: Error, type = 'Error') => {
      const errorContext = {
        errorType: error.constructor.name,
        errorCode: (error as any).code,
        stackTrace: error.stack,
        originalError: error
      };

      const enhancedContext: LogContext = mergeLogContext(
        baseContext,
        {
          errorContext,
          metadata: {
            ...baseContext.metadata,
            errorName: error.name,
            errorMessage: error.message,
          },
        },
      );

      await errorLogger.error(
        formatErrorMsg(type, error.message),
        error,
        enhancedContext,
      );

      // Log stack trace if available
      if (error.stack) {
        await errorLogger.debug('Stack trace:', {
          ...baseContext,
          metadata: {
            ...baseContext.metadata,
            stackTrace: error.stack
          },
        });
      }

      // Log cause if available
      if (error.cause) {
        await errorLogger.debug('Caused by:', {
          ...baseContext,
          metadata: {
            ...baseContext.metadata,
            errorCause: Deno.inspect(error.cause, { colors: false })
          },
        });
      }

      // Log additional error details
      await errorLogger.debug('Error details:', {
        ...baseContext,
        metadata: {
          ...baseContext.metadata,
          errorDetails: Deno.inspect(error, { colors: false })
        },
      });
    };

    // Handle specific error types with enhanced context
    if (e instanceof Error) {
      // Check for custom Flow Service error types first
      if (e.name === 'FlowServiceError') {
        const fsError = e as Error & { code?: string; context?: unknown };
        const errorContext = {
          errorType: 'FlowServiceError',
          errorCode: fsError.code,
          stackTrace: e.stack,
          originalError: e
        };

        await errorLogger.error(
          formatErrorMsg('FlowServiceError', e.message),
          e,
          mergeLogContext(baseContext, {
            errorContext,
            metadata: {
              ...baseContext.metadata,
              serviceErrorContext: fsError.context,
            },
          }),
        );

        if (e.stack) {
          await errorLogger.debug('FlowServiceError stack trace:', {
            ...baseContext,
            metadata: {
              ...baseContext.metadata,
              stackTrace: e.stack
            },
          });
        }

        if (fsError.context) {
          await errorLogger.debug('FlowServiceError context:', {
            ...baseContext,
            metadata: {
              ...baseContext.metadata,
              serviceContext: Deno.inspect(fsError.context, { colors: false })
            },
          });
        }
      } else if (e.name === 'ValidationError') {
        const valError = e as Error & {
          code?: string;
          field?: string;
          context?: unknown;
        };
        const errorContext = {
          errorType: 'ValidationError',
          errorCode: valError.code,
          stackTrace: e.stack,
          originalError: e
        };

        await errorLogger.error(
          formatErrorMsg('ValidationError', e.message),
          e,
          mergeLogContext(baseContext, {
            errorContext,
            metadata: {
              ...baseContext.metadata,
              field: valError.field,
              validationContext: valError.context,
            },
          }),
        );

        if (e.stack) {
          await errorLogger.debug('ValidationError stack trace:', {
            ...baseContext,
            metadata: {
              ...baseContext.metadata,
              stackTrace: e.stack
            },
          });
        }
      } else if (
        e.name === 'ConfigurationError' || e.name === 'ConfigError' ||
        e.name === 'ConfigValidationError'
      ) {
        const configError = e as Error & {
          code?: string;
          errors?: string[];
          context?: unknown;
        };
        const errorContext = {
          errorType: e.name,
          errorCode: configError.code,
          stackTrace: e.stack,
          originalError: e
        };

        await errorLogger.error(
          formatErrorMsg('ConfigurationError', e.message),
          e,
          mergeLogContext(baseContext, {
            errorContext,
            metadata: {
              ...baseContext.metadata,
              validationErrors: configError.errors,
              configContext: configError.context,
            },
          }),
        );

        if (e.stack) {
          await errorLogger.debug('ConfigurationError stack trace:', {
            ...baseContext,
            metadata: {
              ...baseContext.metadata,
              stackTrace: e.stack
            },
          });
        }

        if (configError.errors) {
          await errorLogger.debug('Configuration validation errors:', {
            ...baseContext,
            metadata: {
              ...baseContext.metadata,
              validationErrors: configError.errors
            },
          });
        }
      } else if (['TypeError', 'ReferenceError', 'SyntaxError', 'RangeError'].includes(e.name)) {
        await logDetailedError(e, e.name);
      } else {
        // Generic Error handling
        await logDetailedError(e, 'Error');
      }
    } else if (typeof e === 'string') {
      // Handle string errors
      await errorLogger.error(
        formatErrorMsg('StringError', e),
        undefined,
        mergeLogContext(baseContext, {
          errorContext: {
            errorType: 'StringError',
          },
          metadata: {
            ...baseContext.metadata,
            errorValue: e,
          },
        }),
      );
    } else if (typeof e === 'number') {
      // Handle numeric errors
      await errorLogger.error(
        formatErrorMsg('NumericError', String(e)),
        undefined,
        mergeLogContext(baseContext, {
          errorContext: {
            errorType: 'NumericError',
          },
          metadata: {
            ...baseContext.metadata,
            errorValue: e,
          },
        }),
      );
    } else if (e === null) {
      // Handle null errors
      await errorLogger.error(
        formatErrorMsg('NullError', 'null value thrown'),
        undefined,
        mergeLogContext(baseContext, {
          errorContext: { errorType: 'NullError' },
        }),
      );
    } else if (e === undefined) {
      // Handle undefined errors
      await errorLogger.error(
        formatErrorMsg('UndefinedError', 'undefined value thrown'),
        undefined,
        mergeLogContext(baseContext, {
          errorContext: { errorType: 'UndefinedError' },
        }),
      );
    } else {
      // Handle any other unknown error types
      await errorLogger.error(
        formatErrorMsg('UnknownError', 'Unknown error type'),
        undefined,
        mergeLogContext(baseContext, {
          errorContext: {
            errorType: 'UnknownError',
          },
          metadata: {
            ...baseContext.metadata,
            errorValue: Deno.inspect(e, { colors: false }),
          },
        }),
      );

      // Log detailed inspection of unknown error
      await errorLogger.debug('Unknown error details:', {
        ...baseContext,
        metadata: {
          ...baseContext.metadata,
          unknownError: Deno.inspect(e, { colors: false, depth: 3 }),
        },
      });
    }

    // Handle additional options if provided
    if (options?.rethrow) {
      throw e;
    }
  } catch (loggingError) {
    // Fallback error handling if logging itself fails
    console.error('Failed to log error properly:', loggingError);
    console.error('Original error was:', e);

    if (options?.rethrow) {
      throw e;
    }
  }
}

/**
 * Convenience wrapper for async operations that automatically handles caught errors
 * with LogContext support.
 * 
 * @param operation - The async operation to wrap
 * @param context - Context description for error messages
 * @param logContext - LogContext for structured logging
 * @param options - Error handling options
 * @returns Promise that resolves to the operation result or undefined if error occurs
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string,
  logContext?: LogContext,
  options?: ErrorHandlingOptions,
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    await handleCaughtError(error, context, logContext, options);
    return undefined;
  }
}

/**
 * Create an error handler with pre-filled LogContext for consistent error reporting
 * within a specific operation or component.
 * 
 * @param baseContext - Base LogContext to apply to all error handling
 * @returns Object with error handling functions that use the base context
 */
export function createContextualErrorHandler(baseContext: LogContext) {
  return {
    handleError: async (
      error: unknown,
      context?: string,
      additionalContext?: LogContext,
      meta?: Record<string, unknown>,
      options?: ErrorHandlingOptions,
    ) => {
      const mergedContext = mergeLogContext(baseContext, additionalContext);
      return handleError(error, context, mergedContext, meta, options);
    },

    handleCaughtError: async (
      error: unknown,
      customMessage?: string,
      additionalContext?: LogContext,
      options?: ErrorHandlingOptions,
    ) => {
      const mergedContext = mergeLogContext(baseContext, additionalContext);
      return handleCaughtError(error, customMessage, mergedContext, options);
    },

    withErrorHandling: async <T>(
      operation: () => Promise<T>,
      context?: string,
      additionalContext?: LogContext,
      options?: ErrorHandlingOptions,
    ): Promise<T | undefined> => {
      const mergedContext = mergeLogContext(baseContext, additionalContext);
      return withErrorHandling(operation, context, mergedContext, options);
    },
  };
}
