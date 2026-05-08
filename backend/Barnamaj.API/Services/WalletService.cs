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
}
