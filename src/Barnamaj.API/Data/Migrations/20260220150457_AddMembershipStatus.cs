using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Barnamaj.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMembershipStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_memberships_user_active",
                table: "memberships");

            migrationBuilder.DropColumn(
                name: "is_active",
                table: "memberships");

            migrationBuilder.AlterColumn<DateTime>(
                name: "joined_at",
                table: "memberships",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "memberships",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.AddColumn<Guid>(
                name: "invited_by_user_id",
                table: "memberships",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<byte>(
                name: "status",
                table: "memberships",
                type: "smallint",
                nullable: false,
                defaultValue: (byte)0);

            // Все уже существующие записи были активными — ставим Active (1)
            // вместо дефолтного Pending (0), чтобы не сломать данные при апгрейде
            migrationBuilder.Sql(
                "UPDATE memberships SET status = 1 WHERE status = 0;");

            migrationBuilder.CreateIndex(
                name: "ix_memberships_user_status",
                table: "memberships",
                columns: new[] { "user_id", "status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_memberships_user_status",
                table: "memberships");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "memberships");

            migrationBuilder.DropColumn(
                name: "invited_by_user_id",
                table: "memberships");

            migrationBuilder.DropColumn(
                name: "status",
                table: "memberships");

            migrationBuilder.AlterColumn<DateTime>(
                name: "joined_at",
                table: "memberships",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_active",
                table: "memberships",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateIndex(
                name: "ix_memberships_user_active",
                table: "memberships",
                columns: new[] { "user_id", "is_active" });
        }
    }
}
