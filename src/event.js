/**
 * Ветка «День открытых дверей».
 *
 * Живёт рядом с реферальной, ничего в ней не меняя: сделка попадает сюда
 * только если её заголовок совпал с EVENT_DEAL_TITLE_MATCH. Всё остальное —
 * шаблоны, стадия, календарь — своё.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { config } from "./config.js";
import { extractTitle } from "./bitrix.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const templateDir = path.join(root, "templates");
const assetDir = path.join(root, "assets");

const cache = new Map();
async function template(name) {
  if (!cache.has(name)) cache.set(name, await readFile(path.join(templateDir, name), "utf8"));
  return cache.get(name);
}

/** Сделка относится к мероприятию, а не к реферальной программе. */
export function isEventDeal(entity) {
  const needle = String(config.event.titleMatch || "").trim().toLowerCase();
  if (!needle) return false;
  return extractTitle(entity).toLowerCase().includes(needle);
}

function fill(text, values) {
  return text.replace(/\{\{(\w+)\}\}/g, (whole, key) =>
    key in values && values[key] != null ? String(values[key]) : whole
  );
}

/** Строка вида 20260912T100000 из «2026-09-12» и «10:00». */
function stamp(date, time) {
  return `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
}

/** UTC-метка для Google Calendar: время события минус смещение площадки. */
function utcStamp(date, time, offsetHours) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d, hh - offsetHours, mm));
  return at.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl() {
  const e = config.event;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.summary,
    dates: `${utcStamp(e.date, e.startTime, e.utcOffset)}/${utcStamp(e.date, e.endTime, e.utcOffset)}`,
    location: e.address,
    details: e.calendarDetails,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Содержимое .ics для вложения. */
export async function buildIcs({ uid }) {
  const e = config.event;
  const raw = await template("event.ics");
  return fill(raw, {
    uid,
    dtstamp: new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""),
    start_hhmmss: stamp(e.date, e.startTime).split("T")[1],
    end_hhmmss: stamp(e.date, e.endTime).split("T")[1],
    route_url: e.routeUrl,
    landing_url: e.landingUrl,
  }).replace(/\r?\n/g, "\r\n"); // RFC 5545 требует CRLF
}

export async function logoAttachment() {
  return {
    filename: "logo.png",
    content: await readFile(path.join(assetDir, "logo-email@2x.png")),
    cid: "ags-logo",
    contentDisposition: "inline",
  };
}

const LOGO_SRC = "cid:ags-logo";

export async function renderConfirm({ name, confirmUrl }) {
  const e = config.event;
  const html = fill(await template("event-confirm.html"), {
    logo_url: LOGO_SRC,
    name: name ? `${name},` : "Здравствуйте,",
    confirm_url: confirmUrl,
    ttl_hours: config.tokenTtlHours,
    event_time: e.timeLabel,
    unsubscribe_url: e.unsubscribeUrl,
  });
  const text = [
    `${name ? name + "," : "Здравствуйте,"} вы записались на День открытых дверей на производстве «Авангард Строй».`,
    "",
    "Подтвердите почту, чтобы мы закрепили за вами место:",
    confirmUrl,
    "",
    `Ссылка действует ${config.tokenTtlHours} часов.`,
    "",
    `${e.dateLabel}, ${e.timeLabel}`,
    e.address,
  ].join("\n");
  return { html, text };
}

export async function renderReminder({ name }) {
  const e = config.event;
  const html = fill(await template("event-reminder.html"), {
    logo_url: LOGO_SRC,
    name: name ? `${name},` : "Здравствуйте,",
    event_time: e.timeLabel,
    route_url: e.routeUrl,
    phone: e.phone,
    unsubscribe_url: e.unsubscribeUrl,
  });
  const text = [
    `${name ? name + "," : "Здравствуйте,"} напоминаем: День открытых дверей «Авангард Строй» завтра.`,
    "",
    `${e.dateLabel}, ${e.timeLabel}`,
    e.address,
    `Ориентир: ${e.landmark}`,
    "",
    `Маршрут: ${e.routeUrl}`,
    `Не сможете приехать — позвоните: ${e.phone}`,
  ].join("\n");
  return { html, text };
}

export async function renderProgramme({ name }) {
  const e = config.event;
  const html = fill(await template("event-programme.html"), {
    logo_url: LOGO_SRC,
    name: name ? `${name},` : "Здравствуйте,",
    event_time: e.timeLabel,
    google_cal_url: googleCalendarUrl(),
    ics_url: `${config.publicUrl}/event.ics`,
    route_url: e.routeUrl,
    phone: e.phone,
    unsubscribe_url: e.unsubscribeUrl,
  });
  const text = [
    `${name ? name + "," : "Здравствуйте,"} почта подтверждена, место закреплено.`,
    "",
    `${e.dateLabel}, ${e.timeLabel}`,
    e.address,
    `Ориентир: ${e.landmark}`,
    "",
    "Программа дня приложена к письму, событие — во вложении .ics.",
    `Маршрут: ${e.routeUrl}`,
  ].join("\n");
  return { html, text };
}
