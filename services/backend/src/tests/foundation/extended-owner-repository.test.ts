import assert from "node:assert/strict";
import test from "node:test";
import {
  AppwriteOwnerScopedRepository,
  RepositoryPolicyError,
  type AppwriteTablesClient,
  type FoundationTableId,
  type ListRowsRequest,
  type ListRowsResult,
  type RepositoryRow,
} from "../../foundation/index.ts";

class FakeTablesClient implements AppwriteTablesClient {
  public readonly rows = new Map<string, RepositoryRow<Record<string, unknown>>>();
  private readonly rowTables = new Map<string, FoundationTableId>();

  async listRows<T extends Record<string, unknown>>(request: ListRowsRequest): Promise<ListRowsResult<T>> {
    const owner = request.queries.find((query) => query.field === "userId")?.value;
    const rows = [...this.rows.values()].filter((row) => this.rowTables.get(row.$id) === request.tableId && row.userId === owner) as RepositoryRow<T>[];
    return { rows, total: rows.length };
  }

  async getRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string): Promise<RepositoryRow<T> | null> {
    return this.rowTables.get(rowId) === tableId ? (this.rows.get(rowId) ?? null) as RepositoryRow<T> | null : null;
  }

  async createRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string, data: T): Promise<RepositoryRow<T>> {
    const row = { ...data, $id: rowId } as RepositoryRow<T>;
    this.rows.set(rowId, row as RepositoryRow<Record<string, unknown>>);
    this.rowTables.set(rowId, tableId);
    return row;
  }

  async updateRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string, data: Partial<T>): Promise<RepositoryRow<T>> {
    const row = { ...(this.rows.get(rowId) ?? {}), ...data, $id: rowId } as RepositoryRow<T>;
    this.rows.set(rowId, row as RepositoryRow<Record<string, unknown>>);
    this.rowTables.set(rowId, tableId);
    return row;
  }

  async deleteRow(_databaseId: string, tableId: FoundationTableId, rowId: string): Promise<void> {
    this.rows.delete(rowId);
    if (this.rowTables.get(rowId) === tableId) this.rowTables.delete(rowId);
  }
}

test("new personal, dashboard, sync, and notification tables use owner-scoped repository operations", async () => {
  const client = new FakeTablesClient();
  const repository = new AppwriteOwnerScopedRepository(client, "movefuel_mvp");

  await repository.createOwned("personal_food", "user-a", "food-a", { name: "Oats" });
  await repository.createOwned("day_summary", "user-a", "day-a", { localDate: "2026-08-03" });
  await repository.createOwned("notification", "user-b", "notification-b", { title: "Ready" });

  assert.equal((await repository.listOwned("personal_food", "user-a")).rows.length, 1);
  assert.equal((await repository.listOwned("day_summary", "user-a")).rows.length, 1);
  assert.equal((await repository.listOwned("notification", "user-a")).rows.length, 0);
  assert.equal(await repository.getOwned("notification", "user-a", "notification-b"), null);
});

test("server-only delivery and exercise tables cannot be accessed through an owner repository", async () => {
  const repository = new AppwriteOwnerScopedRepository(new FakeTablesClient(), "movefuel_mvp");
  for (const tableId of ["notification_delivery", "exercise_catalog", "exercise_muscle_map"] as const) {
    await assert.rejects(
      repository.listOwned(tableId, "user-a"),
      (error: unknown) => error instanceof RepositoryPolicyError && error.code === "server_only_table",
    );
  }
});
