import "dotenv/config";

function required(name, value) {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT || 3000),
  publicUrl: (process.env.PUBLIC_URL || "http://localhost:3000").replace(/\/$/, ""),
  bitrixWebhookUrl: required("BITRIX_WEBHOOK_URL", process.env.BITRIX_WEBHOOK_URL).replace(/\/?$/, "/"),
  bitrixAppToken: process.env.BITRIX_APP_TOKEN || "",
  entityType: (process.env.BITRIX_ENTITY_TYPE || "lead").toLowerCase(),
  ufEmailConfirmed: process.env.BITRIX_UF_EMAIL_CONFIRMED || "",
  stageAfterConfirm: process.env.BITRIX_STAGE_AFTER_CONFIRM || "",
  tokenSecret: required("TOKEN_SECRET", process.env.TOKEN_SECRET),
  tokenTtlHours: Number(process.env.TOKEN_TTL_HOURS || 72),
  rulesUrl: process.env.RULES_URL || "https://avgst.ru/referral",
  smtp: {
    host: required("SMTP_HOST", process.env.SMTP_HOST),
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: required("SMTP_FROM", process.env.SMTP_FROM),
  },
};

export function entityMethods(type) {
  if (type === "deal") {
    return { get: "crm.deal.get", update: "crm.deal.update", stageField: "STAGE_ID" };
  }
  return { get: "crm.lead.get", update: "crm.lead.update", stageField: "STATUS_ID" };
}
