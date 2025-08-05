/**
 * @fileoverview Sentry integration for error reporting and logging.
 * Provides centralized Sentry configuration and error reporting functionality.
 */

import { Sentry } from '../../deps.ts';
import type { LogContext } from './logger-types.ts';
import type { LogLevel } from './formatters.ts';
import { extractErrorContext } from './formatters.ts';

/**
 * Sentry initialization state
 */
let sentryInitialized = false;

/**
 * Sentry configuration options
 */
export interface SentryConfig {
  /** Sentry DSN for error reporting */
  dsn: string;
  /** Environment name (development, staging, production) */
  environment?: string;
  /** Release version identifier */
  release?: string;
  /** Debug mode for Sentry (enables verbose logging) */
  debug?: boolean;
  /** Traces sample rate (0.0 to 1.0) */
  tracesSampleRate?: number;
  /** Enable experimental logs feature */
  enableLogs?: boolean;
}

/**
 * Initialize Sentry with the provided configuration
 * @param config - Sentry configuration options
 * @param dsn - Optional DSN override
 */
export function initSentry(config?: SentryConfig, dsn?: string): void {
  const isDevelopment = Deno.env.get('FLOW_ENV') !== 'production';
  const sentryDsn = dsn || config?.dsn || Deno.env.get('FLOW_SENTRY_DSN');
  const sentryEnabled = Deno.env.get('FLOW_SENTRY_ENABLED') === 'true' && !!sentryDsn;

  console.log(`🔧 Sentry enabled in config: ${sentryEnabled}`);

  if (sentryEnabled && !sentryInitialized) {
    console.log(`🔧 Initializing Sentry...`);
    try {
      Sentry.init({
        dsn: sentryDsn,
        environment: config?.environment || (isDevelopment ? 'development' : 'production'),
        debug: config?.debug ?? isDevelopment,
        tracesSampleRate: config?.tracesSampleRate ?? (isDevelopment ? 1.0 : 0.1),
        release: config?.release || Deno.env.get('FLOW_VERSION'),
        // Enable logs to be sent to Sentry (experimental feature)
        _experiments: {
          enableLogs: config?.enableLogs ?? true
        },
      });
      sentryInitialized = true;
      console.log(`🔧 DEBUG: Sentry initialized successfully`);
    } catch (error) {
      // Use console.error here to avoid circular dependency with error handlers
      console.error(`🔧 ERROR: Failed to initialize Sentry: ${error}`);
      console.error(`🔧 ERROR: Sentry will remain disabled`);
    }
  } else if (Deno.env.get('FLOW_SENTRY_ENABLED') !== 'true') {
    console.log(`🔧 Sentry disabled - FLOW_SENTRY_ENABLED is not 'true'`);
  } else if (!sentryDsn) {
    console.log(`🔧 Sentry disabled - no DSN provided`);
  } else {
    console.log(`🔧 Sentry already initialized, skipping`);
  }
}

/**
 * Check if Sentry is currently initialized and enabled
 * @returns True if Sentry is ready to accept events
 */
export function isSentryEnabled(): boolean {
  return sentryInitialized;
}

/**
 * Report an error to Sentry with structured context
 * @param error - Error object to report
 * @param level - Log level for the error
 * @param context - Logging context for additional information
 * @param message - Optional custom message
 */
export function reportErrorToSentry(
  error: Error,
  level: LogLevel,
  context?: LogContext,
  message?: string,
): void {
  if (!sentryInitialized) return;

  try {
    const sentryLevel = mapLogLevelToSentry(level);
    const errorContext = extractErrorContext(context);

    Sentry.captureException(error, {
      level: sentryLevel,
      tags: {
        source: 'flow-platform',
        component: context?.component,
        operation: context?.operation,
        meshId: context?.meshId,
        nodeId: context?.nodeId,
      },
      extra: {
        message: message || error.message,
        operationId: context?.operationId,
        functionName: context?.functionName,
        ...errorContext,
        ...context?.metadata,
      },
      contexts: {
        operation: {
          name: context?.operation,
          id: context?.operationId,
          startTime: context?.performanceMetrics?.startTime,
          duration: context?.performanceMetrics?.duration,
        },
        mesh: {
          id: context?.meshId,
          name: context?.meshName,
        },
        node: {
          id: context?.nodeId,
          name: context?.nodeName,
        },
        api: context?.apiContext ? {
          requestId: context.apiContext.requestId,
          method: context.apiContext.method,
          path: context.apiContext.path,
          statusCode: context.apiContext.statusCode,
          userAgent: context.apiContext.userAgent,
          ip: context.apiContext.ip,
        } : undefined,
        config: context?.configContext ? {
          configPath: context.configContext.configPath,
          configType: context.configContext.configType,
          validationStage: context.configContext.validationStage,
        } : undefined,
      },
    });
  } catch (err) {
    console.error(`Failed to report error to Sentry: ${err}`);
  }
}

