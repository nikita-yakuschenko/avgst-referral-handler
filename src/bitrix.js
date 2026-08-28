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

export async function getContact(contactId) {
  const id = Number(contactId);
  if (!id) return null;
  return bitrixCall("crm.contact.get", { id });
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

export function extractTitle(entity) {
  return String(entity?.TITLE || "").trim();
}

/** Только сделки с формы регистрации в реферальной программе */
export function isReferralDeal(entity) {
  const needle = String(config.referralTitleMatch || "").trim().toLowerCase();
  if (!needle) return false;
  return extractTitle(entity).toLowerCase().includes(needle);
}

/**
 * Email/имя для сделки: сначала сделка, иначе контакт.
 * У crm.deal обычно нет EMAIL — данные на CONTACT_ID.
 */
export async function resolveDealPerson(deal) {
  const fromDeal = {
    email: extractEmail(deal),
    name: extractName(deal),
    contactId: extractContactId(deal),
  };

  let contact = null;
  if (fromDeal.contactId) {
    contact = await getContact(fromDeal.contactId);
  }

  const email = fromDeal.email || extractEmail(contact) || "";
  let contactId = fromDeal.contactId;

  if (!contactId && email) {
    contactId = await findContactIdByEmail(email);
    if (contactId && !contact) contact = await getContact(contactId);
  }

  const name =
    (contact ? extractName(contact) : "") ||
    (fromDeal.name && fromDeal.name !== extractTitle(deal) ? fromDeal.name : "") ||
    "";

  return { email, name, contactId: contactId ? String(contactId) : "" };
}

export function extractContactId(entity) {
  const direct = Number(entity?.CONTACT_ID || entity?.contact_id || 0);
  if (direct > 0) return direct;

  const ids = entity?.CONTACT_IDS;
  if (Array.isArray(ids)) {
    for (const item of ids) {
      const id = Number(typeof item === "object" ? item?.CONTACT_ID || item?.ID || item?.id : item);
      if (id > 0) return id;
    }
  }

  return 0;
}

async function findContactIdByEmail(email) {
  const normalized = String(email || "").trim();
  if (!normalized) return 0;

  const result = await bitrixCall("crm.duplicate.findbycomm", {
    entity_type: "CONTACT",
    type: "EMAIL",
    values: [normalized],
  });

  const ids = result?.CONTACT;
  if (!Array.isArray(ids) || !ids.length) return 0;
  return Number(ids[0] || 0);
}

/** Код участника = ID контакта в Bitrix24 */
export async function resolveParticipantCode(entity) {
  const person = await resolveDealPerson(entity);
  if (person.contactId) return person.contactId;

  let contactId = extractContactId(entity);
  if (!contactId) {
    contactId = await findContactIdByEmail(extractEmail(entity) || person.email);
  }
  if (!contactId) {
    throw new Error("contact_id_not_found");
  }
  return String(contactId);
}

export function participantReferralLink(code) {
  const { referralLinkTemplate } = config;
  if (!referralLinkTemplate.includes("{code}")) {
    throw new Error("REFERRAL_LINK_TEMPLATE must contain {code}");
  }
  return referralLinkTemplate.replaceAll("{code}", encodeURIComponent(String(code)));
}

/** Отметить контакт как участника реферальной программы и записать реферальную ссылку */
export async function markReferralParticipant(contactId, referralUrl) {
  const id = Number(contactId);
  if (!id) throw new Error("contact_id_required");

  const fields = {};
  if (config.ufReferralParticipant) {
    fields[config.ufReferralParticipant] = "1";
  }
  if (config.ufReferralLink && referralUrl) {
    fields[config.ufReferralLink] = referralUrl;
  }
  if (!Object.keys(fields).length) return;

  return bitrixCall("crm.contact.update", { id, fields });
}

export { bitrixCall };
