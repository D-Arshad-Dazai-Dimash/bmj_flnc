using System.Security.Cryptography;
using System.Text;

namespace Barnamaj.API.Services;

/// <summary>
/// Защита персональных данных (ИИН):
///   - HMAC-SHA256 для уникального индекса в БД (без plaintext).
///   - AES-GCM шифрование для хранения и обратимого отображения.
///
/// Ключи конфигурируются через секцию Kyc:
///   Kyc:IinHmacKey         — Base64, 32+ байт, отдельный от Encryption.
///   Kyc:IinEncryptionKey   — Base64, ровно 32 байта (AES-256).
///
/// В продакшне обязательно передавать через переменные окружения / Vault.
/// При смене ключа потребуется migration с перешифровкой существующих записей.
/// </summary>
public interface IIinProtector
{
    /// <summary>HMAC-SHA256 от plaintext ИИН (hex, 64 символа). Детерминированный — для индекса.</summary>
    string ComputeHmac(string iinPlaintext);

    /// <summary>AES-GCM шифрование. Возвращает Base64(nonce ‖ tag ‖ ciphertext).</summary>
    string Encrypt(string iinPlaintext);

    /// <summary>Расшифровка. Бросает CryptographicException при подделке.</summary>
    string Decrypt(string encryptedBase64);
}

public sealed class IinProtector : IIinProtector
{
    private readonly byte[] _hmacKey;
    private readonly byte[] _aesKey;

    public IinProtector(IConfiguration cfg)
    {
        var hmacKey = cfg["Kyc:IinHmacKey"]
            ?? throw new InvalidOperationException(
                "Kyc:IinHmacKey is not configured. Generate with: " +
                "[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))");

        var encKey = cfg["Kyc:IinEncryptionKey"]
            ?? throw new InvalidOperationException(
                "Kyc:IinEncryptionKey is not configured. Generate same way as IinHmacKey.");

        _hmacKey = Convert.FromBase64String(hmacKey);
        _aesKey  = Convert.FromBase64String(encKey);

        if (_hmacKey.Length < 32)
            throw new InvalidOperationException("Kyc:IinHmacKey must be at least 32 bytes.");
        if (_aesKey.Length != 32)
            throw new InvalidOperationException("Kyc:IinEncryptionKey must be exactly 32 bytes (AES-256).");
    }

    public string ComputeHmac(string iinPlaintext)
    {
        if (string.IsNullOrEmpty(iinPlaintext))
            throw new ArgumentException("ИИН не должен быть пустым.", nameof(iinPlaintext));

        using var hmac = new HMACSHA256(_hmacKey);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(iinPlaintext));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public string Encrypt(string iinPlaintext)
    {
        var nonce      = RandomNumberGenerator.GetBytes(AesGcm.NonceByteSizes.MaxSize);
        var tag        = new byte[AesGcm.TagByteSizes.MaxSize];
        var plaintext  = Encoding.UTF8.GetBytes(iinPlaintext);
        var ciphertext = new byte[plaintext.Length];

        using (var aes = new AesGcm(_aesKey, AesGcm.TagByteSizes.MaxSize))
        {
            aes.Encrypt(nonce, plaintext, ciphertext, tag);
        }

        // Формат: nonce ‖ tag ‖ ciphertext
        var combined = new byte[nonce.Length + tag.Length + ciphertext.Length];
        Buffer.BlockCopy(nonce,      0, combined, 0,                               nonce.Length);
        Buffer.BlockCopy(tag,        0, combined, nonce.Length,                    tag.Length);
        Buffer.BlockCopy(ciphertext, 0, combined, nonce.Length + tag.Length,       ciphertext.Length);

        return Convert.ToBase64String(combined);
    }

    public string Decrypt(string encryptedBase64)
    {
        var combined = Convert.FromBase64String(encryptedBase64);
        var nonceLen = AesGcm.NonceByteSizes.MaxSize;
        var tagLen   = AesGcm.TagByteSizes.MaxSize;

        if (combined.Length < nonceLen + tagLen)
            throw new CryptographicException("Ciphertext too short.");

        var nonce      = new byte[nonceLen];
        var tag        = new byte[tagLen];
        var ciphertext = new byte[combined.Length - nonceLen - tagLen];

        Buffer.BlockCopy(combined, 0,                          nonce,      0, nonceLen);
        Buffer.BlockCopy(combined, nonceLen,                   tag,        0, tagLen);
        Buffer.BlockCopy(combined, nonceLen + tagLen,          ciphertext, 0, ciphertext.Length);

        var plaintext = new byte[ciphertext.Length];
        using (var aes = new AesGcm(_aesKey, tagLen))
        {
            aes.Decrypt(nonce, ciphertext, tag, plaintext);
        }

        return Encoding.UTF8.GetString(plaintext);
    }
}
