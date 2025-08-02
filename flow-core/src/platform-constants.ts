export const validLogLevels = ['debug', 'info', 'warn', 'error'] as const;

export type LogLevel = typeof validLogLevels[number];

/**
 * Validates that the provided log level is one of the allowed values.
 *
 * @param level - The log level to validate, as unknown
 * @returns The validated log level as a LogLevel type
 * @throws Error if the log level is not valid
 */
export function validateLogLevel(level: unknown): LogLevel {
  if (typeof level !== 'string' || !validLogLevels.includes(level as LogLevel)) {
    throw new Error(
      `Invalid log level: ${level}. Must be one of: ${validLogLevels.join(', ')}`,
    );
  }
  return level as LogLevel;
}
