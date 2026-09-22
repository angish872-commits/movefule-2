import { createHash } from "node:crypto";
import type { AppwriteSessionClient, SessionUser } from "./session.ts";

export type AppwriteSessionTransport = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export type AppwriteSessionHttpConfig = {
  endpoint: string;
  projectId: string;
  fetcher?: AppwriteSessionTransport;
};

export class AppwriteSessionHttpClient implements AppwriteSessionClient {
  private readonly endpoint: string;
  private readonly projectId: string;
  private readonly fetcher: AppwriteSessionTransport;

  public constructor(config: AppwriteSessionHttpConfig) {
    this.endpoint = config.endpoint.replace(/\/$/, "");
    this.projectId = config.projectId;
    this.fetcher = config.fetcher ?? ((input, init) => fetch(input, init));
    if (!this.endpoint || !this.projectId) throw new Error("appwrite_session_config_incomplete");
  }

  async getCurrentUser(accessToken: string): Promise<SessionUser> {
    const response = await this.fetcher(`${this.endpoint}/account`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Appwrite-Project": this.projectId,
        "X-Appwrite-JWT": accessToken,
      },
    });
    if (!response.ok) throw new Error("appwrite_session_rejected");
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("appwrite_session_invalid_response");
    const record = body as Record<string, unknown>;
    const userId = typeof record.$id === "string" ? record.$id : "";
    if (!userId) throw new Error("appwrite_session_missing_user");
    return {
      userId,
      sessionId: `jwt:${createHash("sha256").update(accessToken).digest("hex").slice(0, 32)}`,
    };
  }
}
