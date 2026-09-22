import type {
  AppwriteTablesClient,
  ListRowsRequest,
  ListRowsResult,
  OwnerScopedRepository,
  RepositoryListOptions,
  RepositoryRow,
  ServerOwnedRepository,
} from "../../foundation/repository.ts";
import type { FoundationTableId } from "../../foundation/permissions.ts";

type AnyRow = RepositoryRow<Record<string, unknown>>;

function matches(row: AnyRow, options: RepositoryListOptions | { queries?: ListRowsRequest["queries"] }): boolean {
  return (options.queries ?? []).every((query) => {
    const value = row[query.field];
    switch (query.operator) {
      case "equal":
        return value === query.value;
      case "lessThan":
        return typeof value === "number" && typeof query.value === "number" && value < query.value;
      case "lessThanEqual":
        return typeof value === "number" && typeof query.value === "number" && value <= query.value;
      case "greaterThan":
        return typeof value === "number" && typeof query.value === "number" && value > query.value;
      case "greaterThanEqual":
        return typeof value === "number" && typeof query.value === "number" && value >= query.value;
    }
  });
}

export class MemoryOwnerRepository implements OwnerScopedRepository {
  readonly rows = new Map<string, AnyRow>();
  readCalls = 0;
  writeCalls = 0;

  private key(tableId: FoundationTableId, rowId: string): string {
    return `${tableId}:${rowId}`;
  }

  seed(tableId: FoundationTableId, rowId: string, data: Record<string, unknown>): AnyRow {
    const row = { $id: rowId, ...data } as AnyRow;
    this.rows.set(this.key(tableId, rowId), row);
    return row;
  }

  async listOwned<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    options: RepositoryListOptions = {},
  ): Promise<ListRowsResult<T>> {
    this.readCalls += 1;
    const rows = [...this.rows.entries()]
      .filter(([key, row]) => key.startsWith(`${tableId}:`) && row.userId === userId)
      .map(([, row]) => row)
      .filter((row) => matches(row, options))
      .slice(0, options.limit ?? 100) as RepositoryRow<T>[];
    return { rows, total: rows.length };
  }

  async getOwned<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
  ): Promise<RepositoryRow<T> | null> {
    this.readCalls += 1;
    const row = this.rows.get(this.key(tableId, rowId));
    return row?.userId === userId ? row as RepositoryRow<T> : null;
  }

  async createOwned<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
    data: T,
  ): Promise<RepositoryRow<T>> {
    this.writeCalls += 1;
    const key = this.key(tableId, rowId);
    if (this.rows.has(key)) throw new Error("duplicate_row");
    const row = { $id: rowId, ...data, userId } as RepositoryRow<T>;
    this.rows.set(key, row as AnyRow);
    return row;
  }

  async updateOwned<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
    data: Partial<T>,
  ): Promise<RepositoryRow<T>> {
    this.writeCalls += 1;
    const existing = this.rows.get(this.key(tableId, rowId));
    if (!existing || existing.userId !== userId) throw new Error("missing_row");
    const row = { ...existing, ...data, userId, $id: rowId } as RepositoryRow<T>;
    this.rows.set(this.key(tableId, rowId), row as AnyRow);
    return row;
  }

  async deleteOwned(tableId: FoundationTableId, userId: string, rowId: string): Promise<void> {
    this.writeCalls += 1;
    const existing = this.rows.get(this.key(tableId, rowId));
    if (existing?.userId === userId) this.rows.delete(this.key(tableId, rowId));
  }
}

export class MemoryServerRepository implements ServerOwnedRepository {
  readonly rows = new Map<string, AnyRow>();
  readCalls = 0;
  writeCalls = 0;

  private key(tableId: FoundationTableId, rowId: string): string {
    return `${tableId}:${rowId}`;
  }

  seed(tableId: FoundationTableId, rowId: string, data: Record<string, unknown>): AnyRow {
    const row = { $id: rowId, ...data } as AnyRow;
    this.rows.set(this.key(tableId, rowId), row);
    return row;
  }

