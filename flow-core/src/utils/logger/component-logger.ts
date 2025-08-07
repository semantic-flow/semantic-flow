import {
  EnhancedStructuredLogger,
  LoggingConfig,
  createEnhancedLogger,
} from "./index.ts";

let injectedLoggingConfig: LoggingConfig | undefined;
let globalLogger: EnhancedStructuredLogger | undefined;

/**
 * Inject a LoggingConfig to be used globally by flow-core.
 * Should be called once by flow-service at startup.
 */
export function setGlobalLoggingConfig(config: LoggingConfig): void {
  injectedLoggingConfig = config;
  globalLogger = undefined; // force re-creation with new config
}

/**
 * Resets logger for testing or reconfiguration
 */
export function resetGlobalLogger(): void {
  injectedLoggingConfig = undefined;
  globalLogger = undefined;
}

/**
 * Get the global enhanced logger, initializing if necessary.
 */
function getGlobalLogger(): EnhancedStructuredLogger {
  if (!globalLogger) {
    globalLogger = createEnhancedLogger(injectedLoggingConfig ?? {
      consoleChannel: {
        logChannelEnabled: true,
        logLevel: 'info',
        logFormat: 'pretty',
      }
    });
  }
  return globalLogger;
}

/**
 * Get a logger scoped to the current file/module.
 * Auto-fills the `component` field from import.meta.
 */
export function getComponentLogger(meta: ImportMeta): EnhancedStructuredLogger {
  const component = deriveComponentName(meta);
  return getGlobalLogger().forComponent(component) as EnhancedStructuredLogger;
}

function deriveComponentName(meta: ImportMeta): string {
  const url = new URL(meta.url);
  return url.pathname.split("/").pop()?.replace(".ts", "") ?? "unknown";
}
