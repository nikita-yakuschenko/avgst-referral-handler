import crypto from "crypto";
import { config } from "./config.js";

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function fromB64url(input) {
  return Buffer.from(input, "base64url");
}

export function createConfirmToken(payload) {
  const header = { v: 1, exp: Date.now() + config.tokenTtlHours * 3600 * 1000 };
  const body = { ...payload, ...header };
  const data = b64url(JSON.stringify(body));
  const sig = crypto.createHmac("sha256", config.tokenSecret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function parseConfirmToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    throw new Error("invalid_token");
  }
  const [data, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", config.tokenSecret).update(data).digest("base64url");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error("invalid_token");
  }
  const body = JSON.parse(fromB64url(data).toString("utf8"));
  if (!body.exp || Date.now() > body.exp) throw new Error("expired_token");
  if (!body.entityId || !body.entityType || !body.email) throw new Error("invalid_token");
  return body;
}

export function confirmUrl(token) {
  return `${config.publicUrl}/confirm?token=${encodeURIComponent(token)}`;
}
