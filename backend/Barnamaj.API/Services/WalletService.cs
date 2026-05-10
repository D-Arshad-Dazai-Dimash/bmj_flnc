using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Wallet;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Services;

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

public interface IWalletService
{
    /// <summary>Возвращает кошелёк текущего пользователя (создаёт при отсутствии).</summary>
    Task<WalletDto> GetOrCreateWalletAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Пагинированная история транзакций.</summary>
    Task<WalletHistoryDto> GetHistoryAsync(Guid userId, int page = 1, int pageSize = 20, CancellationToken ct = default);

    /// <summary>Балансы по проектам/контрактам, в которых участвует пользователь.</summary>
    Task<IReadOnlyList<ProjectBalanceDto>> GetProjectBalancesAsync(Guid userId, CancellationToken ct = default);

    /// <summary>MVP-пополнение пользователем своего кошелька (до интеграции провайдера).</summary>
    Task<WalletDto> DemoTopUpAsync(Guid userId, decimal amount, CancellationToken ct = default);

    // ── Admin ──────────────────────────────────────────────────────────────
    Task<IReadOnlyList<AdminWalletSummaryDto>> GetAllWalletsAsync(CancellationToken ct = default);
    Task<WalletDto> AdminAdjustBalanceAsync(Guid userId, decimal amount, string? description, Guid adminId, CancellationToken ct = default);
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

public class WalletService : IWalletService
{
    private readonly AppDbContext _db;

    public WalletService(AppDbContext db) => _db = db;

    // ── Get or Create ─────────────────────────────────────────────────────
    public async Task<WalletDto> GetOrCreateWalletAsync(Guid userId, CancellationToken ct = default)
    {
        var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
        if (wallet == null)
        {
            wallet = new Wallet
            {
                UserId    = userId,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.Wallets.Add(wallet);
            await _db.SaveChangesAsync(ct);
        }
        return ToDto(wallet);
    }

    // ── History ───────────────────────────────────────────────────────────
    public async Task<WalletHistoryDto> GetHistoryAsync(Guid userId, int page, int pageSize, CancellationToken ct)
    {
        var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct)
                     ?? throw new InvalidOperationException("Кошелёк не найден. Откройте страницу кошелька чтобы создать его.");

        var query = _db.Transactions.Where(t => t.WalletId == wallet.Id);
        var total = await query.CountAsync(ct);

        var txns = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new WalletHistoryDto(
            Wallet:       ToDto(wallet),
            Transactions: txns.Select(ToTxDto).ToList(),
            Total:        total,
            Page:         page,
            PageSize:     pageSize
        );
    }

    // ── Admin: list all ───────────────────────────────────────────────────
    public async Task<IReadOnlyList<AdminWalletSummaryDto>> GetAllWalletsAsync(CancellationToken ct)
    {
        return await _db.Wallets
            .Include(w => w.User)
            .Select(w => new AdminWalletSummaryDto(
                w.UserId,
                w.User.Email,
                w.User.Email,
                w.Id,
                w.AvailableBalance,
                w.FrozenBalance,
                w.PendingWithdrawal,
                w.UpdatedAt
            ))
            .ToListAsync(ct);
    }

