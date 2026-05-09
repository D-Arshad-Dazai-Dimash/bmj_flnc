using Barnamaj.API.Services;
using Xunit;

namespace Barnamaj.Tests.Services;

/// <summary>
/// Тесты stub-реализации реестра юр. лиц РК (statgov эмуляция).
/// </summary>
public class StubLegalEntityRegistryTests
{
    private readonly ILegalEntityRegistry _r = new StubLegalEntityRegistry();

    [Theory]
    [InlineData("991240000123", "ТОО")]
    [InlineData("970640000456", "АО")]
    [InlineData("900101400123", "ИП")]
    public async Task LookupByBin_KnownBin_ReturnsInfo(string bin, string expectedForm)
    {
        var info = await _r.LookupByBinAsync(bin, CancellationToken.None);

        Assert.NotNull(info);
        Assert.Equal(bin, info!.Bin);
        Assert.Equal(expectedForm, info.LegalForm);
        Assert.True(info.IsActive);
        Assert.Equal("stub", info.Source);
    }

    [Theory]
    [InlineData("000000000000")]
    [InlineData("123456789012")]
    public async Task LookupByBin_UnknownBin_ReturnsNull(string bin)
    {
        var info = await _r.LookupByBinAsync(bin, CancellationToken.None);
        Assert.Null(info);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("12345")]
    [InlineData("12345678901a")]
    public async Task LookupByBin_InvalidFormat_ReturnsNull(string? bin)
    {
        var info = await _r.LookupByBinAsync(bin!, CancellationToken.None);
        Assert.Null(info);
    }
}
