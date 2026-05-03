# KYC (рынок Республики Казахстан) — production architecture

Реализация на ветке `feature/kyc-rk-prod`. Заменяет insecure draft из
`feature/kyc-rk-registration` (plaintext IIN, без HMAC/AES, без аудита).

## Уровни верификации

| Статус | Достигается | Доступ |
|---|---|---|
| `None` | сразу после регистрации | минимальный |
| `Lite` | подтверждён телефон **и** сохранён ИИН | базовые операции |
| `DocPending` | загружен документ, ждёт модератора | как `Lite` (без эскалации) |
| `Full` | документ одобрен модератором | полный доступ + эскроу/выплаты |
| `Rejected` | документ отклонён | как `Lite`, можно повторить |

Уровень требуется через атрибут на эндпоинте:
```csharp
[RequireKyc(KycStatus.Full)]
public IActionResult WithdrawFunds(...) { ... }
```
Ответ при отказе — `HTTP 403 { error, code:"kyc_required", current, required }`.
Фронт перехватывает в `lib/api.ts` и показывает `<KycGate />`.

## Защита персональных данных

| Поле | Хранение |
|---|---|
| `phone` | varchar(16), маскируется при выдаче (`+7700***67`) |
| `iin_hmac` | HMAC-SHA256 от ИИН (hex, 64). Используется только для **детерминированного индекса уникальности** (filtered partial unique). Plaintext не восстановим. |
| `iin_encrypted` | AES-GCM-256, формат `Base64(nonce ‖ tag ‖ ciphertext)`. Расшифровывается только в памяти при необходимости. |
| Документы (фото) | MinIO **private bucket** `kyc-documents`. Доступ только через **presigned URL** (TTL 5 мин), выдаётся модератору. Дедупликация по `front_sha256`. |
| `kyc_events` | jsonb-аудит: тип события, провайдер, IP, UA. **БЕЗ PII** в payload. Хранение 5 лет (требование закона «О ПОД/ФТ» №191-IV ст.12). |

## Криптографические ключи (production)

Сгенерировать:
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Передать через переменные окружения (см. `docker-compose.yml`):
- `Kyc__IinHmacKey` — ≥ 32 байта
- `Kyc__IinEncryptionKey` — ровно 32 байта (AES-256)
- `Kyc__Otp__HmacKey` — ≥ 32 байта (защита OTP в Redis от компрометации кэша)

**При смене любого ключа** требуется миграция с перешифровкой существующих
записей `users.iin_encrypted` и/или пересчётом `users.iin_hmac`.

## OTP

- 6-значный код, источник энтропии — `RandomNumberGenerator.GetInt32`
- В Redis хранится **HMAC** от кода, не plaintext
- Сравнение через `CryptographicOperations.FixedTimeEquals` (защита от timing-атак)
- Cooldown между отправками: 60 сек
- Lockout: 5 неудачных попыток → 15 мин блокировки на номер
- Все ответы при превышении лимитов: `HTTP 429 { code: "rate_limited" }`

## Загрузка документов

- Multipart с лимитом 40 MB на запрос (10 MB на файл)
- Валидация по **magic bytes**, не по `Content-Type` (JPEG `FF D8 FF`, PNG `89 50 4E 47…`, PDF `25 50 44 46`)
- Минимальный размер 4 KB (отсев заглушек)
- Имена объектов в MinIO: `kyc/{userId}/{docId}_front.{ext}`, `_back.{ext}`, `_selfie.{ext}`
- При повторной загрузке старые `Pending`/`InReview` записи + объекты MinIO удаляются (избегаем накопления PII)
- `NationalId` требует обе стороны + selfie. `Passport` / `ResidencePermit` — front + selfie.

## Модерация

- Эндпоинты: `/api/kyc/moderation/*`, доступ только `Moderator` или `Admin`
- При запросе списка генерируются **presigned URL на 5 минут** для каждого изображения
- Approve → `KycStatus = Full`, `KycVerifiedAt = UtcNow`, аудит `kyc.document_approved`
- Reject требует причину 5-500 символов, она сохраняется в `user_documents.rejection_reason`,
  пользователь видит в `KycPanel`, аудит `kyc.document_rejected`

## Соответствие законодательству РК

- **Закон «О ПОД/ФТ» №191-IV**: подтверждение личности клиента, хранение журнала аудита 5 лет (`kyc_events`).
- **Закон «О персональных данных и их защите» №94-V**:
  - персональные данные хранятся в зашифрованном виде (AES-GCM для ИИН)
  - применяется псевдонимизация (HMAC) для индексной обработки
  - доступ к документам строго ограничен (modeators only, presigned URLs)
- ИИН проверяется по контрольной сумме РК (Комитет по статистике), но
  принадлежность реальному человеку валидируется только при интеграции с **eGov / Sumsub / Veriff**
  (см. `IinValidator.cs` — пометка о том, что это лишь проверка формата).

## Архитектура (модули)

```
Entities/        KycStatus, KycEvent, UserDocument, User (расширен)
Data/Configurations/  KycEventConfiguration, UserDocumentConfiguration
Services/
  IinValidator         — формат + контрольная сумма РК
  IinProtector         — HMAC + AES-GCM (singleton)
  OtpService           — Redis IDistributedCache, lockout (scoped)
  FileValidator        — magic bytes + size (singleton)
  MinioDocumentStorage — private bucket + presigned URL (scoped)
  KycService           — оркестратор пользовательского flow (scoped)
  KycModerationService — модераторский flow (scoped)
  ConsoleSmsProvider   — DEV stub (PROD: SMS Aero / Mobizon)
  ConsoleEmailProvider — DEV stub
Controllers/
  KycController            — /api/kyc/*
  KycModerationController  — /api/kyc/moderation/*
Filters/
  RequireKycAttribute      — IAsyncAuthorizationFilter
DTOs/Kyc/   KycDtos + KycValidators (FluentValidation)
```

## Frontend

```
src/components/kyc/
  KycPanel.tsx   — встраиваемая панель в /dashboard/profile
  KycWizard.tsx  — модальный мастер: phone → iin → document → done
  KycGate.tsx    — глобальная модалка по событию kyc-required
src/lib/api.ts   — секция api.kyc.* + multipart upload + ApiError.code
```

`ApiError` теперь содержит `code` и `details`. На 403 с `code:"kyc_required"`
файл `lib/api.ts` диспатчит `CustomEvent('barnamaj:kyc-required')`.
`<KycGate />` подключён в `app/[lang]/layout.tsx`.

## Тесты

`backend/Barnamaj.Tests/`:
- `IinValidatorTests` — известные валидные/невалидные ИИН, диапазоны, будущие даты
- `IinProtectorTests` — детерминизм HMAC, key separation, AES-GCM roundtrip, отказ при подмене байтов, валидация длины ключей
- `FileValidatorTests` — magic bytes JPEG/PNG/PDF, отказ на чужие форматы, нарушение размеров

Запуск: `dotnet test backend/Barnamaj.Tests/Barnamaj.Tests.csproj`

## Что осталось для PROD

- Заменить `ConsoleSmsProvider` на интеграцию с реальным шлюзом РК (Mobizon / SMS Aero)
- Заменить DEV-ключи `Kyc__*` в `.env` на сгенерированные через `RandomNumberGenerator`
- Включить TLS на MinIO (`Minio__Secure=true`) и использовать сертификат
- Настроить ротацию ключей с миграцией перешифровки
- Включить webhook от eGov (если получено разрешение УД РК) — заменить ручной модераторский flow
