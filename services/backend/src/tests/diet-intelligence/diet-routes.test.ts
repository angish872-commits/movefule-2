import assert from "node:assert/strict";
import test from "node:test";
import { Readable, Writable } from "node:stream";
import { createDietRouteHandler } from "../../http/diet-routes.ts";
import type { ProfileResult, ProfileService } from "../../foundation/profile.ts";
import type { FoundationTableId } from "../../foundation/permissions.ts";
import type { ListRowsResult, OwnerScopedRepository, RepositoryListOptions, RepositoryRow, ServerOwnedRepository } from "../../foundation/repository.ts";
import type { ConfirmedMeal, ConfirmedMealStoreLike } from "../../meal/confirmed-meals.ts";

const NOW = new Date("2026-08-29T12:00:00.000Z");

class MemoryRepository implements OwnerScopedRepository, ServerOwnedRepository {
  readonly tables = new Map<FoundationTableId, Map<string, Record<string, unknown>>>();

  private table(tableId: FoundationTableId): Map<string, Record<string, unknown>> {
    let table = this.tables.get(tableId);
    if (!table) {
      table = new Map();
      this.tables.set(tableId, table);
    }
    return table;
  }

  private list<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, options: RepositoryListOptions = {}): ListRowsResult<T> {
    const rows = [...this.table(tableId).values()]
      .filter((row) => row.userId === userId)
      .filter((row) => (options.queries ?? []).every((query) => query.operator !== "equal" || row[query.field] === query.value))
      .slice(0, options.limit ?? 100) as RepositoryRow<T>[];
    return { rows, total: rows.length };
  }

  private get<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string): RepositoryRow<T> | null {
    const row = this.table(tableId).get(rowId);
    return row?.userId === userId ? row as RepositoryRow<T> : null;
  }

  private create<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: T): RepositoryRow<T> {
    const table = this.table(tableId);
    if (table.has(rowId)) throw new Error("duplicate_row");
    const row = { ...data, userId, $id: rowId } as RepositoryRow<T>;
    table.set(rowId, row);
    return row;
  }

  private update<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: Partial<T>): RepositoryRow<T> {
    const current = this.get<T>(tableId, userId, rowId);
    if (!current) throw new Error("missing_row");
    const row = { ...current, ...data, userId, $id: rowId } as RepositoryRow<T>;
    this.table(tableId).set(rowId, row);
    return row;
  }

  async listOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, options?: RepositoryListOptions) { return this.list<T>(tableId, userId, options); }
  async getOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string) { return this.get<T>(tableId, userId, rowId); }
  async createOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: T) { return this.create(tableId, userId, rowId, data); }
  async updateOwned<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: Partial<T>) { return this.update(tableId, userId, rowId, data); }
  async deleteOwned(tableId: FoundationTableId, userId: string, rowId: string) { if (this.get(tableId, userId, rowId)) this.table(tableId).delete(rowId); }
  async listForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, options?: RepositoryListOptions) { return this.list<T>(tableId, userId, options); }
  async getForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string) { return this.get<T>(tableId, userId, rowId); }
  async createForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: T) { return this.create(tableId, userId, rowId, data); }
  async updateForUser<T extends Record<string, unknown>>(tableId: FoundationTableId, userId: string, rowId: string, data: Partial<T>) { return this.update(tableId, userId, rowId, data); }
}

function meal(): ConfirmedMeal {
  return {
    mealId: "meal-a",
    userId: "user-a",
    localDate: "2026-08-29",
    mealType: "lunch",
    status: "CONFIRMED",
    currentRevision: 1,
    sourceDraftId: "draft-a",
    items: [{
      itemId: "item-a",
      displayName: "Dal bhat",
      portionGrams: 400,
      energyKcal: 600,
      proteinGrams: 22,
      carbGrams: 95,
      fatGrams: 14,
      fiberGrams: 12,
      confidence: "high",
      energyRangeKcal: { min: 560, max: 650 },
    }],
    totals: { energyKcal: 600, proteinGrams: 22, carbGrams: 95, fatGrams: 14, fiberGrams: 12 },
    confirmedAtEpochMillis: NOW.getTime() - 60_000,
    createdAtEpochMillis: NOW.getTime() - 120_000,
    updatedAtEpochMillis: NOW.getTime() - 60_000,
  };
}

