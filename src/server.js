import express from "express";
import { config } from "./config.js";
import {
  extractEmail,
  extractTitle,
  getContact,
  getEntity,
  isEmailConfirmed,
  isReferralDeal,
  markEmailConfirmed,
  markReferralParticipant,
  resolveDealPerson,
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

function extractEntityId(body) {
  let entityId =
    body?.data?.FIELDS?.ID ||
    body?.["data[FIELDS][ID]"] ||
    body?.data?.id ||
    body?.ID;

  if (!entityId && typeof body === "object") {
    for (const key of Object.keys(body)) {
      if (/^data\[FIELDS\]\[ID\]$/i.test(key)) entityId = body[key];
    }
  }
  return Number(entityId) || 0;
}

/**
 * Разбор исходящего webhook Bitrix.
 * Контур только deal: ONCRMDEALADD / ONCRMDEALUPDATE.
 * Контакты и лиды игнорируем.
 */
function parseBitrixWebhookBody(body) {
  const event = String(body?.event || body?.EVENT || "").toUpperCase();
  const entityId = extractEntityId(body);

  if (!event) {
    return { ok: false, reason: "no_event", entityId };
  }

  if (event.includes("CONTACT")) {
    return { ok: false, reason: "ignored_contact_event", event, entityId };
  }
  if (event.includes("LEAD")) {
    return { ok: false, reason: "ignored_lead_event", event, entityId };
  }
  if (!event.includes("DEAL")) {
    return { ok: false, reason: "ignored_event", event, entityId };
  }
  if (!entityId) {
    return { ok: false, reason: "no_entity_id", event };
  }

  return { ok: true, event, entityId, entityType: "deal" };
}

async function startConfirmationFlow(entityType, entityId) {
  const entity = await getEntity(entityType, entityId);
  const title = extractTitle(entity);

  // Жёсткий фильтр: только форма реферальной программы
  if (!isReferralDeal(entity)) {
    log("skip: not referral deal", { entityId, title });
    return { skipped: true, reason: "not_referral_deal", title };
  }

  const person = await resolveDealPerson(entity);
  const { email, name } = person;
  const contact = person.contactId ? await getContact(person.contactId) : null;

  if (!email) {
    log("skip: no email", { entityId, title, contactId: person.contactId || null });
    return { skipped: true, reason: "no_email" };
  }

  if (isEmailConfirmed(contact)) {
    log("skip: already confirmed", { entityId, contactId: person.contactId || null });
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

  log("confirm email sent", {
    entityId,
    title,
    contactId: person.contactId || null,
    email: email.replace(/(.{2}).+(@.+)/, "$1***$2"),
  });
  return { ok: true, entityId, emailSent: true };
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "avgst-referral-handler",
    entityType: "deal",
    referralTitleMatch: config.referralTitleMatch,
    stageAfterConfirm: config.stageAfterConfirm,
  });
});

/**
 * Исходящий webhook Bitrix24.
 * События: ONCRMDEALADD, ONCRMDEALUPDATE
 * URL: https://your-domain/webhook/bitrix
 */
app.post("/webhook/bitrix", async (req, res) => {
  try {
    log("bitrix webhook: received", {
      event: req.body?.event || req.body?.EVENT || null,
      entityId: extractEntityId(req.body) || null,
    });

    if (!verifyBitrixAppToken(req.body)) {
      log("bitrix webhook: invalid app token");
      return res.status(403).json({ ok: false, error: "forbidden" });
    }

    const parsed = parseBitrixWebhookBody(req.body);
    if (!parsed.ok) {
      log("bitrix webhook: skipped", {
        reason: parsed.reason,
        event: parsed.event,
        entityId: parsed.entityId || undefined,
      });
      return res.status(200).json({ ok: true, skipped: true, reason: parsed.reason });
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

    const result = await startConfirmationFlow("deal", entityId);
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
    const { entityId, email } = payload;
    // Всегда deal — старые токены с lead не поддерживаем после смены контура
    const entityType = "deal";

    const entity = await getEntity(entityType, entityId);

    if (!isReferralDeal(entity)) {
      return res.status(400).send(
        pageTemplate({
          title: "Ошибка подтверждения",
          message: "Эта заявка не относится к реферальной программе.",
          ok: false,
        })
      );
    }

    const currentEmail = extractEmail(entity);
    const person = await resolveDealPerson(entity);
    const liveEmail = currentEmail || person.email;

    if (liveEmail && liveEmail.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).send(
        pageTemplate({
          title: "Ошибка подтверждения",
          message: "Email в заявке изменился. Обратитесь в поддержку.",
          ok: false,
        })
      );
    }

    const contact = person.contactId ? await getContact(person.contactId) : null;
    if (isEmailConfirmed(contact)) {
      return res.status(200).send(
        pageTemplate({
          title: "Email уже подтверждён",
          message: "Ничего делать не нужно. Если код не приходил — проверьте папку «Спам».",
          ok: true,
        })
      );
    }

    const name = person.name;
    const code = person.contactId || (await resolveParticipantCode(entity));
    const referralUrl = participantReferralLink(code);

    await markReferralParticipant(code, referralUrl);
    // UF «email подтверждён» на контакте + этап сделки UC_L2W4L1
    await markEmailConfirmed(entityType, entityId, person.contactId);
    await sendCodeEmail({ email, name, code, referralUrl });

    log("confirmed", {
      entityId,
      contactId: code,
      referralUrl,
      stage: config.stageAfterConfirm,
    });

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
  log(`listening on :${config.port}`, {
    publicUrl: config.publicUrl,
    entityType: "deal",
    referralTitleMatch: config.referralTitleMatch,
    stageAfterConfirm: config.stageAfterConfirm,
  });
});
