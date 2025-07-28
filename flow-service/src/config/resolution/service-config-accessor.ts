import type { ServiceConfigContext, DelegationChain, AttributedTo } from '../types.ts';
import { getConfigValue } from './service-config-utils.ts';

/**
 * Get a typed configuration accessor for common service config values
 */
export class ServiceConfigAccessor {
  constructor(private context: ServiceConfigContext) { }

  get port(): number {
    return getConfigValue<number>(this.context, 'fsvc:port', 'fsvc:port');
  }

  get host(): string {
    return getConfigValue<string>(this.context, 'fsvc:host', 'fsvc:host');
  }

  get meshPaths(): string[] {
    return this.context.inputOptions['fsvc:meshPaths'] || [];
  }

  get consoleLogLevel(): string {
    const loggingConfig = this.context.inputOptions['fsvc:hasLoggingConfig'] ||
      this.context.defaultOptions['fsvc:hasLoggingConfig'];
    const consoleChannel = loggingConfig?.['fsvc:hasConsoleChannel'];
    return consoleChannel?.['fsvc:logLevel'] || 'info';
  }

  get fileLogEnabled(): boolean {
    const loggingConfig = this.context.inputOptions['fsvc:hasLoggingConfig'] ||
      this.context.defaultOptions['fsvc:hasLoggingConfig'];
    const fileChannel = loggingConfig?.['fsvc:hasFileChannel'];
    return fileChannel?.['fsvc:logChannelEnabled'] || false;
  }

  get fileLogLevel(): string {
    const loggingConfig = this.context.inputOptions['fsvc:hasLoggingConfig'] ||
      this.context.defaultOptions['fsvc:hasLoggingConfig'];
    const fileChannel = loggingConfig?.['fsvc:hasFileChannel'];
    return fileChannel?.['fsvc:logLevel'] || 'warn';
  }

  get sentryEnabled(): boolean {
    const loggingConfig = this.context.inputOptions['fsvc:hasLoggingConfig'] ||
      this.context.defaultOptions['fsvc:hasLoggingConfig'];
    const sentryChannel = loggingConfig?.['fsvc:hasSentryChannel'];
    return sentryChannel?.['fsvc:logChannelEnabled'] || false;
  }

  get sentryLogLevel(): string {
    const loggingConfig = this.context.inputOptions['fsvc:hasLoggingConfig'] ||
      this.context.defaultOptions['fsvc:hasLoggingConfig'];
    const sentryChannel = loggingConfig?.['fsvc:hasSentryChannel'];
    return sentryChannel?.['fsvc:logLevel'] || 'error';
  }

  get sentryDsn(): string | undefined {
    const loggingConfig = this.context.inputOptions['fsvc:hasLoggingConfig'] ||
      this.context.defaultOptions['fsvc:hasLoggingConfig'];
    const sentryChannel = loggingConfig?.['fsvc:hasSentryChannel'];
    return sentryChannel?.['fsvc:sentryDsn'];
  }

  get apiEnabled(): boolean {
    const containedServices =
      this.context.inputOptions['fsvc:hasContainedServices'] ||
      this.context.defaultOptions['fsvc:hasContainedServices'];
    return containedServices['fsvc:apiEnabled'] ?? true;
  }

  get sparqlEnabled(): boolean {
    const containedServices =
      this.context.inputOptions['fsvc:hasContainedServices'] ||
      this.context.defaultOptions['fsvc:hasContainedServices'];
    return containedServices['fsvc:sparqlEnabled'] ?? true;
  }

  get queryWidgetEnabled(): boolean {
    const containedServices =
      this.context.inputOptions['fsvc:hasContainedServices'] ||
      this.context.defaultOptions['fsvc:hasContainedServices'];
    return containedServices['fsvc:queryWidgetEnabled'] ?? true;
  }

  get defaultDelegationChain(): DelegationChain | undefined {
    return getConfigValue<DelegationChain | undefined>(
      this.context,
      'fsvc:defaultDelegationChain',
      'fsvc:defaultDelegationChain',
    );
  }

  get defaultAttributedTo(): AttributedTo | undefined {
    return getConfigValue<AttributedTo | undefined>(
      this.context,
      'fsvc:defaultAttributedTo',
      'fsvc:defaultAttributedTo',
    );
  }
}
