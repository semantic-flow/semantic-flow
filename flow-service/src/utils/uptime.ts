// Service uptime tracking utility
const serviceStartTime = Date.now();

export interface UptimeInfo {
  startTime: string;
  uptimeSeconds: number;
  uptimeFormatted: string;
}

/**
 * Calculate service uptime information
 * @returns UptimeInfo object with start time and uptime details
 */
export function getUptimeInfo(): UptimeInfo {
  const now = Date.now();
  const uptimeMs = now - serviceStartTime;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);

  return {
    startTime: new Date(serviceStartTime).toISOString(),
    uptimeSeconds,
    uptimeFormatted: formatUptime(uptimeSeconds),
  };
}

/**
 * Format uptime seconds into a human-readable string
 * @param seconds - uptime in seconds
 * @returns formatted uptime string (e.g., "1d 2h 3m 4s")
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.length > 0 ? parts.join(' ') : '0s';
}
