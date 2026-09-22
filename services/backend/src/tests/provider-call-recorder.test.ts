import assert from "node:assert/strict";
import test from "node:test";
import { AppwriteProviderCallRecorder } from "../nutrition/vision/telemetry/providerCallRecorder.ts";

class FakeClient {
  rows: Array<{ tableId: string; rowId: string; data: Record<string, unknown>; permissions?: readonly string[] }> = [];
  async listRows() { return { rows: [], total: 0 }; }
  async getRow() { return null; }
  async createRow(_db: string, tableId: string, rowId: string, data: Record<string, unknown>, permissions?: readonly string[]) { this.rows.push({ tableId, rowId, data, ...(permissions ? { permissions } : {}) }); return { $id: rowId, ...data }; }
  async updateRow() { throw new Error("unused"); }
  async deleteRow() {}
}

test("provider recorder stores only hashed/metric metadata and owner-scoped cost accounting", async () => {
  const client = new FakeClient();
  const recorder = new AppwriteProviderCallRecorder(client as any, "movefuel_mvp");
  await recorder.record({ provider: "openrouter", ownerUserId: "user-a", requestId: "req-a", imageReference: "private://meal/image.jpg", outputHash: "abc", model: "google/gemini-2.5-flash", promptTokens: 100, completionTokens: 50, totalTokens: 150, costUsd: 0.002, latencyMs: 900 });
  assert.deepEqual(client.rows.map((row) => row.tableId), ["provider_call", "usage_ledger"]);
  const provider = client.rows[0]!.data;
  assert.equal(provider.userId, "user-a");
  assert.equal(provider.tokenIn, 100);
  assert.equal(provider.tokenOut, 50);
  assert.equal(provider.inputHash === "private://meal/image.jpg", false);
  assert.equal(JSON.stringify(client.rows).includes("sk-or"), false);
  assert.equal(client.rows[1]!.data.quantity, 0.002);
  assert.ok(client.rows[1]!.permissions?.some((p) => p.includes("user:user-a")));
  assert.ok(client.rows[1]!.permissions?.some((p) => p === 'write("user:user-a")'));
});

test("provider recorder ignores events without owner/request identity", async () => {
  const client = new FakeClient();
  const recorder = new AppwriteProviderCallRecorder(client as any, "movefuel_mvp");
  await recorder.record({ provider: "openrouter", model: "m", promptTokens: 1, completionTokens: 1, totalTokens: 2, latencyMs: 1 });
  assert.equal(client.rows.length, 0);
});
