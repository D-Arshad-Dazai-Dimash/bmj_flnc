using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Barnamaj.API.Data;

/// <summary>
/// Фабрика для design-time операций EF Core (dotnet ef migrations, dotnet ef database update).
/// Используется ТОЛЬКО при запуске CLI-инструментов, не при работе приложения.
/// Подключается к PostgreSQL в Docker через localhost:5432.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();

        // При design-time используем Development строку (localhost, БД внутри Docker)
        const string connectionString =
            "Host=localhost;Port=5432;Database=barnamaj_db;" +
            "Username=barnamaj_user;Password=barnamaj_pass_2025;" +
            "Include Error Detail=true;";

        optionsBuilder
            .UseNpgsql(connectionString, opts =>
            {
                opts.CommandTimeout(60);
            })
            .UseSnakeCaseNamingConvention();

        return new AppDbContext(optionsBuilder.Options);
    }
}
