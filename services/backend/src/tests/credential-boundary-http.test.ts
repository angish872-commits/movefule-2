import assert from "node:assert/strict";
import test from "node:test";
import { createMoveFuelServer } from "../http/local-server.ts";

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = createMoveFuelServer({ environment: "local" });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a port.");
  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("/v1/config never exposes server credential names or values", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/config`, {
      headers: { Authorization: "Bearer local-user:credential-boundary", "x-device-id": "phone-security" },
    });
    assert.equal(response.status, 200);
    const body = await response.json() as Record<string, unknown>;
    const serialized = JSON.stringify(body);
    for (const forbidden of [
      "APPWRITE_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY", "USDA_FDC_API_KEY", "FDC_API_KEY",
      "X-Appwrite-Key", "Authorization", "sessionCookie", "accessToken",
    ]) {
      assert.equal(serialized.includes(forbidden), false, `/v1/config exposed forbidden credential material: ${forbidden}`);
    }
  });
});
