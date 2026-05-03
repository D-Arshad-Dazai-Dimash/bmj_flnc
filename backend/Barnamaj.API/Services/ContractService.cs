using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Contracts;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Services;

/// <summary>
/// Бизнес-логика контрактов. Все методы возвращают актуализированные DTO,
/// а не сущности, чтобы не утекали навигации.
/// </summary>
public interface IContractService
{
    Task<ContractDetailDto>           CreateAsync(Guid initiatorProfileId, CreateContractDto dto, CancellationToken ct);
    Task<List<ContractSummaryDto>>    ListMineAsync(Guid profileId, CancellationToken ct);
    Task<ContractDetailDto?>          GetAsync(Guid contractId, Guid profileId, CancellationToken ct);
    Task<ContractDetailDto>           SignAsync(Guid contractId, Guid signerProfileId, CancellationToken ct);
    Task<ContractDetailDto>           ReleaseAsync(Guid contractId, Guid clientProfileId, CancellationToken ct);
}

public class ContractService : IContractService
{
    private readonly AppDbContext         _db;
    private readonly INotificationService _notify;

    public ContractService(AppDbContext db, INotificationService notify)
    {
        _db     = db;
        _notify = notify;
    }

    public async Task<ContractDetailDto> CreateAsync(
        Guid initiatorProfileId, CreateContractDto dto, CancellationToken ct)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == dto.ProjectId, ct)
            ?? throw new InvalidOperationException("Проект не найден.");

        if (project.ClientProfileId != initiatorProfileId)
            throw new UnauthorizedAccessException("Создавать контракт может только заказчик проекта.");

        var exists = await _db.Contracts.AnyAsync(
            c => c.ProjectId == dto.ProjectId
              && c.ExecutorProfileId == dto.ExecutorProfileId
              && c.Status != ContractStatus.Cancelled,
            ct);
        if (exists) throw new InvalidOperationException("Контракт по этому проекту с этим исполнителем уже существует.");

        if (dto.Amount <= 0)
            throw new InvalidOperationException("Сумма должна быть больше нуля.");

        var contract = new Contract
        {
            ProjectId         = dto.ProjectId,
            ClientProfileId   = initiatorProfileId,
            ExecutorProfileId = dto.ExecutorProfileId,
            Amount            = dto.Amount,
            Currency          = "KZT",
            Status            = ContractStatus.Draft,
        };
        _db.Contracts.Add(contract);
        await _db.SaveChangesAsync(ct);

        return await GetDetailRequiredAsync(contract.Id, ct);
    }

    public async Task<List<ContractSummaryDto>> ListMineAsync(
        Guid profileId, CancellationToken ct)
    {
        return await _db.Contracts
            .Where(c => c.ClientProfileId == profileId || c.ExecutorProfileId == profileId)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new ContractSummaryDto(
                c.Id, c.ProjectId,
                c.Project!.Title,
                c.Status.ToString(),
                c.Amount, c.Currency,
                c.ClientProfile!.Name,
                c.ExecutorProfile!.Name,
                c.CreatedAt))
            .ToListAsync(ct);
    }

    public async Task<ContractDetailDto?> GetAsync(
        Guid contractId, Guid profileId, CancellationToken ct)
    {
        var detail = await GetDetailAsync(contractId, ct);
        if (detail is null) return null;

        if (detail.ClientProfileId != profileId && detail.ExecutorProfileId != profileId)
            throw new UnauthorizedAccessException("Нет доступа к этому контракту.");

        return detail;
    }

    public async Task<ContractDetailDto> SignAsync(
        Guid contractId, Guid signerProfileId, CancellationToken ct)
    {
        var c = await _db.Contracts.FirstOrDefaultAsync(x => x.Id == contractId, ct)
            ?? throw new InvalidOperationException("Контракт не найден.");

        if (c.Status != ContractStatus.Draft)
            throw new InvalidOperationException("Подписать можно только черновик.");

        var now = DateTime.UtcNow;
        if (signerProfileId == c.ClientProfileId)
            c.ClientSignedAt = now;
        else if (signerProfileId == c.ExecutorProfileId)
            c.ExecutorSignedAt = now;
        else
            throw new UnauthorizedAccessException("Подписывать контракт могут только его стороны.");

        if (c.ClientSignedAt is not null && c.ExecutorSignedAt is not null)
            c.Status = ContractStatus.Signed;

        c.UpdatedAt = now;
        await _db.SaveChangesAsync(ct);

        // Уведомление другой стороне
        var otherProfileId = signerProfileId == c.ClientProfileId ? c.ExecutorProfileId : c.ClientProfileId;
        var otherUserId    = await ResolveUserIdAsync(otherProfileId, ct);
        if (otherUserId is { } uid)
        {
            await _notify.PushAsync(uid,
                type:    c.Status == ContractStatus.Signed ? "contract_signed" : "contract_signature_partial",
                title:   c.Status == ContractStatus.Signed
                    ? "Контракт подписан обеими сторонами"
                    : "Контрагент подписал контракт",
                payload: new { contractId = c.Id }, ct: ct);
        }

        return await GetDetailRequiredAsync(contractId, ct);
    }

    public async Task<ContractDetailDto> ReleaseAsync(
        Guid contractId, Guid clientProfileId, CancellationToken ct)
    {
        var c = await _db.Contracts.FirstOrDefaultAsync(x => x.Id == contractId, ct)
            ?? throw new InvalidOperationException("Контракт не найден.");

        if (c.ClientProfileId != clientProfileId)
            throw new UnauthorizedAccessException("Подтвердить приёмку может только заказчик.");

        if (c.Status is not (ContractStatus.Funded or ContractStatus.InProgress))
            throw new InvalidOperationException("Подтверждение возможно только для оплаченного контракта.");

        var payment = await _db.Payments.FirstOrDefaultAsync(
            p => p.ContractId == contractId && p.Status == PaymentStatus.Held, ct)
            ?? throw new InvalidOperationException("Нет удерживаемого платежа для разблокировки.");

        var now = DateTime.UtcNow;
        payment.Status    = PaymentStatus.Released;
        payment.UpdatedAt = now;

        c.Status     = ContractStatus.Released;
        c.ReleasedAt = now;
        c.UpdatedAt  = now;

        await _db.SaveChangesAsync(ct);

        // Уведомляем исполнителя о разблокировке средств
        var execUserId = await ResolveUserIdAsync(c.ExecutorProfileId, ct);
        if (execUserId is { } uid)
        {
            await _notify.PushAsync(uid,
                type:    "work_released",
                title:   $"Средства разблокированы: {c.Amount:0.##} {c.Currency}",
                payload: new { contractId = c.Id, amount = c.Amount }, ct: ct);
        }

        return await GetDetailRequiredAsync(contractId, ct);
    }

    /// <summary>Находит User.Id по Profile.Id (через User.ProfileId или Memberships).</summary>
    private async Task<Guid?> ResolveUserIdAsync(Guid profileId, CancellationToken ct)
    {
        // Вариант 1: индивидуальный профиль (User.ProfileId == profileId)
        var owner = await _db.Users
            .Where(u => u.ProfileId == profileId)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefaultAsync(ct);
        if (owner is { } u && u != Guid.Empty) return u;

        // Вариант 2: для клана/компании — берём первого активного участника
        return await _db.Memberships
            .Where(m => m.ProfileId == profileId && m.Status == MembershipStatus.Active)
            .OrderBy(m => m.JoinedAt)
            .Select(m => (Guid?)m.UserId)
            .FirstOrDefaultAsync(ct);
    }

    // ── helpers ───────────────────────────────────────────────────────────

    private async Task<ContractDetailDto?> GetDetailAsync(Guid id, CancellationToken ct)
    {
        var c = await _db.Contracts
            .Include(x => x.Project)
            .Include(x => x.ClientProfile)
            .Include(x => x.ExecutorProfile)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c is null) return null;

        var pay = await _db.Payments
            .Where(p => p.ContractId == id)
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync(ct);

        return new ContractDetailDto(
            c.Id, c.ProjectId, c.Project?.Title ?? "",
            c.Status.ToString(), c.Amount, c.Currency,
            c.ClientProfileId,   c.ClientProfile?.Name   ?? "",
            c.ExecutorProfileId, c.ExecutorProfile?.Name ?? "",
            c.ClientSignedAt, c.ExecutorSignedAt,
            c.FundedAt, c.ReleasedAt, c.CreatedAt,
            pay is null ? null : new PaymentSummaryDto(
                pay.Id, pay.Amount, pay.Currency,
                pay.Provider, pay.ProviderRef,
                pay.Status.ToString(), pay.CreatedAt));
    }

    private async Task<ContractDetailDto> GetDetailRequiredAsync(Guid id, CancellationToken ct)
        => await GetDetailAsync(id, ct)
           ?? throw new InvalidOperationException("Контракт не найден.");
}
