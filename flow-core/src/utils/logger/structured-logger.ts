/**
 * @fileoverview Main structured logger implementation that coordinates all logging channels.
 * Integrates console output, file logging, and Sentry error reporting with structured context.
 */

import type { LogContext, StructuredLogger, LoggingConfig, LogLevel } from './logger-types.ts';
import {
  formatConsoleMessage,
  formatStructuredMessage,
  shouldLog,
  mergeLogContext,
} from './formatters.ts';
import { getGlobalFileLogger } from './file-logger.ts';
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
  private config: LoggingConfig;

  /**
   * Create a new StructuredLogger instance
   * @param baseContext - Base context applied to all log entries
   * @param config - Logger configuration
   */
  constructor(baseContext: LogContext = {}, config: LoggingConfig = {}) {
    this.baseContext = baseContext;
    this.config = {
      consoleChannel: {
        logChannelEnabled: true,
        logLevel: 'info',
        logFormat: 'pretty',
      },
      fileChannel: {
        logChannelEnabled: false,
        logLevel: 'info',
        logFormat: 'json',
      },
      sentryChannel: {
        logChannelEnabled: false,
        logLevel: 'error',
      },
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
    if (!shouldLog('debug')) return;
    const mergedContext = this.mergeContexts(context, meta);
    await this.writeToAllChannels('debug', message, mergedContext);
  }

  /**
   * Log informational messages
   */
  async info(
    message: string,
    context?: LogContext,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    if (!shouldLog('info')) return;
    const mergedContext = this.mergeContexts(context, meta);
    await this.writeToAllChannels('info', message, mergedContext);
  }

  /**
   * Log warning messages
   */
  async warn(
    message: string,
    context?: LogContext,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    if (!shouldLog('warn')) return;
    const mergedContext = this.mergeContexts(context, meta);
    await this.writeToAllChannels('warn', message, mergedContext);
  }

  /**
   * Log error messages
   */
  async error(
    message: string,
    context?: LogContext,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    if (!shouldLog('error')) return;
    const mergedContext = this.mergeContexts(context, meta);
    await this.writeToAllChannels('error', message, mergedContext);
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
    await this.writeToAllChannels('critical', message, mergedContext);
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
    // Write to console if enabled and level meets threshold
    if (this.config.consoleChannel?.logChannelEnabled && this.shouldLogToChannel(level, this.config.consoleChannel.logLevel)) {
      this.writeToConsole(level, message, context);
    }

    // Write to file if enabled and level meets threshold
    if (this.config.fileChannel?.logChannelEnabled && this.shouldLogToChannel(level, this.config.fileChannel.logLevel)) {
      await this.writeToFile(level, message, context);
    }

    // Write to Sentry if enabled, level meets threshold, and Sentry is initialized
    if (this.config.sentryChannel?.logChannelEnabled && this.shouldLogToChannel(level, this.config.sentryChannel.logLevel) && isSentryEnabled()) {
      this.writeToSentry(level, message, context, error);
    }
  }

  /**
   * Check if a log level meets the threshold for a specific channel
   */
  private shouldLogToChannel(messageLevel: LogLevel, channelLevel: LogLevel): boolean {
    const messageLevelValue = this.getLogLevelValue(messageLevel);
    const channelLevelValue = this.getLogLevelValue(channelLevel);
    return messageLevelValue >= channelLevelValue;
  }

  /**
   * Get numeric value for log level comparison
   */
  private getLogLevelValue(level: LogLevel): number {
    const levels = { debug: 0, info: 1, warn: 2, error: 3, critical: 4 };
    return levels[level] ?? 1;
  }

  /**
   * Write log entry to console
   */
  private writeToConsole(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): void {
    try {
      const consoleFormatted = formatConsoleMessage(level, message, context);

      switch (level) {
        case 'debug':
        case 'info':
          console.log(consoleFormatted);
          break;
        case 'warn':
          console.warn(consoleFormatted);
          break;
        case 'error':
        case 'critical':
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
  private writeToSentry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): void {
    try {
      if (error) {
        // Error reporting
        reportErrorToSentry(error, level, context, message);
      } else if (level === 'error' || level === 'critical') {
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
  getConfig(): LoggingConfig {
    return { ...this.config };
  }

  /**
   * Update the logger configuration
   */
  updateConfig(config: Partial<LoggingConfig>): void {
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
    if (!shouldLog('error')) return;

    let error: Error | undefined;
    let finalContext: LogContext | undefined;

    if (errorOrContext instanceof Error) {
      error = errorOrContext;
      finalContext = context;
    } else {
      finalContext = errorOrContext;
    }

    const mergedContext = this.mergeContexts(finalContext);
    await this.writeToAllChannels('error', message, mergedContext, error);
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
    await this.writeToAllChannels('critical', message, mergedContext, error);
  }
}

/**
 * Create a new structured logger instance
 * @param config - Logger configuration
 * @param baseContext - Base context for all log entries
 * @returns New StructuredLogger instance
 */
export function createLogger(
  config?: LoggingConfig,
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
  config?: LoggingConfig,
  baseContext?: LogContext,
): EnhancedStructuredLogger {
  return new EnhancedStructuredLogger(baseContext, config);
}
