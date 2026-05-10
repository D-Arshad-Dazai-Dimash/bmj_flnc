using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Barnamaj.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddChatAndContracts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "chat_threads",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    profile1id = table.Column<Guid>(type: "uuid", nullable: false),
                    profile2id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    profile1read_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    profile2read_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_chat_threads", x => x.id);
                    table.ForeignKey(
                        name: "fk_chat_threads_profile_profile1id",
                        column: x => x.profile1id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_chat_threads_profile_profile2id",
                        column: x => x.profile2id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_chat_threads_project_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "contracts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    client_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    executor_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    total_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    status = table.Column<byte>(type: "smallint", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_contracts", x => x.id);
                    table.ForeignKey(
                        name: "fk_contracts_profile_client_profile_id",
                        column: x => x.client_profile_id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_contracts_profile_executor_profile_id",
                        column: x => x.executor_profile_id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_contracts_project_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "chat_messages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    thread_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sender_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    body = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                    is_system = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_chat_messages", x => x.id);
                    table.ForeignKey(
                        name: "fk_chat_messages_chat_thread_thread_id",
                        column: x => x.thread_id,
                        principalTable: "chat_threads",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_chat_messages_profile_sender_profile_id",
                        column: x => x.sender_profile_id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_chat_messages_project_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "contract_events",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    contract_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    action = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    details = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_contract_events", x => x.id);
                    table.ForeignKey(
                        name: "fk_contract_events_contracts_contract_id",
                        column: x => x.contract_id,
                        principalTable: "contracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_contract_events_profile_actor_profile_id",
                        column: x => x.actor_profile_id,
                        principalTable: "profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "contract_milestones",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    contract_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_index = table.Column<int>(type: "integer", nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    due_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<byte>(type: "smallint", nullable: false),
                    notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_contract_milestones", x => x.id);
                    table.ForeignKey(
                        name: "fk_contract_milestones_contracts_contract_id",
                        column: x => x.contract_id,
                        principalTable: "contracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_chat_messages_project_id",
                table: "chat_messages",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_chat_messages_sender_profile_id",
                table: "chat_messages",
                column: "sender_profile_id");

            migrationBuilder.CreateIndex(
                name: "ix_chat_messages_thread_created",
                table: "chat_messages",
                columns: new[] { "thread_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_chat_threads_pair_unique",
                table: "chat_threads",
                columns: new[] { "profile1id", "profile2id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_chat_threads_profile2id",
                table: "chat_threads",
                column: "profile2id");

            migrationBuilder.CreateIndex(
                name: "ix_chat_threads_project_id",
                table: "chat_threads",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_chat_threads_updated_at",
                table: "chat_threads",
                column: "updated_at");

            migrationBuilder.CreateIndex(
                name: "ix_contract_events_actor_profile_id",
                table: "contract_events",
                column: "actor_profile_id");

            migrationBuilder.CreateIndex(
                name: "ix_contract_events_contract_created",
                table: "contract_events",
                columns: new[] { "contract_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_contract_milestones_contract_order",
                table: "contract_milestones",
                columns: new[] { "contract_id", "order_index" });

            migrationBuilder.CreateIndex(
                name: "ix_contracts_client",
                table: "contracts",
                column: "client_profile_id");

            migrationBuilder.CreateIndex(
                name: "ix_contracts_executor",
                table: "contracts",
                column: "executor_profile_id");

            migrationBuilder.CreateIndex(
                name: "ix_contracts_project",
                table: "contracts",
                column: "project_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "chat_messages");

            migrationBuilder.DropTable(
                name: "contract_events");

            migrationBuilder.DropTable(
                name: "contract_milestones");

            migrationBuilder.DropTable(
                name: "chat_threads");

            migrationBuilder.DropTable(
                name: "contracts");
        }
    }
}
