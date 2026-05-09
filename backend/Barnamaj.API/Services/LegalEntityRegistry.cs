using System.Text.Json.Serialization;

namespace Barnamaj.API.Services;

/// <summary>
/// Информация о юридическом лице / ИП из внешнего реестра (statgov.kz / КГД РК).
///
/// Возвращается <see cref="ILegalEntityRegistry.LookupByBinAsync"/> и используется:
///   • для автозаполнения формы legal-KYC (юзер не вводит то, что есть в реестре);
///   • как snapshot в KycSubmission.RegistrySnapshotJson — для аудита модератора.
/// </summary>
public sealed record LegalEntityInfo(
    [property: JsonPropertyName("bin")]          string  Bin,
    [property: JsonPropertyName("legalForm")]    string  LegalForm,    // ТОО | АО | ИП
    [property: JsonPropertyName("name")]         string  Name,
    [property: JsonPropertyName("address")]      string? Address,
    [property: JsonPropertyName("director")]     string? Director,     // ФИО директора (для ТОО/АО)
    [property: JsonPropertyName("ownerIinHmac")] string? OwnerIinHmac, // HMAC ИИН владельца ИП (если применимо)
    [property: JsonPropertyName("isActive")]     bool    IsActive,
    [property: JsonPropertyName("source")]       string  Source        // "statgov" | "stub" | "manual"
);

/// <summary>
/// Реестр юридических лиц РК. v1 — stub с тестовыми БИН; v3 — реальный
/// HTTP-клиент к statgov.kz (api.statgov.kz/api/juridical/{bin}).
///
/// Контракт фиксирован, чтобы подмена реализации в Program.cs была
/// единственным изменением при переключении на боевой реестр.
/// </summary>
public interface ILegalEntityRegistry
{
    /// <summary>
    /// Возвращает данные о юр. лице по БИН или null, если не найдено.
    /// БИН должен быть нормализован (12 цифр, без пробелов).
    /// </summary>
    Task<LegalEntityInfo?> LookupByBinAsync(string bin, CancellationToken ct);
}

/// <summary>
/// Stub-реализация реестра: содержит набор фикстур и распознаёт ИП-БИН по
/// 5-й цифре (= 4 — индивидуальный предприниматель РК). Это позволяет
/// демонстрировать flow и писать тесты без внешних зависимостей.
///
/// Когда подключим реальный statgov — регистрация в DI меняется на
/// HTTP-реализацию, остальной код не трогаем.
/// </summary>
public sealed class StubLegalEntityRegistry : ILegalEntityRegistry
{
    private static readonly Dictionary<string, LegalEntityInfo> Fixtures = new()
    {
        ["991240000123"] = new(
            Bin: "991240000123",
            LegalForm: "ТОО",
            Name: "ТОО \"Барнамаж Тест\"",
            Address: "г. Алматы, ул. Сатпаева 30",
            Director: "Иванов Иван Иванович",
            OwnerIinHmac: null,
            IsActive: true,
            Source: "stub"
        ),
        ["970640000456"] = new(
            Bin: "970640000456",
            LegalForm: "АО",
            Name: "АО \"Тестовое Общество\"",
            Address: "г. Астана, пр. Абая 1",
            Director: "Петров Пётр Петрович",
            OwnerIinHmac: null,
            IsActive: true,
            Source: "stub"
        ),
        ["900101400123"] = new(
            Bin: "900101400123",
            LegalForm: "ИП",
            Name: "ИП Сидоров",
            Address: "г. Шымкент, мкр. Самал 5",
            Director: "Сидоров Сидор Сидорович",
            OwnerIinHmac: null,
            IsActive: true,
            Source: "stub"
        ),
    };

    public Task<LegalEntityInfo?> LookupByBinAsync(string bin, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(bin) || bin.Length != 12 || !bin.All(char.IsDigit))
            return Task.FromResult<LegalEntityInfo?>(null);

        return Task.FromResult(Fixtures.GetValueOrDefault(bin));
    }
}
