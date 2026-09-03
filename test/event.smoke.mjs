/* Локальный дым-тест ветки мероприятия: без сети, без SMTP, без Bitrix.
   Проверяет, что модули грузятся, шаблоны читаются, плейсхолдеры закрыты,
   .ics валиден по структуре, а ссылка Google Calendar считает время верно. */
process.env.BITRIX_WEBHOOK_URL = 'https://example.invalid/rest/1/token/';
process.env.TOKEN_SECRET = 'smoke-secret';
process.env.SMTP_HOST = 'smtp.example.invalid';
process.env.SMTP_FROM = 'noreply@example.invalid';
process.env.PUBLIC_URL = 'https://handler.example.invalid';
// EVENT_PHONE намеренно не задаём: проверяем значение по умолчанию из config.
process.env.EVENT_UNSUBSCRIBE_URL = 'https://avgst.ru/unsubscribe';

const ev = await import('../src/event.js');

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
};

// 1. Роутинг по заголовку сделки
check('сделка мероприятия распознаётся',
  ev.isEventDeal({TITLE: 'Заявка с формы: Регистрация на день открытых дверей'}));
check('реферальная сделка не попадает в ветку мероприятия',
  !ev.isEventDeal({TITLE: 'Реферальная программа — заявка'}));
check('посторонняя сделка не попадает',
  !ev.isEventDeal({TITLE: 'Входящий звонок'}));

// 2. Письмо-подтверждение
const confirm = await ev.renderConfirm({name: 'Иван', confirmUrl: 'https://x.test/c?t=1'});
check('в письме 1 не осталось плейсхолдеров',
  !/\{\{\w+\}\}/.test(confirm.html), (confirm.html.match(/\{\{\w+\}\}/g) || []).join(','));
check('письмо 1 содержит ссылку подтверждения', confirm.html.includes('https://x.test/c?t=1'));
check('логотип идёт через cid', confirm.html.includes('cid:ags-logo'));
check('текстовая версия непустая', confirm.text.length > 80);

// 3. Письмо с программой
const prog = await ev.renderProgramme({name: 'Иван'});
check('в письме 2 не осталось плейсхолдеров',
  !/\{\{\w+\}\}/.test(prog.html), (prog.html.match(/\{\{\w+\}\}/g) || []).join(','));
check('письмо 2 содержит все 8 пунктов программы',
  ['01','02','03','04','05','06','07','08'].every(n => prog.html.includes(`>${n}<`)));
check('письмо 2 не содержит реферальных формулировок',
  !/реферал/i.test(prog.html));

// 4. Календарь
// 3b. Напоминание
const rem = await ev.renderReminder({name: 'Иван'});
check('в письме 3 не осталось плейсхолдеров',
  !/{{w+}}/.test(rem.html), (rem.html.match(/{{w+}}/g) || []).join(','));
check('письмо 3 содержит телефон', rem.html.includes('831 266-66-45'));
check('письмо 3 содержит кнопку маршрута', /Построить маршрут/.test(rem.html));

const ics = await ev.buildIcs({uid: 'smoke-1'});
check('.ics с CRLF', ics.includes('\r\n'));
check('.ics закрывает плейсхолдеры', !/\{\{\w+\}\}/.test(ics), (ics.match(/\{\{\w+\}\}/g) || []).join(','));
check('.ics начало 10:00 по Москве', ics.includes('DTSTART;TZID=Europe/Moscow:20260912T100000'));
check('.ics окончание 13:00', ics.includes('DTEND;TZID=Europe/Moscow:20260912T130000'));
check('.ics имеет напоминание за сутки', ics.includes('TRIGGER:-P1D'));
check('.ics структурно закрыт',
  ics.trimEnd().endsWith('END:VCALENDAR') && ics.includes('BEGIN:VEVENT') && ics.includes('END:VEVENT'));

const g = ev.googleCalendarUrl();
check('Google-ссылка переводит 10:00 MSK в 07:00 UTC', g.includes('20260912T070000Z%2F20260912T100000Z'), g.slice(0, 120));

console.log(failures ? `\nПРОВАЛЕНО: ${failures}` : '\nВсе проверки пройдены.');
process.exit(failures ? 1 : 0);
