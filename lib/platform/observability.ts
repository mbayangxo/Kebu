type LogData = Record<string, unknown>;

function emit(level: "info" | "error" | "warn", event: string, data: LogData) {
  console[level](JSON.stringify({ level, event, ...data, ts: new Date().toISOString() }));
}

export const platformLog = {
  info: (event: string, data: LogData = {}) => emit("info", event, data),
  warn: (event: string, data: LogData = {}) => emit("warn", event, data),
  error: (event: string, data: LogData = {}) => emit("error", event, data),
};
