# ============================================================
# Barnamaj API — Multi-stage Dockerfile
# Оптимизирован для высокой нагрузки и минимального размера образа
#
# Этапы:
#   1. base    — runtime образ
#   2. build   — компиляция и публикация
#   3. final   — финальный минимальный образ
# ============================================================

# ── Этап 1: Runtime base ─────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS base
WORKDIR /app

# ICU нужен для корректной globalization при DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false
RUN apk add --no-cache icu-libs

# Минимальный пользователь (не root) для безопасности
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Порт, на котором слушает Kestrel
EXPOSE 8080

# ── Этап 2: Build ────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

# Сначала копируем только .csproj для кэширования слоёв зависимостей
COPY ["Barnamaj.API.csproj", "./"]
RUN dotnet restore "Barnamaj.API.csproj"

# Копируем остальной код (включая wwwroot/) и собираем
COPY . .
RUN dotnet build "Barnamaj.API.csproj" \
    -c Release \
    --no-restore

# ── Этап 3: Publish ──────────────────────────────────────────
FROM build AS publish
RUN dotnet publish "Barnamaj.API.csproj" \
    -c Release \
    --no-build \
    --self-contained false \
    -o /app/publish \
    /p:UseAppHost=false

# ── Этап 4: Final ────────────────────────────────────────────
FROM base AS final
WORKDIR /app

# Копируем только артефакты публикации
COPY --from=publish /app/publish .

# Папка для логов (пишет appuser)
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

# Переключаемся на непривилегированного пользователя
USER appuser

# Переменные окружения для Kestrel
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

# Health check для Docker
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:8080/health/live || exit 1

ENTRYPOINT ["dotnet", "Barnamaj.API.dll"]
