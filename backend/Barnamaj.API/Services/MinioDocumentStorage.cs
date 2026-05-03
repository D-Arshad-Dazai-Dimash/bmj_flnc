using Minio;
using Minio.DataModel.Args;

namespace Barnamaj.API.Services;

/// <summary>
/// Хранилище приватных KYC-документов на S3-совместимом MinIO.
///
/// ВАЖНО: bucket приватный. Прямого публичного доступа нет.
/// Чтение — только через presigned URL для модераторов (короткий TTL).
/// </summary>
public interface IDocumentStorage
{
    /// <summary>
    /// Сохранить файл. Возвращает object key (для записи в БД).
    /// </summary>
    Task<string> UploadAsync(Stream content, string objectKey, string contentType,
                             CancellationToken ct = default);

    /// <summary>
    /// Получить временную ссылку на скачивание (presigned URL).
    /// Срок жизни — секунды (короткий, для модератора).
    /// </summary>
    Task<string> GetPresignedUrlAsync(string objectKey, TimeSpan ttl, CancellationToken ct = default);

    Task DeleteAsync(string objectKey, CancellationToken ct = default);
}

public sealed class MinioDocumentStorage : IDocumentStorage
{
    private readonly IMinioClient _client;
    private readonly string       _bucket;
    private readonly ILogger<MinioDocumentStorage> _logger;

    public MinioDocumentStorage(IMinioClient client, IConfiguration cfg,
        ILogger<MinioDocumentStorage> logger)
    {
        _client = client;
        _bucket = cfg["Kyc:DocumentsBucket"] ?? "kyc-documents";
        _logger = logger;
    }

    public async Task EnsureBucketAsync(CancellationToken ct = default)
    {
        var exists = await _client.BucketExistsAsync(
            new BucketExistsArgs().WithBucket(_bucket), ct);

        if (!exists)
        {
            await _client.MakeBucketAsync(new MakeBucketArgs().WithBucket(_bucket), ct);
            _logger.LogInformation("MinIO: created private bucket {Bucket}", _bucket);
        }
    }

    public async Task<string> UploadAsync(Stream content, string objectKey, string contentType,
                                          CancellationToken ct = default)
    {
        if (!content.CanSeek)
            throw new InvalidOperationException("Stream must be seekable for upload.");
        content.Position = 0;

        var args = new PutObjectArgs()
            .WithBucket(_bucket)
            .WithObject(objectKey)
            .WithStreamData(content)
            .WithObjectSize(content.Length)
            .WithContentType(contentType);

        await _client.PutObjectAsync(args, ct);
        return objectKey;
    }

    public async Task<string> GetPresignedUrlAsync(string objectKey, TimeSpan ttl,
                                                   CancellationToken ct = default)
    {
        var args = new PresignedGetObjectArgs()
            .WithBucket(_bucket)
            .WithObject(objectKey)
            .WithExpiry((int)ttl.TotalSeconds);

        return await _client.PresignedGetObjectAsync(args);
    }

    public async Task DeleteAsync(string objectKey, CancellationToken ct = default)
    {
        await _client.RemoveObjectAsync(
            new RemoveObjectArgs().WithBucket(_bucket).WithObject(objectKey), ct);
    }
}
