using System;
using System.IO;
using System.Text.Json;
using Xunit;

namespace Barnamaj.Tests.Config;

public sealed class ProductionSecurityConfigTests
{
    private static JsonElement LoadAppSettings()
    {
        var path = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Barnamaj.API", "appsettings.json"));
        var json = File.ReadAllText(path);
        var doc = JsonDocument.Parse(json, new JsonDocumentOptions
        {
            CommentHandling = JsonCommentHandling.Skip,
            AllowTrailingCommas = true,
        });
        return doc.RootElement;
    }

    [Fact]
    public void DefaultConnection_ShouldNotExposeDetailedDatabaseErrors()
    {
        var root = LoadAppSettings();
        var conn = root.GetProperty("ConnectionStrings").GetProperty("DefaultConnection").GetString() ?? string.Empty;

        Assert.DoesNotContain("Include Error Detail=true", conn, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void AllowedHosts_ShouldNotBeWildcardInProductionConfig()
    {
        var root = LoadAppSettings();
        var allowedHosts = root.GetProperty("AllowedHosts").GetString() ?? string.Empty;

        Assert.NotEqual("*", allowedHosts.Trim());
    }
}
