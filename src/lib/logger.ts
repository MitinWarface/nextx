/**
 * Structured JSON logger.
 * Outputs structured logs in production, pretty-printed in development.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL as LogLevel] ?? LOG_LEVELS.info;

function formatEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(entry);
  }
  // Development: pretty print
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
  const context = entry.context ? ` [${entry.context}]` : "";
  const msg = `${prefix}${context} ${entry.message}`;
  if (entry.data) return `${msg}\n  ${JSON.stringify(entry.data, null, 2)}`;
  if (entry.error) return `${msg}\n  ${entry.error.name}: ${entry.error.message}`;
  return msg;
}

function log(level: LogLevel, message: string, context?: string, data?: Record<string, unknown>, error?: Error) {
  if (LOG_LEVELS[level] < MIN_LEVEL) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    data,
    error: error
      ? { name: error.name, message: error.message, stack: error.stack }
      : undefined,
  };

  const formatted = formatEntry(entry);

  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  debug: (msg: string, ctx?: string, data?: Record<string, unknown>) =>
    log("debug", msg, ctx, data),
  info: (msg: string, ctx?: string, data?: Record<string, unknown>) =>
    log("info", msg, ctx, data),
  warn: (msg: string, ctx?: string, data?: Record<string, unknown>) =>
    log("warn", msg, ctx, data),
  error: (msg: string, ctx?: string, error?: Error, data?: Record<string, unknown>) =>
    log("error", msg, ctx, data, error),

  /** Create a child logger with a fixed context. */
  child: (context: string) => ({
    debug: (msg: string, data?: Record<string, unknown>) =>
      log("debug", msg, context, data),
    info: (msg: string, data?: Record<string, unknown>) =>
      log("info", msg, context, data),
    warn: (msg: string, data?: Record<string, unknown>) =>
      log("warn", msg, context, data),
    error: (msg: string, error?: Error, data?: Record<string, unknown>) =>
      log("error", msg, context, data, error),
  }),
};
