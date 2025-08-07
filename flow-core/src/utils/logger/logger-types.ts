/**
 * @fileoverview Core logging types and interfaces for the Semantic Flow platform.
 * These types provide structured logging context and interfaces for consistent
 * logging across all platform modules.
 */

/**
 * Structured logging context interface that provides comprehensive context
 * information for logging operations across the platform.
 */
export interface LogContext {
  /** Operation being performed (e.g., 'startup', 'config-resolve', 'weave', 'scan', 'api-request') */
  operation?: string;

  /** Unique identifier for tracking related log entries */
  operationId?: string;

  /** Component or module generating the log entry */
  component?: string;

  /** Specific function or method name */
  functionName?: string;

  /** Current mesh identifier when applicable */
  meshId?: string;

  /** Current node identifier when applicable */
  nodeId?: string;

  /** Current mesh name for human-readable context */
  meshName?: string;

  /** Current node name for human-readable context */
  nodeName?: string;

  /** Performance metrics for operation timing */
  performanceMetrics?: {
    startTime?: number;
    duration?: number;
    memoryUsage?: number;
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

  /** Service-specific context */
  serviceContext?: {
    serviceName?: string;
    serviceVersion?: string;
    environment?: string;
    instanceId?: string;
  };

  /** SPARQL query context for SPARQL operations */
  sparqlContext?: {
    query?: string;
  };

  /** Additional arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Core structured logger interface that all logger implementations must follow.
 * Provides both simple logging methods and context-aware logging factories.
 */
export interface StructuredLogger {
  /**
   * Log debug information
   * @param message - The log message
   * @param context - Optional logging context
   * @param meta - Additional metadata
   */
  debug(message: string, context?: LogContext, meta?: Record<string, unknown>): void;

  /**
   * Log informational messages
   * @param message - The log message
   * @param context - Optional logging context
   * @param meta - Additional metadata
   */
  info(message: string, context?: LogContext, meta?: Record<string, unknown>): void;

  /**
   * Log warning messages
   * @param message - The log message
   * @param context - Optional logging context
   * @param meta - Additional metadata
   */
  warn(message: string, context?: LogContext, meta?: Record<string, unknown>): void;

  /**
   * Log error messages
   * @param message - The log message
   * @param context - Optional logging context
   * @param meta - Additional metadata
   */
  error(message: string, context?: LogContext, meta?: Record<string, unknown>): void;

  /**
   * Log critical error messages
   * @param message - The log message
   * @param context - Optional logging context
   * @param meta - Additional metadata
   */
  critical(message: string, context?: LogContext, meta?: Record<string, unknown>): void;

  /**
   * Create a contextual logger with pre-filled context
   * @param baseContext - The base context to use for all log entries
   * @returns A new logger instance with the base context applied
   */
  withContext(baseContext: LogContext): StructuredLogger;

  /**
   * Create an operation-scoped logger with operation tracking
   * @param operationName - Name of the operation
   * @param operationId - Optional unique identifier for the operation
   * @returns A new logger instance scoped to the operation
   */
  forOperation(operationName: string, operationId?: string): StructuredLogger;

  /**
   * Create a component-scoped logger
   * @param componentName - Name of the component
   * @returns A new logger instance scoped to the component
   */
  forComponent(componentName: string): StructuredLogger;
}

/**
 * Log level type using lowercase string literals for controlling log output
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

/**
 * Valid log levels array for validation and iteration
 */
export const validLogLevels = ['debug', 'info', 'warn', 'error', 'critical'] as const;

/**
 * Base log channel configuration interface aligned with ontology fsvc:LogChannelConfig
 */
export interface LogChannelConfig {
  /** Whether this logging channel is enabled (fsvc:logChannelEnabled) */
  logChannelEnabled: boolean;

  /** Minimum log level for this channel (fsvc:logLevel) */
  logLevel: LogLevel;

  /** Log format for this channel (fsvc:logFormat) */
  logFormat?: 'json' | 'pretty';
}

/**
 * Console channel configuration interface
 */
export interface ConsoleChannelConfig extends LogChannelConfig {
  // Console channels only need the base properties
}

/**
 * File channel configuration interface
 */
export interface FileChannelConfig extends LogChannelConfig {
  /** Log file path (fsvc:logFilePath) */
  logFilePath?: string;

  /** Log retention days (fsvc:logRetentionDays) */
  logRetentionDays?: number;

  /** Maximum number of log files (fsvc:logMaxFiles) */
  logMaxFiles?: number;

  /** Maximum log file size in bytes (fsvc:logMaxFileSize) */
  logMaxFileSize?: number;

  /** Log rotation interval (fsvc:logRotationInterval) */
  logRotationInterval?: 'daily' | 'weekly' | 'monthly' | 'size-based';
}

/**
 * Sentry channel configuration interface
 */
export interface SentryChannelConfig extends LogChannelConfig {
  /** Sentry DSN for error reporting (fsvc:sentryDsn) */
  sentryDsn?: string;
}

/**
 * Logging configuration interface aligned with ontology fsvc:LoggingConfig
 */
export interface LoggingConfig {
  /** Console logging channel configuration (fsvc:hasConsoleChannel) */
  consoleChannel?: ConsoleChannelConfig;

  /** File logging channel configuration (fsvc:hasFileChannel) */
  fileChannel?: FileChannelConfig;

  /** Sentry logging channel configuration (fsvc:hasSentryChannel) */
  sentryChannel?: SentryChannelConfig;

  /** Service context applied to all logs */
  serviceContext?: {
    serviceName: string;
    serviceVersion: string;
    environment: string;
    instanceId?: string;
  };
}

/**
 * Separate Sentry general configuration (not part of logging config)
 * For tracing and other non-logging Sentry features
 */
export interface SentryConfig {
  /** Sentry DSN */
  dsn: string;

  /** Environment name */
  environment?: string;

  /** Release version */
  release?: string;

  /** Traces sample rate for performance monitoring */
  tracesSampleRate?: number;

  /** Debug mode */
  debug?: boolean;
}

/**
 * Error severity levels for error handling
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error handling options
 */
export interface ErrorHandlingOptions {
  /** Whether to log the error */
  logError?: boolean;

  /** Whether to report to Sentry */
  reportToSentry?: boolean;

  /** Error severity level */
  severity?: ErrorSeverity;

  /** Whether to include stack trace in logs */
  includeStackTrace?: boolean;

  /** Additional context for error reporting */
  context?: LogContext;

  /** Whether to throw the error after handling */
  rethrow?: boolean;
}
