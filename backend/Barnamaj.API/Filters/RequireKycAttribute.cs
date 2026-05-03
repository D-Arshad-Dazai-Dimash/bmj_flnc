using Barnamaj.API.Data;
using Barnamaj.API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Filters;

/// <summary>
/// Требует определённого минимального уровня KYC у текущего пользователя.
///
/// Возвращает 403 с кодом kyc_required и текущим / требуемым статусом,
/// чтобы фронтенд показал соответствующий шаг визарда.
///
/// Применение: <c>[RequireKyc(KycStatus.Lite)]</c> на действиях контроллера
/// (создание проекта, чат) или <c>[RequireKyc(KycStatus.Full)]</c> (эскроу, выплаты).
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
public sealed class RequireKycAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly KycStatus _minimum;
    public RequireKycAttribute(KycStatus minimum) => _minimum = minimum;

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var sub = context.HttpContext.User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(sub, out var userId))
        {
            context.Result = new UnauthorizedObjectResult(new
            {
                error = "Не авторизован.",
                code  = "unauthorized"
            });
            return;
        }

        var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
        var status = await db.Users
            .Where(u => u.Id == userId)
            .Select(u => (KycStatus?)u.KycStatus)
            .FirstOrDefaultAsync(context.HttpContext.RequestAborted);

        if (status is null)
        {
            context.Result = new UnauthorizedObjectResult(new
            {
                error = "Пользователь не найден.",
                code  = "user_not_found"
            });
            return;
        }

        if ((byte)status.Value < (byte)_minimum && status.Value != KycStatus.Full)
        {
            // Full удовлетворяет любому минимуму
            context.Result = new ObjectResult(new
            {
                error    = "Для этого действия требуется подтверждение личности.",
                code     = "kyc_required",
                current  = status.Value.ToString(),
                required = _minimum.ToString()
            })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
        }
    }
}
