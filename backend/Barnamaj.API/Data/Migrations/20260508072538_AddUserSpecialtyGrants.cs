using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Barnamaj.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserSpecialtyGrants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "bin",
                table: "profiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "contact_phone",
                table: "profiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "director_name",
                table: "profiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "iin_entrepreneur",
                table: "profiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "legal_address",
                table: "profiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "legal_form",
                table: "profiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "legal_name",
                table: "profiles",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "admin_audit_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    admin_id = table.Column<Guid>(type: "uuid", nullable: false),
                    action = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    target_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    payload = table.Column<string>(type: "jsonb", nullable: true),
                    ip_address = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_admin_audit_logs", x => x.id);
                    table.ForeignKey(
                        name: "fk_admin_audit_logs_user_admin_id",
                        column: x => x.admin_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "user_specialty_grants",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    specialty = table.Column<byte>(type: "smallint", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    granted_by_admin_id = table.Column<Guid>(type: "uuid", nullable: false),
                    note = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_specialty_grants", x => x.id);
                    table.ForeignKey(
                        name: "fk_user_specialty_grants_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_audit_logs_admin_id",
                table: "admin_audit_logs",
                column: "admin_id");

            migrationBuilder.CreateIndex(
                name: "ix_audit_logs_created_at",
                table: "admin_audit_logs",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_audit_logs_target_user_id",
                table: "admin_audit_logs",
                column: "target_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_specialty_grants_expires_at",
                table: "user_specialty_grants",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "ix_specialty_grants_user_id",
                table: "user_specialty_grants",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_specialty_grants_user_specialty",
                table: "user_specialty_grants",
                columns: new[] { "user_id", "specialty" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "admin_audit_logs");

            migrationBuilder.DropTable(
                name: "user_specialty_grants");

            migrationBuilder.DropColumn(
                name: "bin",
                table: "profiles");

            migrationBuilder.DropColumn(
                name: "contact_phone",
                table: "profiles");

            migrationBuilder.DropColumn(
                name: "director_name",
                table: "profiles");

            migrationBuilder.DropColumn(
                name: "iin_entrepreneur",
                table: "profiles");

            migrationBuilder.DropColumn(
                name: "legal_address",
                table: "profiles");

            migrationBuilder.DropColumn(
                name: "legal_form",
                table: "profiles");

            migrationBuilder.DropColumn(
                name: "legal_name",
                table: "profiles");
        }
    }
}
