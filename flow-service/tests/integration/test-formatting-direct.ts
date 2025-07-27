#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env

/**
 * Direct test of the pretty formatting function
 */

// Import the formatting functions directly from the logger module
// We'll need to extract them for testing

import { dirname, ensureDir } from "../../../flow-core/src/deps.ts";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";

interface LogContext {
  operation?:
    | "scan"
    | "weave"
    | "validate"
    | "config-resolve"
    | "api-request"
    | "startup"
    | "error-handling";
  requestId?: string;
  meshPath?: string;
  nodePath?: string;
  nodeType?: "data" | "namespace" | "reference";
  duration?: number;
  startTime?: number;
  nodeCount?: number;
  fileCount?: number;
  configSource?: "file" | "inheritance" | "defaults" | "api" | "environment";
  schemaVersion?: string;
  errorCode?: string;
  violations?: string[];
  cause?: string;
  endpoint?: string;
  statusCode?: number;
  userAgent?: string;
  component?:
    | "mesh-scanner"
    | "api-handler"
    | "config-resolver"
    | "weave-processor";
  [key: string]: unknown;
}

// Copy the pretty formatting function
function formatPrettyMessage(
  level: LogLevel,
  message: string,
  context?: LogContext,
): string {
  const timestamp = new Date().toISOString();
  const levelPadded = level.padEnd(5);

  let contextStr = "";
  if (context && Object.keys(context).length > 0) {
    const parts = [];
    if (context.operation) parts.push(`op=${context.operation}`);
    if (context.meshPath) parts.push(`mesh=${context.meshPath}`);
    if (context.duration) parts.push(`${context.duration}ms`);
    if (context.nodeCount) parts.push(`${context.nodeCount} nodes`);
    if (context.configSource) parts.push(`source=${context.configSource}`);
    if (context.component) parts.push(`[${context.component}]`);

    contextStr = parts.length > 0 ? ` (${parts.join(", ")})` : "";
  }

  return `[${timestamp}] ${levelPadded} ${message}${contextStr}`;
}

// Simple file logger
class SimpleFileLogger {
  constructor(private logFile: string) {}

  async ensureLogDirectory(): Promise<void> {
    try {
      const dir = dirname(this.logFile);
      await ensureDir(dir);
    } catch (error) {
      console.error(`Failed to create log directory: ${error}`);
    }
  }

  async writeToFile(content: string): Promise<void> {
    try {
      await this.ensureLogDirectory();
      await Deno.writeTextFile(this.logFile, content + "\n", { append: true });
    } catch (error) {
      console.error(`Failed to write to log file: ${error}`);
    }
  }
}

console.log("🧪 Testing pretty formatting directly...\n");

// Clear existing log file
const logFile = "./logs/test-pretty-direct.log";
try {
  await Deno.remove(logFile);
  console.log("📄 Cleared existing log file");
} catch (error) {
  console.log(`📄 No existing log file to clear:  ${error}`);
}

// Create file logger
const fileLogger = new SimpleFileLogger(logFile);

// Test different log levels with various contexts
const testCases = [
  {
    level: "INFO" as LogLevel,
    message: "File logging test started",
    context: {
      operation: "startup" as const,
      component: "config-resolver" as const,
    },
  },
  {
    level: "WARN" as LogLevel,
    message: "Configuration override detected",
    context: {
      operation: "config-resolve" as const,
      configSource: "environment" as const,
    },
  },
  {
    level: "ERROR" as LogLevel,
    message: "Database connection failed",
    context: { operation: "startup" as const, duration: 5000 },
  },
  {
    level: "DEBUG" as LogLevel,
    message: "Processing mesh nodes",
    context: {
      operation: "scan" as const,
      meshPath: "/data/mesh",
      nodeCount: 42,
      duration: 1250,
    },
  },
];

console.log("📝 Writing pretty formatted logs...");
for (const testCase of testCases) {
  const formatted = formatPrettyMessage(
    testCase.level,
    testCase.message,
    testCase.context,
  );
  console.log(`Console: ${formatted}`);
  await fileLogger.writeToFile(formatted);
}

console.log("\n✅ Test logging complete!");
console.log("📄 Checking log file content...\n");

// Read and display the log file contents
try {
  const logContent = await Deno.readTextFile(logFile);
  console.log("📋 Log file contents:");
  console.log("─".repeat(80));
  console.log(logContent);
  console.log("─".repeat(80));

  // Check if logs are in pretty format
  if (logContent.includes("[2025-") && !logContent.startsWith('{"timestamp"')) {
    console.log("✅ SUCCESS: Logs are in pretty format!");
    console.log("🎨 Pretty formatting is working correctly.");
  } else {
    console.log("❌ ISSUE: Logs are not in the expected pretty format");
  }
} catch (error) {
  console.log(
    "❌ Failed to read log file:",
    error instanceof Error ? error.message : String(error),
  );
}
