import * as Sentry from 'npm:@sentry/deno';
import { dirname, ensureDir } from '../../../flow-core/src/deps.ts';

// Environment-based configuration
const isDevelopment = Deno.env.get('FLOW_ENV') !== 'production';
const logLevel = Deno.env.get('FLOW_LOG_LEVEL') ||
  (isDevelopment ? 'DEBUG' : 'INFO');

// Log levels (inspired by your weave implementation)
export const LogLevels = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  CRITICAL: 50,
} as const;

type LogLevel = keyof typeof LogLevels;

// Structured logging interfaces
export interface LogContext {
  // Operation tracking
  operation?:
    | 'scan'
    | 'weave'
    | 'validate'
    | 'config-resolve'
    | 'api-request'
    | 'startup'
    | 'error-handling';
  requestId?: string;

  // Mesh/Node context
  meshPath?: string;
  nodePath?: string;
  nodeType?: 'data' | 'namespace' | 'reference';

  // Performance metrics
  duration?: number;
  startTime?: number;
  nodeCount?: number;
  fileCount?: number;

  // Configuration context
  configSource?: 'file' | 'inheritance' | 'defaults' | 'api' | 'environment';
  schemaVersion?: string;

  // Error context
  errorCode?: string;
  violations?: string[];
  cause?: string;

  // API context
  endpoint?: string;
  statusCode?: number;
  userAgent?: string;

  // Service context
  component?:
    | 'mesh-scanner'
    | 'api-handler'
    | 'config-resolver'
    | 'weave-processor';

  // Arbitrary additional context
  [key: string]: unknown;
}

export interface StructuredLogger {
  debug(message: string, context?: LogContext): Promise<void>;
  info(message: string, context?: LogContext): Promise<void>;
  warn(message: string, context?: LogContext): Promise<void>;
  error(message: string, error?: Error, context?: LogContext): Promise<void>;
  critical(message: string, error?: Error, context?: LogContext): Promise<void>;

  // Contextual logger factories
  withContext(baseContext: LogContext): StructuredLogger;
}

// File logging functionality
class FileLogger {
  private logFile: string;
  private isWriting = false;
  private writeQueue: string[] = [];
  private readonly maxQueueSize = 10000; // Configurable limit

  constructor(logFilePath: string) {
    this.logFile = logFilePath;
  }

  async ensureLogDirectory(): Promise<void> {
    try {
      const dir = dirname(this.logFile);
      await ensureDir(dir);
    } catch (error) {
      console.error(`Failed to create log directory: ${error}`);
    }
  }

  async writeToFile(content: string): Promise<void> {
    if (this.writeQueue.length >= this.maxQueueSize) {
      console.error(
        `Log queue full (${this.maxQueueSize} items), dropping oldest entries`,
      );
      this.writeQueue = this.writeQueue.slice(
        -Math.floor(this.maxQueueSize / 2),
      );
    }
    this.writeQueue.push(content);
    if (!this.isWriting) {
      await this.processWriteQueue();
    }
  }

  private async processWriteQueue(): Promise<void> {
    if (this.writeQueue.length === 0) return;

    this.isWriting = true;

    try {
      await this.ensureLogDirectory();

      const content = this.writeQueue.join('\n') + '\n';
      this.writeQueue = [];

      await Deno.writeTextFile(this.logFile, content, { append: true });
    } catch (error) {
      console.error(`Failed to write to log file: ${error}`);
      // Graceful degradation - continue without crashing
    } finally {
      this.isWriting = false;

      // Process any new entries that were added while writing
      if (this.writeQueue.length > 0) {
        await this.processWriteQueue();
      }
    }
  }

  async rotateIfNeeded(): Promise<void> {
    try {
      const stats = await Deno.stat(this.logFile);
      const now = new Date();
      const fileDate = new Date(stats.mtime || stats.birthtime || now);

      // Check if file is from a different day
      if (fileDate.toDateString() !== now.toDateString()) {
        await this.performDailyRotation();
      }
    } catch (error) {
      // File doesn't exist yet, no rotation needed
      if (!(error instanceof Deno.errors.NotFound)) {
        console.error(`Failed to check log file for rotation: ${error}`);
      }
    }
  }

  private async performDailyRotation(): Promise<void> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const rotatedName = this.logFile.replace(
        '.log',
        `-${yesterday.toISOString().split('T')[0]}.log`,
      );

      await Deno.rename(this.logFile, rotatedName);
      console.log(`Log rotated to: ${rotatedName}`);
    } catch (error) {
      console.error(`Failed to rotate log file: ${error}`);
    }
  }
}

