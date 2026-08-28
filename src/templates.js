function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// referral-rules/index.html
const t = {
  page: "#0e0e0e",
  sheet: "#ffffff",
  ink: "#111111",
  soft: "#4a4a4a",
  faint: "#7a7a7a",
  yellow: "#fcc90c",
  yellowSoft: "rgba(252, 201, 12, 0.55)",
  yellowTint: "rgba(252, 201, 12, 0.16)",
  group: "#f6f6f6",
  rule: "#e8e8e8",
  destructive: "#e85d4a",
  radiusSheet: "20px",
  radiusGroup: "16px",
  radiusBox: "14px",
  radiusBtn: "12px",
};

const fontFamily =
  "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
const font = `font-family:${fontFamily}`;

const fontHead = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap&subset=cyrillic" rel="stylesheet">
<style>
  body, table, td, p, h1, a, span, ol, li { ${font}; }
  h1 { margin: 0; font-weight: 700; }
  p { margin: 0; }
</style>`;

function layout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>${fontHead}</head>
<body style="margin:0;padding:16px;background:${t.page};${font};color:${t.ink};-webkit-font-smoothing:antialiased">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${font}"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${t.sheet};border-radius:${t.radiusSheet};overflow:hidden;${font}">
      <tr><td style="padding:36px 20px 32px;${font}">${bodyHtml}</td></tr>
      <tr><td style="padding:0 20px 24px;${font}">
        <p style="margin:0;padding-top:18px;border-top:1px solid ${t.rule};font-size:13px;line-height:1.55;color:${t.faint};text-align:center;${font}">Авангард Строй · Реферальная программа</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function button(href, label) {
  return `<a href="${esc(href)}" style="display:inline-block;padding:14px 24px;background:${t.yellow};color:${t.ink};text-decoration:none;border-radius:${t.radiusBtn};font-size:15px;font-weight:600;line-height:1.25;${font}">${esc(label)}</a>`;
}

function link(href, label) {
  return `<a href="${esc(href)}" style="color:${t.ink};text-decoration:underline;text-underline-offset:3px;font-weight:600;${font}">${esc(label)}</a>`;
}

function sheetTitle(text) {
  return `<h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-.03em;color:${t.ink};${font}">${esc(text)}</h1>`;
}

function sheetIntro(html) {
  return `<p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:${t.soft};${font}">${html}</p>`;
}

function fieldLabel(text) {
  return `<p style="margin:0 0 10px;font-size:15px;line-height:1.4;font-weight:700;color:${t.ink};${font}">${esc(text)}</p>`;
}

function copyBox(text, { large = false } = {}) {
  if (large) {
    return `<p style="margin:0 0 24px;padding:18px 16px;background:${t.yellowTint};border:1px solid rgba(252,201,12,.45);border-radius:${t.radiusBox};text-align:center;font-size:36px;font-weight:700;line-height:1;letter-spacing:-.04em;color:${t.ink};font-variant-numeric:tabular-nums;${font}">${esc(text)}</p>`;
  }
  return `<p style="margin:0;padding:16px 18px;background:${t.sheet};border:1px solid rgba(17,17,17,.08);border-radius:${t.radiusBox};font-size:13px;line-height:1.5;color:${t.ink};word-break:break-all;${font}">${esc(text)}</p>`;
}

function rulesSummary() {
  const items = [
    "Размещайте ссылку в профилях в соц. сетях, сообщайте её неограниченному кругу лиц. Это увеличивает шансы на получение вознаграждения.",
    "Ваши рефералы получат скидку до 12% при заключении договора в зависимости от формы оплаты.",
    "Если Ваши рефералы обращаются в Компанию по телефону или через социальные сети, то при первом обращении или в первом сообщении они должны сообщить Ваш код.",
    "Если человек уже есть в нашей базе, мы не сможем признать за вами право на вознаграждение, поэтому важно подчёркивать это и доносить до своей аудитории.",
  ];

  const rows = items
    .map((item, index) => {
      const border = index === 0 ? "" : `border-top:1px solid ${t.rule};`;
      return `<tr>
        <td style="width:44px;padding:16px 0 0;vertical-align:top;${border}font-size:15px;line-height:1.7;font-weight:700;color:${t.ink};${font}">${index + 1}</td>
        <td style="padding:16px 0 0;vertical-align:top;${border}font-size:15px;line-height:1.7;color:${t.ink};${font}">${esc(item)}</td>
      </tr>`;
    })
    .join("");

  return `<div style="margin:0 0 24px;padding:20px 16px 8px;background:${t.group};border-radius:${t.radiusGroup};${font}">
    <p style="display:inline-block;margin:0 0 12px;padding:4px 8px;background:${t.yellowSoft};font-size:15px;line-height:1.35;font-weight:700;letter-spacing:-.01em;color:${t.ink};${font}">Кратко о правилах</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${font}">${rows}</table>
  </div>`;
}

