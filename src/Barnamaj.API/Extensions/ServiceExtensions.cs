using Barnamaj.API.Services;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace Barnamaj.API.Extensions;

/// <summary>
/// Централизованная регистрация сервисов приложения.
/// </summary>
public static class ServiceExtensions
{
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // ── FluentValidation ─────────────────────────────────
        services.AddFluentValidationAutoValidation();
        services.AddValidatorsFromAssembly(typeof(Program).Assembly);

        // ── JWT Authentication ───────────────────────────────
        var jwtSection = configuration.GetSection("Jwt");
        var secretKey  = jwtSection["SecretKey"]
            ?? throw new InvalidOperationException(
                "Jwt:SecretKey is not configured. " +
                "Set it via appsettings.Development.json or environment variable Jwt__SecretKey.");

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            // Отключаем автоматическое преобразование имён клеймов
            // (sub → NameIdentifier, email → ClaimTypes.Email и т.д.)
            // чтобы клеймы сохраняли оригинальные имена из JWT-токена.
            options.MapInboundClaims = false;

            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer           = true,
                ValidateAudience         = true,
                ValidateLifetime         = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer              = jwtSection["Issuer"],
                ValidAudience            = jwtSection["Audience"],
                IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                // Минимальный drift между серверами
                ClockSkew = TimeSpan.FromSeconds(30),
                // Маппим claim "role" в стандартный ClaimTypes.Role
                RoleClaimType = "role",
            };

            options.Events = new JwtBearerEvents
            {
                // Возвращаем JSON вместо пустого тела при 401
                OnChallenge = async ctx =>
                {
                    ctx.HandleResponse();
                    ctx.Response.StatusCode  = StatusCodes.Status401Unauthorized;
                    ctx.Response.ContentType = "application/json";
                    await ctx.Response.WriteAsJsonAsync(new
                    {
                        error = "Unauthorized. Provide a valid Bearer token."
                    });
                },
                OnAuthenticationFailed = ctx =>
                {
                    if (ctx.Exception is SecurityTokenExpiredException)
                        ctx.Response.Headers.Append("X-Token-Expired", "true");
                    return Task.CompletedTask;
                }
            };
        });

        services.AddAuthorization();

        // ── Сервисы приложения ───────────────────────────────
        services.AddSingleton<IJwtService,    JwtService>();
        services.AddScoped<IAuthService,     AuthService>();
        services.AddScoped<IProfileService,    ProfileService>();
        services.AddScoped<IProjectService,    ProjectService>();
        services.AddScoped<IAssessmentService, AssessmentService>();

        // ── In-Memory кэш (заменить на Redis при масштабировании) ─
        services.AddMemoryCache(options => { options.SizeLimit = 1024; });

        return services;
    }
}
