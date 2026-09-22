import {
  FOUNDATION_PERMISSION_DECLARATIONS,
  canPrincipal,
  type FoundationTableId,
  isOwnerScoped,
} from "./permissions.ts";

export type RepositoryRow<T extends Record<string, unknown> = Record<string, unknown>> = T & {
  $id: string;
  userId?: string;
};

export type RowQuery = {
  field: string;
  operator: "equal" | "lessThan" | "lessThanEqual" | "greaterThan" | "greaterThanEqual";
  value: string | number | boolean;
};

export type ListRowsRequest = {
  databaseId: string;
  tableId: FoundationTableId;
  queries: readonly RowQuery[];
  limit?: number;
  cursor?: string;
};

export type ListRowsResult<T extends Record<string, unknown> = Record<string, unknown>> = {
  rows: readonly RepositoryRow<T>[];
  total: number;
  cursor?: string;
};

/** Structural adapter for Appwrite TablesDB rows; no SDK is required here. */
export interface AppwriteTablesClient {
  listRows<T extends Record<string, unknown>>(request: ListRowsRequest): Promise<ListRowsResult<T>>;
  getRow<T extends Record<string, unknown>>(databaseId: string, tableId: FoundationTableId, rowId: string): Promise<RepositoryRow<T> | null>;
  createRow<T extends Record<string, unknown>>(
    databaseId: string,
    tableId: FoundationTableId,
    rowId: string,
    data: T,
    permissions?: readonly string[],
  ): Promise<RepositoryRow<T>>;
  updateRow<T extends Record<string, unknown>>(
    databaseId: string,
    tableId: FoundationTableId,
    rowId: string,
    data: Partial<T>,
  ): Promise<RepositoryRow<T>>;
  deleteRow(databaseId: string, tableId: FoundationTableId, rowId: string): Promise<void>;
}

export type RepositoryListOptions = {
  queries?: readonly RowQuery[];
  limit?: number;
  cursor?: string;
};

export interface OwnerScopedRepository {
  listOwned<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    options?: RepositoryListOptions,
  ): Promise<ListRowsResult<T>>;
  getOwned<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
  ): Promise<RepositoryRow<T> | null>;
  createOwned<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
    data: T,
  ): Promise<RepositoryRow<T>>;
  updateOwned<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
    data: Partial<T>,
  ): Promise<RepositoryRow<T>>;
  deleteOwned(tableId: FoundationTableId, userId: string, rowId: string): Promise<void>;
}

/**
 * Server-only tables still carry userId for isolation/audit, but clients must
 * never receive direct Appwrite CRUD permissions for them. This wrapper keeps
 * that owner boundary explicit inside movefuel_api while using server authority.
 */
export interface ServerOwnedRepository {
  listForUser<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    options?: RepositoryListOptions,
  ): Promise<ListRowsResult<T>>;
  getForUser<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
  ): Promise<RepositoryRow<T> | null>;
  createForUser<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
    data: T,
  ): Promise<RepositoryRow<T>>;
  updateForUser<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
    data: Partial<T>,
  ): Promise<RepositoryRow<T>>;
}

export class RepositoryPolicyError extends Error {
  public readonly code:
    | "owner_scope_required"
    | "server_only_table"
    | "server_scope_required"
    | "server_action_forbidden"
    | "owner_mismatch"
    | "invalid_owner";

  constructor(
    code:
      | "owner_scope_required"
      | "server_only_table"
      | "server_scope_required"
      | "server_action_forbidden"
      | "owner_mismatch"
      | "invalid_owner",
    message: string,
  ) {
    super(message);
    this.name = "RepositoryPolicyError";
    this.code = code;
  }
}

function requireUserId(userId: string): void {
  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new RepositoryPolicyError("invalid_owner", "A non-empty owner id is required.");
  }
}

function assertOwnerTable(tableId: FoundationTableId): void {
  if (!isOwnerScoped(tableId)) {
    throw new RepositoryPolicyError("server_only_table", `${tableId} is server-only.`);
  }
}

function assertServerTable(tableId: FoundationTableId, action: "read" | "create" | "update"): void {
  if (isOwnerScoped(tableId)) {
    throw new RepositoryPolicyError("server_scope_required", `${tableId} uses owner-scoped CRUD.`);
  }
  if (!canPrincipal(tableId, "server", action)) {
    throw new RepositoryPolicyError("server_action_forbidden", `${action} is not allowed for ${tableId}.`);
  }
}

function assertOwner<T extends Record<string, unknown>>(row: RepositoryRow<T>, userId: string): void {
  if (row.userId !== userId) {
    throw new RepositoryPolicyError("owner_mismatch", "The row is not owned by the authenticated user.");
  }
}

export class AppwriteOwnerScopedRepository implements OwnerScopedRepository {
  private readonly client: AppwriteTablesClient;
  private readonly databaseId: string;

  public constructor(client: AppwriteTablesClient, databaseId: string) {
    this.client = client;
    this.databaseId = databaseId;
  }

