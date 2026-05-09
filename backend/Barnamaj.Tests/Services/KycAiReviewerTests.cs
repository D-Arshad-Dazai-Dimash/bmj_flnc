using Barnamaj.API.Entities;
using Barnamaj.API.Services;
using Xunit;

namespace Barnamaj.Tests.Services;

/// <summary>
/// Тесты rules-based AI reviewer'а: проверка решений по индивидуальной и юр. KYC.
/// Ключевая инвариант v1: AI никогда не возвращает "approve" без модератора.
/// </summary>
public class KycAiReviewerTests
{
    private static IKycAiReviewer Build()
        => new RulesBasedKycAiReviewer(new StubLegalEntityRegistry());

    // ── Individual ────────────────────────────────────────────────────

    [Fact]
    public async Task Individual_WithIdDoc_ReturnsManual()
    {
        var s = new KycSubmission { Kind = KycSubmissionKind.Individual };
        s.Documents.Add(new UserDocument { DocumentType = DocumentType.NationalId });

        var r = await Build().ReviewAsync(s, CancellationToken.None);

        Assert.Equal("manual", r.Decision);
        Assert.NotEqual("approve", r.Decision); // никогда auto-approve в v1
    }

    [Fact]
    public async Task Individual_WithoutIdDoc_Rejected()
    {
        var s = new KycSubmission { Kind = KycSubmissionKind.Individual };

        var r = await Build().ReviewAsync(s, CancellationToken.None);

        Assert.Equal("reject", r.Decision);
        Assert.Contains("документ", r.Reasoning, StringComparison.OrdinalIgnoreCase);
    }

    // ── Legal: базовая валидация ──────────────────────────────────────

    [Theory]
    [InlineData(null,   "991240000123", "ТОО Тест",  "Не указана")]
    [InlineData("ОАО",  "991240000123", "ТОО Тест",  "Неподдерживаемая форма")]
    [InlineData("ТОО",  "12345",        "ТОО Тест",  "БИН должен")]
    [InlineData("ТОО",  "991240000123", "X",         "наименование")]
    public async Task Legal_InvalidFields_Rejected(string? form, string bin, string name, string expectedSubstring)
    {
        var s = new KycSubmission
        {
            Kind            = KycSubmissionKind.Legal,
            LegalForm       = form,
            Bin             = bin,
            LegalName       = name,
            ResponsibleRole = ResponsibleRole.Director,
            ResponsibleName = "Иван Иванов",
        };

        var r = await Build().ReviewAsync(s, CancellationToken.None);

        Assert.Equal("reject", r.Decision);
        Assert.Contains(expectedSubstring, r.Reasoning, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Legal_MissingResponsiblePersonId_Rejected()
    {
        var s = MakeValidLegal("ТОО", "991240000123");
        // нет ResponsiblePersonId документа

        var r = await Build().ReviewAsync(s, CancellationToken.None);

        Assert.Equal("reject", r.Decision);
        Assert.Contains("ответственного лица", r.Reasoning, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Legal_TooMissingAuthority_Rejected()
    {
        var s = MakeValidLegal("ТОО", "991240000123");
        s.Documents.Add(new UserDocument { DocumentType = DocumentType.ResponsiblePersonId });
        // нет AuthorityDocument для ТОО

        var r = await Build().ReviewAsync(s, CancellationToken.None);

        Assert.Equal("reject", r.Decision);
        Assert.Contains("основание", r.Reasoning, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Legal_IpOwner_AuthorityNotRequired_Manual()
    {
        // ИП с representative=Owner: AuthorityDocument НЕ нужен.
        var s = MakeValidLegal("ИП", "900101400123");
        s.ResponsibleRole = ResponsibleRole.Owner;
        s.Documents.Add(new UserDocument { DocumentType = DocumentType.ResponsiblePersonId });

        var r = await Build().ReviewAsync(s, CancellationToken.None);

        Assert.Equal("manual", r.Decision);
    }

    [Fact]
    public async Task Legal_TooWithAllDocs_Manual()
    {
        var s = MakeValidLegal("ТОО", "991240000123");
        s.Documents.Add(new UserDocument { DocumentType = DocumentType.ResponsiblePersonId });
        s.Documents.Add(new UserDocument { DocumentType = DocumentType.AuthorityDocument });

        var r = await Build().ReviewAsync(s, CancellationToken.None);

        Assert.Equal("manual", r.Decision);
        Assert.NotEqual("approve", r.Decision);
        Assert.True(r.Confidence >= 0.7);
    }

    [Fact]
    public async Task Legal_DirectorMatch_HighConfidence()
    {
        var s = MakeValidLegal("ТОО", "991240000123");
        s.ResponsibleRole = ResponsibleRole.Director;
        s.ResponsibleName = "Иванов Иван Иванович"; // совпадает со stub registry
        s.Documents.Add(new UserDocument { DocumentType = DocumentType.ResponsiblePersonId });
        s.Documents.Add(new UserDocument { DocumentType = DocumentType.AuthorityDocument });

        var r = await Build().ReviewAsync(s, CancellationToken.None);

        Assert.Equal("manual", r.Decision);
        Assert.True(r.Confidence >= 0.9);
    }

    [Fact]
    public async Task Legal_BinNotInRegistry_Manual_RequestsRegDoc()
    {
        var s = MakeValidLegal("ТОО", "111111111111"); // нет в фикстурах
        s.Documents.Add(new UserDocument { DocumentType = DocumentType.ResponsiblePersonId });
        s.Documents.Add(new UserDocument { DocumentType = DocumentType.AuthorityDocument });

        var r = await Build().ReviewAsync(s, CancellationToken.None);

        Assert.Equal("manual", r.Decision);
        Assert.Contains("реестре", r.Reasoning, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Legal_FormMismatchWithRegistry_Rejected()
    {
        // БИН зарегистрирован как ТОО, юзер указал АО.
        var s = MakeValidLegal("АО", "991240000123");
        s.Documents.Add(new UserDocument { DocumentType = DocumentType.ResponsiblePersonId });
        s.Documents.Add(new UserDocument { DocumentType = DocumentType.AuthorityDocument });

        var r = await Build().ReviewAsync(s, CancellationToken.None);

        Assert.Equal("reject", r.Decision);
        Assert.Contains("совпадает", r.Reasoning, StringComparison.OrdinalIgnoreCase);
    }

    private static KycSubmission MakeValidLegal(string form, string bin) => new()
    {
        Kind            = KycSubmissionKind.Legal,
        LegalForm       = form,
        Bin             = bin,
        LegalName       = "Тестовое наименование",
        ResponsibleRole = ResponsibleRole.Director,
        ResponsibleName = "Иван Иванов",
    };
}
