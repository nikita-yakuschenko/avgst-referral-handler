function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const brand = {
  yellow: "#fcc90c",
  bg: "#111111",
  card: "#1a1a1a",
  text: "#f5f5f5",
  muted: "#b3b3b3",
};

function layout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title></head>
<body style="margin:0;padding:24px;background:${brand.bg};font-family:Inter,Arial,sans-serif;color:${brand.text}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:560px;background:${brand.card};border-radius:16px;padding:32px 28px">
      <tr><td>${bodyHtml}</td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:${brand.muted}">Авангард Строй · Реферальная программа</p>
  </td></tr></table>
</body></html>`;
}

export function confirmTemplate({ name, confirmUrl, expiresHours, rulesUrl }) {
  const hello = name ? `Здравствуйте, ${name}!` : "Здравствуйте!";
  const html = layout(
    "Подтвердите email",
    `<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3">Подтвердите email</h1>
     <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:${brand.muted}">${esc(hello)}<br>
     Вы зарегистрировались в реферальной программе. Подтвердите адрес электронной почты, чтобы получить код участника.</p>
     <p style="margin:0 0 24px;text-align:center">
       <a href="${esc(confirmUrl)}" style="display:inline-block;padding:14px 28px;background:${brand.yellow};color:#111;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px">Подтвердить email</a>
     </p>
     <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${brand.muted}">Или перейдите по ссылке:<br>
     <a href="${esc(confirmUrl)}" style="color:${brand.yellow};word-break:break-all">${esc(confirmUrl)}</a></p>
     <p style="margin:16px 0 0;font-size:12px;color:${brand.muted}">Ссылка действует ${expiresHours} ч. Если вы не регистрировались — просто проигнорируйте письмо.<br>
     <a href="${esc(rulesUrl)}" style="color:${brand.yellow}">Правила программы</a></p>`
  );
  const text = `${hello}\n\nПодтвердите email для участия в реферальной программе:\n${confirmUrl}\n\nСсылка действует ${expiresHours} ч.\nПравила: ${rulesUrl}`;
  return { html, text };
}

export function codeTemplate({ name, code, rulesUrl }) {
  const hello = name ? `${name}, email подтверждён!` : "Email подтверждён!";
  const html = layout(
    "Код участника",
    `<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3">Спасибо за регистрацию!</h1>
     <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:${brand.muted}">${esc(hello)}<br>
     Ваш код участника реферальной программы:</p>
     <p style="margin:0 0 24px;padding:16px 20px;background:#0d0d0d;border:1px solid ${brand.yellow};border-radius:12px;text-align:center;font-size:28px;font-weight:700;letter-spacing:.08em;color:${brand.yellow}">${esc(code)}</p>
     <p style="margin:0;font-size:14px;line-height:1.55;color:${brand.muted}">Сохраните код — он понадобится для участия в программе.<br>
     <a href="${esc(rulesUrl)}" style="color:${brand.yellow}">Правила реферальной программы</a></p>`
  );
  const text = `${hello}\n\nВаш код участника: ${code}\n\nПравила: ${rulesUrl}`;
  return { html, text };
}

export function pageTemplate({ title, message, ok }) {
  const color = ok ? "#4ade80" : "#f87171";
  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#111;color:#fff;font-family:Inter,Arial,sans-serif;padding:24px">
  <div style="max-width:420px;text-align:center">
    <div style="width:56px;height:56px;margin:0 auto 16px;border-radius:50%;border:2px solid ${color};display:flex;align-items:center;justify-content:center;color:${color};font-size:28px">${ok ? "✓" : "!"}</div>
    <h1 style="margin:0 0 12px;font-size:22px">${esc(title)}</h1>
    <p style="margin:0;font-size:15px;line-height:1.55;color:#b3b3b3">${message}</p>
  </div>
</body></html>`;
}
