using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Barnamaj.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddKycAndPhoneFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "iin",
                table: "users",
                type: "character varying(12)",
                maxLength: 12,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_phone_verified",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "kyc_provider_ref",
                table: "users",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<byte>(
                name: "kyc_status",
                table: "users",
                type: "smallint",
                nullable: false,
                defaultValue: (byte)0);

            migrationBuilder.AddColumn<DateTime>(
                name: "kyc_verified_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "phone",
                table: "users",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "kyc_events",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_type = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    provider = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    provider_ref = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    payload_json = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_kyc_events", x => x.id);
                    table.ForeignKey(
                        name: "fk_kyc_events_user_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_users_iin",
                table: "users",
                column: "iin",
                unique: true,
                filter: "iin IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_users_phone",
                table: "users",
                column: "phone",
                unique: true,
                filter: "phone IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_kyc_events_user_created",
                table: "kyc_events",
                columns: new[] { "user_id", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "kyc_events");

            migrationBuilder.DropIndex(
                name: "ix_users_iin",
                table: "users");

            migrationBuilder.DropIndex(
                name: "ix_users_phone",
                table: "users");

            migrationBuilder.DropColumn(
                name: "iin",
                table: "users");

            migrationBuilder.DropColumn(
                name: "is_phone_verified",
                table: "users");

            migrationBuilder.DropColumn(
                name: "kyc_provider_ref",
                table: "users");

            migrationBuilder.DropColumn(
                name: "kyc_status",
                table: "users");

            migrationBuilder.DropColumn(
                name: "kyc_verified_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "phone",
                table: "users");
        }
    }
}
