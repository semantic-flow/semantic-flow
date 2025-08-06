/**
 * @fileoverview Service-specific logger configuration for flow-service.
 * Configures the flow-core logger with service-specific settings including
 * service name, version, environment, and other service context.
 */

import {
  createEnhancedLogger,
  type LoggingConfig,
  type LogContext,
  type StructuredLogger,
  type EnhancedStructuredLogger,
} from '../../../flow-core/src/utils/logger/index.ts';
import { FLOW_SERVICE_VERSION } from "../service-constants.ts";

// Re-export formatters and error handlers for test access
export { formatConsoleMessage } from '../../../flow-core/src/utils/logger/formatters.ts';
export { handleCaughtError } from '../../../flow-core/src/utils/logger/error-handlers.ts';

/**
 * Service-specific context that gets applied to all log entries
 */
const SERVICE_CONTEXT = {
  serviceName: 'flow-service',
  serviceVersion: Deno.env.get('FLOW_SERVICE_VERSION') || FLOW_SERVICE_VERSION,
  environment: Deno.env.get('FLOW_ENV') || 'development',
  instanceId: Deno.env.get('FLOW_INSTANCE_ID') || crypto.randomUUID(),
} as const;

/**
 * Service-specific logger configuration
 */
export const SERVICE_LOGGER_DEFAULT_CONFIG: LoggingConfig = {
  consoleChannel: {
    logChannelEnabled: true,
    logLevel: 'info',
    logFormat: 'pretty',
  },

  fileChannel: {
    logChannelEnabled: Deno.env.get('FLOW_LOG_FILE_ENABLED') === 'true',
    logLevel: 'info',
    logFormat: 'json',
    logFilePath: `${Deno.env.get('FLOW_LOG_DIR') || './logs'}/flow-service.log`,
    logMaxFileSize: parseInt(Deno.env.get('FLOW_LOG_MAX_FILE_SIZE') || '10485760'), // 10MB
    logMaxFiles: parseInt(Deno.env.get('FLOW_LOG_MAX_FILES') || '5'),
    logRotationInterval: Deno.env.get('FLOW_LOG_ROTATE_DAILY') === 'true' ? 'daily' : 'size-based',
  },

  sentryChannel: {
    logChannelEnabled: Deno.env.get('FLOW_SENTRY_ENABLED') === 'true',
    logLevel: 'error',
    sentryDsn: Deno.env.get('FLOW_SENTRY_DSN'),
  },

  serviceContext: SERVICE_CONTEXT,
};

/**
 * Configured logger instance for flow-service with service-specific context
 */
export const logger: EnhancedStructuredLogger = createEnhancedLogger(SERVICE_LOGGER_DEFAULT_CONFIG);

/**
 * Create a logger with additional service operation context
 * @param operation - The operation being performed
 * @param operationId - Optional unique identifier for the operation
 * @returns Logger instance scoped to the operation
 */
export function createOperationLogger(operation: string, operationId?: string): StructuredLogger {
  return logger.forOperation(operation, operationId || crypto.randomUUID());
}

/**
 * Create a logger with component-specific context
 * @param component - The component name
 * @returns Logger instance scoped to the component
 */
export function createComponentLogger(component: string): StructuredLogger {
  return logger.forComponent(component);
}

/**
 * Create a logger with API request context
 * @param requestId - Unique request identifier
 * @param method - HTTP method
 * @param path - Request path
 * @param userAgent - User agent string
 * @param ip - Client IP address
 * @returns Logger instance with API context
 */
export function createApiLogger(
  requestId: string,
  method?: string,
  path?: string,
  userAgent?: string,
  ip?: string,
): StructuredLogger {
  const apiContext: LogContext = {
    operation: 'api-request',
    operationId: requestId,
    apiContext: {
      requestId,
      method,
      path,
      userAgent,
      ip,
    },
  };

  return logger.withContext(apiContext);
}

/**
 * Create a logger with mesh processing context
 * @param meshId - Mesh identifier
 * @param meshName - Human-readable mesh name
 * @param nodeId - Optional node identifier
 * @param nodeName - Optional human-readable node name
 * @returns Logger instance with mesh context
 */
export function createMeshLogger(
  meshId: string,
  meshName?: string,
  nodeId?: string,
  nodeName?: string,
): StructuredLogger {
  const meshContext: LogContext = {
    operation: 'mesh-processing',
    meshId,
    meshName,
    nodeId,
    nodeName,
  };

  return logger.withContext(meshContext);
}

/**
 * Create a logger with configuration operation context
 * @param configPath - Path to configuration file
 * @param configType - Type of configuration (e.g., 'service', 'node')
 * @param validationStage - Current validation stage
 * @returns Logger instance with config context
 */
export function createConfigLogger(
  configPath?: string,
  configType?: string,
  validationStage?: string,
): StructuredLogger {
  const configContext: LogContext = {
    operation: 'config-resolve',
    configContext: {
      configPath,
      configType,
      validationStage,
    },
  };

  return logger.withContext(configContext);
}

/**
 * Create a logger with startup operation context
 * @param stage - Startup stage (e.g., 'initialization', 'config-loading', 'server-start')
 * @returns Logger instance with startup context
 */
export function createStartupLogger(stage?: string): StructuredLogger {
  const startupContext: LogContext = {
    operation: 'startup',
    component: 'flow-service',
    metadata: {
      stage,
    },
  };

  return logger.withContext(startupContext);
}

/**
 * Get service information for logging context
 * @returns Service context information
 */
export function getServiceContext() {
  return SERVICE_CONTEXT;
}

/**
 * Get the raw configured logger instance (without additional context)
 * @returns Base logger instance
 */
export function getRawLogger(): StructuredLogger {
  return logger;
}

// Export the configured logger as default
export default logger;
