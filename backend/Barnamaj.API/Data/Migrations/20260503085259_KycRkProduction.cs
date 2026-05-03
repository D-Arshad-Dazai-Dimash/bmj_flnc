using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Barnamaj.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class KycRkProduction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "iin_encrypted",
                table: "users",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "iin_hmac",
                table: "users",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_phone_verified",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

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
                type: "character varying(16)",
                maxLength: 16,
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
                    ip_address = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    user_agent = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
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

            migrationBuilder.CreateTable(
                name: "user_documents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_type = table.Column<byte>(type: "smallint", nullable: false),
                    status = table.Column<byte>(type: "smallint", nullable: false),
                    front_object_key = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    back_object_key = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    selfie_object_key = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    front_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    reviewed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    rejection_reason = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_documents", x => x.id);
                    table.ForeignKey(
                        name: "fk_user_documents_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_users_kyc_status",
                table: "users",
                column: "kyc_status");

            migrationBuilder.CreateIndex(
                name: "ux_users_iin_hmac",
                table: "users",
                column: "iin_hmac",
                unique: true,
                filter: "iin_hmac IS NOT NULL AND deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ux_users_phone_verified",
                table: "users",
                column: "phone",
                unique: true,
                filter: "is_phone_verified = true AND deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_kyc_events_type",
                table: "kyc_events",
                column: "event_type");

            migrationBuilder.CreateIndex(
                name: "ix_kyc_events_user_created",
                table: "kyc_events",
                columns: new[] { "user_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_user_documents_front_sha",
                table: "user_documents",
                column: "front_sha256");

            migrationBuilder.CreateIndex(
                name: "ux_user_documents_user_active",
                table: "user_documents",
                column: "user_id",
                unique: true,
                filter: "status <> 3");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "kyc_events");

            migrationBuilder.DropTable(
                name: "user_documents");

            migrationBuilder.DropIndex(
                name: "ix_users_kyc_status",
                table: "users");

            migrationBuilder.DropIndex(
                name: "ux_users_iin_hmac",
                table: "users");

            migrationBuilder.DropIndex(
                name: "ux_users_phone_verified",
                table: "users");

            migrationBuilder.DropColumn(
                name: "iin_encrypted",
                table: "users");

            migrationBuilder.DropColumn(
                name: "iin_hmac",
                table: "users");

            migrationBuilder.DropColumn(
                name: "is_phone_verified",
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
