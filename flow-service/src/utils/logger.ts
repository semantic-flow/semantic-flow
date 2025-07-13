import * as Sentry from "https://deno.land/x/sentry/index.mjs"

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

// Initialize Sentry (only in production or when explicitly configured)
const sentryDsn = Deno.env.get('SENTRY_DSN')
let sentryInitialized = false

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

// Core logging interface (inspired by your weave logger)
export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (!shouldLog('DEBUG')) return

    const formatted = formatMessage('DEBUG', message, meta)
    console.log(formatted)

    if (sentryInitialized) {
      // In production, send logs to Sentry using captureMessage
      if (!isDevelopment) {
        Sentry.captureMessage(message, 'debug')
        if (meta) {
          Sentry.setContext('debug_context', meta)
        }
      } else {
        // In development, just add breadcrumbs
        Sentry.addBreadcrumb({
          message,
          level: 'debug',
          data: meta || {},
        })
      }
    }
  },

  info(message: string, meta?: Record<string, unknown>) {
    if (!shouldLog('INFO')) return

    const formatted = formatMessage('INFO', message, meta)
    console.log(formatted)

    console.log(`🔧 DEBUG INFO: sentryInitialized=${sentryInitialized}, isDevelopment=${isDevelopment}`)

    if (sentryInitialized) {
      // In production, send logs to Sentry using captureMessage
      if (!isDevelopment) {
        console.log(`🔧 DEBUG INFO: Sending to Sentry as captureMessage`)
        Sentry.captureMessage(message, 'info')
        if (meta) {
          Sentry.setContext('info_context', meta)
        }
      } else {
        console.log(`🔧 DEBUG INFO: Adding breadcrumb to Sentry`)
        // In development, just add breadcrumbs
        Sentry.addBreadcrumb({
          message,
          level: 'info',
          data: meta || {},
        })
      }
    } else {
      console.log(`🔧 DEBUG INFO: Sentry not initialized, skipping`)
    }
  },

  warn(message: string, meta?: Record<string, unknown>) {
    if (!shouldLog('WARN')) return

    const formatted = formatMessage('WARN', message, meta)
    console.warn(formatted)

    if (sentryInitialized) {
      Sentry.captureMessage(message, 'warning')
      if (meta) {
        Sentry.setContext('warning_context', meta)
      }
    }
  },

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>) {
    if (!shouldLog('ERROR')) return

    const errorInfo = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : { error: String(error) }

    const combinedMeta = { ...errorInfo, ...safeSpread(meta) }
    const formatted = formatMessage('ERROR', message, combinedMeta)
    console.error(formatted)

    if (sentryInitialized) {
      if (error instanceof Error) {
        Sentry.captureException(error, {
          tags: { source: 'flow-service' },
          extra: { message, ...safeSpread(meta) },
        })
      } else {
        Sentry.captureMessage(message, 'error')
        if (error || meta) {
          Sentry.setContext('error_context', { error, ...safeSpread(meta) })
        }
      }
    }
  },

  critical(message: string, error?: Error | unknown, meta?: Record<string, unknown>) {
    const errorInfo = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : { error: String(error) }

    const combinedMeta = { ...errorInfo, ...safeSpread(meta) }
    const formatted = formatMessage('CRITICAL', message, combinedMeta)
    console.error(formatted)

    if (sentryInitialized) {
      if (error instanceof Error) {
        Sentry.captureException(error, {
          level: 'fatal',
          tags: { source: 'flow-service', critical: 'true' },
          extra: { message, ...safeSpread(meta) },
        })
      } else {
        Sentry.captureMessage(message, 'fatal')
        if (error || meta) {
          Sentry.setContext('critical_context', { error, ...safeSpread(meta) })
        }
      }
    }
  },
}

// Enhanced error handler (inspired by your weave handleCaughtError)
export function handleError(
  error: unknown,
  context?: string,
  meta?: Record<string, unknown>
): void {
  const contextMessage = context ? `${context}: ` : ''

  if (error instanceof Error) {
    logger.error(`${contextMessage}${error.message}`, error, {
      stack: error.stack,
      cause: error.cause,
      name: error.name,
      ...safeSpread(meta),
    })
  } else {
    logger.error(`${contextMessage}Unknown error occurred`, error, meta)
  }
}

// Convenience functions for common patterns
export const log = logger // Alias for shorter usage
export { Sentry } // Re-export for direct Sentry usage when needed
