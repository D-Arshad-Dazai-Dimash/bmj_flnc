using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Barnamaj.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddKycSubmission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_user_documents_user_active",
                table: "user_documents");

            migrationBuilder.AddColumn<Guid>(
                name: "submission_id",
                table: "user_documents",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "kyc_submissions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<byte>(type: "smallint", nullable: false),
                    status = table.Column<byte>(type: "smallint", nullable: false),
                    legal_form = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    bin = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: true),
                    legal_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    legal_address = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    contact_phone = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    responsible_role = table.Column<byte>(type: "smallint", nullable: true),
                    responsible_name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    registry_snapshot_json = table.Column<string>(type: "jsonb", nullable: true),
                    ai_decision = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    ai_confidence = table.Column<double>(type: "double precision", nullable: true),
                    ai_reasoning = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    reviewed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    rejection_reason = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_kyc_submissions", x => x.id);
                    table.ForeignKey(
                        name: "fk_kyc_submissions_user_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_user_documents_submission",
                table: "user_documents",
                column: "submission_id");

            migrationBuilder.CreateIndex(
                name: "ux_user_documents_user_type_active",
                table: "user_documents",
                columns: new[] { "user_id", "document_type" },
                unique: true,
                filter: "status <> 3");

            migrationBuilder.CreateIndex(
                name: "ix_kyc_submissions_status_created",
                table: "kyc_submissions",
                columns: new[] { "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ux_kyc_submissions_user_active",
                table: "kyc_submissions",
                column: "user_id",
                unique: true,
                filter: "status < 4");

            migrationBuilder.AddForeignKey(
                name: "fk_user_documents_kyc_submissions_submission_id",
                table: "user_documents",
                column: "submission_id",
                principalTable: "kyc_submissions",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_user_documents_kyc_submissions_submission_id",
                table: "user_documents");

            migrationBuilder.DropTable(
                name: "kyc_submissions");

            migrationBuilder.DropIndex(
                name: "ix_user_documents_submission",
                table: "user_documents");

            migrationBuilder.DropIndex(
                name: "ux_user_documents_user_type_active",
                table: "user_documents");

            migrationBuilder.DropColumn(
                name: "submission_id",
                table: "user_documents");

            migrationBuilder.CreateIndex(
                name: "ux_user_documents_user_active",
                table: "user_documents",
                column: "user_id",
                unique: true,
                filter: "status <> 3");
        }
    }
}