    // ── Admin: adjust balance ─────────────────────────────────────────────
    public async Task<WalletDto> AdminAdjustBalanceAsync(Guid userId, decimal amount, string? description, Guid adminId, CancellationToken ct)
    {
        var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
        if (wallet == null)
        {
            wallet = new Wallet { UserId = userId, UpdatedAt = DateTime.UtcNow };
            _db.Wallets.Add(wallet);
            await _db.SaveChangesAsync(ct);
        }

        wallet.AvailableBalance += amount;
        wallet.UpdatedAt = DateTime.UtcNow;

        _db.Transactions.Add(new Transaction
        {
            WalletId          = wallet.Id,
            UserId            = userId,
            Type              = amount >= 0 ? TransactionType.ManualAdjustment : TransactionType.ManualAdjustment,
            Status            = TransactionStatus.Completed,
            Amount            = amount,
            Description       = description ?? "Ручная корректировка администратором",
            CreatedByAdminId  = adminId,
            CreatedAt         = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync(ct);
        return ToDto(wallet);
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private static WalletDto ToDto(Wallet w) =>
        new(w.Id, w.AvailableBalance, w.FrozenBalance, w.PendingWithdrawal, w.UpdatedAt);

    private static TransactionDto ToTxDto(Transaction t) =>
        new(t.Id, t.Type.ToString(), t.Status.ToString(), t.Amount, t.Description, t.RelatedProjectId, t.CreatedAt);

    // ── Project balances (эскроу по контрактам) ──────────────────────────
    public async Task<IReadOnlyList<ProjectBalanceDto>> GetProjectBalancesAsync(
        Guid userId, CancellationToken ct = default)
    {
        // Профили пользователя (own + group). Эскроу сейчас работает только
        // для individual-профилей, но чтобы не ломать UI кланов — вернём
        // ВСЕ контракты, в которых участвуют любые профили пользователя.
        var profileIds = await GetUserProfileIdsAsync(userId, ct);
        if (profileIds.Count == 0) return Array.Empty<ProjectBalanceDto>();

        var contracts = await _db.Contracts.AsNoTracking()
            .Where(c => profileIds.Contains(c.ClientProfileId)
                     || profileIds.Contains(c.ExecutorProfileId))
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync(ct);
        if (contracts.Count == 0) return Array.Empty<ProjectBalanceDto>();

        var pids = contracts.SelectMany(c => new[] { c.ClientProfileId, c.ExecutorProfileId }).ToHashSet();
        var names = await _db.Profiles.AsNoTracking()
            .Where(p => pids.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, ct);

        var prjIds = contracts.Select(c => c.ProjectId).ToHashSet();
        var titles = await _db.Projects.AsNoTracking()
            .Where(p => prjIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Title, ct);

        return contracts.Select(c =>
        {
            var asClient = profileIds.Contains(c.ClientProfileId);
            var counter  = asClient ? c.ExecutorProfileId : c.ClientProfileId;
            return new ProjectBalanceDto(
                ContractId:       c.Id,
                ProjectId:        c.ProjectId,
                ProjectTitle:     titles.GetValueOrDefault(c.ProjectId) ?? "—",
                Role:             asClient ? "Client" : "Executor",
                CounterpartyName: names.GetValueOrDefault(counter) ?? "—",
                TotalAmount:      c.TotalAmount,
                EscrowFunded:     c.EscrowFunded,
                EscrowReleased:   c.EscrowReleased,
                Status:           c.Status.ToString(),
                UpdatedAt:        c.UpdatedAt);
        }).ToList();
    }

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

    // ── Demo top-up (MVP, пока нет провайдера платежей) ──────────────────
    public async Task<WalletDto> DemoTopUpAsync(Guid userId, decimal amount, CancellationToken ct = default)
    {
        if (amount <= 0)            throw new InvalidOperationException("Сумма пополнения должна быть положительной.");
        if (amount > 10_000_000m)   throw new InvalidOperationException("Слишком большая сумма для demo-пополнения.");

        var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
        if (wallet == null)
        {
            wallet = new Wallet { UserId = userId, UpdatedAt = DateTime.UtcNow };
            _db.Wallets.Add(wallet);
            await _db.SaveChangesAsync(ct);
        }

        wallet.AvailableBalance += amount;
        wallet.UpdatedAt         = DateTime.UtcNow;

        _db.Transactions.Add(new Transaction
        {
            WalletId    = wallet.Id,
            UserId      = userId,
            Type        = TransactionType.Deposit,
            Status      = TransactionStatus.Completed,
            Amount      = amount,
            Description = "Demo-пополнение (MVP, до интеграции платёжного провайдера)",
            CreatedAt   = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync(ct);
        return ToDto(wallet);
    }
}