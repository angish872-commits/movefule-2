import assert from "node:assert/strict";
import test from "node:test";
import {
  AppwriteBootstrapService,
  AppwriteOwnerScopedRepository,
  type AppwriteTablesClient,
  type FoundationTableId,
  type ListRowsRequest,
  type ListRowsResult,
  type RepositoryRow,
} from "../../foundation/index.ts";

class BootstrapTablesClient implements AppwriteTablesClient {
  private readonly rows = new Map<string, RepositoryRow>();

  private key(tableId: FoundationTableId, rowId: string): string {
    return `${tableId}:${rowId}`;
  }

  async listRows<T extends Record<string, unknown>>(request: ListRowsRequest): Promise<ListRowsResult<T>> {
    const owner = request.queries.find((query) => query.field === "userId")?.value;
    const rows = [...this.rows.values()].filter((row) => row.userId === owner) as RepositoryRow<T>[];
    return { rows, total: rows.length };
  }

  async getRow<T extends Record<string, unknown>>(_databaseId: string, _tableId: FoundationTableId, rowId: string): Promise<RepositoryRow<T> | null> {
    return (this.rows.get(this.key(_tableId, rowId)) ?? null) as RepositoryRow<T> | null;
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
    this.rows.delete(this.key(tableId, rowId));
  }
}

test("Appwrite bootstrap creates the owner profile, device, onboarding, and privacy records once", async () => {
  const client = new BootstrapTablesClient();
  const service = new AppwriteBootstrapService(new AppwriteOwnerScopedRepository(client, "movefuel_mvp"));

  const first = await service.ensure("user-a", "phone-a");
  assert.deepEqual(first.created, { profile: true, onboarding: true, privacy: true, device: true });
  assert.equal(first.profile.userId, "user-a");
  assert.equal(first.device.userId, "user-a");
  assert.notEqual(first.device.installationIdHash, "phone-a");

  const second = await service.ensure("user-a", "phone-a");
  assert.deepEqual(second.created, { profile: false, onboarding: false, privacy: false, device: false });
});
