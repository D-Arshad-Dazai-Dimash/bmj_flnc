using Barnamaj.API.Data;
using Barnamaj.API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Filters;

/// <summary>
/// Требует минимального уровня роли у текущего пользователя.
///
/// Иерархия: Member(1) &lt; Moderator(2) &lt; SeniorAdmin(3) &lt; HeadAdmin(4).
/// Атрибут пропускает всех пользователей с ролью ≥ указанной.
///
/// Применение: <c>[RequireRole(UserRole.Moderator)]</c> — только просмотр,
/// <c>[RequireRole(UserRole.SeniorAdmin)]</c> — редактирование,
/// <c>[RequireRole(UserRole.HeadAdmin)]</c> — финансы и роли.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
public sealed class RequireRoleAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly UserRole _minimum;
    public RequireRoleAttribute(UserRole minimum) => _minimum = minimum;

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
        var role = await db.Users
            .Where(u => u.Id == userId)
            .Select(u => (UserRole?)u.Role)
            .FirstOrDefaultAsync(context.HttpContext.RequestAborted);

        if (role is null)
        {
            context.Result = new UnauthorizedObjectResult(new
            {
                error = "Пользователь не найден.",
                code  = "user_not_found"
            });
            return;
        }

        // Проверяем активные временные гранты роли (UserRoleGrant)
        var now = DateTime.UtcNow;
        var maxGrantRole = await db.UserRoleGrants
            .Where(g => g.UserId == userId && !g.IsRevoked && (g.ExpiresAt == null || g.ExpiresAt > now))
            .Select(g => (UserRole?)g.GrantedRole)
            .ToListAsync(context.HttpContext.RequestAborted);

        var effectiveRole = role.Value;
        if (maxGrantRole.Any())
        {
            var grantMax = maxGrantRole.Max()!.Value;
            if ((byte)grantMax > (byte)effectiveRole)
                effectiveRole = grantMax;
        }

        if ((byte)effectiveRole < (byte)_minimum)
        {
            context.Result = new ObjectResult(new
            {
                error    = "Недостаточно прав для этого действия.",
                code     = "forbidden",
                required = _minimum.ToString(),
                current  = effectiveRole.ToString()
            })
            { StatusCode = 403 };
        }
    }
}
