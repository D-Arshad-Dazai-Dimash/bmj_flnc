using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Contracts;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Services;

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

public interface IContractService
{
    Task<IReadOnlyList<ContractSummaryDto>> ListMineAsync(
        Guid currentUserId, CancellationToken ct = default);

    Task<ContractDetailDto> GetByIdAsync(
        Guid id, Guid currentUserId, CancellationToken ct = default);

    Task<ContractDetailDto> CreateAsync(
        CreateContractDto dto, Guid currentUserId, CancellationToken ct = default);

    Task<ContractDetailDto> TransitionAsync(
        Guid id, TransitionContractDto dto, Guid currentUserId, CancellationToken ct = default);

    Task<ContractDetailDto> SubmitMilestoneAsync(
        Guid id, Guid milestoneId, MilestoneActionDto dto,
        Guid currentUserId, CancellationToken ct = default);

    Task<ContractDetailDto> ApproveMilestoneAsync(
        Guid id, Guid milestoneId, MilestoneActionDto dto,
        Guid currentUserId, CancellationToken ct = default);

    Task<ContractDetailDto> RejectMilestoneAsync(
        Guid id, Guid milestoneId, MilestoneActionDto dto,
        Guid currentUserId, CancellationToken ct = default);
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

public sealed class ContractService : IContractService
{
    private readonly AppDbContext            _db;
    private readonly IChatService            _chat;
    private readonly ILogger<ContractService> _logger;

    public ContractService(AppDbContext db, IChatService chat, ILogger<ContractService> logger)
    {
        _db = db; _chat = chat; _logger = logger;
    }

    // ── Helpers ────────────────────────────────────────────────

    private async Task<HashSet<Guid>> GetUserProfileIdsAsync(Guid userId, CancellationToken ct)
    {
        var own = await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId && u.ProfileId != null)
            .Select(u => u.ProfileId!.Value).ToListAsync(ct);
        var groups = await _db.Memberships.AsNoTracking()
            .Where(m => m.UserId == userId && m.Status == MembershipStatus.Active)
            .Select(m => m.ProfileId).ToListAsync(ct);
        return own.Concat(groups).ToHashSet();
    }

    private async Task<Contract> LoadContractForUserAsync(
        Guid id, Guid userId, CancellationToken ct, bool track = false)
    {
        var q = track ? _db.Contracts.AsQueryable() : _db.Contracts.AsNoTracking();
        var c = await q
            .Include(x => x.Milestones)
            .Include(x => x.Events)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new ContractException("Контракт не найден.", 404);

        var my = await GetUserProfileIdsAsync(userId, ct);
        if (!my.Contains(c.ClientProfileId) && !my.Contains(c.ExecutorProfileId))
            throw new ContractException("Нет доступа к контракту.", 403);
        return c;
    }

