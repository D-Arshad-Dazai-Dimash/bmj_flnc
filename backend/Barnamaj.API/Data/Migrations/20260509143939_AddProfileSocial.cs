using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Barnamaj.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileSocial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "cover_preset_id",
                table: "profiles",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "pinned_project_ids_json",
                table: "profiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "profiles",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "cover_preset_id",
                table: "profiles");

            migrationBuilder.DropColumn(
                name: "pinned_project_ids_json",
                table: "profiles");

            migrationBuilder.DropColumn(
                name: "status",
                table: "profiles");
        }
    }
}