  async listForUser<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    options: RepositoryListOptions = {},
  ): Promise<ListRowsResult<T>> {
    this.readCalls += 1;
    const rows = [...this.rows.entries()]
      .filter(([key, row]) => key.startsWith(`${tableId}:`) && row.userId === userId)
      .map(([, row]) => row)
      .filter((row) => matches(row, options))
      .slice(0, options.limit ?? 100) as RepositoryRow<T>[];
    return { rows, total: rows.length };
  }

  async getForUser<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
  ): Promise<RepositoryRow<T> | null> {
    this.readCalls += 1;
    const row = this.rows.get(this.key(tableId, rowId));
    return row?.userId === userId ? row as RepositoryRow<T> : null;
  }

  async createForUser<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
    data: T,
  ): Promise<RepositoryRow<T>> {
    this.writeCalls += 1;
    const key = this.key(tableId, rowId);
    if (this.rows.has(key)) throw new Error("duplicate_row");
    const row = { $id: rowId, ...data, userId } as RepositoryRow<T>;
    this.rows.set(key, row as AnyRow);
    return row;
  }

  async updateForUser<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
    data: Partial<T>,
  ): Promise<RepositoryRow<T>> {
    this.writeCalls += 1;
    const existing = this.rows.get(this.key(tableId, rowId));
    if (!existing || existing.userId !== userId) throw new Error("missing_row");
    const row = { ...existing, ...data, userId, $id: rowId } as RepositoryRow<T>;
    this.rows.set(this.key(tableId, rowId), row as AnyRow);
    return row;
  }
}

export class MemoryTablesClient implements AppwriteTablesClient {
  readonly rows = new Map<string, AnyRow>();
  readCalls = 0;
  writeCalls = 0;

  private key(tableId: FoundationTableId, rowId: string): string {
    return `${tableId}:${rowId}`;
  }

  seed(tableId: FoundationTableId, rowId: string, data: Record<string, unknown>): AnyRow {
    const row = { $id: rowId, ...data } as AnyRow;
    this.rows.set(this.key(tableId, rowId), row);
    return row;
  }

  async listRows<T extends Record<string, unknown>>(request: ListRowsRequest): Promise<ListRowsResult<T>> {
    this.readCalls += 1;
    const rows = [...this.rows.entries()]
      .filter(([key]) => key.startsWith(`${request.tableId}:`))
      .map(([, row]) => row)
      .filter((row) => matches(row, request))
      .slice(0, request.limit ?? 100) as RepositoryRow<T>[];
    return { rows, total: rows.length };
  }

  async getRow<T extends Record<string, unknown>>(
    _databaseId: string,
    tableId: FoundationTableId,
    rowId: string,
  ): Promise<RepositoryRow<T> | null> {
    this.readCalls += 1;
    return (this.rows.get(this.key(tableId, rowId)) as RepositoryRow<T> | undefined) ?? null;
  }

  async createRow<T extends Record<string, unknown>>(
    _databaseId: string,
    tableId: FoundationTableId,
    rowId: string,
    data: T,
    _permissions?: readonly string[],
  ): Promise<RepositoryRow<T>> {
    this.writeCalls += 1;
    const key = this.key(tableId, rowId);
    if (this.rows.has(key)) throw new Error("duplicate_row");
    const row = { $id: rowId, ...data } as RepositoryRow<T>;
    this.rows.set(key, row as AnyRow);
    return row;
  }

  async updateRow<T extends Record<string, unknown>>(
    _databaseId: string,
    tableId: FoundationTableId,
    rowId: string,
    data: Partial<T>,
  ): Promise<RepositoryRow<T>> {
    this.writeCalls += 1;
    const key = this.key(tableId, rowId);
    const existing = this.rows.get(key);
    if (!existing) throw new Error("missing_row");
    const row = { ...existing, ...data, $id: rowId } as RepositoryRow<T>;
    this.rows.set(key, row as AnyRow);
    return row;
  }

  async deleteRow(_databaseId: string, tableId: FoundationTableId, rowId: string): Promise<void> {
    this.writeCalls += 1;
    this.rows.delete(this.key(tableId, rowId));
  }
}