class ConfirmedMealFixtureStore implements ConfirmedMealStoreLike {
  private readonly rows: ConfirmedMeal[];

  public constructor(rows: ConfirmedMeal[]) {
    this.rows = rows;
  }

  async list(userId: string, _localDate?: string): Promise<ConfirmedMeal[]> {
    return this.rows.filter((row) => row.userId === userId).map((row) => structuredClone(row));
  }

  async get(_userId: string, mealId: string): Promise<ConfirmedMeal | null> {
    return this.rows.find((row) => row.mealId === mealId) ?? null;
  }
}

function profileResult(userId = "user-a"): ProfileResult {
  return {
    userId,
    source: "local_fixture",
    profile: { revision: 2, updatedAt: NOW.toISOString(), countryCode: "NP", locale: "METRIC" },
    onboarding: {},
    preferences: { revision: 3, valueJson: "{}" },
    goal: null,
    target: {
      targetRevisionId: "target-a",
      revision: 4,
      effectiveDate: "2026-08-29",
      source: "CALCULATED",
      manualEntry: false,
      eligibilityDecision: "ELIGIBLE",
      eligibilityReasonCodesJson: JSON.stringify(["ADULT_POPULATION"]),
      policyVersion: "target-policy-v1",
      populationClass: "ADULT",
      energyKcal: 2200,
      proteinG: 110,
      createdAt: NOW.toISOString(),
    },
  };
}

class FakeProfileService {
  private readonly rows: Map<string, ProfileResult>;

  public constructor(rows = new Map<string, ProfileResult>()) {
    this.rows = rows;
  }

  async get(userId: string): Promise<ProfileResult | null> {
    return this.rows.get(userId) ?? null;
  }
}

class TestResponse extends Writable {
  public statusCode = 200;
  public body = "";
  setHeader(): this { return this; }
  _write(chunk: Buffer | string, _encoding: string, callback: (error?: Error | null) => void): void { this.body += chunk.toString(); callback(); }
}

function request(method: string, url: string, body?: unknown): Readable & { method: string; url: string; headers: Record<string, string> } {
  const stream = Readable.from(body === undefined ? [] : [JSON.stringify(body)]) as Readable & { method: string; url: string; headers: Record<string, string> };
  stream.method = method;
  stream.url = url;
  stream.headers = { "content-type": "application/json" };
  return stream;
}

function parse(response: TestResponse): any { return JSON.parse(response.body); }

function context(userId: string): { auth: { userId: string }; url: URL; correlationId: string } {
  return { auth: { userId }, url: new URL("http://local"), correlationId: "diet-1" };
}

async function buildHandler() {
  const repository = new MemoryRepository();
  const profileRows = new Map<string, ProfileResult>([["user-a", profileResult("user-a")]]);
  const profileService = new FakeProfileService(profileRows) as unknown as ProfileService;
  const handler = createDietRouteHandler({
    profileService,
    repositoryFor: () => repository,
    confirmedMealsFor: () => new ConfirmedMealFixtureStore([meal()]),
    serverRepository: repository,
  });
  return { handler, repository, profileRows };
}

test("GET /v1/diet/recommendation serves a validated advisory READY plan for an eligible profile", async () => {
  const { handler } = await buildHandler();
  const res = new TestResponse();
  const ctx = context("user-a");
  ctx.url = new URL("http://local/v1/diet/recommendation?localDate=2026-08-29");
  await handler(request("GET", "/v1/diet/recommendation?localDate=2026-08-29"), res, ctx);
  assert.equal(res.statusCode, 200);
  const data = parse(res).data;
  assert.equal(data.localDate, "2026-08-29");
  assert.equal(data.status, "READY");
  assert.ok(data.recommendationId);
  assert.ok(data.title);
  assert.ok(data.body);
  assert.ok(data.reasonCodes.includes("ADVISORY_ONLY"));
});

