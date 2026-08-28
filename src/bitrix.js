import { config, entityMethods } from "./config.js";

async function bitrixCall(method, params = {}) {
  const url = `${config.bitrixWebhookUrl}${method}.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = data.error_description || data.error || res.statusText;
    throw new Error(`Bitrix ${method}: ${msg}`);
  }
  return data.result;
}

export async function getEntity(entityType, entityId) {
  const methods = entityMethods(entityType);
  return bitrixCall(methods.get, { id: entityId });
}

export async function markEmailConfirmed(entityType, entityId) {
  if (!config.ufEmailConfirmed) {
    throw new Error("BITRIX_UF_EMAIL_CONFIRMED is not configured");
  }
  const methods = entityMethods(entityType);
  const fields = { [config.ufEmailConfirmed]: "1" };
  if (config.stageAfterConfirm) {
    fields[methods.stageField] = config.stageAfterConfirm;
  }
  return bitrixCall(methods.update, { id: entityId, fields });
}

export function isEmailConfirmed(entity) {
  if (!config.ufEmailConfirmed) return false;
  const val = entity?.[config.ufEmailConfirmed];
  return val === true || val === 1 || val === "1" || val === "Y" || val === "y";
}

export function extractEmail(entity) {
  const raw = entity?.EMAIL;
  if (!raw) return "";
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const v = item?.VALUE || item?.value;
      if (v) return String(v).trim();
    }
  }
  if (raw?.VALUE) return String(raw.VALUE).trim();
  return "";
}

export function extractName(entity) {
  const parts = [entity?.NAME, entity?.SECOND_NAME, entity?.LAST_NAME].filter(Boolean);
  if (parts.length) return parts.join(" ").trim();
  return String(entity?.TITLE || "").trim();
}

export function participantCode(entityType, entityId) {
  return String(entityId);
}

export { bitrixCall };
