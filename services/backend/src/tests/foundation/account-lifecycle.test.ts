import assert from "node:assert/strict";
import test from "node:test";
import {
  AccountLifecycleError,
  AccountLifecycleService,
  AppwriteOwnerScopedRepository,
  type AppwriteTablesClient,
  type FoundationTableId,
  type ListRowsRequest,
  type ListRowsResult,
  type RepositoryRow,
} from "../../foundation/index.ts";

class AccountTablesClient implements AppwriteTablesClient {
  readonly rows = new Map<string, RepositoryRow>();
  readonly deleted: FoundationTableId[] = [];

  private key(tableId: FoundationTableId, rowId: string): string {
    return `${tableId}:${rowId}`;
  }

  async listRows<T extends Record<string, unknown>>(request: ListRowsRequest): Promise<ListRowsResult<T>> {
    const owner = request.queries.find((query) => query.field === "userId")?.value;
    const prefix = `${request.tableId}:`;
    const rows = [...this.rows.entries()]
      .filter(([key, row]) => key.startsWith(prefix) && row.userId === owner)
      .map(([, row]) => row) as RepositoryRow<T>[];
    return { rows, total: rows.length };
  }

  async getRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string): Promise<RepositoryRow<T> | null> {
    return (this.rows.get(this.key(tableId, rowId)) ?? null) as RepositoryRow<T> | null;
  }

  async createRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string, data: T): Promise<RepositoryRow<T>> {
    const row = { $id: rowId, ...data } as RepositoryRow<T>;
    this.rows.set(this.key(tableId, rowId), row as RepositoryRow);
    return row;
  }

  async updateRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string, data: Partial<T>): Promise<RepositoryRow<T>> {
    const row = { ...(this.rows.get(this.key(tableId, rowId)) ?? {}), ...data, $id: rowId } as RepositoryRow<T>;
    this.rows.set(this.key(tableId, rowId), row as RepositoryRow);
    return row;
  }

  async deleteRow(_databaseId: string, tableId: FoundationTableId, rowId: string): Promise<void> {
    this.deleted.push(tableId);
    this.rows.delete(this.key(tableId, rowId));
  }
}

test("account export and deletion traverse only authenticated owner-scoped rows", async () => {
  const client = new AccountTablesClient();
  client.rows.set("user_profile:user-a", { $id: "user-a", userId: "user-a", displayName: "Ari" });
  client.rows.set("meal:user-a-meal", { $id: "user-a-meal", userId: "user-a", title: "Breakfast" });
  client.rows.set("user_profile:user-b", { $id: "user-b", userId: "user-b", displayName: "Other" });
  const service = new AccountLifecycleService();
  const repository = new AppwriteOwnerScopedRepository(client, "movefuel_mvp");

  const exported = await service.export("user-a", repository);
  assert.equal(exported.source, "appwrite");
  assert.equal(exported.tables.user_profile?.[0]?.userId, "user-a");
  assert.equal(exported.tables.meal?.[0]?.userId, "user-a");
  assert.equal("schema_migrations" in exported.tables, false);
  assert.equal("audit_event" in exported.tables, false);

  await assert.rejects(
    service.delete("user-a", false, repository),
    (error: unknown) => error instanceof AccountLifecycleError && error.code === "delete_confirmation_required",
  );
  const deleted = await service.delete("user-a", true, repository);
  assert.equal(deleted.source, "appwrite");
  assert.equal(deleted.deletedRows, 2);
  assert.equal(client.rows.has("user_profile:user-a"), false);
  assert.equal(client.rows.has("meal:user-a-meal"), false);
  assert.equal(client.rows.has("user_profile:user-b"), true);
  assert.equal(client.deleted.includes("schema_migrations"), false);
});

test("local account lifecycle keeps export and delete explicitly fixture-scoped", async () => {
  const service = new AccountLifecycleService();
  const exported = await service.export("local-user");
  assert.equal(exported.source, "local_fixture");
  assert.deepEqual(exported.tables, {});
  const deleted = await service.delete("local-user", true);
  assert.deepEqual(deleted, { userId: "local-user", source: "local_fixture", deletedRows: 0, tables: [] });
});

test("admin account deletion removes private media, dependent rows, owner rows, then identity", async () => {
  const operations: string[] = [];
  const tables = new Map<string, RepositoryRow[]>([
    ["meal_media", [{ $id: "media-row", userId: "user-a", bucketId: "private", objectId: "file-1" }]],
    ["report", [{ $id: "report-row", userId: "user-a", reportId: "report-1" }]],
    ["report_section", [{ $id: "section-row", reportId: "report-1" }]],
    ["provider_call", [{ $id: "provider-row", userId: "user-a" }]],
    ["user_profile", [{ $id: "profile-row", userId: "user-a" }]],
  ]);
  const admin = {
    async listRows(tableId: string, field: string, value: string) {
      return (tables.get(tableId) ?? []).filter((row) => row[field] === value);
    },
    async deleteRow(tableId: string, rowId: string) {
      operations.push(`row:${tableId}:${rowId}`);
      tables.set(tableId, (tables.get(tableId) ?? []).filter((row) => row.$id !== rowId));
    },
    async deleteStorageFile(bucketId: string, fileId: string) { operations.push(`file:${bucketId}:${fileId}`); },
    async deleteUser(userId: string) { operations.push(`user:${userId}`); },
  };
  const result = await new AccountLifecycleService({ deletionAdmin: admin }).delete("user-a", true);
  assert.equal(result.identityDeleted, true);
  assert.equal(result.deletedFiles, 1);
  assert.ok(operations.indexOf("file:private:file-1") < operations.indexOf("row:meal_media:media-row"));
  assert.ok(operations.includes("row:report_section:section-row"));
  assert.equal(operations.at(-1), "user:user-a");
});