const rulesSummaryText = `Кратко о правилах:
1. Размещайте ссылку в профилях в соц. сетях, сообщайте её неограниченному кругу лиц. Это увеличивает шансы на получение вознаграждения.
2. Ваши рефералы получат скидку до 12% при заключении договора в зависимости от формы оплаты.
3. Если Ваши рефералы обращаются в Компанию по телефону или через социальные сети, то при первом обращении или в первом сообщении они должны сообщить Ваш код.
4. Если человек уже есть в нашей базе, мы не сможем признать за вами право на вознаграждение, поэтому важно подчёркивать это и доносить до своей аудитории.`;

export function confirmTemplate({ name, confirmUrl, expiresHours, rulesUrl }) {
  const hello = name ? `Здравствуйте, ${name}!` : "Здравствуйте!";
  const html = layout(
    "Подтвердите email",
    `${sheetTitle("Подтвердите email")}
     ${sheetIntro(`${esc(hello)} Вы зарегистрировались в реферальной программе. Подтвердите адрес электронной почты, чтобы получить код участника.`)}
     <p style="margin:0 0 24px;text-align:center;${font}">${button(confirmUrl, "Подтвердить email")}</p>
     <p style="margin:0 0 10px;font-size:13px;line-height:1.55;color:${t.faint};${font}">Если кнопка неактивна, то перейдите по ссылке:</p>
     <p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;${font}"><a href="${esc(confirmUrl)}" style="color:${t.ink};text-decoration:underline;text-underline-offset:3px;${font}">${esc(confirmUrl)}</a></p>
     <p style="margin:0;font-size:13px;line-height:1.55;color:${t.faint};${font}">Ссылка действует ${expiresHours} ч. Если вы не регистрировались — проигнорируйте письмо.<br><br>
     ${link(rulesUrl, "Правила программы")}</p>`
  );
  const text = `${hello}\n\nПодтвердите email для участия в реферальной программе:\n${confirmUrl}\n\nСсылка действует ${expiresHours} ч.\nПравила: ${rulesUrl}`;
  return { html, text };
}

export function codeTemplate({ name, code, referralUrl, rulesUrl }) {
  const hello = name ? `${name}, email подтверждён!` : "Email подтверждён!";
  const html = layout(
    "Код участника",
    `${sheetTitle("Спасибо за регистрацию!")}
     ${sheetIntro(`${esc(hello)} Сохраните код и реферальную ссылку — они понадобятся для участия в программе.`)}
     ${fieldLabel("Код участника")}
     ${copyBox(code, { large: true })}
     ${fieldLabel("Реферальная ссылка")}
     <div style="margin:0 0 24px">${copyBox(referralUrl)}</div>
     ${rulesSummary()}
     <p style="margin:0;font-size:13px;line-height:1.55;color:${t.faint};${font}">${link(rulesUrl, "Правила реферальной программы")}</p>`
  );
  const text = `${hello}\n\nВаш код участника: ${code}\n\nРеферальная ссылка:\n${referralUrl}\n\n${rulesSummaryText}\n\nПравила: ${rulesUrl}`;
  return { html, text };
}

export function pageTemplate({ title, message, ok }) {
  const accent = ok ? t.yellow : t.destructive;
  const iconBg = ok ? t.yellowTint : "#fdecea";

  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>${fontHead}</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:${t.page};color:${t.ink};${font};padding:16px;-webkit-font-smoothing:antialiased">
  <div style="width:100%;max-width:420px;background:${t.sheet};border-radius:${t.radiusSheet};padding:36px 24px;text-align:center;${font}">
    <div style="width:48px;height:48px;margin:0 auto 20px;border-radius:9999px;background:${iconBg};display:flex;align-items:center;justify-content:center;color:${ok ? t.ink : t.destructive};font-size:22px;font-weight:700;line-height:1;${font}">${ok ? "✓" : "!"}</div>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-.02em;${font}">${esc(title)}</h1>
    <p style="margin:0;font-size:15px;line-height:1.65;color:${t.soft};${font}">${esc(message)}</p>
  </div>
</body></html>`;
}
