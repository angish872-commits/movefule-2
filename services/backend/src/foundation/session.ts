export type SessionProviderName = "appwrite" | "local-test";

export type SessionPrincipal = {
  userId: string;
  sessionId: string;
  provider: SessionProviderName;
  /** Request-scoped JWT for the server-side TablesDB adapter; never serialize or log it. */
  accessToken?: string;
};

export type SessionRequest = {
  authorization?: string;
};

export type SessionUser = {
  userId: string;
  sessionId: string;
};

export interface SessionProvider {
  resolve(request: SessionRequest): Promise<SessionPrincipal | null>;
}

/**
 * Narrow boundary around the Appwrite account/session API. The concrete SDK
 * client is injected by deployment code; this package never stores or logs a
 * credential and does not require an Appwrite dependency for local tests.
 */
export interface AppwriteSessionClient {
  getCurrentUser(accessToken: string): Promise<SessionUser>;
}

export class SessionResolutionError extends Error {
  public readonly code: "invalid_session" | "session_provider_unavailable";
  public readonly retryable: boolean;

  constructor(
    code: "invalid_session" | "session_provider_unavailable",
    message: string,
    retryable = false,
  ) {
    super(message);
    this.name = "SessionResolutionError";
    this.code = code;
    this.retryable = retryable;
  }
}

function bearerToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function validateUser(user: SessionUser): SessionUser {
  if (!user || typeof user.userId !== "string" || user.userId.trim().length === 0 ||
      typeof user.sessionId !== "string" || user.sessionId.trim().length === 0) {
    throw new SessionResolutionError("invalid_session", "The session provider returned an invalid session.");
  }
  return user;
}

export class AppwriteSessionProvider implements SessionProvider {
  private readonly client: AppwriteSessionClient;

  public constructor(client: AppwriteSessionClient) {
    this.client = client;
  }

  async resolve(request: SessionRequest): Promise<SessionPrincipal | null> {
    const token = bearerToken(request.authorization);
    if (!token) return null;
    try {
      const user = validateUser(await this.client.getCurrentUser(token));
      const principal: SessionPrincipal = { ...user, provider: "appwrite" };
      // Keep the bearer token request-scoped and non-enumerable so accidental
      // serialization/logging of the principal cannot disclose it.
      Object.defineProperty(principal, "accessToken", { value: token, enumerable: false });
      return principal;
    } catch (error) {
      if (error instanceof SessionResolutionError) throw error;
      throw new SessionResolutionError("invalid_session", "The Appwrite session could not be validated.");
    }
  }
}

/** Explicitly test-only; it is not accepted as a production session provider. */
export class LocalTestSessionProvider implements SessionProvider {
  async resolve(request: SessionRequest): Promise<SessionPrincipal | null> {
    const authorization = request.authorization;
    if (!authorization?.startsWith("Bearer local-user:")) return null;
    const userId = authorization.slice("Bearer local-user:".length).trim();
    if (!userId) return null;
    return { userId, sessionId: `local-session:${userId}`, provider: "local-test" };
  }
}
