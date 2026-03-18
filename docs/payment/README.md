# Платёжная система

## Escrow Flow

1. Клиент создаёт заказ → сумма рассчитывается с комиссией (lib/pricing.ts)
2. `POST /api/payments/initiate` → создаёт платёж через шлюз, сохраняет в `payments`
3. Шлюз перенаправляет клиента на оплату
4. Webhook `POST /api/payments/webhook` → обновляет статус, логирует
5. Клиент принимает работу → `POST /api/payments/{id}/release`
6. Escrow разблокируется, создаются записи в `payouts`

## Распределение выплат

| Пакет | Исполнитель | Технадзор | Платформа |
|-------|-------------|-----------|-----------|
| 1 | 100% | 0% | Комиссия 600₸ (отдельно) |
| 2 | 100% | 0% | Комиссия 1% (отдельно) |
| 3 | 90% | 3% | 7% |

## Таблицы БД

### `payments`
id, order_id, payer_id, amount_tiyn, commission_tiyn, status, gateway_payment_id, created_at

### `payment_escrow`
id, payment_id, held_amount_tiyn, released_at, released_to_user_id

### `payouts`
id, user_id, amount_tiyn, status(pending/processed), processed_at

### `payment_logs`
id, payment_id, event, payload(JSONB), created_at

## API

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/payments/initiate` | Создать платёж |
| POST | `/api/payments/webhook` | Webhook от шлюза |
| POST | `/api/payments/{id}/release` | Разблокировать escrow |

## HMAC Верификация

Webhook защищён HMAC-SHA256: заголовок `x-webhook-signature`, секрет `PAYMENT_WEBHOOK_SECRET`.

## Payment Gateway

Абстракция `PaymentGateway` (interface) + `MockPaymentGateway` для разработки.
В продакшне подключить реальный шлюз (Kaspi, Halyk и т.д.).

## Файлы

| Файл | Описание |
|------|----------|
| `supabase/migrations/014_payment_tables.sql` | Миграция БД |
| `src/lib/payment/gateway.ts` | Абстракция шлюза + Mock + HMAC |
| `src/app/api/payments/initiate/route.ts` | Инициализация платежа |
| `src/app/api/payments/webhook/route.ts` | Webhook |
| `src/app/api/payments/[id]/release/route.ts` | Разблокировка escrow |
