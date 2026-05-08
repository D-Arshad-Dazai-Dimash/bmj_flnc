using Barnamaj.API.Data;
using Barnamaj.API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Filters;

/// <summary>
/// Требует наличия специализации у текущего пользователя.
///
/// SeniorAdmin и HeadAdmin проходят проверку автоматически (bypass).
/// Moderator и Member должны иметь активный (не просроченный) грант.
///
/// Применение: <c>[RequireSpecialty(Specialty.KycReviewer)]</c>
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
public sealed class RequireSpecialtyAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly Specialty _specialty;
    public RequireSpecialtyAttribute(Specialty specialty) => _specialty = specialty;

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

        // SeniorAdmin+ имеют доступ ко всему без гранта
        if ((byte)role.Value >= (byte)UserRole.SeniorAdmin)
            return;

        var now = DateTime.UtcNow;
        var hasGrant = await db.UserSpecialtyGrants
            .AnyAsync(
                g => g.UserId    == userId &&
                     g.Specialty == _specialty &&
                     (g.ExpiresAt == null || g.ExpiresAt > now),
                context.HttpContext.RequestAborted);

        if (!hasGrant)
        {
            context.Result = new ObjectResult(new
            {
                error      = "Нет специализации для этого действия.",
                code       = "specialty_required",
                specialty  = _specialty.ToString()
            })
            { StatusCode = 403 };
        }
    }
}
