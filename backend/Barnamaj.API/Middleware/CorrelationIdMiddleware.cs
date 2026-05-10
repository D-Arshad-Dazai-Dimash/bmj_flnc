using Serilog.Context;

namespace Barnamaj.API.Middleware;

/// <summary>
/// Обогащает каждый request structured-логи correlation_id и user_id.
/// Использует X-Correlation-Id из заголовка (если пришёл от клиента/прокси)
/// или генерирует новый. Пробрасывает обратно в response header.
/// </summary>
public sealed class CorrelationIdMiddleware
{
    private const string HeaderName = "X-Correlation-Id";
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next) => _next = next;

    public async Task Invoke(HttpContext context)
    {
        var correlationId =
            context.Request.Headers.TryGetValue(HeaderName, out var v) && !string.IsNullOrWhiteSpace(v)
                ? v.ToString()
                : Guid.NewGuid().ToString("N");

        context.Response.Headers[HeaderName] = correlationId;
        context.Items[HeaderName] = correlationId;

        var userId = context.User?.FindFirst("sub")?.Value;

        using (LogContext.PushProperty("correlation_id", correlationId))
        using (LogContext.PushProperty("user_id", userId ?? "anonymous"))
        {
            await _next(context);
        }
    }
}
