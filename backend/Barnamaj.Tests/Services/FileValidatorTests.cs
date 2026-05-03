using Barnamaj.API.Services;
using Xunit;

namespace Barnamaj.Tests.Services;

/// <summary>
/// Тесты FileValidator: проверка по magic bytes и размерам.
/// Защищает от подмены mime / неподдерживаемых форматов.
/// </summary>
public class FileValidatorTests
{
    private readonly FileValidator _v = new();

    private static MemoryStream WithSize(byte[] header, long totalBytes)
    {
        var bytes = new byte[totalBytes];
        Array.Copy(header, bytes, header.Length);
        return new MemoryStream(bytes);
    }

    [Fact]
    public async Task ValidatesJpeg()
    {
        var s = WithSize([0xFF, 0xD8, 0xFF], 8 * 1024);
        var ext = await _v.ValidateAsync(s, s.Length);
        Assert.Equal(".jpg", ext);
    }

    [Fact]
    public async Task ValidatesPng()
    {
        var s = WithSize([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], 8 * 1024);
        var ext = await _v.ValidateAsync(s, s.Length);
        Assert.Equal(".png", ext);
    }

    [Fact]
    public async Task ValidatesPdf()
    {
        var s = WithSize([0x25, 0x50, 0x44, 0x46], 8 * 1024);
        var ext = await _v.ValidateAsync(s, s.Length);
        Assert.Equal(".pdf", ext);
    }

    [Fact]
    public async Task RejectsUnknownMagic()
    {
        var s = WithSize([0x00, 0x01, 0x02, 0x03], 8 * 1024);
        await Assert.ThrowsAsync<InvalidFileException>(() => _v.ValidateAsync(s, s.Length));
    }

    [Fact]
    public async Task RejectsTooLarge()
    {
        var s = WithSize([0xFF, 0xD8, 0xFF], 11 * 1024 * 1024);
        await Assert.ThrowsAsync<InvalidFileException>(() => _v.ValidateAsync(s, s.Length));
    }

    [Fact]
    public async Task RejectsTooSmall()
    {
        var s = WithSize([0xFF, 0xD8, 0xFF], 100);
        await Assert.ThrowsAsync<InvalidFileException>(() => _v.ValidateAsync(s, s.Length));
    }
}
