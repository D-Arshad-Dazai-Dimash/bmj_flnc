using Barnamaj.API.Data;
using Barnamaj.API.Extensions;
using Microsoft.EntityFrameworkCore;
using Serilog;
using System.Threading.RateLimiting;

// ============================================================
// Barnamaj — High-Load Freelance Platform
// Entry Point
// ============================================================

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // ── Serilog ─────────────────────────────────────────────
    builder.Host.UseSerilog((ctx, services, config) =>
        config
            .ReadFrom.Configuration(ctx.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext()
            .WriteTo.Console()
            .WriteTo.File("logs/barnamaj-.log",
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 30,
                fileSizeLimitBytes: 50_000_000));

    // ── База данных ──────────────────────────────────────────
    builder.Services.AddDbContext<AppDbContext>(options =>
    {
        options.UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            npgsqlOptions =>
            {
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 5,
                    maxRetryDelay: TimeSpan.FromSeconds(30),
                    errorCodesToAdd: null);
                npgsqlOptions.CommandTimeout(60);
            })
            .UseSnakeCaseNamingConvention(); // snake_case для PostgreSQL
    });

    // ── Контроллеры ─────────────────────────────────────────
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();

    // ── Swagger ──────────────────────────────────────────────
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new()
        {
            Title = "Barnamaj API",
            Version = "v1",
            Description = "High-Load Freelance Platform API"
        });
        c.AddSecurityDefinition("Bearer", new()
        {
            Name = "Authorization",
            Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        });
        c.AddSecurityRequirement(new()
        {
            {
                new() { Reference = new() { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" } },
                Array.Empty<string>()
            }
        });
    });

    // ── Health Checks ────────────────────────────────────────
    builder.Services.AddHealthChecks()
        .AddNpgSql(
            builder.Configuration.GetConnectionString("DefaultConnection")!,
            name: "postgresql",
            tags: ["db", "ready"]);

    // ── Rate Limiting (защита от перегрузок) ─────────────────
    builder.Services.AddRateLimiter(options =>
    {
        // Общий лимит: 100 запросов за 10 секунд с одного IP
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 100,
                    Window = TimeSpan.FromSeconds(10),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 5
                }));

        // Строгий лимит для assessment/submit: 5 попыток в 5 минут на пользователя
        options.AddPolicy("assessment-submit", ctx =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: ctx.User.FindFirst("sub")?.Value
                              ?? ctx.Connection.RemoteIpAddress?.ToString()
                              ?? "unknown",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 5,
                    Window = TimeSpan.FromMinutes(5),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0
                }));

        options.OnRejected = async (context, token) =>
        {
            context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            await context.HttpContext.Response.WriteAsJsonAsync(
                new { error = "Too many requests. Please slow down." }, token);
        };
    });

    // ── CORS ─────────────────────────────────────────────────
    // В Development разрешаем любой origin вида http(s)://<host>:<port> из локальной
    // сети (localhost, 127.0.0.1, 10.x, 172.16-31.x, 192.168.x). Для production
    // используем строгий список из конфигурации AllowedOrigins.
    var allowedOrigins = builder.Configuration
        .GetSection("AllowedOrigins").Get<string[]>()
        ?? ["http://localhost:3000"];
    var isDev = builder.Environment.IsDevelopment();

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
        {
            policy
                .AllowAnyHeader()
                .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .WithExposedHeaders("Content-Disposition", "X-Pagination")
                .AllowCredentials()
                .SetPreflightMaxAge(TimeSpan.FromMinutes(10));

            if (isDev)
            {
                // Разрешаем все origins из локальной сети (LAN) для удобной
                // отладки с других устройств. AllowCredentials требует
                // конкретного origin в ответе — поэтому используем предикат.
                policy.SetIsOriginAllowed(origin =>
                {
                    if (string.IsNullOrEmpty(origin)) return false;
                    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
                    var host = uri.Host;
                    if (host is "localhost" or "127.0.0.1") return true;
                    if (System.Net.IPAddress.TryParse(host, out var ip))
                    {
                        var b = ip.GetAddressBytes();
                        if (ip.AddressFamily != System.Net.Sockets.AddressFamily.InterNetwork) return false;
                        // 10.0.0.0/8
                        if (b[0] == 10) return true;
                        // 172.16.0.0/12
                        if (b[0] == 172 && b[1] >= 16 && b[1] <= 31) return true;
                        // 192.168.0.0/16
                        if (b[0] == 192 && b[1] == 168) return true;
                    }
                    return allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase);
                });
            }
            else
            {
                policy.WithOrigins(allowedOrigins);
            }
        });
    });

    // ── Расширения сервисов ──────────────────────────────────
    builder.Services.AddApplicationServices(builder.Configuration);

    // ── MiniProfiler (анализ SQL запросов) ───────────────────
    builder.Services.AddMiniProfiler(options =>
    {
        options.RouteBasePath = "/profiler";
        options.SqlFormatter = new StackExchange.Profiling.SqlFormatters.InlineFormatter();
        options.TrackConnectionOpenClose = true;
        options.ColorScheme = StackExchange.Profiling.ColorScheme.Auto;
    }).AddEntityFramework();

    // ── Response Caching ──────────────────────────────────────
    builder.Services.AddResponseCaching();

    // ── Response Compression ─────────────────────────────────
    builder.Services.AddResponseCompression(options =>
    {
        options.EnableForHttps = true;
    });

    // ── Статические файлы (логотип, favicon и пр.) ───────────
    // wwwroot монтируется из корня проекта (см. docker-compose volumes)
    builder.Services.AddDirectoryBrowser();

    // ============================================================
    var app = builder.Build();
    // ============================================================

    // ── Middleware pipeline (порядок важен!) ─────────────────
    app.UseSerilogRequestLogging(opts =>
    {
        opts.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
        {
            diagnosticContext.Set("RemoteIP", httpContext.Connection.RemoteIpAddress);
            diagnosticContext.Set("UserAgent", httpContext.Request.Headers.UserAgent.FirstOrDefault());
        };
    });

    // В Production Swagger тоже доступен (ограничьте через env при необходимости)
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Barnamaj API v1");
        c.RoutePrefix = "swagger"; // Swagger на /swagger, корень — index.html
    });

    app.UseResponseCaching();
    app.UseResponseCompression();

    // MiniProfiler — только в Development
    if (app.Environment.IsDevelopment())
    {
        app.UseMiniProfiler();
    }

    // Статические файлы — до аутентификации, чтобы логотип был публичным
    app.UseDefaultFiles();     // index.html по умолчанию
    app.UseStaticFiles();      // wwwroot/ → /img/logo.png, /index.html

    // Алиас /static → wwwroot/img/
    // Например: GET /static/logo.png  →  wwwroot/img/logo.png
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(
            Path.Combine(builder.Environment.WebRootPath, "img")),
        RequestPath = "/static",
    });

    app.UseRateLimiter();
    app.UseCors("AllowFrontend");
    app.UseAuthentication();
    app.UseAuthorization();

    // Health check endpoints
    app.MapHealthChecks("/health/live", new()
    {
        Predicate = _ => false  // Только liveness
    });
    app.MapHealthChecks("/health/ready", new()
    {
        Predicate = check => check.Tags.Contains("ready")
    });

    app.MapControllers();

    // ── Применить миграции при запуске ───────────────────────
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
        Log.Information("Database migrations applied successfully");

        // ── KYC: создать private bucket в MinIO (идемпотентно) ──
        try
        {
            var storage = scope.ServiceProvider.GetRequiredService<Barnamaj.API.Services.IDocumentStorage>();
            if (storage is Barnamaj.API.Services.MinioDocumentStorage mds)
                await mds.EnsureBucketAsync();
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "MinIO bucket initialization skipped (storage unreachable in this environment).");
        }
    }

    Log.Information("Barnamaj API started on {Env}", app.Environment.EnvironmentName);
    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application failed to start");
    throw;
}
finally
{
    await Log.CloseAndFlushAsync();
}
