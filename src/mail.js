import nodemailer from "nodemailer";
import { config } from "./config.js";
import { confirmTemplate, codeTemplate } from "./templates.js";

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  await getTransporter().sendMail({
    from: config.smtp.from,
    to,
    subject,
    html,
    text,
  });
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
  });
}
