# DECISION_NEEDED — соцфункции профиля

## Контекст

В рамках UX-редизайна (декабрь 2025) добавлены две социальные фичи,
реализованные пока **только на клиенте** через `localStorage`:

1. **Лайки заказов** (кнопка ♥ в ленте `/dashboard/orders` и на детальной
   странице `/dashboard/orders/[id]`, фильтр-таб «Понравилось»).
2. **Пользовательские посты** на публичной странице профиля
   `/profiles/[id]` (вкладка «Посты», простой текстовый формат).

Источник: [`frontend/src/lib/socialStore.ts`](frontend/src/lib/socialStore.ts).

## Что нужно решить

Перенести ли обе фичи в бекенд (C#/EF Core), и если да — каков приоритет?

## Что нужно сделать на бекенде (если переносим)

### Лайки

- Entity `ProjectLike` (`UserId`, `ProjectId`, `CreatedAt`, unique index).
- DTO + endpoints в `ProjectsController`:
  - `POST /api/projects/{id}/like` → `{ liked: true }`
  - `DELETE /api/projects/{id}/like` → `{ liked: false }`
  - `GET /api/projects/liked` → `IReadOnlyList<ProjectSummaryDto>` (мои лайки)
- Метод `IProjectService.ToggleLikeAsync(...)`.
- Миграция EF Core.

### Посты профиля

- Entity `ProfilePost` (`Id`, `ProfileId`, `AuthorUserId`, `Text`,
  `CreatedAt`, опционально `MediaUrl`).
- DTO + endpoints в `ProfilesController`:
  - `GET /api/profiles/{id}/posts?page=&pageSize=`
  - `POST /api/profiles/{id}/posts` (только Owner профиля)
  - `DELETE /api/profiles/{id}/posts/{postId}` (только автор/Owner)
- Сервис + миграция.

## Принятое временное решение

Не блокировать UX-итерацию. Локальный `localStorage`-shim работает:
- лайки видны на одном устройстве на пользователя (key = `userId`),
- посты видны всем посетителям этой же машины (key = `profileId`),
  но между устройствами не синхронизируются.

После бекенд-имплементации переключить `socialStore.ts` на API-вызовы,
сохранив сигнатуры функций, чтобы не трогать UI-компоненты.
