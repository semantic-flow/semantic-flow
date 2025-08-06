export const FLOW_SERVICE_VERSION = '0.1.0';

export const FLOW_SERVICE_NAME = 'flow-service';

/**
 * Service instance ID - generated once per service invocation
 */
export const FLOW_SERVICE_INSTANCE_ID = Deno.env.get('FLOW_INSTANCE_ID') || crypto.randomUUID();
