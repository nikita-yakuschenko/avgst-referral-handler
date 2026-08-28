import { config } from "./config.js";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function levelValue(name) {
  return LEVELS[name] ?? LEVELS.info;
}

function write(level, msg, extra) {
  if (levelValue(level) < levelValue(config.logLevel)) return;
  const line = extra !== undefined ? `${msg} ${JSON.stringify(extra)}` : msg;
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(`[referral] ${line}`);
}

export function maskEmail(email) {
  const s = String(email || "").trim();
  if (!s.includes("@")) return s;
  return s.replace(/(.{2}).+(@.+)/, "$1***$2");
}

export const logger = {
  debug: (msg, extra) => write("debug", msg, extra),
  info: (msg, extra) => write("info", msg, extra),
  warn: (msg, extra) => write("warn", msg, extra),
  error: (msg, extra) => write("error", msg, extra),
};
