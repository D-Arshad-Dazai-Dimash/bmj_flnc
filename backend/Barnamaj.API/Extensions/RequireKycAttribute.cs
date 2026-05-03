using Barnamaj.API.Data;
using Barnamaj.API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Extensions;

/// <summary>
/// Атрибут-фильтр: требует, чтобы пользователь имел указанный (или выше) уровень KYC.
///
/// Использование:
///   [Authorize]
///   [RequireKyc(KycStatus.Lite)]      // нужен Lite или Full
///   public IActionResult Create(...) { ... }
///
///   [RequireKyc(KycStatus.Full)]      // нужен только Full
///
/// При недостаточном статусе — HTTP 403 с телом
///   { "error": "...", "code": "kyc_required", "required": "Lite" | "Full" }
///
/// Применяется через TypeFilter, чтобы получить AppDbContext через DI.
/// </summary>
public sealed class RequireKycAttribute : TypeFilterAttribute
{
    public RequireKycAttribute(KycStatus required)
        : base(typeof(RequireKycFilter))
    {
        Arguments = new object[] { required };
    }
}

internal sealed class RequireKycFilter : IAsyncActionFilter
{
    private readonly AppDbContext _db;
    private readonly KycStatus    _required;

    public RequireKycFilter(AppDbContext db, KycStatus required)
    {
        _db       = db;
        _required = required;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext ctx, ActionExecutionDelegate next)
    {
        var sub = ctx.HttpContext.User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(sub, out var userId))
        {
            ctx.Result = new UnauthorizedObjectResult(new
            {
                error = "Не авторизован.",
                code  = "unauthorized",
            });
            return;
        }

        var status = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => (KycStatus?)u.KycStatus)
            .FirstOrDefaultAsync(ctx.HttpContext.RequestAborted)
            ?? KycStatus.None;

        if ((byte)status < (byte)_required)
        {
            ctx.Result = new ObjectResult(new
            {
                error    = $"Для этого действия требуется уровень KYC: {_required}.",
                code     = "kyc_required",
                required = _required.ToString(),
                current  = status.ToString(),
            }) { StatusCode = StatusCodes.Status403Forbidden };
            return;
        }

        await next();
    }
}
