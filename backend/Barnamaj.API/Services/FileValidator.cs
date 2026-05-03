namespace Barnamaj.API.Services;

/// <summary>
/// Валидация загружаемых файлов KYC по magic bytes (а не по расширению).
/// Дополнительно проверяется размер.
/// </summary>
public interface IFileValidator
{
    /// <summary>
    /// Возвращает корректное расширение (".jpg" / ".png" / ".pdf"), если файл валиден.
    /// Бросает <see cref="InvalidFileException"/> при отказе.
    /// Поток должен быть с поддержкой Seek.
    /// </summary>
    Task<string> ValidateAsync(Stream content, long sizeBytes, CancellationToken ct = default);
}

public sealed class InvalidFileException : Exception
{
    public InvalidFileException(string message) : base(message) { }
}

public sealed class FileValidator : IFileValidator
{
    public const long MaxFileSize = 10 * 1024 * 1024; // 10 МБ
    public const long MinFileSize = 4 * 1024;         // 4 КБ — слишком маленькое = не документ

    private static readonly byte[] JpegMagic = { 0xFF, 0xD8, 0xFF };
    private static readonly byte[] PngMagic  = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
    private static readonly byte[] PdfMagic  = { 0x25, 0x50, 0x44, 0x46 }; // "%PDF"

    public async Task<string> ValidateAsync(Stream content, long sizeBytes, CancellationToken ct = default)
    {
        if (sizeBytes > MaxFileSize)
            throw new InvalidFileException("Файл больше 10 МБ.");
        if (sizeBytes < MinFileSize)
            throw new InvalidFileException("Файл слишком мал — это не документ.");

        if (!content.CanSeek)
            throw new InvalidFileException("Внутренняя ошибка: поток без поддержки Seek.");

        content.Position = 0;

        var header = new byte[8];
        var read   = await content.ReadAsync(header.AsMemory(0, 8), ct);
        content.Position = 0;

        if (read < 4) throw new InvalidFileException("Файл не распознан.");

        if (StartsWith(header, JpegMagic)) return ".jpg";
        if (StartsWith(header, PngMagic))  return ".png";
        if (StartsWith(header, PdfMagic))  return ".pdf";

        throw new InvalidFileException("Допустимые форматы: JPG, PNG, PDF.");
    }

    private static bool StartsWith(byte[] data, byte[] prefix)
    {
        if (data.Length < prefix.Length) return false;
        for (var i = 0; i < prefix.Length; i++)
            if (data[i] != prefix[i]) return false;
        return true;
    }
}
