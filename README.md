# Referral email confirmation handler

Промежуточный сервис для реферальной программы Авангард Строй.

## Поток

1. Заявка попадает в Bitrix24 (уже настроено).
2. **Исходящий webhook Bitrix24** → `POST /webhook/bitrix` → письмо «Подтвердите email».
3. Пользователь кликает ссылку → `GET /confirm?token=...`.
4. Сервис ставит UF-чекбокс «Email подтверждён» и отправляет письмо с **кодом участника** (= ID записи).

## Домен в Dokploy (проект `avgst.dev`)

| Поле | Значение |
|------|----------|
| Host | `dev.avgst.ru` |
| Path | `/bitrix/referral` |
| Strip path | **да** |
| HTTPS | Let's Encrypt |
| Port | `3855` (как в `.env`) |

`PUBLIC_URL=https://dev.avgst.ru/bitrix/referral`

**Исходящий webhook Bitrix24:**
```
https://dev.avgst.ru/bitrix/referral/webhook/bitrix
```

**Confirm в письме:**
```
https://dev.avgst.ru/bitrix/referral/confirm?token=...
```

Traefik отрежет префикс `/bitrix/referral` — внутри контейнера пути остаются `/webhook/bitrix`, `/confirm`, `/health`.

## Настройка Bitrix24

### 1. Входящий webhook (REST)

Разработчикам → Другое → **Входящий webhook**  
Права: `crm`  
→ скопировать URL в `BITRIX_WEBHOOK_URL`

### 2. Исходящий webhook

Разработчикам → Другое → **Исходящий webhook**  
- Событие: `ONCRMLEADADD` (или `ONCRMDEALADD` для сделок)
- URL: `https://dev.avgst.ru/bitrix/referral/webhook/bitrix`
- Токен приложения → `BITRIX_APP_TOKEN`

### 3. UF-поле

Укажите код чекбокса в `BITRIX_UF_EMAIL_CONFIRMED` (например `UF_CRM_1234567890`).

## Env

Скопируйте `.env.example` → `.env` и заполните.

## Запуск локально

```powershell
cd referral-handler
npm install
copy .env.example .env
# отредактировать .env
npm run dev
```

## Dokploy

1. New Application → Dockerfile из `referral-handler/`
2. Domain + SSL
3. Env из `.env.example`
4. Healthcheck: `GET https://dev.avgst.ru/bitrix/referral/health`

## Ручной перезапуск письма confirm

```powershell
curl -X POST https://dev.avgst.ru/bitrix/referral/api/referral/start `
  -H "Content-Type: application/json" `
  -H "X-Webhook-Secret: ВАШ_TOKEN_SECRET" `
  -d "{\"entity_id\": 123}"
```

## Endpoints

| Method | Path | Назначение |
|--------|------|------------|
| GET | `/health` | Healthcheck |
| POST | `/webhook/bitrix` | Исходящий webhook Bitrix24 |
| GET | `/confirm?token=` | Подтверждение email |
| POST | `/api/referral/start` | Ручной запуск (secret header) |
