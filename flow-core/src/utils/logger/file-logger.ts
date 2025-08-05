/**
 * @fileoverview File logging functionality with rotation and queuing support.
 * Provides reliable file-based logging with automatic daily rotation and error handling.
 */

import { dirname, ensureDir } from '../../deps.ts';

/**
 * File logger with rotation, queuing, and error handling capabilities
 */
export class FileLogger {
  private logFile: string;
  private isWriting = false;
  private writeQueue: string[] = [];
  private readonly maxQueueSize: number;

  /**
   * Create a new FileLogger instance
   * @param logFilePath - Path to the log file
   * @param maxQueueSize - Maximum number of queued log entries (default: 10000)
   */
  constructor(logFilePath: string, maxQueueSize = 10000) {
    this.logFile = logFilePath;
    this.maxQueueSize = maxQueueSize;
  }

  /**
   * Ensure the log directory exists
   */
  async ensureLogDirectory(): Promise<void> {
    try {
      const dir = dirname(this.logFile);
      await ensureDir(dir);
    } catch (error) {
      console.error(`Failed to create log directory: ${error}`);
    }
  }

  /**
   * Write content to the log file (queued and batched for performance)
   * @param content - Content to write to the log file
   */
  async writeToFile(content: string): Promise<void> {
    if (this.writeQueue.length >= this.maxQueueSize) {
      console.error(
        `Log queue full (${this.maxQueueSize} items), dropping oldest entries`,
      );
      this.writeQueue = this.writeQueue.slice(
        -Math.floor(this.maxQueueSize / 2),
      );
    }
    this.writeQueue.push(content);
    if (!this.isWriting) {
      await this.processWriteQueue();
    }
  }

  /**
   * Process the write queue, writing all pending entries to the file
   */
  private async processWriteQueue(): Promise<void> {
    if (this.writeQueue.length === 0) return;

    this.isWriting = true;

    try {
      await this.ensureLogDirectory();

      const content = this.writeQueue.join('\n') + '\n';
      this.writeQueue = [];

      await Deno.writeTextFile(this.logFile, content, { append: true });
    } catch (error) {
      console.error(`Failed to write to log file: ${error}`);
      // Graceful degradation - continue without crashing
    } finally {
      this.isWriting = false;

      // Process any new entries that were added while writing
      if (this.writeQueue.length > 0) {
        await this.processWriteQueue();
      }
    }
  }

  /**
   * Check if log rotation is needed and rotate if necessary
   */
  async rotateIfNeeded(): Promise<void> {
    try {
      const stats = await Deno.stat(this.logFile);
      const now = new Date();
      const fileDate = new Date(stats.mtime || stats.birthtime || now);

      // Check if file is from a different day
      if (fileDate.toDateString() !== now.toDateString()) {
        await this.performDailyRotation();
      }
    } catch (error) {
      // File doesn't exist yet, no rotation needed
      if (!(error instanceof Deno.errors.NotFound)) {
        console.error(`Failed to check log file for rotation: ${error}`);
      }
    }
  }

  /**
   * Perform daily log rotation
   */
  private async performDailyRotation(): Promise<void> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const rotatedName = this.logFile.replace(
        '.log',
        `-${yesterday.toISOString().split('T')[0]}.log`,
      );

      await Deno.rename(this.logFile, rotatedName);
      console.log(`Log rotated to: ${rotatedName}`);
    } catch (error) {
      console.error(`Failed to rotate log file: ${error}`);
    }
  }

  /**
   * Flush any pending writes and close the logger
   */
  async close(): Promise<void> {
    // Process any remaining queue items
    while (this.writeQueue.length > 0 && !this.isWriting) {
      await this.processWriteQueue();
    }
  }

  /**
   * Get the current log file path
   */
  getLogFilePath(): string {
    return this.logFile;
  }

  /**
   * Get the current queue size
   */
  getQueueSize(): number {
    return this.writeQueue.length;
  }

  /**
   * Check if the logger is currently writing
   */
  isCurrentlyWriting(): boolean {
    return this.isWriting;
  }
}

/**
 * Factory function to create a FileLogger based on environment configuration
 * @returns FileLogger instance or null if file logging is disabled
 */
export async function createFileLogger(): Promise<FileLogger | null> {
  try {
    // Check environment variable first to avoid config dependency during logger initialization
    const fileLogPath = Deno.env.get('FLOW_FILE_LOG_PATH');
    const fileLogEnabled = Deno.env.get('FLOW_FILE_LOG_ENABLED');

    if (fileLogEnabled === 'true' && fileLogPath) {
      const fileLogger = new FileLogger(fileLogPath);
      await fileLogger.rotateIfNeeded();
      return fileLogger;
    }
  } catch (error) {
    // Use console.error here to avoid circular dependency with error handlers
    console.error(`Failed to initialize file logger: ${error}`);
  }
  return null;
}

/**
 * Global file logger instance (lazy-loaded)
 */
let globalFileLogger: FileLogger | null | Promise<FileLogger | null> = null;

/**
 * Get the global file logger instance (creates it if needed)
 * @returns FileLogger instance or null if disabled
 */
export async function getGlobalFileLogger(): Promise<FileLogger | null> {
  if (globalFileLogger === null) {
    globalFileLogger = createFileLogger();
  }
  return await globalFileLogger;
}

/**
 * Reset the global file logger (useful for testing)
 */
export function resetGlobalFileLogger(): void {
  globalFileLogger = null;
}