// Global file logger instance
let fileLogger: FileLogger | null = null;

async function getFileLogger(): Promise<FileLogger | null> {
  if (!fileLogger) {
    try {
      // Check environment variable first to avoid config dependency during logger initialization
      const fileLogPath = Deno.env.get('FLOW_FILE_LOG_PATH');
      const fileLogEnabled = Deno.env.get('FLOW_FILE_LOG_ENABLED');

      if (fileLogEnabled === 'true' && fileLogPath) {
        fileLogger = new FileLogger(fileLogPath);
        await fileLogger.rotateIfNeeded();
      }
    } catch (error) {
      // Use console.error here to avoid circular dependency with handleCaughtError
      console.error(`Failed to initialize file logger: ${error}`);
    }
  }
  return fileLogger;
}

// Initialize Sentry (only in production or when explicitly configured)
const sentryDsn = Deno.env.get('FLOW_SENTRY_DSN');
let sentryInitialized = false;

// Formatters for structured logging
function formatStructuredMessage(
  level: LogLevel,
  message: string,
  context?: LogContext,
): string {
  const timestamp = new Date().toISOString();
  const baseEntry = {
    timestamp,
    level: level.toLowerCase(),
    message,
    service: 'flow-service',
    version: Deno.env.get('FLOW_VERSION'),
    environment: Deno.env.get('FLOW_ENV') || 'development',
    ...context,
  };

  return JSON.stringify(baseEntry);
}

