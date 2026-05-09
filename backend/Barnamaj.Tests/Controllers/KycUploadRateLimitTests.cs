using System.Linq;
using Barnamaj.API.Controllers;
using Microsoft.AspNetCore.RateLimiting;
using Xunit;

namespace Barnamaj.Tests.Controllers;

public sealed class KycUploadRateLimitTests
{
    [Fact]
    public void UploadDocument_ShouldHaveKycUploadRateLimitPolicy()
    {
        var method = typeof(KycController).GetMethod("UploadDocument");
        Assert.NotNull(method);

        var attr = method!
            .GetCustomAttributes(typeof(EnableRateLimitingAttribute), inherit: true)
            .Cast<EnableRateLimitingAttribute>()
            .SingleOrDefault();

        Assert.NotNull(attr);
        Assert.Equal("kyc-upload", attr!.PolicyName);
    }
}