test("GET /v1/diet/recommendation returns profile_not_found when no profile exists", async () => {
  const { handler } = await buildHandler();
  const ctx = context("missing-user");
  ctx.url = new URL("http://local/v1/diet/recommendation?localDate=2026-08-29");
  await assert.rejects(
    () => handler(request("GET", "/v1/diet/recommendation?localDate=2026-08-29"), new TestResponse(), ctx),
    (error: unknown) => (error as { code?: string }).code === "profile_not_found",
  );
});

test("POST recommendation feedback persists ACCEPTED idempotently and retires the served recommendation", async () => {
  const { handler, repository } = await buildHandler();

  const recRes = new TestResponse();
  const recCtx = context("user-a");
  recCtx.url = new URL("http://local/v1/diet/recommendation?localDate=2026-08-29");
  await handler(request("GET", "/v1/diet/recommendation?localDate=2026-08-29"), recRes, recCtx);
  const served = parse(recRes).data;
  assert.equal(served.status, "READY");
  const recommendationId = served.recommendationId;
  assert.ok(recommendationId);
  const stored = await repository.getOwned("daily_recommendation", "user-a", recommendationId);
  assert.ok(stored, `expected daily_recommendation row for ${recommendationId}`);

  const feedbackBody = {
    action: "ACCEPTED",
    sourceDevice: "phone-a",
    idempotencyKey: "android-diet-accepted:1",
    occurredAt: NOW.toISOString(),
  };
  const fbUrl = `http://local/v1/diet/recommendation/${encodeURIComponent(recommendationId)}/feedback`;
  const first = new TestResponse();
  const fbCtx = context("user-a");
  fbCtx.url = new URL(fbUrl);
  await handler(request("POST", fbUrl, feedbackBody), first, fbCtx);
  assert.equal(first.statusCode, 200);
  assert.equal(parse(first).data.accepted, true);

  const retry = new TestResponse();
  await handler(request("POST", fbUrl, feedbackBody), retry, fbCtx);
  assert.equal(parse(retry).data.accepted, true);

  const row = await repository.getOwned("daily_recommendation", "user-a", recommendationId);
  assert.equal(row?.state, "EXPIRED");
  const completions = (await repository.listOwned("action_completion", "user-a")).rows;
  assert.equal(completions.length, 1);
});

test("GET after terminal feedback returns CONSUMED rather than re-serving the same READY recommendation", async () => {
  const { handler } = await buildHandler();

  const recRes = new TestResponse();
  const recCtx = context("user-a");
  recCtx.url = new URL("http://local/v1/diet/recommendation?localDate=2026-08-29");
  await handler(request("GET", "/v1/diet/recommendation?localDate=2026-08-29"), recRes, recCtx);
  const recommendationId = parse(recRes).data.recommendationId;
  const fbUrl = `http://local/v1/diet/recommendation/${encodeURIComponent(recommendationId)}/feedback`;
  const fbCtx = context("user-a");
  fbCtx.url = new URL(fbUrl);
  await handler(request("POST", fbUrl, {
    action: "DISMISSED",
    sourceDevice: "phone-a",
    idempotencyKey: "android-diet-dismissed:1",
    occurredAt: NOW.toISOString(),
  }), new TestResponse(), fbCtx);

  const afterRes = new TestResponse();
  const afterCtx = context("user-a");
  afterCtx.url = new URL("http://local/v1/diet/recommendation?localDate=2026-08-29");
  await handler(request("GET", "/v1/diet/recommendation?localDate=2026-08-29"), afterRes, afterCtx);
  const after = parse(afterRes).data;
  assert.equal(after.status, "CONSUMED");
  assert.equal(after.recommendationId, null);
});

test("POST recommendation feedback rejects unsupported actions", async () => {
  const { handler } = await buildHandler();
  const ctx = context("user-a");
  ctx.url = new URL("http://local/v1/diet/recommendation/example/feedback");
  await assert.rejects(
    () => handler(request("POST", "/v1/diet/recommendation/example/feedback", {
      action: "NOT_REAL",
      sourceDevice: "phone-a",
      idempotencyKey: "key",
      occurredAt: NOW.toISOString(),
    }), new TestResponse(), ctx),
    (error: unknown) => (error as { code?: string }).code === "invalid_diet_feedback",
  );
});
