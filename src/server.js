import express from "express";
import { config } from "./config.js";
import {
  extractEmail,
  extractName,
  getEntity,
  isEmailConfirmed,
  markEmailConfirmed,
  markReferralParticipant,
  resolveParticipantCode,
  participantReferralLink,
} from "./bitrix.js";
import { sendCodeEmail, sendConfirmEmail } from "./mail.js";
import { confirmUrl, createConfirmToken, parseConfirmToken } from "./token.js";
import { pageTemplate } from "./templates.js";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

function log(msg, extra) {
  const line = extra ? `${msg} ${JSON.stringify(extra)}` : msg;
  console.log(`[referral] ${line}`);
}

function verifyBitrixAppToken(body) {
  if (!config.bitrixAppToken) return true;
  const token = body?.auth?.application_token || body?.["auth[application_token]"];
  return token === config.bitrixAppToken;
}

function parseBitrixWebhookBody(body) {
  // Bitrix исходящий webhook: form-urlencoded или JSON
  const event = body.event || body.EVENT || body["event"];
  let entityId =
    body?.data?.FIELDS?.ID ||
    body?.["data[FIELDS][ID]"] ||
    body?.data?.id ||
    body?.ID;

  if (!entityId && typeof body === "object") {
    for (const key of Object.keys(body)) {
      const m = key.match(/^data\[FIELDS\]\[ID\]$/);
      if (m) entityId = body[key];
    }
  }

  entityId = Number(entityId);
  if (!entityId) return null;

  const entityType = config.entityType;
  return { event, entityId, entityType };
}

async function startConfirmationFlow(entityType, entityId) {
  const entity = await getEntity(entityType, entityId);
  const email = extractEmail(entity);
  const name = extractName(entity);

  if (!email) {
    log("skip: no email", { entityId });
    return { skipped: true, reason: "no_email" };
  }

  if (isEmailConfirmed(entity)) {
    log("skip: already confirmed", { entityId });
    return { skipped: true, reason: "already_confirmed" };
  }

  const token = createConfirmToken({ entityId, entityType, email });
  const url = confirmUrl(token);
  await sendConfirmEmail({
    email,
    name,
    confirmUrlValue: url,
    expiresHours: config.tokenTtlHours,
  });

  log("confirm email sent", { entityId, email: email.replace(/(.{2}).+(@.+)/, "$1***$2") });
  return { ok: true, entityId, emailSent: true };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "avgst-referral-handler" });
});

/**
 * Исходящий webhook Bitrix24.
 * В Bitrix: Разработчикам → Другое → Исходящий webhook
 * Событие: ONCRMLEADADD (или ONCRMDEALADD)
 * URL: https://your-domain/webhook/bitrix
 */
app.post("/webhook/bitrix", async (req, res) => {
  try {
    if (!verifyBitrixAppToken(req.body)) {
      log("bitrix webhook: invalid app token");
      return res.status(403).json({ ok: false, error: "forbidden" });
    }

    const parsed = parseBitrixWebhookBody(req.body);
    if (!parsed?.entityId) {
      log("bitrix webhook: no entity id", { event: req.body?.event });
      return res.status(200).json({ ok: true, skipped: true, reason: "no_entity_id" });
    }

    // Bitrix ждёт быстрый ответ
    res.status(200).json({ ok: true, accepted: true, entityId: parsed.entityId });

    startConfirmationFlow(parsed.entityType, parsed.entityId).catch((err) => {
      log("confirm flow error", { message: err.message, entityId: parsed.entityId });
    });
  } catch (err) {
    log("webhook error", { message: err.message });
    if (!res.headersSent) res.status(500).json({ ok: false, error: "internal" });
  }
});

/**
 * Ручной перезапуск (если webhook не сработал)
 * POST /api/referral/start  { "entity_id": 123 }
 * Header: X-Webhook-Secret: TOKEN_SECRET
 */
app.post("/api/referral/start", async (req, res) => {
  try {
    const secret = req.get("X-Webhook-Secret") || "";
    if (secret !== config.tokenSecret) {
      return res.status(403).json({ ok: false, error: "forbidden" });
    }
    const entityId = Number(req.body?.entity_id || req.body?.entityId);
    if (!entityId) return res.status(400).json({ ok: false, error: "entity_id required" });

    const result = await startConfirmationFlow(config.entityType, entityId);
    res.json(result);
  } catch (err) {
    log("start error", { message: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Подтверждение email по ссылке из письма
 */
app.get("/confirm", async (req, res) => {
  try {
    const token = String(req.query.token || "");
    const payload = parseConfirmToken(token);
    const { entityId, entityType, email } = payload;

    const entity = await getEntity(entityType, entityId);
    const currentEmail = extractEmail(entity);
    if (currentEmail && currentEmail.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).send(
        pageTemplate({
          title: "Ошибка подтверждения",
          message: "Email в заявке изменился. Обратитесь в поддержку.",
          ok: false,
        })
      );
    }

    if (isEmailConfirmed(entity)) {
      return res.status(200).send(
        pageTemplate({
          title: "Email уже подтверждён",
          message: "Ничего делать не нужно. Если код не приходил — проверьте папку «Спам».",
          ok: true,
        })
      );
    }

    const name = extractName(entity);
    const code = await resolveParticipantCode(entity);
    const referralUrl = participantReferralLink(code);

    await markReferralParticipant(code, referralUrl);
    await markEmailConfirmed(entityType, entityId);
    await sendCodeEmail({ email, name, code, referralUrl });

    log("confirmed", { entityId, contactId: code, referralUrl });

    res.status(200).send(
      pageTemplate({
        title: "Email подтверждён",
        message: "Код участника отправлен на вашу почту. Проверьте входящие и папку «Спам».",
        ok: true,
      })
    );
  } catch (err) {
    const msg =
      err.message === "expired_token"
        ? "Ссылка устарела. Запросите новое письмо через регистрацию или поддержку."
        : err.message === "invalid_token"
          ? "Некорректная ссылка подтверждения."
          : err.message === "contact_id_not_found"
            ? "Не удалось определить код участника. Обратитесь в поддержку."
            : "Не удалось подтвердить email. Попробуйте позже.";
    log("confirm error", { message: err.message });
    res.status(400).send(pageTemplate({ title: "Не удалось подтвердить", message: msg, ok: false }));
  }
});

app.listen(config.port, () => {
  log(`listening on :${config.port}`, { publicUrl: config.publicUrl, entityType: config.entityType });
});
