import type {
  AppwriteTablesClient,
  ListRowsRequest,
  ListRowsResult,
  RepositoryRow,
} from "./repository.ts";

export type AppwriteTablesTransport = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type AppwriteTablesHttpConfig = {
  endpoint: string;
  projectId: string;
  sessionToken: () => string | undefined;
  fetcher?: AppwriteTablesTransport;
};

export class AppwriteTablesRequestError extends Error {
  public readonly status: number;

  constructor(status: number, message = "The Appwrite TablesDB request failed.") {
    super(message);
    this.name = "AppwriteTablesRequestError";
    this.status = status;
  }
}

/**
 * Session-scoped TablesDB adapter. It deliberately accepts only a short-lived
 * caller token provider and never accepts an Appwrite API key. That keeps the
 * runtime boundary usable by authenticated sessions without making a server
 * key available to Android, Wear, logs, or test fixtures.
 */
export class AppwriteTablesHttpClient implements AppwriteTablesClient {
  private readonly endpoint: string;
  private readonly projectId: string;
  private readonly sessionToken: () => string | undefined;
  private readonly fetcher: AppwriteTablesTransport;

  public constructor(config: AppwriteTablesHttpConfig) {
    this.endpoint = config.endpoint.replace(/\/$/, "");
    this.projectId = config.projectId;
    this.sessionToken = config.sessionToken;
    this.fetcher = config.fetcher ?? ((input, init) => fetch(input, init));
    if (!this.endpoint || !this.projectId) throw new Error("appwrite_config_incomplete");
  }

  async listRows<T extends Record<string, unknown>>(request: ListRowsRequest): Promise<ListRowsResult<T>> {
    const url = this.rowsUrl(request.databaseId, request.tableId);
    for (const query of request.queries) {
      url.searchParams.append("queries[]", this.queryExpression(query.field, query.operator, query.value));
    }
    if (request.limit !== undefined) url.searchParams.set("limit", String(request.limit));
    if (request.cursor !== undefined) url.searchParams.set("cursor", request.cursor);
    const body = await this.request(url, { method: "GET" });
    return {
      rows: Array.isArray(body.rows) ? body.rows as RepositoryRow<T>[] : [],
      total: typeof body.total === "number" ? body.total : 0,
      ...(typeof body.cursor === "string" ? { cursor: body.cursor } : {}),
    };
  }

  async getRow<T extends Record<string, unknown>>(
    databaseId: string,
    tableId: ListRowsRequest["tableId"],
    rowId: string,
  ): Promise<RepositoryRow<T> | null> {
    const url = this.rowUrl(databaseId, tableId, rowId);
    try {
      return await this.request(url, { method: "GET" }) as RepositoryRow<T>;
    } catch (error) {
      if (error instanceof AppwriteTablesRequestError && error.status === 404) return null;
      throw error;
    }
  }

  async createRow<T extends Record<string, unknown>>(
    databaseId: string,
    tableId: ListRowsRequest["tableId"],
    rowId: string,
    data: T,
    permissions?: readonly string[],
  ): Promise<RepositoryRow<T>> {
    const url = this.rowsUrl(databaseId, tableId);
    return await this.request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rowId, data, ...(permissions ? { permissions } : {}) }),
    }) as RepositoryRow<T>;
  }

  async updateRow<T extends Record<string, unknown>>(
    databaseId: string,
    tableId: ListRowsRequest["tableId"],
    rowId: string,
    data: Partial<T>,
  ): Promise<RepositoryRow<T>> {
    const url = this.rowUrl(databaseId, tableId, rowId);
    return await this.request(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data }),
    }) as RepositoryRow<T>;
  }

  async deleteRow(databaseId: string, tableId: ListRowsRequest["tableId"], rowId: string): Promise<void> {
    const url = this.rowUrl(databaseId, tableId, rowId);
    await this.request(url, { method: "DELETE" });
  }

  private url(path: string): URL {
    return new URL(`${this.endpoint}${path}`);
  }

  /** Appwrite TablesDB is a distinct REST service; do not use the legacy Databases path here. */
  private rowsUrl(databaseId: string, tableId: string): URL {
    return this.url(`/tablesdb/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(tableId)}/rows`);
  }

  private rowUrl(databaseId: string, tableId: string, rowId: string): URL {
    return this.url(`/tablesdb/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(tableId)}/rows/${encodeURIComponent(rowId)}`);
  }

  private async request(url: URL, init: RequestInit): Promise<Record<string, unknown>> {
    const token = this.sessionToken();
    if (!token?.trim()) throw new AppwriteTablesRequestError(401, "An authenticated Appwrite session token is required.");
    const response = await this.fetcher(url.toString(), {
      ...init,
      headers: {
        "X-Appwrite-Project": this.projectId,
        "X-Appwrite-JWT": token,
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) throw new AppwriteTablesRequestError(response.status);
    if (response.status === 204) return {};
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new AppwriteTablesRequestError(response.status, "Appwrite returned an invalid response.");
    }
    return body as Record<string, unknown>;
  }

  private queryExpression(field: string, operator: ListRowsRequest["queries"][number]["operator"], value: string | number | boolean): string {
    const safeField = JSON.stringify(field);
    const safeValue = JSON.stringify([value]);
    const operatorName = {
      equal: "equal",
      lessThan: "lessThan",
      lessThanEqual: "lessThanEqual",
      greaterThan: "greaterThan",
      greaterThanEqual: "greaterThanEqual",
    }[operator];
    return JSON.stringify({ method: operatorName, attribute: field, values: [value] });
  }
}
