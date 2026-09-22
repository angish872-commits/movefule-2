import assert from "node:assert/strict";
import test from "node:test";
import { AppwriteAccountDeletionAdmin } from "../../foundation/appwrite-account-admin.ts";

test("account deletion admin uses the current structured TablesDB query format", async () => {
  let requestedUrl = "";
  const admin = new AppwriteAccountDeletionAdmin({
    endpoint: "https://appwrite.example/v1",
    projectId: "project-a",
    apiKey: "server-key",
    databaseId: "movefuel_mvp",
    fetcher: async (input) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ rows: [], total: 0 }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });

  const rows = await admin.listRows("user_profile", "userId", "user-a");
  assert.deepEqual(rows, []);
  const query = new URL(requestedUrl).searchParams.get("queries[]");
  assert.equal(query, JSON.stringify({ method: "equal", attribute: "userId", values: ["user-a"] }));
});
