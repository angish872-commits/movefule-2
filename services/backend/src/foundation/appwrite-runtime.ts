import { AppwriteOwnerScopedRepository } from "./repository.ts";
import { AppwriteTablesHttpClient, type AppwriteTablesTransport } from "./appwrite-tables-client.ts";

export type AppwriteRuntimeOptions = {
  endpoint: string;
  projectId: string;
  databaseId: string;
  fetcher?: AppwriteTablesTransport;
};

/**
 * Creates session-scoped Appwrite repositories from one reviewed configuration.
 * The backend remains the only place that knows how Appwrite session persistence
 * is composed; feature modules receive repositories rather than rebuilding HTTP
 * clients independently.
 */
export class AppwriteRuntime {
  readonly endpoint: string;
  readonly projectId: string;
  readonly databaseId: string;
  private readonly fetcher?: AppwriteTablesTransport;

  constructor(options: AppwriteRuntimeOptions) {
    this.endpoint = options.endpoint.trim().replace(/\/$/, "");
    this.projectId = options.projectId.trim();
    this.databaseId = options.databaseId.trim();
    this.fetcher = options.fetcher;
  }

  get sessionPersistenceConfigured(): boolean {
    return Boolean(this.endpoint && this.projectId && this.databaseId);
  }

  repositoryFor(accessToken: string | undefined): AppwriteOwnerScopedRepository | undefined {
    const token = accessToken?.trim();
    if (!token || !this.sessionPersistenceConfigured) return undefined;
    return new AppwriteOwnerScopedRepository(
      new AppwriteTablesHttpClient({
        endpoint: this.endpoint,
        projectId: this.projectId,
        sessionToken: () => token,
        ...(this.fetcher ? { fetcher: this.fetcher } : {}),
      }),
      this.databaseId,
    );
  }
}