function formatConsoleMessage(
  level: LogLevel,
  message: string,
  context?: LogContext,
): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] ${level.padEnd(5)}`;

  if (isDevelopment) {
    const coloredLevel = level === 'ERROR' || level === 'CRITICAL'
      ? colorize('red', level)
      : level === 'WARN'
      ? colorize('yellow', level)
      : level === 'DEBUG'
      ? colorize('blue', level)
      : colorize('green', level);

    const coloredPrefix = colorize('gray', `[${timestamp}]`) +
      ` ${coloredLevel.padEnd(5)}`;
    let contextStr = '';

    if (context && Object.keys(context).length > 0) {
      const parts = [];
      if (context.operation) parts.push(`op=${context.operation}`);
      if (context.meshPath) parts.push(`mesh=${context.meshPath}`);
      if (context.duration) parts.push(`${context.duration}ms`);
      if (context.nodeCount) parts.push(`${context.nodeCount} nodes`);
      if (context.component) parts.push(`[${context.component}]`);

      contextStr = parts.length > 0 ? ` (${parts.join(', ')})` : '';
    }

    return `${coloredPrefix} ${message}${contextStr}`;
  }

  return context
    ? `${prefix} ${message} ${JSON.stringify(context)}`
    : `${prefix} ${message}`;
}

async function writeToAllChannels(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error,
): Promise<void> {
  // Write to console
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

  // Write to file if enabled - use fallback to avoid circular dependencies
  const fileLoggerInstance = await getFileLogger();
  if (fileLoggerInstance) {
    try {
      await fileLoggerInstance.rotateIfNeeded();

      // Use JSON format as fallback to avoid config dependency loops
      const fileFormatted = formatStructuredMessage(level, message, context);
      await fileLoggerInstance.writeToFile(fileFormatted);
    } catch (err) {
      console.error(`Failed to write to file log: ${err}`);
    }
  }

  // Write to Sentry if enabled - use basic check to avoid circular dependencies
  if (sentryInitialized) {
    try {
      if (error) {
        // Error reporting
        Sentry.captureException(error, {
          level: level.toLowerCase() as
            | 'debug'
            | 'info'
            | 'warning'
            | 'error'
            | 'fatal',
          tags: {
            source: 'flow-service',
            component: context?.component,
            operation: context?.operation,
          },
          extra: { message, ...context },
        });
      } else {
        // Log message sending
        Sentry.captureMessage(
          message,
          level.toLowerCase() as
            | 'debug'
            | 'info'
            | 'warning'
            | 'error'
            | 'fatal',
        );
        if (context) {
          Sentry.setContext(`${level.toLowerCase()}_context`, context);
        }
      }
    } catch (err) {
      console.error(`Failed to write to Sentry: ${err}`);
    }
  }
}

export function initSentry(dsn?: string) {
  const targetDsn = dsn || sentryDsn;
  const sentryEnabled = Deno.env.get('FLOW_SENTRY_ENABLED') === 'true' &&
    !!targetDsn;

  console.log(`🔧 Sentry enabled in config: ${sentryEnabled}`);

  if (sentryEnabled && !sentryInitialized) {
    console.log(`🔧 Initializing Sentry...`);
    try {
      Sentry.init({
        dsn: targetDsn,
        environment: isDevelopment ? 'development' : 'production',
        debug: isDevelopment,
        tracesSampleRate: isDevelopment ? 1.0 : 0.1,
        // Enable logs to be sent to Sentry (experimental feature)
        _experiments: { enableLogs: true },
      });
      sentryInitialized = true;
      console.log(`🔧 DEBUG: Sentry initialized successfully`);
    } catch (error) {
      // Use console.error here to avoid circular dependency with handleCaughtError
      console.error(`🔧 ERROR: Failed to initialize Sentry: ${error}`);
      console.error(`🔧 ERROR: Sentry will remain disabled`);
    }
  } else if (Deno.env.get('FLOW_SENTRY_ENABLED') !== 'true') {
    console.log(`🔧 Sentry disabled - FLOW_SENTRY_ENABLED is not 'true'`);
  } else if (!targetDsn) {
    console.log(`🔧 Sentry disabled - no DSN provided`);
  } else {
    console.log(`🔧 Sentry already initialized, skipping`);
  }
}

// Console colors (simplified from your weave implementation)
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function colorize(color: keyof typeof colors, text: string): string {
  if (!isDevelopment) return text;
  return `${colors[color]}${text}${colors.reset}`;
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = LogLevels[logLevel as LogLevel] || LogLevels.INFO;
  return LogLevels[level] >= currentLevel;
}

function safeSpread(obj?: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return {};
  return obj as Record<string, unknown>;
}

// Structured logger implementation
class StructuredLoggerImpl implements StructuredLogger {
  constructor(private baseContext: LogContext = {}) {}

  async debug(message: string, context?: LogContext): Promise<void> {
    if (!shouldLog('DEBUG')) return;
    const mergedContext = { ...this.baseContext, ...context };
    await writeToAllChannels('DEBUG', message, mergedContext);
  }

  async info(message: string, context?: LogContext): Promise<void> {
    if (!shouldLog('INFO')) return;
    const mergedContext = { ...this.baseContext, ...context };
    await writeToAllChannels('INFO', message, mergedContext);
  }

  async warn(message: string, context?: LogContext): Promise<void> {
    if (!shouldLog('WARN')) return;
    const mergedContext = { ...this.baseContext, ...context };
    await writeToAllChannels('WARN', message, mergedContext);
  }

  async error(
    message: string,
    error?: Error,
    context?: LogContext,
  ): Promise<void> {
    if (!shouldLog('ERROR')) return;
    const mergedContext = { ...this.baseContext, ...context };
    await writeToAllChannels('ERROR', message, mergedContext, error);
  }

  async critical(
    message: string,
    error?: Error,
    context?: LogContext,
  ): Promise<void> {
    const mergedContext = { ...this.baseContext, ...context };
    await writeToAllChannels('CRITICAL', message, mergedContext, error);
  }

  withContext(baseContext: LogContext): StructuredLogger {
    return new StructuredLoggerImpl({ ...this.baseContext, ...baseContext });
  }
}

// Create main logger instance
export const logger = new StructuredLoggerImpl();

// Enhanced error handler (inspired by your weave handleCaughtError)
export async function handleError(
  error: unknown,
  context?: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  const contextMessage = context ? `${context}: ` : '';

  if (error instanceof Error) {
    await logger.error(`${contextMessage}${error.message}`, error, {
      stack: error.stack,
      cause: error.cause ? String(error.cause) : undefined,
      name: error.name,
      ...safeSpread(meta),
    });
  } else {
    await logger.error(`${contextMessage}Unknown error occurred`, undefined, {
      error: String(error),
      ...safeSpread(meta),
    });
  }
}
/**
 * Comprehensive error handler following weave application pattern.
 * Handles different error types with detailed logging including stack traces, causes, and context.
 *
 * @param e - The caught error of unknown type
 * @param customMessage - Optional custom message to prefix error details
 */
export async function handleCaughtError(
  e: unknown,
  customMessage?: string,
): Promise<void> {
  // Format error message with context if provided
  const formatErrorMsg = (errorType: string, msg: string) => {
    if (customMessage) {
      return `${customMessage} ${errorType}: ${msg}`;
    }
    return `${errorType}: ${msg}`;
  };

  // Log detailed error information
  const logDetailedError = async (error: Error, type = 'Error') => {
    await logger.error(formatErrorMsg(type, error.message), error, {
      errorType: type,
      errorName: error.name,
      customMessage,
    });

    // Log stack trace if available
    if (error.stack) {
      await logger.debug('Stack trace:', {
        stack: error.stack,
        operation: 'error-handling',
      });
    }

    // Log cause if available
    if (error.cause) {
      await logger.debug('Caused by:', {
        cause: Deno.inspect(error.cause, { colors: false }),
        operation: 'error-handling',
      });
    }

    // Log additional error details
    await logger.debug('Error details:', {
      errorDetails: Deno.inspect(error, { colors: false }),
      operation: 'error-handling',
    });
  };

  // Handle specific error types
  try {
    if (e instanceof Error) {
      // Check for custom Flow Service error types first
      if (e.name === 'FlowServiceError') {
        const fsError = e as Error & { code?: string; context?: unknown };
        await logger.error(formatErrorMsg('FlowServiceError', e.message), e, {
          errorType: 'FlowServiceError',
          errorCode: fsError.code,
          errorContext: fsError.context,
          customMessage,
        });

        if (e.stack) {
          await logger.debug('FlowServiceError stack trace:', {
            stack: e.stack,
            operation: 'error-handling',
          });
        }

        if (fsError.context) {
          await logger.debug('FlowServiceError context:', {
            context: Deno.inspect(fsError.context, { colors: false }),
            operation: 'error-handling',
          });
        }
      } else if (e.name === 'ValidationError') {
        const valError = e as Error & {
          code?: string;
          field?: string;
          context?: unknown;
        };
        await logger.error(formatErrorMsg('ValidationError', e.message), e, {
          errorType: 'ValidationError',
          errorCode: valError.code,
          field: valError.field,
          errorContext: valError.context,
          customMessage,
        });

        if (e.stack) {
          await logger.debug('ValidationError stack trace:', {
            stack: e.stack,
            operation: 'error-handling',
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
        await logger.error(formatErrorMsg('ConfigurationError', e.message), e, {
          errorType: e.name,
          errorCode: configError.code,
          errors: configError.errors, // For ConfigValidationError
          errorContext: configError.context,
          customMessage,
        });

        if (e.stack) {
          await logger.debug('ConfigurationError stack trace:', {
            stack: e.stack,
            operation: 'error-handling',
          });
        }

        if (configError.errors) {
          await logger.debug('Configuration validation errors:', {
            validationErrors: configError.errors,
            operation: 'error-handling',
          });
        }
      } else if (e.name === 'TypeError') {
        await logDetailedError(e, 'TypeError');
      } else if (e.name === 'ReferenceError') {
        await logDetailedError(e, 'ReferenceError');
      } else if (e.name === 'SyntaxError') {
        await logDetailedError(e, 'SyntaxError');
      } else if (e.name === 'RangeError') {
        await logDetailedError(e, 'RangeError');
      } else {
        // Generic Error handling
        await logDetailedError(e, 'Error');
      }
    } else if (typeof e === 'string') {
      // Handle string errors
      await logger.error(formatErrorMsg('StringError', e), undefined, {
        errorType: 'StringError',
        errorValue: e,
        customMessage,
      });
    } else if (typeof e === 'number') {
      // Handle numeric errors
      await logger.error(formatErrorMsg('NumericError', String(e)), undefined, {
        errorType: 'NumericError',
        errorValue: e,
        customMessage,
      });
    } else if (e === null) {
      // Handle null errors
      await logger.error(
        formatErrorMsg('NullError', 'null value thrown'),
        undefined,
        {
          errorType: 'NullError',
          customMessage,
        },
      );
    } else if (e === undefined) {
      // Handle undefined errors
      await logger.error(
        formatErrorMsg('UndefinedError', 'undefined value thrown'),
        undefined,
        {
          errorType: 'UndefinedError',
          customMessage,
        },
      );
    } else {
      // Handle any other unknown error types
      await logger.error(
        formatErrorMsg('UnknownError', 'Unknown error type'),
        undefined,
        {
          errorType: 'UnknownError',
          errorValue: Deno.inspect(e, { colors: false }),
          customMessage,
        },
      );

      // Log detailed inspection of unknown error
      await logger.debug('Unknown error details:', {
        unknownError: Deno.inspect(e, { colors: false, depth: 3 }),
        operation: 'error-handling',
      });
    }
  } catch (loggingError) {
    // Fallback error handling if logging itself fails
    console.error('Failed to log error properly:', loggingError);
    console.error('Original error was:', e);
  }
}

// Convenience functions for common patterns
export const log = logger; // Alias for shorter usage
export { Sentry }; // Re-export for direct Sentry usage when needed
