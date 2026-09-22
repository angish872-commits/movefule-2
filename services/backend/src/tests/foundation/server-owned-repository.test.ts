import assert from "node:assert/strict";
import test from "node:test";
import {
  AppwriteOwnerScopedRepository,
  AppwriteServerOwnedRepository,
  RepositoryPolicyError,
  type AppwriteTablesClient,
  type FoundationTableId,
  type ListRowsRequest,
  type ListRowsResult,
  type RepositoryRow,
} from "../../foundation/index.ts";

type Row = RepositoryRow<Record<string, unknown>>;

class FakeTablesClient implements AppwriteTablesClient {
  readonly rows = new Map<string, Row>();
  lastPermissions: readonly string[] | undefined;

  async listRows<T extends Record<string, unknown>>(request: ListRowsRequest): Promise<ListRowsResult<T>> {
    const values = [...this.rows.values()].filter((row) => request.queries.every((query) => {
      if (query.operator !== "equal") return true;
      return row[query.field] === query.value;
    })) as RepositoryRow<T>[];
    return { rows: values, total: values.length };
  }
  async getRow<T extends Record<string, unknown>>(_db: string, _table: FoundationTableId, rowId: string): Promise<RepositoryRow<T> | null> {
    return (this.rows.get(rowId) ?? null) as RepositoryRow<T> | null;
  }
  async createRow<T extends Record<string, unknown>>(_db: string, _table: FoundationTableId, rowId: string, data: T, permissions?: readonly string[]): Promise<RepositoryRow<T>> {
    if (this.rows.has(rowId)) throw new Error("duplicate_row");
    this.lastPermissions = permissions;
    const row = { ...data, $id: rowId } as RepositoryRow<T>;
    this.rows.set(rowId, row as Row);
    return row;
  }
  async updateRow<T extends Record<string, unknown>>(_db: string, _table: FoundationTableId, rowId: string, data: Partial<T>): Promise<RepositoryRow<T>> {
    const prior = this.rows.get(rowId);
    if (!prior) throw new Error("missing_row");
    const row = { ...prior, ...data, $id: rowId } as RepositoryRow<T>;
    this.rows.set(rowId, row as Row);
    return row;
  }
  async deleteRow(_db: string, _table: FoundationTableId, rowId: string): Promise<void> {
    this.rows.delete(rowId);
  }
}

test("canonical sync/calendar tables reject direct owner CRUD and use server-only rows", async () => {
  const client = new FakeTablesClient();
  const ownerRepository = new AppwriteOwnerScopedRepository(client, "movefuel_mvp");
  const serverRepository = new AppwriteServerOwnedRepository(client, "movefuel_mvp");

  await assert.rejects(
    ownerRepository.createOwned("calendar_revision", "user-a", "rev-1", { revision: 1 }),
    (error: unknown) => error instanceof RepositoryPolicyError && error.code === "server_only_table",
  );

  const row = await serverRepository.createForUser("calendar_revision", "user-a", "rev-1", { revision: 1 });
  assert.equal(row.userId, "user-a");
  assert.deepEqual(client.lastPermissions, []);
  assert.equal(await serverRepository.getForUser("calendar_revision", "user-b", "rev-1"), null);
});

test("server-owned repository preserves immutable-table policy", async () => {
  const client = new FakeTablesClient();
  const repository = new AppwriteServerOwnedRepository(client, "movefuel_mvp");
  await repository.createForUser("calendar_entry", "user-a", "entry-1", { entryId: "entry-1" });

  await assert.rejects(
    repository.updateForUser("calendar_entry", "user-a", "entry-1", { entryId: "changed" }),
    (error: unknown) => error instanceof RepositoryPolicyError && error.code === "server_action_forbidden",
  );
  await assert.rejects(
    repository.createForUser("device", "user-a", "device-a", { deviceId: "device-a" }),
    (error: unknown) => error instanceof RepositoryPolicyError && error.code === "server_scope_required",
  );
});

test("server-owned create cannot associate another user", async () => {
  const repository = new AppwriteServerOwnedRepository(new FakeTablesClient(), "movefuel_mvp");
  await assert.rejects(
    repository.createForUser("sync_operation", "user-a", "operation-1", { userId: "user-b", operationId: "operation-1" }),
    (error: unknown) => error instanceof RepositoryPolicyError && error.code === "owner_mismatch",
  );
});
