# Barnamaj Web

> Профессиональный кодинг. Без лишних слов.

Premium Dark Tech лендинг для платформы Barnamaj.

## Запуск

```bash
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000)

## Стек

- **Next.js 15** — App Router + Turbopack
- **Tailwind CSS 3** — кастомная тёмная тема
- **Framer Motion** — анимации появления и hover-эффекты
- **Lucide React** — иконки
- **TypeScript** — строгая типизация

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
