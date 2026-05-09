using System;
using System.Linq;
using Barnamaj.API.Controllers;
using Barnamaj.API.Entities;
using Barnamaj.API.Filters;
using Microsoft.AspNetCore.Authorization;
using Xunit;

namespace Barnamaj.Tests.Controllers;

public sealed class KycModerationAuthorizationTests
{
    [Fact]
    public void Controller_ShouldNotUseLegacyAdminRoleString()
    {
        var attrs = typeof(KycModerationController).GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .ToList();

        Assert.NotEmpty(attrs);
        Assert.All(attrs, a => Assert.DoesNotContain("Admin", a.Roles ?? string.Empty, StringComparison.Ordinal));
    }

    [Fact]
    public void Controller_ShouldRequireAtLeastModeratorRole()
    {
        var requireRole = typeof(KycModerationController)
            .GetCustomAttributes(typeof(RequireRoleAttribute), inherit: true)
            .Cast<RequireRoleAttribute>()
            .SingleOrDefault();

        Assert.NotNull(requireRole);

        var field = typeof(RequireRoleAttribute).GetField("_minimum", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        Assert.NotNull(field);

        var value = field!.GetValue(requireRole);
        Assert.Equal(UserRole.Moderator, value);
    }
}
