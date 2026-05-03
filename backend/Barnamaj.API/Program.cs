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

    // ── SignalR (realtime: chat + notifications) ─────────────
    builder.Services.AddSignalR();

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
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
            policy
                .WithOrigins(
                    builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
                    ?? ["http://localhost:3000"])
                .AllowAnyHeader()
                .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .WithExposedHeaders("Content-Disposition", "X-Pagination")
                .AllowCredentials()
                .SetPreflightMaxAge(TimeSpan.FromMinutes(10)));
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
    app.MapHub<Barnamaj.API.Hubs.ChatHub>("/hubs/chat");
    app.MapHub<Barnamaj.API.Hubs.NotificationsHub>("/hubs/notifications");

    // ── Применить миграции при запуске ───────────────────────
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
        Log.Information("Database migrations applied successfully");
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
