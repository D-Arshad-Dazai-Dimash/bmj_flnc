using Barnamaj.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Barnamaj.API.Data.Configurations;

public class ContractConfiguration : IEntityTypeConfiguration<Contract>
{
    public void Configure(EntityTypeBuilder<Contract> builder)
    {
        builder.ToTable("contracts");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(c => c.TotalAmount).HasPrecision(18, 2);
        builder.Property(c => c.Status).HasConversion<byte>();

        builder.Property(c => c.CreatedAt).HasDefaultValueSql("NOW()").ValueGeneratedOnAdd();
        builder.Property(c => c.UpdatedAt).HasDefaultValueSql("NOW()");

        builder.HasOne(c => c.Project)
            .WithMany()
            .HasForeignKey(c => c.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.ClientProfile)
            .WithMany()
            .HasForeignKey(c => c.ClientProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.ExecutorProfile)
            .WithMany()
            .HasForeignKey(c => c.ExecutorProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(c => c.ClientProfileId).HasDatabaseName("ix_contracts_client");
        builder.HasIndex(c => c.ExecutorProfileId).HasDatabaseName("ix_contracts_executor");
        builder.HasIndex(c => c.ProjectId).HasDatabaseName("ix_contracts_project");
    }
}

public class ContractMilestoneConfiguration : IEntityTypeConfiguration<ContractMilestone>
{
    public void Configure(EntityTypeBuilder<ContractMilestone> builder)
    {
        builder.ToTable("contract_milestones");

        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(m => m.Title).HasMaxLength(200).IsRequired();
        builder.Property(m => m.Amount).HasPrecision(18, 2);
        builder.Property(m => m.Status).HasConversion<byte>();
        builder.Property(m => m.Notes).HasMaxLength(2000);

        builder.Property(m => m.UpdatedAt).HasDefaultValueSql("NOW()");

        builder.HasOne(m => m.Contract)
            .WithMany(c => c.Milestones)
            .HasForeignKey(m => m.ContractId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(m => new { m.ContractId, m.OrderIndex })
            .HasDatabaseName("ix_contract_milestones_contract_order");
    }
}

public class ContractEventConfiguration : IEntityTypeConfiguration<ContractEvent>
{
    public void Configure(EntityTypeBuilder<ContractEvent> builder)
    {
        builder.ToTable("contract_events");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(e => e.Action).HasMaxLength(40).IsRequired();
        builder.Property(e => e.Details).HasMaxLength(2000);

        builder.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()").ValueGeneratedOnAdd();

        builder.HasOne(e => e.Contract)
            .WithMany(c => c.Events)
            .HasForeignKey(e => e.ContractId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.ActorProfile)
            .WithMany()
            .HasForeignKey(e => e.ActorProfileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(e => new { e.ContractId, e.CreatedAt })
            .HasDatabaseName("ix_contract_events_contract_created");
    }
}
