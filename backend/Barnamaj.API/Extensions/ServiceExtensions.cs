using Barnamaj.API.Services;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Minio;
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

        // ── JWT Authentication (читает токен из httpOnly cookie) ─
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
                ClockSkew                = TimeSpan.FromSeconds(30),
                RoleClaimType            = "role",
            };

            options.Events = new JwtBearerEvents
            {
                // Читаем токен из httpOnly cookie "access_token"
                // Это главное изменение — убираем зависимость от Authorization header
                OnMessageReceived = ctx =>
                {
                    var token = ctx.Request.Cookies["access_token"];
                    if (!string.IsNullOrEmpty(token))
                        ctx.Token = token;
                    return Task.CompletedTask;
                },

                // JSON-ответ при 401 вместо пустого тела
                OnChallenge = async ctx =>
                {
                    ctx.HandleResponse();
                    ctx.Response.StatusCode  = StatusCodes.Status401Unauthorized;
                    ctx.Response.ContentType = "application/json";
                    await ctx.Response.WriteAsJsonAsync(new
                    {
                        error = "Не авторизован. Выполните вход."
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
        services.AddSingleton<IJwtService,     JwtService>();
        services.AddScoped<IAuthService,       AuthService>();
        services.AddScoped<IProfileService,    ProfileService>();
        services.AddScoped<IProjectService,    ProjectService>();
        services.AddScoped<IRatingService,     RatingService>();
        services.AddScoped<IAssessmentService, AssessmentService>();
        services.AddScoped<IWalletService,      WalletService>();
        services.AddScoped<ISpecialtyService,   SpecialtyService>();
        services.AddScoped<IAuditService,       AuditService>();
        services.AddScoped<IRoleGrantService,   RoleGrantService>();
        services.AddScoped<IProjectRoleService, ProjectRoleService>();
        services.AddSingleton<IContentFilterService, ContentFilterService>();
        services.AddHttpContextAccessor();

        // ── KYC (рынок РК) ───────────────────────────────────
        services.AddSingleton<IIinProtector,         IinProtector>();
        services.AddScoped<IOtpService,              OtpService>();
        services.AddSingleton<IFileValidator,        FileValidator>();
        services.AddScoped<IKycService,              KycService>();
        services.AddScoped<IKycModerationService,    KycModerationService>();
        services.AddSingleton<ILegalEntityRegistry,  StubLegalEntityRegistry>();
        services.AddScoped<IKycAiReviewer,           RulesBasedKycAiReviewer>();
        services.AddScoped<IKycSubmissionService,    KycSubmissionService>();
        // SMS / Email — dev-стабы. В prod заменить через DI override.
        services.AddSingleton<ISmsProvider,          ConsoleSmsProvider>();
        services.AddSingleton<IEmailProvider,        ConsoleEmailProvider>();

        // ── MinIO (S3-клиент) ────────────────────────────────
        var minioCfg = configuration.GetSection("Minio");
        services.AddSingleton<IMinioClient>(_ =>
        {
            var endpoint = minioCfg["Endpoint"]   ?? "localhost:9000";
            var access   = minioCfg["AccessKey"]  ?? "minioadmin";
            var secret   = minioCfg["SecretKey"]  ?? "minioadmin";
            var secure   = minioCfg.GetValue("Secure", false);

            var client = new MinioClient()
                .WithEndpoint(endpoint)
                .WithCredentials(access, secret);
            if (secure) client = client.WithSSL();
            return client.Build();
        });
        services.AddScoped<IDocumentStorage, MinioDocumentStorage>();

        // ── Redis кэш ────────────────────────────────────────
        var redisConnection = configuration.GetConnectionString("Redis");
        if (!string.IsNullOrEmpty(redisConnection))
        {
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisConnection;
                options.InstanceName  = "barnamaj:";
            });
        }
        else
        {
            // Fallback на in-memory для локальной разработки без Redis
            services.AddDistributedMemoryCache();
        }

        return services;
    }
}
