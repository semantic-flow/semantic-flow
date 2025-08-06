import {
  EnhancedStructuredLogger,
  LoggerConfig,
  createEnhancedLogger,
} from "./index.ts";

let injectedLoggerConfig: LoggerConfig | undefined;
let globalLogger: EnhancedStructuredLogger | undefined;

/**
 * Inject a LoggerConfig to be used globally by flow-core.
 * Should be called once by flow-service at startup.
 */
export function setGlobalLoggerConfig(config: LoggerConfig): void {
  injectedLoggerConfig = config;
  globalLogger = undefined; // force re-creation with new config
}

/**
 * Resets logger for testing or reconfiguration
 */
export function resetGlobalLogger(): void {
  injectedLoggerConfig = undefined;
  globalLogger = undefined;
}

/**
 * Get the global enhanced logger, initializing if necessary.
 */
function getGlobalLogger(): EnhancedStructuredLogger {
  if (!globalLogger) {
    globalLogger = createEnhancedLogger(injectedLoggerConfig ?? {
      enableConsole: true,
      enableFile: false,
      enableSentry: false,
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
