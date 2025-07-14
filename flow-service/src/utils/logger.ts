import * as Sentry from 'npm:@sentry/deno';
import { getCompleteServiceConfig } from '../config/index.ts';
import { dirname } from 'https://deno.land/std@0.208.0/path/mod.ts';
import { ensureDir } from 'https://deno.land/std@0.208.0/fs/mod.ts';

// Environment-based configuration
const isDevelopment = Deno.env.get('DENO_ENV') !== 'production'
const logLevel = Deno.env.get('LOG_LEVEL') || (isDevelopment ? 'DEBUG' : 'INFO')

// Log levels (inspired by your weave implementation)
export const LogLevels = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  CRITICAL: 50,
} as const

type LogLevel = keyof typeof LogLevels

// Structured logging interfaces
export interface LogContext {
  // Operation tracking
  operation?: 'scan' | 'weave' | 'validate' | 'config-resolve' | 'api-request' | 'startup';
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
  component?: 'mesh-scanner' | 'api-handler' | 'config-resolver' | 'weave-processor';

  // Arbitrary additional context
  [key: string]: unknown;
}

export interface StructuredLogger {
  debug(message: string, context?: LogContext): Promise<void>;
  info(message: string, context?: LogContext): Promise<void>;
  warn(message: string, context?: LogContext): Promise<void>;
  error(message: string, error?: Error, context?: LogContext): Promise<void>;

  // Contextual logger factories
  withContext(baseContext: LogContext): StructuredLogger;
}

// File logging functionality
class FileLogger {
  private logFile: string;
  private isWriting = false;
  private writeQueue: string[] = [];

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
      const rotatedName = this.logFile.replace('.log', `-${yesterday.toISOString().split('T')[0]}.log`);

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
      const config = await getCompleteServiceConfig();
      const fileChannel = config["fsvc:hasLoggingConfig"]["fsvc:hasFileChannel"];

      if (fileChannel["fsvc:logChannelEnabled"] && fileChannel["fsvc:logFilePath"]) {
        fileLogger = new FileLogger(fileChannel["fsvc:logFilePath"]);
        await fileLogger.rotateIfNeeded();
      }
    } catch (error) {
      console.error(`Failed to initialize file logger: ${error}`);
    }
  }
  return fileLogger;
}

// Initialize Sentry (only in production or when explicitly configured)
const sentryDsn = Deno.env.get('SENTRY_DSN')
let sentryInitialized = false

// Formatters for structured logging
function formatStructuredMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const baseEntry = {
    timestamp,
    level: level.toLowerCase(),
    message,
    service: 'flow-service',
    version: Deno.env.get('FLOW_VERSION'),
    environment: Deno.env.get('DENO_ENV') || 'development',
    ...context
  };

  return JSON.stringify(baseEntry);
}

function formatConsoleMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] ${level.padEnd(5)}`;

  if (isDevelopment) {
    const coloredLevel = level === 'ERROR' || level === 'CRITICAL' ? colorize('red', level) :
      level === 'WARN' ? colorize('yellow', level) :
        level === 'DEBUG' ? colorize('blue', level) :
          colorize('green', level);

    const coloredPrefix = colorize('gray', `[${timestamp}]`) + ` ${coloredLevel.padEnd(5)}`;
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

  return context ? `${prefix} ${message} ${JSON.stringify(context)}` : `${prefix} ${message}`;
}

async function writeToAllChannels(level: LogLevel, message: string, context?: LogContext, error?: Error): Promise<void> {
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

  // Write to file if enabled
  const fileLoggerInstance = await getFileLogger();
  if (fileLoggerInstance) {
    try {
      await fileLoggerInstance.rotateIfNeeded();
      const fileFormatted = formatStructuredMessage(level, message, context);
      await fileLoggerInstance.writeToFile(fileFormatted);
    } catch (err) {
      console.error(`Failed to write to file log: ${err}`);
    }
  }

  // Write to Sentry if enabled
  if (sentryInitialized) {
    try {
      if (error) {
        Sentry.captureException(error, {
          level: level.toLowerCase() as any,
          tags: {
            source: 'flow-service',
            component: context?.component,
            operation: context?.operation
          },
          extra: { message, ...context },
        });
      } else {
        Sentry.captureMessage(message, level.toLowerCase() as any);
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
  const targetDsn = dsn || sentryDsn
  const sentryEnabled = Deno.env.get('SENTRY_ENABLED') === 'true' && !!targetDsn

  console.log(`🔧 DEBUG: SENTRY_ENABLED: ${Deno.env.get('SENTRY_ENABLED')}`)
  console.log(`🔧 DEBUG: Sentry DSN: ${targetDsn ? 'present' : 'missing'}`)
  console.log(`🔧 DEBUG: Sentry enabled: ${sentryEnabled}`)
  console.log(`🔧 DEBUG: Environment: ${isDevelopment ? 'development' : 'production'}`)
  console.log(`🔧 DEBUG: Sentry already initialized: ${sentryInitialized}`)

  if (sentryEnabled && !sentryInitialized) {
    console.log(`🔧 DEBUG: Initializing Sentry...`)
    Sentry.init({
      dsn: targetDsn,
      environment: isDevelopment ? 'development' : 'production',
      debug: isDevelopment,
      tracesSampleRate: isDevelopment ? 1.0 : 0.1,
      // Enable logs to be sent to Sentry (experimental feature)
      _experiments: { enableLogs: true },
    })
    sentryInitialized = true
    console.log(`🔧 DEBUG: Sentry initialized successfully`)
  } else if (Deno.env.get('SENTRY_ENABLED') !== 'true') {
    console.log(`🔧 DEBUG: Sentry disabled - SENTRY_ENABLED is not 'true'`)
  } else if (!targetDsn) {
    console.log(`🔧 DEBUG: Sentry disabled - no DSN provided`)
  } else {
    console.log(`🔧 DEBUG: Sentry already initialized, skipping`)
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
}

function colorize(color: keyof typeof colors, text: string): string {
  if (!isDevelopment) return text
  return `${colors[color]}${text}${colors.reset}`
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = LogLevels[logLevel as LogLevel] || LogLevels.INFO
  return LogLevels[level] >= currentLevel
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] ${level.padEnd(5)}`

  if (isDevelopment) {
    const coloredLevel = level === 'ERROR' || level === 'CRITICAL' ? colorize('red', level) :
      level === 'WARN' ? colorize('yellow', level) :
        level === 'DEBUG' ? colorize('blue', level) :
          colorize('green', level)

    const coloredPrefix = colorize('gray', `[${timestamp}]`) + ` ${coloredLevel.padEnd(5)}`
    return meta ? `${coloredPrefix} ${message} ${Deno.inspect(meta, { colors: true })}` : `${coloredPrefix} ${message}`
  }

  return meta ? `${prefix} ${message} ${JSON.stringify(meta)}` : `${prefix} ${message}`
}

function safeSpread(obj?: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return {}
  return obj as Record<string, unknown>
}

// Structured logger implementation
class StructuredLoggerImpl implements StructuredLogger {
  constructor(private baseContext: LogContext = {}) { }

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

  async error(message: string, error?: Error, context?: LogContext): Promise<void> {
    if (!shouldLog('ERROR')) return;
    const mergedContext = { ...this.baseContext, ...context };
    await writeToAllChannels('ERROR', message, mergedContext, error);
  }

  async critical(message: string, error?: Error, context?: LogContext): Promise<void> {
    const mergedContext = { ...this.baseContext, ...context };
    await writeToAllChannels('CRITICAL', message, mergedContext, error);
  }

  withContext(baseContext: LogContext): StructuredLogger {
    return new StructuredLoggerImpl({ ...this.baseContext, ...baseContext });
  }
}

// Create main logger instance
export const logger = new StructuredLoggerImpl();

// Backward compatibility - export legacy interface
export const legacyLogger = {
  debug(message: string, meta?: Record<string, unknown>) {
    logger.debug(message, meta as LogContext);
  },

  info(message: string, meta?: Record<string, unknown>) {
    logger.info(message, meta as LogContext);
  },

  warn(message: string, meta?: Record<string, unknown>) {
    logger.warn(message, meta as LogContext);
  },

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>) {
    const errorObj = error instanceof Error ? error : undefined;
    const context = error instanceof Error ? meta as LogContext : { error, ...meta } as LogContext;
    logger.error(message, errorObj, context);
  },

  critical(message: string, error?: Error | unknown, meta?: Record<string, unknown>) {
    const errorObj = error instanceof Error ? error : undefined;
    const context = error instanceof Error ? meta as LogContext : { error, ...meta } as LogContext;
    logger.critical(message, errorObj, context);
  },
};

// Enhanced error handler (inspired by your weave handleCaughtError)
export async function handleError(
  error: unknown,
  context?: string,
  meta?: Record<string, unknown>
): Promise<void> {
  const contextMessage = context ? `${context}: ` : ''

  if (error instanceof Error) {
    await logger.error(`${contextMessage}${error.message}`, error, {
      stack: error.stack,
      cause: error.cause ? String(error.cause) : undefined,
      name: error.name,
      ...safeSpread(meta),
    })
  } else {
    await logger.error(`${contextMessage}Unknown error occurred`, undefined, {
      error: String(error),
      ...safeSpread(meta),
    })
  }
}

// Convenience functions for common patterns
export const log = logger // Alias for shorter usage
export { Sentry } // Re-export for direct Sentry usage when needed
