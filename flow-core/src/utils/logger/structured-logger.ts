/**
 * @fileoverview Main structured logger implementation that coordinates all logging channels.
 * Integrates console output, file logging, and Sentry error reporting with structured context.
 */

import type { LogContext, StructuredLogger, LoggerConfig } from './logger-types.ts';
import type { LogLevel } from './formatters.ts';
import {
  formatConsoleMessage,
  formatStructuredMessage,
  shouldLog,
  mergeLogContext,
} from './formatters.ts';
import { getGlobalFileLogger, type FileLogger } from './file-logger.ts';
import {
  isSentryEnabled,
  reportErrorToSentry,
  reportMessageToSentry,
} from './sentry-logger.ts';

/**
 * Main structured logger implementation that coordinates all logging outputs
 */
export class StructuredLoggerImpl implements StructuredLogger {
  private baseContext: LogContext;
  private config: LoggerConfig;

  /**
   * Create a new StructuredLogger instance
   * @param baseContext - Base context applied to all log entries
   * @param config - Logger configuration
   */
  constructor(baseContext: LogContext = {}, config: LoggerConfig = {}) {
    this.baseContext = baseContext;
    this.config = {
      enableConsole: true,
      enableFile: true,
      enableSentry: true,
      ...config,
    };
  }

  /**
   * Log debug information
   */
  async debug(
    message: string,
    context?: LogContext,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    if (!shouldLog('DEBUG')) return;
    const mergedContext = this.mergeContexts(context, meta);
    await this.writeToAllChannels('DEBUG', message, mergedContext);
  }

  /**
   * Log informational messages
   */
  async info(
    message: string,
    context?: LogContext,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    if (!shouldLog('INFO')) return;
    const mergedContext = this.mergeContexts(context, meta);
    await this.writeToAllChannels('INFO', message, mergedContext);
  }

  /**
   * Log warning messages
   */
  async warn(
    message: string,
    context?: LogContext,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    if (!shouldLog('WARN')) return;
    const mergedContext = this.mergeContexts(context, meta);
    await this.writeToAllChannels('WARN', message, mergedContext);
  }

  /**
   * Log error messages
   */
  async error(
    message: string,
    context?: LogContext,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    if (!shouldLog('ERROR')) return;
    const mergedContext = this.mergeContexts(context, meta);
    await this.writeToAllChannels('ERROR', message, mergedContext);
  }

  /**
   * Log critical error messages
   */
  async critical(
    message: string,
    context?: LogContext,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    const mergedContext = this.mergeContexts(context, meta);
    await this.writeToAllChannels('CRITICAL', message, mergedContext);
  }

  /**
   * Create a contextual logger with pre-filled context
   */
  withContext(baseContext: LogContext): StructuredLogger {
    const mergedBaseContext = mergeLogContext(this.baseContext, baseContext);
    return new StructuredLoggerImpl(mergedBaseContext, this.config);
  }

  /**
   * Create an operation-scoped logger with operation tracking
   */
  forOperation(operationName: string, operationId?: string): StructuredLogger {
    return this.withContext({
      operation: operationName,
      operationId: operationId || crypto.randomUUID(),
      performanceMetrics: {
        startTime: Date.now(),
      },
    });
  }

  /**
   * Create a component-scoped logger
   */
  forComponent(componentName: string): StructuredLogger {
    return this.withContext({
      component: componentName,
    });
  }

  /**
   * Write log entry to all enabled channels (console, file, Sentry)
   */
  protected async writeToAllChannels(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): Promise<void> {
    // Write to console if enabled
    if (this.config.enableConsole !== false) {
      await this.writeToConsole(level, message, context);
    }

    // Write to file if enabled
    if (this.config.enableFile !== false) {
      await this.writeToFile(level, message, context);
    }

    // Write to Sentry if enabled
    if (this.config.enableSentry !== false && isSentryEnabled()) {
      await this.writeToSentry(level, message, context, error);
    }
  }

