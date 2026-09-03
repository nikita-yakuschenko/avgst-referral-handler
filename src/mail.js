import nodemailer from "nodemailer";
import { config } from "./config.js";
import { logger, maskEmail } from "./logger.js";
import { confirmTemplate, codeTemplate } from "./templates.js";
import { logoAttachment, renderConfirm, renderProgramme, renderReminder } from "./event.js";

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
      logger: config.logLevel === "debug",
      debug: config.logLevel === "debug",
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html, text, kind, attachments }) {
  const from = config.smtp.from;
  const authUser = config.smtp.user || "";
  const fromDomain = String(from).split("@")[1] || "";
  const authDomain = authUser.split("@")[1] || "";

  logger.debug("smtp: sending", {
    kind: kind || "mail",
    to: maskEmail(to),
    from,
    subject,
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    authUser: authUser ? maskEmail(authUser) : null,
    fromAuthDomainMatch: !authDomain || !fromDomain || fromDomain === authDomain,
  });

  if (authUser && fromDomain && authDomain && fromDomain !== authDomain) {
    logger.warn("smtp: FROM domain differs from SMTP_USER — Gmail may reject or spam-folder", {
      from,
      authUser: maskEmail(authUser),
    });
  }

  if (authUser && from !== authUser && !String(from).includes(authUser)) {
    logger.warn("smtp: SMTP_FROM is not the authenticated mailbox — use alias in Yandex or set SMTP_FROM=SMTP_USER", {
      from,
      authUser: maskEmail(authUser),
    });
  }

  try {
    const info = await getTransporter().sendMail({
      from,
      to,
      replyTo: authUser || from,
      subject,
      html,
      text,
      attachments,
    });

    logger.info("smtp: sent", {
      kind: kind || "mail",
      to: maskEmail(to),
      messageId: info.messageId || null,
      response: info.response || null,
      accepted: info.accepted || [],
      rejected: info.rejected || [],
    });
    return info;
  } catch (err) {
    logger.error("smtp: failed", {
      kind: kind || "mail",
      to: maskEmail(to),
      code: err.code || null,
      command: err.command || null,
      response: err.response || null,
      message: err.message,
    });
    throw err;
  }
}

export async function sendConfirmEmail({ email, name, confirmUrlValue, expiresHours }) {
  const { html, text } = confirmTemplate({
    name,
    confirmUrl: confirmUrlValue,
    expiresHours,
    rulesUrl: config.rulesUrl,
  });
  await sendMail({
    to: email,
    subject: "Подтвердите email — реферальная программа Авангард Строй",
    html,
    text,
    kind: "confirm",
  });
}

export async function sendCodeEmail({ email, name, code, referralUrl, rulesUrl }) {
  const { html, text } = codeTemplate({
    name,
    code,
    referralUrl,
    rulesUrl: rulesUrl || config.rulesUrl,
  });
  await sendMail({
    to: email,
    subject: "Ваш код участника реферальной программы — Авангард Строй",
    html,
    text,
    kind: "code",
  });
}

/** Проверка SMTP при старте (debug) */
export async function verifySmtp() {
  logger.debug("smtp: verify start", {
    host: config.smtp.host,
    port: config.smtp.port,
    from: config.smtp.from,
    user: config.smtp.user ? maskEmail(config.smtp.user) : null,
  });
  await getTransporter().verify();
  logger.info("smtp: verify ok");
}

/* ---------- Ветка «День открытых дверей» ---------- */

export async function sendEventConfirmEmail({ email, name, confirmUrlValue }) {
  const { html, text } = await renderConfirm({ name, confirmUrl: confirmUrlValue });
  await sendMail({
    to: email,
    subject: config.event.confirmSubject,
    html,
    text,
    kind: "event_confirm",
    attachments: [await logoAttachment()],
  });
}

export async function sendEventReminderEmail({ email, name }) {
  const { html, text } = await renderReminder({ name });
  await sendMail({
    to: email,
    subject: config.event.reminderSubject,
    html,
    text,
    kind: "event_reminder",
    attachments: [await logoAttachment()],
  });
}

export async function sendEventProgrammeEmail({ email, name }) {
  const { html, text } = await renderProgramme({ name });
  await sendMail({
    to: email,
    subject: config.event.programmeSubject,
    html,
    text,
    kind: "event_programme",
    // Событие отдаётся ссылкой на /event.ics, а не вложением.
    attachments: [await logoAttachment()],
  });
}
