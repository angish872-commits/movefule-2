import { createMoveFuelServer } from "./http/local-server.ts";
import { AppwriteSessionHttpClient } from "./foundation/appwrite-session-client.ts";
import { AppwriteSessionProvider, type SessionProvider } from "./foundation/session.ts";

function configuredValue(value: string | undefined): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) return "";
  const upper = normalized.toUpperCase();
  if (upper.startsWith("REPLACE_") || upper === "REPLACE_ME" || upper.includes("PLACEHOLDER")) return "";
  return normalized;
}

const port = Number(process.env.PORT ?? 8787);
const environment = process.env.MOVEFUEL_ENV ?? "local";
const appwriteEndpoint = configuredValue(process.env.APPWRITE_ENDPOINT);
const appwriteProjectId = configuredValue(process.env.APPWRITE_PROJECT_ID);
const appwriteDatabaseId = process.env.APPWRITE_DATABASE_ID ?? "movefuel_mvp";
const authMode = process.env.MOVEFUEL_AUTH_MODE?.trim() || (environment === "production" ? "appwrite" : "local-test");
const sessionProvider: SessionProvider | undefined = authMode === "appwrite" && appwriteEndpoint && appwriteProjectId
  ? new AppwriteSessionProvider(new AppwriteSessionHttpClient({ endpoint: appwriteEndpoint, projectId: appwriteProjectId }))
  : undefined;
if (authMode === "appwrite" && !sessionProvider) {
  throw new Error("MOVEFUEL_AUTH_MODE=appwrite requires APPWRITE_ENDPOINT and APPWRITE_PROJECT_ID");
}
const server = createMoveFuelServer({
  environment,
  appwriteEndpoint,
  appwriteProjectId,
  appwriteDatabaseId,
  ...(sessionProvider ? { sessionProvider } : {}),
});

const host = process.env.MOVEFUEL_HOST?.trim() || "127.0.0.1";
server.listen(port, host, () => {
  console.log(`MoveFuel backend listening on http://${host}:${port} (${environment}, auth=${authMode})`);
});
