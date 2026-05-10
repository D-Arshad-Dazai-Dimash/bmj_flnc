# Barnamaj Web

> Профессиональный кодинг. Без лишних слов.

Premium dark SaaS-интерфейс для платформы Barnamaj в визуальном языке Vercel / Linear с brand-палитрой из логотипа.

## Запуск

```bash
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000)

Для локальной интеграции с backend:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Стек

- **Next.js 15** — App Router + Turbopack
- **Tailwind CSS 3** — кастомные design tokens и translucent surfaces
- **Framer Motion** — мягкие переходы и motion для product-grade UI
- **Lucide React** — иконки
- **TypeScript** — строгая типизация

## Дизайн-система

- Палитра бренда: `#638ad4`, `#050830`, `#376fb1`, `#4898bc`, `#c98fb1`, `#1c286d`, `#4947ab`, `#4c3f96`, `#7a58ac`, `#a46c84`
- Базовые поверхности: `bg-base`, `bg-panel`, `bg-card`, `bg-elevated`
- Бордеры: полупрозрачные белые вместо тяжёлых solid outlines
- Типографика: Inter Variable + отрицательный tracking для display / headings
- Ключевые паттерны: glass header, premium auth, elevated cards, dense dashboard controls, enterprise hero, control-panel admin shell

## Структура

```
src/
├── app/
│   ├── layout.tsx        # Root layout с шрифтами
│   ├── page.tsx          # Лендинг (Hero + Portal cards)
│   └── auth/
│       └── page.tsx      # Login / Register
├── components/
│   ├── ui/               # Базовые UI-примитивы (Button, Input)
│   ├── Navbar.tsx
│   ├── HeroSection.tsx
│   └── PortalCards.tsx
└── lib/
    ├── api.ts            # Клиент к C# бэкенду
    └── utils.ts
```

## Бэкенд

Фронтенд обращается к `http://localhost:5000/api/auth`

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Авторизация |
| GET  | `/api/auth/me` | Профиль (Bearer) |

## Production Auth (Vercel + Fly)

- В production фронтенд и backend находятся на разных доменах.
- `access_token` / `refresh_token` выставляются backend-доменом и недоступны в Next middleware на frontend-домене.
- Поэтому проверка сессии выполняется на клиенте через `GET /api/auth/me` в `AuthContext`, а не через middleware cookie-check.

## Auth Hardening (май 2026)

- Добавлен централизованный role guard:
    - `src/lib/roleGuard.ts` — единые правила доступа и иерархии ролей;
    - `src/hooks/useRoleGuard.ts` — redirect-логика для защищённых зон (`dashboard` / `admin`).
- Layout-guards унифицированы:
    - `src/app/[lang]/dashboard/layout.tsx` использует `useRoleGuard('dashboard')`;
    - `src/app/[lang]/admin/layout.tsx` использует `useRoleGuard('admin')`.
- Добавлены E2E-спеки:
    - `e2e/auth-logout.spec.ts` — logout инвалидирует сессию (`/api/auth/me -> 401`);
    - `e2e/role-guard.spec.ts` — проверка redirect по ролям;
    - `e2e/refresh-rotation.spec.ts` — rotation + reuse detection на refresh cookies.

## Автодеплой Frontend (Vercel)

- Production Branch в Vercel: `main`.
- Auto Deploy on Push: `enabled`.
- Для корректной интеграции с API задайте в Vercel Environment Variables:
    - `NEXT_PUBLIC_API_URL=https://barnamaj-api.fly.dev`

### Фолбэк через GitHub Actions (Deploy Hook)

- Если Vercel Git Integration не триггерится, используется workflow `.github/workflows/deploy-frontend-vercel.yml`.
- Добавьте в GitHub Secrets:
    - `VERCEL_DEPLOY_HOOK_URL` (Deploy Hook URL из Vercel проекта)
- Workflow запускается на push в `main` при изменениях в `frontend/**` и вызывает Vercel deploy принудительно.

### Фолбэк сборки при неверном Root Directory

- В корне репозитория добавлен `package.json` со скриптом `vercel-build`.
- Скрипт выполняет `npm --prefix frontend ci && npm --prefix frontend run build`, чтобы сборка проходила через `frontend/`.
