import type { LogContext } from '../../../flow-core/src/utils/logger/types.ts';
import { FLOW_SERVICE_VERSION, FLOW_SERVICE_NAME } from '../service-constants.ts';

/**
 * Extended LogContext for flow-service with default serviceVersion.
 */
export interface ServiceLogContext extends LogContext {
  serviceVersion?: string;
  serviceName?: string;
}

/**
 * Creates a ServiceLogContext with default serviceVersion set.
 * Merges any provided partial context.
 */
export function createServiceLogContext(
  partialContext: Partial<ServiceLogContext> = {},
): ServiceLogContext {
  return {
    serviceVersion: FLOW_SERVICE_VERSION,
    serviceName: FLOW_SERVICE_NAME,
    ...partialContext,
  };
}
