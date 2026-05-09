using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Barnamaj.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "avg_rating",
                table: "profiles",
                type: "numeric(3,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ratings_count",
                table: "profiles",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "project_reviews",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    author_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    author_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    target_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    direction = table.Column<byte>(type: "smallint", nullable: false),
                    stars = table.Column<byte>(type: "smallint", nullable: false),
                    comment = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    tags_json = table.Column<string>(type: "jsonb", nullable: true),
                    is_hidden = table.Column<bool>(type: "boolean", nullable: false),
                    hidden_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    hidden_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    hidden_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_project_reviews", x => x.id);
                    table.ForeignKey(
                        name: "fk_project_reviews_profiles_author_profile_id",
                        column: x => x.author_profile_id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_project_reviews_profiles_target_profile_id",
                        column: x => x.target_profile_id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_project_reviews_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_project_reviews_user_author_user_id",
                        column: x => x.author_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_project_reviews_author_profile_id",
                table: "project_reviews",
                column: "author_profile_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_reviews_author_user_id",
                table: "project_reviews",
                column: "author_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_project_reviews_target",
                table: "project_reviews",
                columns: new[] { "target_profile_id", "is_hidden", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ux_project_reviews_project_direction",
                table: "project_reviews",
                columns: new[] { "project_id", "direction" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "project_reviews");

            migrationBuilder.DropColumn(
                name: "avg_rating",
                table: "profiles");

            migrationBuilder.DropColumn(
                name: "ratings_count",
                table: "profiles");
        }
    }
}
