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
  // Контур только сделки (Tilda → Bitrix deal)
  entityType: "deal",
  // Подстрока в TITLE сделки с формы «Реферальная программа»
  referralTitleMatch: (process.env.REFERRAL_DEAL_TITLE_MATCH || "Реферальная программа").trim(),
  ufEmailConfirmed: process.env.BITRIX_UF_EMAIL_CONFIRMED || "",
  ufReferralParticipant:
    process.env.BITRIX_UF_REFERRAL_PARTICIPANT || "UF_CRM_1787908414223",
  ufReferralLink: process.env.BITRIX_UF_REFERRAL_LINK || "UF_CRM_1787908433785",
  // Этап сделки после полной регистрации
  stageAfterConfirm: process.env.BITRIX_STAGE_AFTER_CONFIRM || "UC_L2W4L1",
  tokenSecret: required("TOKEN_SECRET", process.env.TOKEN_SECRET),
  tokenTtlHours: Number(process.env.TOKEN_TTL_HOURS || 72),
  rulesUrl: process.env.RULES_URL || "https://avgst.ru/referral",
  referralLinkTemplate: process.env.REFERRAL_LINK_TEMPLATE || "https://avgst.ru/?ref={code}",
  logLevel: (process.env.LOG_LEVEL || "info").trim().toLowerCase(),
  // Вторая ветка: «День открытых дверей». Реферальной логики не касается —
  // сделка попадает сюда только по совпадению заголовка.
  event: {
    titleMatch: (process.env.EVENT_DEAL_TITLE_MATCH || "Регистрация на день открытых дверей").trim(),
    stageAfterConfirm: process.env.EVENT_STAGE_AFTER_CONFIRM || "UC_X25RZI",
    date: process.env.EVENT_DATE || "2026-09-12",
    startTime: process.env.EVENT_START || "10:00",
    endTime: process.env.EVENT_END || "13:00",
    utcOffset: Number(process.env.EVENT_UTC_OFFSET || 3), // Europe/Moscow
    dateLabel: process.env.EVENT_DATE_LABEL || "суббота, 12 сентября 2026",
    timeLabel: process.env.EVENT_TIME_LABEL || "сбор в 10:00",
    summary: process.env.EVENT_SUMMARY || "День открытых дверей на производстве «Авангард Строй»",
    calendarDetails:
      process.env.EVENT_CALENDAR_DETAILS ||
      "Экскурсия по цехам, прогулка по будущему дому, консультация архитектора.",
    address: process.env.EVENT_ADDRESS || "Нижний Новгород, ул. Зайцева, 31, корпус 1",
    landmark: process.env.EVENT_LANDMARK || "проходная бывшего завода ЗКПД-4",
    routeUrl:
      process.env.EVENT_ROUTE_URL ||
      "https://yandex.ru/maps/?rtext=~56.366321,43.791390&rtt=auto",
    landingUrl: process.env.EVENT_LANDING_URL || "https://avgst.ru/",
    phone: process.env.EVENT_PHONE || "+7 831 266-66-45",
    unsubscribeUrl: process.env.EVENT_UNSUBSCRIBE_URL || "",
    confirmSubject:
      process.env.EVENT_CONFIRM_SUBJECT ||
      "Подтвердите почту — День открытых дверей «Авангард Строй»",
    programmeSubject:
      process.env.EVENT_PROGRAMME_SUBJECT ||
      "Вы в списке: программа Дня открытых дверей 12 сентября",
    reminderSubject:
      process.env.EVENT_REMINDER_SUBJECT ||
      "Завтра — День открытых дверей «Авангард Строй»",
  },
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