/**
 * Send a message to Sentry
 * @param message - Message to send
 * @param level - Log level for the message
 * @param context - Optional logging context
 */
export function reportMessageToSentry(
  message: string,
  level: LogLevel,
  context?: LogContext,
): void {
  if (!sentryInitialized) return;

  try {
    const sentryLevel = mapLogLevelToSentry(level);

    Sentry.captureMessage(message, sentryLevel);

    if (context) {
      const contextKey = `${level.toLowerCase()}_context`;
      Sentry.setContext(contextKey, extractErrorContext(context));
    }
  } catch (err) {
    console.error(`Failed to send message to Sentry: ${err}`);
  }
}

/**
 * Set user context in Sentry
 * @param user - User information
 */
export function setSentryUser(user: {
  id?: string;
  email?: string;
  username?: string;
  ip_address?: string;
}): void {
  if (!sentryInitialized) return;

  try {
    Sentry.setUser(user);
  } catch (err) {
    console.error(`Failed to set Sentry user: ${err}`);
  }
}

/**
 * Add breadcrumb to Sentry for debugging
 * @param message - Breadcrumb message
 * @param category - Breadcrumb category
 * @param level - Breadcrumb level
 * @param data - Additional data
 */
export function addSentryBreadcrumb(
  message: string,
  category?: string,
  level?: 'debug' | 'info' | 'warning' | 'error' | 'fatal',
  data?: Record<string, unknown>,
): void {
  if (!sentryInitialized) return;

  try {
    Sentry.addBreadcrumb({
      message,
      category: category || 'default',
      level: level || 'info',
      data,
      timestamp: Date.now() / 1000,
    });
  } catch (err) {
    console.error(`Failed to add Sentry breadcrumb: ${err}`);
  }
}

/**
 * Set a tag in Sentry
 * @param key - Tag key
 * @param value - Tag value
 */
export function setSentryTag(key: string, value: string): void {
  if (!sentryInitialized) return;

  try {
    Sentry.setTag(key, value);
  } catch (err) {
    console.error(`Failed to set Sentry tag: ${err}`);
  }
}

/**
 * Set multiple tags in Sentry
 * @param tags - Object with tag key-value pairs
 */
export function setSentryTags(tags: Record<string, string>): void {
  if (!sentryInitialized) return;

  try {
    Sentry.setTags(tags);
  } catch (err) {
    console.error(`Failed to set Sentry tags: ${err}`);
  }
}

/**
 * Close Sentry and flush any pending events
 * @param timeout - Timeout in milliseconds (default: 2000)
 * @returns Promise that resolves when all events are sent
 */
export async function closeSentry(timeout = 2000): Promise<boolean> {
  if (!sentryInitialized) return true;

  try {
    return await Sentry.close(timeout);
  } catch (err) {
    console.error(`Failed to close Sentry: ${err}`);
    return false;
  }
}

/**
 * Reset Sentry state (useful for testing)
 */
export function resetSentry(): void {
  sentryInitialized = false;
}

/**
 * Map internal log level to Sentry severity level
 * @param level - Internal log level
 * @returns Sentry severity level
 */
function mapLogLevelToSentry(level: LogLevel): 'debug' | 'info' | 'warning' | 'error' | 'fatal' {
  switch (level) {
    case 'DEBUG':
      return 'debug';
    case 'INFO':
      return 'info';
    case 'WARN':
      return 'warning';
    case 'ERROR':
      return 'error';
    case 'CRITICAL':
      return 'fatal';
    default:
      return 'info';
  }
}

// Re-export Sentry for direct usage when needed
export { Sentry };
