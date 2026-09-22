import { createMoveFuelRequestHandler } from "../../../src/http/request-handler.ts";
import { invokeNodeHttpHandler, type AppwriteFunctionContext } from "../../../src/appwrite/function-http.ts";
import { AppwriteServerTablesHttpClient } from "../../../src/foundation/appwrite-server-tables-client.ts";
import { AppwriteOwnerScopedRepository } from "../../../src/foundation/repository.ts";

/**
 * Public Appwrite Function entry point. Appwrite injects a short-lived dynamic
 * key per execution; it is passed directly to the existing server adapters and
 * is never written to an environment file or returned to a client.
 */
export default async function main(context: AppwriteFunctionContext): Promise<unknown> {
  const dynamicKey = context.req.headers["x-appwrite-key"]?.trim() || process.env.APPWRITE_FUNCTION_API_KEY?.trim();
  if (!dynamicKey) return context.res.text("Service configuration is incomplete.", 503);
  const functionUserId = context.req.headers["x-appwrite-user-id"]?.trim();
  const functionSessionProvider = functionUserId
    ? {
        async resolve() {
          const principal = {
            userId: functionUserId,
            sessionId: `appwrite-function:${functionUserId}`,
            provider: "appwrite" as const,
          };
          Object.defineProperty(principal, "accessToken", { value: dynamicKey, enumerable: false });
          return principal;
        },
      }
    : undefined;
  const functionOwnerRepository = functionUserId
    ? new AppwriteOwnerScopedRepository(
      new AppwriteServerTablesHttpClient({
        endpoint: process.env.APPWRITE_ENDPOINT,
        projectId: process.env.APPWRITE_PROJECT_ID,
        apiKey: dynamicKey,
      }),
      process.env.APPWRITE_DATABASE_ID ?? "movefuel_mvp",
    )
    : undefined;
  const handler = createMoveFuelRequestHandler({
    environment: "production",
    appwriteEndpoint: process.env.APPWRITE_ENDPOINT,
    appwriteProjectId: process.env.APPWRITE_PROJECT_ID,
    appwriteDatabaseId: process.env.APPWRITE_DATABASE_ID,
    appwriteServerApiKey: dynamicKey,
    mealMediaBucketId: process.env.BUCKET_MEAL_MEDIA_ID,
    ...(functionSessionProvider ? { sessionProvider: functionSessionProvider } : {}),
    ...(functionOwnerRepository ? { ownerRepositoryForContext: () => functionOwnerRepository } : {}),
  });
  return invokeNodeHttpHandler(handler, context);
}
