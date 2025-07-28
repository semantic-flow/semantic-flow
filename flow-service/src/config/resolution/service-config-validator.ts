import type { ServiceConfigContext } from '../types.ts';
import { ConfigError } from '../types.ts';
import { getConfigValue } from './service-config-utils.ts';

/**
 * Validates that required service configuration values are present and correctly formatted.
 *
 * Checks that the port is within the valid range, the host is a non-empty string, and if Sentry logging is enabled, ensures a valid Sentry DSN is configured.
 *
 * @throws ConfigError if any required configuration is missing or invalid.
 */
export function validateServiceConfig(context: ServiceConfigContext): void {
  const port = getConfigValue<number>(context, 'fsvc:port', 'fsvc:port');
  const host = getConfigValue<string>(context, 'fsvc:host', 'fsvc:host');

  if (!port || port <= 0 || port > 65535) {
    throw new ConfigError(
      `Invalid port number: ${port}. Must be between 1 and 65535.`,
    );
  }

  if (!host || host.trim().length === 0) {
    throw new ConfigError(`Invalid host: ${host}. Host cannot be empty.`);
  }

  // Validate Sentry configuration if enabled
  const loggingConfig = context.inputOptions['fsvc:hasLoggingConfig'] ||
    context.defaultOptions['fsvc:hasLoggingConfig'];
  const sentryChannel = loggingConfig?.['fsvc:hasSentryChannel'];

  if (sentryChannel && sentryChannel['fsvc:logChannelEnabled']) {
    const sentryDsn = sentryChannel['fsvc:sentryDsn'];
    if (!sentryDsn || !sentryDsn.startsWith('https://')) {
      throw new ConfigError(
        'Sentry is enabled but no valid DSN is configured. Please set FLOW_SENTRY_DSN environment variable or configure it in the service config file.',
      );
    }
  }
}
