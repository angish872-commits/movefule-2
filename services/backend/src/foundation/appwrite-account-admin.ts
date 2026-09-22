import type { RepositoryRow } from "./repository.ts";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface AccountDeletionAdmin {
  listRows(tableId: string, field: string, value: string): Promise<readonly RepositoryRow[]>;
  deleteRow(tableId: string, rowId: string): Promise<void>;
  deleteStorageFile(bucketId: string, fileId: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
}

/** Server-key-only cleanup gateway used exclusively by account deletion. */
export class AppwriteAccountDeletionAdmin implements AccountDeletionAdmin {
  private readonly endpoint: string;
  private readonly projectId: string;
  private readonly apiKey: string;
  private readonly databaseId: string;
  private readonly fetcher: FetchLike;

  constructor(options: { endpoint: string; projectId: string; apiKey: string; databaseId: string; fetcher?: FetchLike }) {
    this.endpoint = options.endpoint.replace(/\/+$/, "");
    this.projectId = options.projectId.trim();
    this.apiKey = options.apiKey.trim();
    this.databaseId = options.databaseId.trim();
    this.fetcher = options.fetcher ?? fetch;
    if (!this.endpoint || !this.projectId || !this.apiKey || !this.databaseId) throw new Error("account_deletion_admin_not_configured");
  }

  async listRows(tableId: string, field: string, value: string): Promise<readonly RepositoryRow[]> {
    const url = new URL(`${this.endpoint}/tablesdb/${encodeURIComponent(this.databaseId)}/tables/${encodeURIComponent(tableId)}/rows`);
    // TablesDB expects the structured query object used by the other current
    // Appwrite adapters. The legacy `equal(...)` string is rejected by the
    // current endpoint and made authenticated account deletion fail closed
    // with an opaque 500 before it could inspect any owner rows.
    url.searchParams.append("queries[]", JSON.stringify({ method: "equal", attribute: field, values: [value] }));
    url.searchParams.set("limit", "500");
    const response = await this.fetcher(url, { method: "GET", headers: this.headers() });
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`account_delete_list_${response.status}`);
    const body = await response.json() as Record<string, unknown>;
    return Array.isArray(body.rows) ? body.rows as RepositoryRow[] : [];
  }

  async deleteRow(tableId: string, rowId: string): Promise<void> {
    const response = await this.fetcher(
      `${this.endpoint}/tablesdb/${encodeURIComponent(this.databaseId)}/tables/${encodeURIComponent(tableId)}/rows/${encodeURIComponent(rowId)}`,
      { method: "DELETE", headers: this.headers() },
    );
    if (!response.ok && response.status !== 404) throw new Error(`account_delete_row_${response.status}`);
  }

  async deleteStorageFile(bucketId: string, fileId: string): Promise<void> {
    const response = await this.fetcher(
      `${this.endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}`,
      { method: "DELETE", headers: this.headers() },
    );
    if (!response.ok && response.status !== 404) throw new Error(`account_delete_file_${response.status}`);
  }

  async deleteUser(userId: string): Promise<void> {
    const response = await this.fetcher(
      `${this.endpoint}/users/${encodeURIComponent(userId)}`,
      { method: "DELETE", headers: this.headers() },
    );
    if (!response.ok && response.status !== 404) throw new Error(`account_delete_identity_${response.status}`);
  }

  private headers(): Record<string, string> {
    return {
      "X-Appwrite-Project": this.projectId,
      "X-Appwrite-Key": this.apiKey,
      "X-Appwrite-Response-Format": "1.9.5",
    };
  }
}
