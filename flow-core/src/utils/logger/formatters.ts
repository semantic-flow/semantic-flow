/**
 * @fileoverview Message formatting utilities for structured logging.
 * Provides consistent formatting for console output, file logging, and structured data.
 */

import type { LogContext, LogLevel } from './logger-types.ts';

/**
 * Console color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
} as const;

/**
 * Log level numeric values for comparison (using lowercase keys)
 */
export const LogLevels = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  critical: 50,
} as const;

/**
 * Apply color codes to text for terminal output
 * @param color - Color to apply
 * @param text - Text to colorize
 * @returns Colorized text (only in development mode)
 */
export function colorize(color: keyof typeof colors, text: string): string {
  const isDevelopment = Deno.env.get('FLOW_ENV') !== 'production';
  if (!isDevelopment) return text;
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Check if a log level should be output based on current configuration
 * @param level - Log level to check
 * @returns True if the level should be logged
 */
export function shouldLog(level: LogLevel): boolean {
  const configLevel = Deno.env.get('FLOW_LOG_LEVEL') ||
    (Deno.env.get('FLOW_ENV') !== 'production' ? 'debug' : 'info');
  const currentLevel = LogLevels[configLevel as LogLevel] || LogLevels.info;
  return LogLevels[level] >= currentLevel;
}

/**
 * Safely spread an unknown object for logging
 * @param obj - Object to spread
 * @returns Record with string keys, or empty object if input is invalid
 */
export function safeSpread(obj?: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return {};
  return obj as Record<string, unknown>;
}

/**
 * Format a message for structured JSON logging (file output, external systems)
 * @param level - Log level
 * @param message - Log message
 * @param context - Optional logging context
 * @param serviceContext - Service-specific context
 * @returns JSON string formatted log entry
 */
export function formatStructuredMessage(
  level: LogLevel,
  message: string,
  context?: LogContext,
  serviceContext?: {
    serviceName?: string;
    serviceVersion?: string;
    environment?: string;
    instanceId?: string;
  },
): string {
  const timestamp = new Date().toISOString();
  const baseEntry = {
    timestamp,
    level: level.toLowerCase(),
    message,
    service: serviceContext?.serviceName || 'flow-service',
    version: serviceContext?.serviceVersion || Deno.env.get('FLOW_VERSION'),
    environment: serviceContext?.environment || Deno.env.get('FLOW_ENV') || 'development',
    instanceId: serviceContext?.instanceId,
    ...context,
  };

  return JSON.stringify(baseEntry);
}

/**
 * Format a message for console output with colors and readable context
 * @param level - Log level
 * @param message - Log message
 * @param context - Optional logging context
 * @returns Formatted string for console output
 */
export function formatConsoleMessage(
  level: LogLevel,
  message: string,
  context?: LogContext,
): string {
  const isDevelopment = Deno.env.get('FLOW_ENV') !== 'production';
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] ${level.padEnd(5)}`;

  if (isDevelopment) {
    const coloredLevel = level === 'error' || level === 'critical'
      ? colorize('red', level.toUpperCase())
      : level === 'warn'
        ? colorize('yellow', level.toUpperCase())
        : level === 'debug'
          ? colorize('blue', level.toUpperCase())
          : colorize('green', level.toUpperCase());

    const coloredPrefix = colorize('gray', `[${timestamp}]`) +
      ` ${coloredLevel.padEnd(5)}`;
    let contextStr = '';

    if (context && Object.keys(context).length > 0) {
      const parts = [];
      if (context.operation) parts.push(`op=${context.operation}`);
      if (context.meshId) parts.push(`mesh=${context.meshId}`);
      if (context.performanceMetrics?.duration) parts.push(`${context.performanceMetrics.duration}ms`);
      if (context.metadata?.nodeCount) parts.push(`${context.metadata.nodeCount} nodes`);
      if (context.component) parts.push(`[${context.component}]`);
      if (context.operationId) parts.push(`id=${context.operationId}`);

      contextStr = parts.length > 0 ? ` (${parts.join(', ')})` : '';
    }

    return `${coloredPrefix} ${message}${contextStr}`;
  }

  return context
    ? `${prefix} ${message} ${JSON.stringify(context)}`
    : `${prefix} ${message}`;
}

/**
 * Extract key context information for error reporting
 * @param context - Full logging context
 * @returns Simplified context suitable for error reporting
 */
export function extractErrorContext(context?: LogContext): Record<string, unknown> {
  if (!context) return {};

  return {
    operation: context.operation,
    operationId: context.operationId,
    component: context.component,
    functionName: context.functionName,
    meshId: context.meshId,
    nodeId: context.nodeId,
    errorCode: context.errorContext?.errorCode,
    errorType: context.errorContext?.errorType,
    requestId: context.apiContext?.requestId,
    endpoint: context.apiContext?.path,
    statusCode: context.apiContext?.statusCode,
  };
}

/**
 * Create a summary context string for compact logging
 * @param context - Full logging context
 * @returns Compact string representation of key context
 */
export function createContextSummary(context?: LogContext): string {
  if (!context) return '';

  const parts = [];

  if (context.operation) parts.push(`op:${context.operation}`);
  if (context.operationId) parts.push(`id:${context.operationId.slice(0, 8)}`);
  if (context.component) parts.push(`comp:${context.component}`);
  if (context.meshId) parts.push(`mesh:${context.meshId}`);
  if (context.apiContext?.requestId) parts.push(`req:${context.apiContext.requestId.slice(0, 8)}`);

  return parts.length > 0 ? `[${parts.join('|')}]` : '';
}

/**
 * Merge multiple LogContext objects with proper precedence
 * @param contexts - Array of LogContext objects to merge (later entries take precedence)
 * @returns Merged LogContext
 */
export function mergeLogContext(...contexts: (LogContext | undefined)[]): LogContext {
  const result: LogContext = {};

  for (const context of contexts) {
    if (!context) continue;

    // Simple properties - later values override
    Object.assign(result, context);

    // Special handling for nested objects
    if (context.performanceMetrics) {
      result.performanceMetrics = {
        ...result.performanceMetrics,
        ...context.performanceMetrics,
      };
    }

    if (context.configContext) {
      result.configContext = {
        ...result.configContext,
        ...context.configContext,
      };
    }

    if (context.errorContext) {
      result.errorContext = {
        ...result.errorContext,
        ...context.errorContext,
      };
    }

    if (context.apiContext) {
      result.apiContext = {
        ...result.apiContext,
        ...context.apiContext,
      };
    }

    if (context.serviceContext) {
      result.serviceContext = {
        ...result.serviceContext,
        ...context.serviceContext,
      };
    }

    if (context.metadata) {
      result.metadata = {
        ...result.metadata,
        ...context.metadata,
      };
    }
  }

  return result;
}
