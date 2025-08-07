/**
 * @fileoverview Main export file for the flow-core logging system.
 * Provides a comprehensive logging solution with structured context, file logging, and Sentry integration.
 */

// Export all types and interfaces
export type {
  LogContext,
  StructuredLogger,
  LoggingConfig,
  LogChannelConfig,
  ConsoleChannelConfig,
  FileChannelConfig,
  SentryChannelConfig,
  SentryConfig,
  ErrorSeverity,
  ErrorHandlingOptions,
  // Deprecated - use LoggingConfig instead
  LoggerConfig,
} from './logger-types.ts';

export type { LogLevel } from './logger-types.ts';
export { validLogLevels } from './logger-types.ts';

// Export formatting utilities (LogLevel type is now imported from logger-types.ts)
export {
  colorize,
  shouldLog,
  safeSpread,
  formatStructuredMessage,
  formatConsoleMessage,
  extractErrorContext,
  createContextSummary,
  mergeLogContext,
} from './formatters.ts';

// Export main logger implementations and factory functions
export {
  StructuredLoggerImpl,
  EnhancedStructuredLogger,
  createLogger,
  createEnhancedLogger,
} from './structured-logger.ts';

// Export file logging utilities
export type { FileLogger } from './file-logger.ts';
export {
  createFileLogger,
  getGlobalFileLogger,
  resetGlobalFileLogger,
} from './file-logger.ts';

// Export Sentry integration utilities
export {
  initSentry,
  isSentryEnabled,
  reportErrorToSentry,
  reportMessageToSentry,
  setSentryUser,
  addSentryBreadcrumb,
} from './sentry-logger.ts';

// Export error handling utilities
export {
  handleError,
  handleCaughtError,
} from './error-handlers.ts';

// Import types for function signatures
import type { StructuredLogger } from './logger-types.ts';
import type { EnhancedStructuredLogger } from './structured-logger.ts';
import { createLogger, createEnhancedLogger } from './structured-logger.ts';

/**
 * Create a default logger instance with standard configuration
 * @param appName - Application name for context
 * @param appVersion - Application version for context
 * @returns Configured StructuredLogger instance
 */
export function createDefaultLogger(
  appName: string,
  appVersion?: string,
): StructuredLogger {
  return createLogger(
    {
      consoleChannel: {
        logChannelEnabled: true,
        logLevel: 'info',
        logFormat: 'pretty',
      },
      fileChannel: {
        logChannelEnabled: true,
        logLevel: 'info',
        logFormat: 'json',
        logFilePath: './logs/app.log',
      },
      sentryChannel: {
        logChannelEnabled: true,
        logLevel: 'error',
      },
      serviceContext: {
        serviceName: appName,
        serviceVersion: appVersion || 'unknown',
        environment: Deno.env.get('DENO_ENV') || 'development',
      },
    },
    {
      serviceContext: {
        serviceName: appName,
        serviceVersion: appVersion || 'unknown',
        environment: Deno.env.get('DENO_ENV') || 'development',
      },
    },
  );
}

/**
 * Create a default enhanced logger instance with Error object support
 * @param appName - Application name for context
 * @param appVersion - Application version for context
 * @returns Configured EnhancedStructuredLogger instance
 */
export function createDefaultEnhancedLogger(
  appName: string,
  appVersion?: string,
): EnhancedStructuredLogger {
  return createEnhancedLogger(
    {
      consoleChannel: {
        logChannelEnabled: true,
        logLevel: 'info',
        logFormat: 'pretty',
      },
      fileChannel: {
        logChannelEnabled: true,
        logLevel: 'info',
        logFormat: 'json',
        logFilePath: './logs/app.log',
      },
      sentryChannel: {
        logChannelEnabled: true,
        logLevel: 'error',
      },
      serviceContext: {
        serviceName: appName,
        serviceVersion: appVersion || 'unknown',
        environment: Deno.env.get('DENO_ENV') || 'development',
      },
    },
    {
      serviceContext: {
        serviceName: appName,
        serviceVersion: appVersion || 'unknown',
        environment: Deno.env.get('DENO_ENV') || 'development',
      },
    },
  );
}