    private async Task<ContractDetailDto> ToDetailAsync(Contract c, CancellationToken ct)
    {
        var profileIds = new HashSet<Guid> { c.ClientProfileId, c.ExecutorProfileId };
        profileIds.UnionWith(c.Events.Select(e => e.ActorProfileId));
        var names = await _db.Profiles.AsNoTracking()
            .Where(p => profileIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        var projectTitle = await _db.Projects.AsNoTracking()
            .Where(p => p.Id == c.ProjectId).Select(p => p.Title).FirstOrDefaultAsync(ct)
            ?? "—";

        var milestones = c.Milestones.OrderBy(m => m.OrderIndex)
            .Select(m => new MilestoneDto(
                m.Id, m.OrderIndex, m.Title, m.Amount, m.DueDate,
                m.Status.ToString(), m.Notes, m.UpdatedAt))
            .ToList();

        var events = c.Events.OrderBy(e => e.CreatedAt)
            .Select(e => new ContractEventDto(
                e.Id, e.ActorProfileId, names.GetValueOrDefault(e.ActorProfileId) ?? "—",
                e.Action, e.Details, e.CreatedAt))
            .ToList();

        return new ContractDetailDto(
            Id: c.Id,
            ProjectId: c.ProjectId, ProjectTitle: projectTitle,
            ClientProfileId: c.ClientProfileId,
            ClientProfileName: names.GetValueOrDefault(c.ClientProfileId) ?? "—",
            ExecutorProfileId: c.ExecutorProfileId,
            ExecutorProfileName: names.GetValueOrDefault(c.ExecutorProfileId) ?? "—",
            TotalAmount: c.TotalAmount,
            Status: c.Status.ToString(),
            CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt,
            Milestones: milestones, Events: events
        );
    }

    private async Task NotifyAsync(
        Contract c, Guid actorProfileId, string body, CancellationToken ct)
    {
        try
        {
            var thread = await _chat.EnsureThreadAsync(
                c.ClientProfileId, c.ExecutorProfileId, c.ProjectId, ct);
            await _chat.SendSystemMessageAsync(thread.Id, actorProfileId, body, c.ProjectId, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Contract notify failed for {ContractId}", c.Id);
        }
    }

    private static void AppendEvent(Contract c, Guid actorProfileId, string action, string? details = null)
    {
        c.Events.Add(new ContractEvent
        {
            ContractId = c.Id, ActorProfileId = actorProfileId,
            Action = action, Details = details,
        });
        c.UpdatedAt = DateTime.UtcNow;
    }

    // ── List ───────────────────────────────────────────────────

    public async Task<IReadOnlyList<ContractSummaryDto>> ListMineAsync(
        Guid currentUserId, CancellationToken ct = default)
    {
        var my = await GetUserProfileIdsAsync(currentUserId, ct);
        if (my.Count == 0) return Array.Empty<ContractSummaryDto>();

        var contracts = await _db.Contracts.AsNoTracking()
            .Where(c => my.Contains(c.ClientProfileId) || my.Contains(c.ExecutorProfileId))
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync(ct);

        if (contracts.Count == 0) return Array.Empty<ContractSummaryDto>();

        var ids = contracts.Select(c => c.Id).ToList();
        var counts = await _db.ContractMilestones.AsNoTracking()
            .Where(m => ids.Contains(m.ContractId))
            .GroupBy(m => m.ContractId)
            .Select(g => new {
                ContractId = g.Key,
                Total = g.Count(),
                Approved = g.Count(x => x.Status == MilestoneStatus.Approved)
            })
            .ToDictionaryAsync(x => x.ContractId, ct);

        var profileIds = contracts.SelectMany(c => new[] { c.ClientProfileId, c.ExecutorProfileId }).ToHashSet();
        var profiles = await _db.Profiles.AsNoTracking()
            .Where(p => profileIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        var projIds = contracts.Select(c => c.ProjectId).ToHashSet();
        var titles = await _db.Projects.AsNoTracking()
            .Where(p => projIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Title, ct);

        return contracts.Select(c =>
        {
            counts.TryGetValue(c.Id, out var cn);
            return new ContractSummaryDto(
                Id: c.Id, ProjectId: c.ProjectId,
                ProjectTitle: titles.GetValueOrDefault(c.ProjectId) ?? "—",
                ClientProfileId: c.ClientProfileId,
                ClientProfileName: profiles.GetValueOrDefault(c.ClientProfileId) ?? "—",
                ExecutorProfileId: c.ExecutorProfileId,
                ExecutorProfileName: profiles.GetValueOrDefault(c.ExecutorProfileId) ?? "—",
                TotalAmount: c.TotalAmount,
                Status: c.Status.ToString(),
                MilestonesTotal: cn?.Total ?? 0,
                MilestonesApproved: cn?.Approved ?? 0,
                CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt);
        }).ToList();
    }

    public async Task<ContractDetailDto> GetByIdAsync(
        Guid id, Guid currentUserId, CancellationToken ct = default)
    {
        var c = await LoadContractForUserAsync(id, currentUserId, ct);
        return await ToDetailAsync(c, ct);
    }

    // ── Create ─────────────────────────────────────────────────

    public async Task<ContractDetailDto> CreateAsync(
        CreateContractDto dto, Guid currentUserId, CancellationToken ct = default)
    {
        if (dto.Milestones is null || dto.Milestones.Count == 0)
            throw new ContractException("Нужен хотя бы один этап.");
        if (dto.TotalAmount <= 0)
            throw new ContractException("Сумма контракта должна быть положительной.");

        var sum = dto.Milestones.Sum(m => m.Amount);
        if (sum != dto.TotalAmount)
            throw new ContractException(
                $"Сумма этапов ({sum}) должна совпадать с общей суммой ({dto.TotalAmount}).");

        foreach (var m in dto.Milestones)
        {
            if (string.IsNullOrWhiteSpace(m.Title))
                throw new ContractException("Название этапа не может быть пустым.");
            if (m.Amount <= 0)
                throw new ContractException("Сумма этапа должна быть положительной.");
        }

        var project = await _db.Projects
            .FirstOrDefaultAsync(p => p.Id == dto.ProjectId, ct)
            ?? throw new ContractException("Проект не найден.", 404);

        var my = await GetUserProfileIdsAsync(currentUserId, ct);
        if (!my.Contains(project.ClientProfileId))
            throw new ContractException("Только заказчик может создать контракт.", 403);

        var executor = await _db.Profiles.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dto.ExecutorProfileId, ct)
            ?? throw new ContractException("Профиль исполнителя не найден.", 404);

        var hasAccepted = await _db.ProjectApplications.AsNoTracking()
            .AnyAsync(a => a.ProjectId == project.Id
                && a.ApplicantProfileId == dto.ExecutorProfileId
                && a.Status == ApplicationStatus.Accepted, ct);
        if (!hasAccepted)
            throw new ContractException(
                "Контракт можно создать только с принятым исполнителем (Accepted-отклик).", 400);

        var existing = await _db.Contracts.AsNoTracking()
            .AnyAsync(c => c.ProjectId == project.Id
                && c.ExecutorProfileId == dto.ExecutorProfileId
                && c.Status != ContractStatus.Cancelled, ct);
        if (existing)
            throw new ContractException("Активный контракт по этому проекту уже существует.");

        var contract = new Contract
        {
            ProjectId         = project.Id,
            ClientProfileId   = project.ClientProfileId,
            ExecutorProfileId = dto.ExecutorProfileId,
            TotalAmount       = dto.TotalAmount,
            Status            = ContractStatus.Active,
        };
        var idx = 0;
        foreach (var m in dto.Milestones)
        {
            contract.Milestones.Add(new ContractMilestone
            {
                OrderIndex = idx++,
                Title  = m.Title.Trim(),
                Amount = m.Amount,
                DueDate = m.DueDate,
                Status = MilestoneStatus.Pending,
            });
        }
        AppendEvent(contract, project.ClientProfileId, "Created", $"Этапов: {dto.Milestones.Count}, сумма {dto.TotalAmount}");

        _db.Contracts.Add(contract);
        await _db.SaveChangesAsync(ct);

        await NotifyAsync(contract, project.ClientProfileId,
            $"Создан контракт по проекту «{project.Title}» на сумму {dto.TotalAmount}.", ct);

        return await ToDetailAsync(contract, ct);
    }

    // ── Transition (контракт в целом) ─────────────────────────

    public async Task<ContractDetailDto> TransitionAsync(
        Guid id, TransitionContractDto dto, Guid currentUserId, CancellationToken ct = default)
    {
        var c = await LoadContractForUserAsync(id, currentUserId, ct, track: true);
        var my = await GetUserProfileIdsAsync(currentUserId, ct);
        var isClient = my.Contains(c.ClientProfileId);

        if (!Enum.TryParse<ContractStatus>(dto.Status, true, out var next))
            throw new ContractException($"Недопустимый статус: '{dto.Status}'.");

        // Разрешённые переходы
        bool ok = (c.Status, next) switch
        {
            (ContractStatus.Draft,    ContractStatus.Active)    when isClient => true,
            (ContractStatus.Draft,    ContractStatus.Cancelled) when isClient => true,
            (ContractStatus.Active,   ContractStatus.Cancelled) when isClient => true,
            (ContractStatus.Active,   ContractStatus.Disputed)                => true,
            (ContractStatus.InReview, ContractStatus.Disputed)                => true,
            (ContractStatus.Disputed, ContractStatus.Active)                  => true,
            _ => false,
        };
        if (!ok)
            throw new ContractException($"Недопустимый переход {c.Status} → {next}.");

        c.Status = next;
        var actor = isClient ? c.ClientProfileId : c.ExecutorProfileId;
        AppendEvent(c, actor, $"Transition:{next}", dto.Reason);
        await _db.SaveChangesAsync(ct);

        await NotifyAsync(c, actor, $"Контракт переведён в статус «{next}».", ct);
        return await ToDetailAsync(c, ct);
    }

    // ── Milestones actions ────────────────────────────────────

    private async Task<(Contract c, ContractMilestone m, bool isClient, Guid actorProfileId)>
        LoadMsAsync(Guid id, Guid msId, Guid userId, CancellationToken ct)
    {
        var c = await LoadContractForUserAsync(id, userId, ct, track: true);
        var m = c.Milestones.FirstOrDefault(x => x.Id == msId)
            ?? throw new ContractException("Этап не найден.", 404);
        var my = await GetUserProfileIdsAsync(userId, ct);
        var isClient = my.Contains(c.ClientProfileId);
        var actor = isClient ? c.ClientProfileId : c.ExecutorProfileId;
        return (c, m, isClient, actor);
    }

    public async Task<ContractDetailDto> SubmitMilestoneAsync(
        Guid id, Guid milestoneId, MilestoneActionDto dto, Guid currentUserId, CancellationToken ct = default)
    {
        var (c, m, isClient, actor) = await LoadMsAsync(id, milestoneId, currentUserId, ct);
        if (isClient) throw new ContractException("Сдавать этап может только исполнитель.", 403);
        if (c.Status != ContractStatus.Active && c.Status != ContractStatus.InReview)
            throw new ContractException($"Нельзя сдавать этапы в статусе '{c.Status}'.");
        if (m.Status != MilestoneStatus.Pending && m.Status != MilestoneStatus.Rejected)
            throw new ContractException($"Этап в статусе '{m.Status}' нельзя сдавать.");

        // Последовательность: все предыдущие должны быть Approved
        var prev = c.Milestones.Where(x => x.OrderIndex < m.OrderIndex);
        if (prev.Any(x => x.Status != MilestoneStatus.Approved))
            throw new ContractException("Сначала закройте предыдущие этапы.");

        m.Status = MilestoneStatus.Submitted;
        m.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? m.Notes : dto.Notes.Trim();
        m.UpdatedAt = DateTime.UtcNow;

        // Если все этапы сданы — статус контракта InReview
        if (c.Milestones.All(x => x.Status == MilestoneStatus.Submitted || x.Status == MilestoneStatus.Approved))
            c.Status = ContractStatus.InReview;

        AppendEvent(c, actor, $"MilestoneSubmitted:{m.OrderIndex + 1}", dto.Notes);
        await _db.SaveChangesAsync(ct);

        await NotifyAsync(c, actor, $"Этап «{m.Title}» сдан на проверку.", ct);
        return await ToDetailAsync(c, ct);
    }

    public async Task<ContractDetailDto> ApproveMilestoneAsync(
        Guid id, Guid milestoneId, MilestoneActionDto dto, Guid currentUserId, CancellationToken ct = default)
    {
        var (c, m, isClient, actor) = await LoadMsAsync(id, milestoneId, currentUserId, ct);
        if (!isClient) throw new ContractException("Принимать этап может только заказчик.", 403);
        if (m.Status != MilestoneStatus.Submitted)
            throw new ContractException("Этап нужно сначала сдать на проверку.");

        m.Status = MilestoneStatus.Approved;
        m.UpdatedAt = DateTime.UtcNow;

        // Если все Approved — контракт Released
        if (c.Milestones.All(x => x.Status == MilestoneStatus.Approved))
            c.Status = ContractStatus.Released;
        else if (c.Status != ContractStatus.Released)
            c.Status = ContractStatus.Active;

        AppendEvent(c, actor, $"MilestoneApproved:{m.OrderIndex + 1}", dto.Notes);
        await _db.SaveChangesAsync(ct);

        await NotifyAsync(c, actor, $"Заказчик принял этап «{m.Title}».", ct);
        return await ToDetailAsync(c, ct);
    }

    public async Task<ContractDetailDto> RejectMilestoneAsync(
        Guid id, Guid milestoneId, MilestoneActionDto dto, Guid currentUserId, CancellationToken ct = default)
    {
        var (c, m, isClient, actor) = await LoadMsAsync(id, milestoneId, currentUserId, ct);
        if (!isClient) throw new ContractException("Отклонять этап может только заказчик.", 403);
        if (m.Status != MilestoneStatus.Submitted)
            throw new ContractException("Этап не на проверке.");

        m.Status = MilestoneStatus.Rejected;
        m.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? m.Notes : dto.Notes.Trim();
        m.UpdatedAt = DateTime.UtcNow;
        if (c.Status == ContractStatus.InReview) c.Status = ContractStatus.Active;

        AppendEvent(c, actor, $"MilestoneRejected:{m.OrderIndex + 1}", dto.Notes);
        await _db.SaveChangesAsync(ct);

        await NotifyAsync(c, actor, $"Заказчик отклонил этап «{m.Title}»: требуется доработка.", ct);
        return await ToDetailAsync(c, ct);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXCEPTION
// ═══════════════════════════════════════════════════════════════════════════

public sealed class ContractException : Exception
{
    public int StatusCode { get; }
    public ContractException(string message, int statusCode = 400) : base(message)
    {
        StatusCode = statusCode;
    }
}