  /**
   * Write log entry to console
   */
  private async writeToConsole(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): Promise<void> {
    try {
      const consoleFormatted = formatConsoleMessage(level, message, context);

      switch (level) {
        case 'DEBUG':
        case 'INFO':
          console.log(consoleFormatted);
          break;
        case 'WARN':
          console.warn(consoleFormatted);
          break;
        case 'ERROR':
        case 'CRITICAL':
          console.error(consoleFormatted);
          break;
      }
    } catch (err) {
      console.error(`Failed to write to console: ${err}`);
    }
  }

  /**
   * Write log entry to file
   */
  private async writeToFile(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): Promise<void> {
    try {
      const fileLogger = await getGlobalFileLogger();
      if (fileLogger) {
        await fileLogger.rotateIfNeeded();

        const fileFormatted = formatStructuredMessage(
          level,
          message,
          context,
          this.config.serviceContext,
        );
        await fileLogger.writeToFile(fileFormatted);
      }
    } catch (err) {
      console.error(`Failed to write to file log: ${err}`);
    }
  }

  /**
   * Write log entry to Sentry
   */
  private async writeToSentry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): Promise<void> {
    try {
      if (error) {
        // Error reporting
        reportErrorToSentry(error, level, context, message);
      } else if (level === 'ERROR' || level === 'CRITICAL') {
        // Convert high-level log messages to Sentry messages
        reportMessageToSentry(message, level, context);
      }
      // Note: DEBUG/INFO/WARN messages are typically not sent to Sentry
      // to avoid noise, but this can be configured per use case
    } catch (err) {
      console.error(`Failed to write to Sentry: ${err}`);
    }
  }

  /**
   * Merge base context with provided context and metadata
   */
  protected mergeContexts(
    context?: LogContext,
    meta?: Record<string, unknown>,
  ): LogContext {
    const metaContext: LogContext = meta ? { metadata: meta } : {};
    return mergeLogContext(this.baseContext, context, metaContext);
  }

  /**
   * Get the current base context
   */
  getBaseContext(): LogContext {
    return { ...this.baseContext };
  }

  /**
   * Get the current logger configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Update the logger configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Enhanced structured logger that supports error objects in error/critical methods
 */
export class EnhancedStructuredLogger extends StructuredLoggerImpl {
  /**
   * Log error messages with optional Error object
   */
  override async error(
    message: string,
    errorOrContext?: Error | LogContext,
    context?: LogContext,
  ): Promise<void> {
    if (!shouldLog('ERROR')) return;

    let error: Error | undefined;
    let finalContext: LogContext | undefined;

    if (errorOrContext instanceof Error) {
      error = errorOrContext;
      finalContext = context;
    } else {
      finalContext = errorOrContext;
    }

    const mergedContext = this.mergeContexts(finalContext);
    await this.writeToAllChannels('ERROR', message, mergedContext, error);
  }

  /**
   * Log critical error messages with optional Error object
   */
  override async critical(
    message: string,
    errorOrContext?: Error | LogContext,
    context?: LogContext,
  ): Promise<void> {
    let error: Error | undefined;
    let finalContext: LogContext | undefined;

    if (errorOrContext instanceof Error) {
      error = errorOrContext;
      finalContext = context;
    } else {
      finalContext = errorOrContext;
    }

    const mergedContext = this.mergeContexts(finalContext);
    await this.writeToAllChannels('CRITICAL', message, mergedContext, error);
  }
}

/**
 * Create a new structured logger instance
 * @param config - Logger configuration
 * @param baseContext - Base context for all log entries
 * @returns New StructuredLogger instance
 */
export function createLogger(
  config?: LoggerConfig,
  baseContext?: LogContext,
): StructuredLogger {
  return new StructuredLoggerImpl(baseContext, config);
}

/**
 * Create an enhanced structured logger that supports Error objects
 * @param config - Logger configuration  
 * @param baseContext - Base context for all log entries
 * @returns New EnhancedStructuredLogger instance
 */
export function createEnhancedLogger(
  config?: LoggerConfig,
  baseContext?: LogContext,
): EnhancedStructuredLogger {
  return new EnhancedStructuredLogger(baseContext, config);
}
