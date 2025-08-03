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
 * Log level enumeration for controlling log output
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
  OFF = 5,
}

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level?: LogLevel;

  /** Whether to enable console output */
  enableConsole?: boolean;

  /** Whether to enable file output */
  enableFile?: boolean;

  /** Whether to enable Sentry integration */
  enableSentry?: boolean;

  /** File logging configuration */
  fileConfig?: {
    logDir?: string;
    maxFileSize?: number;
    maxFiles?: number;
    rotateDaily?: boolean;
  };

  /** Sentry configuration */
  sentryConfig?: {
    dsn?: string;
    environment?: string;
    release?: string;
    sampleRate?: number;
  };

  /** Service context applied to all logs */
  serviceContext?: {
    serviceName: string;
    serviceVersion: string;
    environment: string;
    instanceId?: string;
  };
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