  async listOwned<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    options: RepositoryListOptions = {},
  ): Promise<ListRowsResult<T>> {
    requireUserId(userId);
    assertOwnerTable(tableId);
    const ownerQuery: RowQuery = { field: "userId", operator: "equal", value: userId };
    const result = await this.client.listRows<T>({
      databaseId: this.databaseId,
      tableId,
      queries: [ownerQuery, ...(options.queries ?? [])],
      ...(options.limit === undefined ? {} : { limit: options.limit }),
      ...(options.cursor === undefined ? {} : { cursor: options.cursor }),
    });
    return {
      ...result,
      rows: result.rows.filter((row) => row.userId === userId),
    };
  }

  async getOwned<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
  ): Promise<RepositoryRow<T> | null> {
    requireUserId(userId);
    assertOwnerTable(tableId);
    const row = await this.client.getRow<T>(this.databaseId, tableId, rowId);
    if (!row) return null;
    return row.userId === userId ? row : null;
  }

  async createOwned<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
    data: T,
  ): Promise<RepositoryRow<T>> {
    requireUserId(userId);
    assertOwnerTable(tableId);
    if ("userId" in data && data.userId !== userId) {
      throw new RepositoryPolicyError("owner_mismatch", "A row cannot be created for another owner.");
    }
    const permissions = [
      `read("user:${userId}")`,
      `update("user:${userId}")`,
      `delete("user:${userId}")`,
    ];
    const row = await this.client.createRow<T>(this.databaseId, tableId, rowId, { ...data, userId } as T, permissions);
    assertOwner(row, userId);
    return row;
  }

  async updateOwned<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
    data: Partial<T>,
  ): Promise<RepositoryRow<T>> {
    requireUserId(userId);
    assertOwnerTable(tableId);
    if ("userId" in data && data.userId !== userId) {
      throw new RepositoryPolicyError("owner_mismatch", "A row owner cannot be changed.");
    }
    const existing = await this.client.getRow<T>(this.databaseId, tableId, rowId);
    if (!existing || existing.userId !== userId) {
      throw new RepositoryPolicyError("owner_mismatch", "The row is not owned by the authenticated user.");
    }
    const row = await this.client.updateRow<T>(this.databaseId, tableId, rowId, { ...data, userId } as Partial<T>);
    assertOwner(row, userId);
    return row;
  }

  async deleteOwned(tableId: FoundationTableId, userId: string, rowId: string): Promise<void> {
    requireUserId(userId);
    assertOwnerTable(tableId);
    const existing = await this.client.getRow(this.databaseId, tableId, rowId);
    if (!existing || existing.userId !== userId) {
      throw new RepositoryPolicyError("owner_mismatch", "The row is not owned by the authenticated user.");
    }
    await this.client.deleteRow(this.databaseId, tableId, rowId);
  }
}

export class AppwriteServerOwnedRepository implements ServerOwnedRepository {
  private readonly client: AppwriteTablesClient;
  private readonly databaseId: string;

  public constructor(client: AppwriteTablesClient, databaseId: string) {
    this.client = client;
    this.databaseId = databaseId;
  }

  async listForUser<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    options: RepositoryListOptions = {},
  ): Promise<ListRowsResult<T>> {
    requireUserId(userId);
    assertServerTable(tableId, "read");
    const ownerQuery: RowQuery = { field: "userId", operator: "equal", value: userId };
    const result = await this.client.listRows<T>({
      databaseId: this.databaseId,
      tableId,
      queries: [ownerQuery, ...(options.queries ?? [])],
      ...(options.limit === undefined ? {} : { limit: options.limit }),
      ...(options.cursor === undefined ? {} : { cursor: options.cursor }),
    });
    return { ...result, rows: result.rows.filter((row) => row.userId === userId) };
  }

  async getForUser<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
  ): Promise<RepositoryRow<T> | null> {
    requireUserId(userId);
    assertServerTable(tableId, "read");
    const row = await this.client.getRow<T>(this.databaseId, tableId, rowId);
    if (!row) return null;
    return row.userId === userId ? row : null;
  }

  async createForUser<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
    data: T,
  ): Promise<RepositoryRow<T>> {
    requireUserId(userId);
    assertServerTable(tableId, "create");
    if ("userId" in data && data.userId !== userId) {
      throw new RepositoryPolicyError("owner_mismatch", "A server-owned row cannot be created for another user.");
    }
    const row = await this.client.createRow<T>(
      this.databaseId,
      tableId,
      rowId,
      { ...data, userId } as T,
      [],
    );
    assertOwner(row, userId);
    return row;
  }

  async updateForUser<T extends Record<string, unknown>>(
    tableId: FoundationTableId,
    userId: string,
    rowId: string,
    data: Partial<T>,
  ): Promise<RepositoryRow<T>> {
    requireUserId(userId);
    assertServerTable(tableId, "update");
    if ("userId" in data && data.userId !== userId) {
      throw new RepositoryPolicyError("owner_mismatch", "A server-owned row cannot change user association.");
    }
    const existing = await this.client.getRow<T>(this.databaseId, tableId, rowId);
    if (!existing || existing.userId !== userId) {
      throw new RepositoryPolicyError("owner_mismatch", "The server-owned row is not associated with the authenticated user.");
    }
    const row = await this.client.updateRow<T>(this.databaseId, tableId, rowId, { ...data, userId } as Partial<T>);
    assertOwner(row, userId);
    return row;
  }
}

export function assertFoundationPermissionDeclarations(): void {
  for (const declaration of Object.values(FOUNDATION_PERMISSION_DECLARATIONS)) {
    if (!declaration.defaultDeny || !declaration.rowSecurity) {
      throw new Error(`unsafe_permission_declaration:${declaration.tableId}`);
    }
  }
}
