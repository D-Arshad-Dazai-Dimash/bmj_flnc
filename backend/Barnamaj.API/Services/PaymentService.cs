using Barnamaj.API.Data;
using Barnamaj.API.DTOs.Contracts;
using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Barnamaj.API.Services;

/// <summary>
/// Сервис эскроу-платежей. В Неделе 2 — заглушка с провайдером "stub":
/// initiate сразу переводит платёж в статус Held и контракт в Funded.
/// В Неделе 4 заменяется на реальную интеграцию (Kaspi/Freedom/Stripe)
/// с асинхронным webhook-подтверждением.
/// </summary>
public interface IPaymentService
{
    Task<InitiatePaymentResponse> InitiateAsync(Guid clientProfileId, Guid contractId, CancellationToken ct);
}

public class PaymentService : IPaymentService
{
    private readonly AppDbContext _db;

    public PaymentService(AppDbContext db) => _db = db;

    public async Task<InitiatePaymentResponse> InitiateAsync(
        Guid clientProfileId, Guid contractId, CancellationToken ct)
    {
        var contract = await _db.Contracts.FirstOrDefaultAsync(c => c.Id == contractId, ct)
            ?? throw new InvalidOperationException("Контракт не найден.");

        if (contract.ClientProfileId != clientProfileId)
            throw new UnauthorizedAccessException("Оплачивает только заказчик.");

        if (contract.Status != ContractStatus.Signed)
            throw new InvalidOperationException("Эскроу можно пополнить только подписанного контракта.");

        var existing = await _db.Payments.AnyAsync(
            p => p.ContractId == contractId && p.Status == PaymentStatus.Held, ct);
        if (existing) throw new InvalidOperationException("Платёж уже зарезервирован.");

        var providerRef = $"stub-{Guid.NewGuid():N}";
        var payment = new Payment
        {
            ContractId  = contractId,
            Amount      = contract.Amount,
            Currency    = contract.Currency,
            Provider    = "stub",
            ProviderRef = providerRef,
            // dev-режим: моментально считаем зарезервированным
            Status      = PaymentStatus.Held,
        };
        _db.Payments.Add(payment);

        var now = DateTime.UtcNow;
        contract.Status    = ContractStatus.Funded;
        contract.FundedAt  = now;
        contract.UpdatedAt = now;

        await _db.SaveChangesAsync(ct);

        return new InitiatePaymentResponse(
            payment.Id, payment.Provider, providerRef, payment.Status.ToString());
    }
}
