import type { AppwriteTablesClient, ListRowsRequest, ListRowsResult, RepositoryRow } from "./repository.ts";
import type { FoundationTableId } from "./permissions.ts";
import { AppwriteTablesRequestError, type AppwriteTablesTransport } from "./appwrite-tables-client.ts";

/** Backend-only TablesDB client. The API key never crosses this module boundary into phone/Wear code. */
export class AppwriteServerTablesHttpClient implements AppwriteTablesClient {
  private readonly endpoint: string;
  private readonly projectId: string;
  private readonly apiKey: string;
  private readonly fetcher: AppwriteTablesTransport;

  constructor(config: { endpoint: string; projectId: string; apiKey: string; fetcher?: AppwriteTablesTransport }) {
    this.endpoint = config.endpoint.replace(/\/$/, "");
    this.projectId = config.projectId.trim();
    this.apiKey = config.apiKey.trim();
    this.fetcher = config.fetcher ?? ((input, init) => fetch(input, init));
    if (!this.endpoint || !this.projectId || !this.apiKey) throw new Error("appwrite_server_config_incomplete");
  }

  async listRows<T extends Record<string, unknown>>(request: ListRowsRequest): Promise<ListRowsResult<T>> {
    const url = this.rowsUrl(request.databaseId, request.tableId);
    for (const query of request.queries) url.searchParams.append("queries[]", this.queryExpression(query.field, query.operator, query.value));
    if (request.limit !== undefined) url.searchParams.set("limit", String(request.limit));
    if (request.cursor !== undefined) url.searchParams.set("cursor", request.cursor);
    const body = await this.request(url, { method: "GET" });
    return { rows: Array.isArray(body.rows) ? body.rows as RepositoryRow<T>[] : [], total: typeof body.total === "number" ? body.total : 0, ...(typeof body.cursor === "string" ? { cursor: body.cursor } : {}) };
  }
  async getRow<T extends Record<string, unknown>>(databaseId: string, tableId: FoundationTableId, rowId: string): Promise<RepositoryRow<T> | null> {
    try { return await this.request(this.rowUrl(databaseId, tableId, rowId), { method: "GET" }) as RepositoryRow<T>; }
    catch (error) { if (error instanceof AppwriteTablesRequestError && error.status === 404) return null; throw error; }
  }
  async createRow<T extends Record<string, unknown>>(databaseId: string, tableId: FoundationTableId, rowId: string, data: T, permissions?: readonly string[]): Promise<RepositoryRow<T>> {
    return await this.request(this.rowsUrl(databaseId, tableId), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rowId, data, ...(permissions ? { permissions } : {}) }),
    }) as RepositoryRow<T>;
  }
  async updateRow<T extends Record<string, unknown>>(databaseId: string, tableId: FoundationTableId, rowId: string, data: Partial<T>): Promise<RepositoryRow<T>> {
    return await this.request(this.rowUrl(databaseId, tableId, rowId), {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ data }),
    }) as RepositoryRow<T>;
  }
  async deleteRow(databaseId: string, tableId: FoundationTableId, rowId: string): Promise<void> {
    await this.request(this.rowUrl(databaseId, tableId, rowId), { method: "DELETE" });
  }
  private url(path: string): URL { return new URL(`${this.endpoint}${path}`); }
  private rowsUrl(databaseId: string, tableId: string): URL {
    return this.url(`/tablesdb/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(tableId)}/rows`);
  }
  private rowUrl(databaseId: string, tableId: string, rowId: string): URL {
    return this.url(`/tablesdb/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(tableId)}/rows/${encodeURIComponent(rowId)}`);
  }
  private async request(url: URL, init: RequestInit): Promise<Record<string, unknown>> {
    const response = await this.fetcher(url.toString(), { ...init, headers: { "X-Appwrite-Project": this.projectId, "X-Appwrite-Key": this.apiKey, ...(init.headers ?? {}) } });
    if (!response.ok) throw new AppwriteTablesRequestError(response.status);
    if (response.status === 204) return {};
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppwriteTablesRequestError(response.status, "Appwrite returned an invalid response.");
    return body as Record<string, unknown>;
  }
  private queryExpression(field: string, operator: ListRowsRequest["queries"][number]["operator"], value: string | number | boolean): string {
    const op = { equal: "equal", lessThan: "lessThan", lessThanEqual: "lessThanEqual", greaterThan: "greaterThan", greaterThanEqual: "greaterThanEqual" }[operator];
    return JSON.stringify({ method: op, attribute: field, values: [value] });
  }
}
