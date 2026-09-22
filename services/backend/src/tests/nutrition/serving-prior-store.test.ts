import assert from "node:assert/strict";
import test from "node:test";
import { MemoryServingPriorStore } from "../../nutrition/personalization/servingPriorStore.ts";
import type { NutritionSource } from "../../nutrition/algorithm/contracts.ts";
import type { RegionFoodCandidate } from "../../nutrition/vision/candidateProviderAdapter.ts";

const source: NutritionSource = { source: "USDA_FDC", fdcId: 123, recipeRevisionId: null, dataType: "Foundation", description: "Rice, cooked" };
const candidate: RegionFoodCandidate = { name: "White rice", searchTerms: ["rice"], foodType: "BASIC", preparationCandidates: [{ label: "cooked", confidence: 0.9 }], providerConfidence: 0.9, modelProviderVersion: "v", uncertaintyNotes: [] };
const identity = { ownerUserId: "u1", source, candidate, preparationLabel: "cooked" };

test("serving prior appears only after enough explicit confirmations and stays identity-bound", async () => {
  const store = new MemoryServingPriorStore({ minimumSamples: 3 });
  await store.recordConfirmed(identity, 180, "2026-08-01T00:00:00Z");
  await store.recordConfirmed(identity, 200, "2026-08-02T00:00:00Z");
  assert.equal(await store.resolve(identity), null);
  await store.recordConfirmed(identity, 220, "2026-08-03T00:00:00Z");
  const prior = await store.resolve(identity);
  assert.equal(prior?.medianGrams, 200);
  assert.equal(prior?.sampleCount, 3);
  assert.equal(await store.resolve({ ...identity, preparationLabel: "fried" }), null);
  assert.equal(await store.resolve({ ...identity, ownerUserId: "u2" }), null);
});

import { AppwriteServingPriorStore, SERVING_PRIOR_TABLE_ID } from "../../nutrition/personalization/servingPriorStore.ts";
import type { AppwriteTablesClient, ListRowsRequest, RepositoryRow } from "../../foundation/repository.ts";

class ServingPriorTablesClient implements AppwriteTablesClient {
  readonly rows = new Map<string, RepositoryRow<Record<string, unknown>>>();
  async listRows<T extends Record<string, unknown>>(request: ListRowsRequest) {
    const rows = [...this.rows.values()].filter((row) => request.queries.every((query) => row[query.field] === query.value));
    return { rows: rows.slice(0, request.limit ?? rows.length) as RepositoryRow<T>[], total: rows.length };
  }
  async getRow<T extends Record<string, unknown>>(_databaseId: string, _tableId: typeof SERVING_PRIOR_TABLE_ID, rowId: string) {
    return (this.rows.get(rowId) as RepositoryRow<T> | undefined) ?? null;
  }
  async createRow<T extends Record<string, unknown>>(_databaseId: string, _tableId: typeof SERVING_PRIOR_TABLE_ID, rowId: string, data: T) {
    if (this.rows.has(rowId)) throw new Error("duplicate");
    const row = { $id: rowId, ...data } as RepositoryRow<T>;
    this.rows.set(rowId, row as RepositoryRow<Record<string, unknown>>);
    return row;
  }
  async updateRow<T extends Record<string, unknown>>(): Promise<RepositoryRow<T>> { throw new Error("unused"); }
  async deleteRow(): Promise<void> { throw new Error("unused"); }
}

test("Appwrite serving prior persists idempotent confirmed observations and resolves them after a new store instance", async () => {
  const client = new ServingPriorTablesClient();
  const firstProcess = new AppwriteServingPriorStore(client, "db", { minimumSamples: 3 });
  await firstProcess.recordConfirmed(identity, 180, "2026-08-01T00:00:00Z");
  await firstProcess.recordConfirmed(identity, 200, "2026-08-02T00:00:00Z");
  await firstProcess.recordConfirmed(identity, 220, "2026-08-03T00:00:00Z");
  await firstProcess.recordConfirmed(identity, 220, "2026-08-03T00:00:00Z");
  assert.equal(client.rows.size, 3, "confirmation retry must not duplicate a prior observation");

  const restartedProcess = new AppwriteServingPriorStore(client, "db", { minimumSamples: 3 });
  const prior = await restartedProcess.resolve(identity);
  assert.equal(prior?.sampleCount, 3);
  assert.equal(prior?.medianGrams, 200);
  assert.equal(await restartedProcess.resolve({ ...identity, ownerUserId: "another-user" }), null);
});
