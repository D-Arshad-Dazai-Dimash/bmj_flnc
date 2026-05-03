using System.Security.Cryptography;
using Barnamaj.API.Services;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Barnamaj.Tests.Services;

/// <summary>
/// Тесты IinProtector — проверка HMAC-SHA256 (детерминизм + key separation)
/// и AES-GCM (roundtrip + неудача при подмене байтов).
/// </summary>
public class IinProtectorTests
{
    private static IinProtector CreateProtector(string? hmacKey = null, string? encKey = null)
    {
        // Генерируем валидные base64-ключи нужной длины
        hmacKey ??= Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        encKey  ??= Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Kyc:IinHmacKey"]      = hmacKey,
                ["Kyc:IinEncryptionKey"] = encKey,
            })
            .Build();

        return new IinProtector(config);
    }

    [Fact]
    public void Hmac_IsDeterministic_ForSameInputAndKey()
    {
        var p = CreateProtector();
        const string iin = "900101345671";
        var h1 = p.ComputeHmac(iin);
        var h2 = p.ComputeHmac(iin);
        Assert.Equal(h1, h2);
        Assert.Equal(64, h1.Length); // 32 байта = 64 hex
    }

    [Fact]
    public void Hmac_DiffersBetweenKeys()
    {
        var p1 = CreateProtector();
        var p2 = CreateProtector();
        var h1 = p1.ComputeHmac("900101345671");
        var h2 = p2.ComputeHmac("900101345671");
        Assert.NotEqual(h1, h2);
    }

    [Fact]
    public void EncryptDecrypt_Roundtrip()
    {
        var p = CreateProtector();
        const string iin = "900101345671";
        var ct = p.Encrypt(iin);
        var pt = p.Decrypt(ct);
        Assert.Equal(iin, pt);
    }

    [Fact]
    public void Encrypt_ProducesDifferentCiphertext_EachTime()
    {
        // AES-GCM с случайным nonce: один и тот же открытый текст → разные шифры.
        var p = CreateProtector();
        var c1 = p.Encrypt("900101345671");
        var c2 = p.Encrypt("900101345671");
        Assert.NotEqual(c1, c2);
    }

    [Fact]
    public void Decrypt_FailsOnTamperedCiphertext()
    {
        var p = CreateProtector();
        var ct = p.Encrypt("900101345671");
        var bytes = Convert.FromBase64String(ct);
        // Портим последний байт (часть ciphertext)
        bytes[^1] ^= 0x01;
        var tampered = Convert.ToBase64String(bytes);
        Assert.ThrowsAny<CryptographicException>(() => p.Decrypt(tampered));
    }

    [Fact]
    public void Constructor_ThrowsOnShortHmacKey()
    {
        // 16 байт < 32 минимум
        var shortKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(16));
        Assert.Throws<InvalidOperationException>(() => CreateProtector(hmacKey: shortKey));
    }
}
