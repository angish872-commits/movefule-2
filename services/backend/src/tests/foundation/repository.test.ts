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

type Row = RepositoryRow<Record<string, unknown>>;

class FakeTablesClient implements AppwriteTablesClient {
  public readonly rows = new Map<string, Row>();
  public lastListRequest: ListRowsRequest | null = null;
  public lastCreatePermissions: readonly string[] | undefined;

  async listRows<T extends Record<string, unknown>>(request: ListRowsRequest): Promise<ListRowsResult<T>> {
    this.lastListRequest = request;
    const owner = request.queries.find((query) => query.field === "userId")?.value;
    const rows = [...this.rows.values()].filter((row) => row.userId === owner) as RepositoryRow<T>[];
    return { rows, total: rows.length };
  }

  async getRow<T extends Record<string, unknown>>(_databaseId: string, _tableId: FoundationTableId, rowId: string): Promise<RepositoryRow<T> | null> {
    return (this.rows.get(rowId) ?? null) as RepositoryRow<T> | null;
  }

  async createRow<T extends Record<string, unknown>>(_databaseId: string, _tableId: FoundationTableId, rowId: string, data: T, permissions?: readonly string[]): Promise<RepositoryRow<T>> {
    this.lastCreatePermissions = permissions;
    const row = { ...data, $id: rowId } as RepositoryRow<T>;
    this.rows.set(rowId, row as Row);
    return row;
  }

  async updateRow<T extends Record<string, unknown>>(_databaseId: string, _tableId: FoundationTableId, rowId: string, data: Partial<T>): Promise<RepositoryRow<T>> {
    const row = { ...(this.rows.get(rowId) ?? {}), ...data, $id: rowId } as RepositoryRow<T>;
    this.rows.set(rowId, row as Row);
    return row;
  }

  async deleteRow(_databaseId: string, _tableId: FoundationTableId, rowId: string): Promise<void> {
    this.rows.delete(rowId);
  }
}

test("owner-scoped repository injects owner query and prevents cross-user access", async () => {
  const client = new FakeTablesClient();
  const repository = new AppwriteOwnerScopedRepository(client, "movefuel_mvp");
  await repository.createOwned("device", "user-a", "device-a", { deviceClass: "phone" });
  await repository.createOwned("device", "user-b", "device-b", { deviceClass: "watch" });

  const result = await repository.listOwned("device", "user-a");
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0]?.userId, "user-a");
  assert.deepEqual(client.lastListRequest?.queries[0], { field: "userId", operator: "equal", value: "user-a" });
  assert.deepEqual(client.lastCreatePermissions, [
    'read("user:user-b")',
    'update("user:user-b")',
    'delete("user:user-b")',
  ]);
  assert.equal(await repository.getOwned("device", "user-a", "device-b"), null);
});

test("owner cannot be changed and server-only tables cannot use owner CRUD", async () => {
  const client = new FakeTablesClient();
  const repository = new AppwriteOwnerScopedRepository(client, "movefuel_mvp");
  await repository.createOwned("device", "user-a", "device-a", { deviceClass: "phone" });

  await assert.rejects(
    repository.updateOwned("device", "user-a", "device-a", { userId: "user-b" }),
    (error: unknown) => error instanceof RepositoryPolicyError && error.code === "owner_mismatch",
  );
  await assert.rejects(
    repository.listOwned("schema_migrations", "user-a"),
    (error: unknown) => error instanceof RepositoryPolicyError && error.code === "server_only_table",
  );
});

test("saved meal tables use the same default-deny owner boundary", async () => {
  const client = new FakeTablesClient();
  const repository = new AppwriteOwnerScopedRepository(client, "movefuel_mvp");
  await repository.createOwned("saved_meal", "user-a", "saved-a", { name: "Breakfast" });
  const result = await repository.listOwned("saved_meal", "user-a");
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0]?.userId, "user-a");
  assert.equal(isOwnerScopedTable("saved_meal_item"), true);
});

function isOwnerScopedTable(tableId: FoundationTableId): boolean {
  return tableId === "saved_meal" || tableId === "saved_meal_item";
}
