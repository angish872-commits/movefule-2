import assert from "node:assert/strict";
import { Readable, Writable } from "node:stream";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createMealRouteHandler } from "../../http/meal-routes.ts";
import { MealStore } from "../../meal/store.ts";
import { LocalMealImageStore } from "../../meal/local-image-store.ts";
import { LiveImageEstimateService } from "../../nutrition/service/liveImageEstimateService.ts";
import { MockCandidateProvider } from "../helpers/mockCandidateProvider.ts";
import { MockSegmentationAdapter } from "../helpers/mockSegmentationAdapter.ts";

class TestResponse extends Writable {
  public statusCode = 200;
  public readonly headers = new Map<string, string>();
  public body = "";

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  _write(chunk: Buffer | string, _encoding: string, callback: (error?: Error | null) => void): void {
    this.body += chunk.toString();
    callback();
  }
}

function request(method: string, url: string, body?: unknown): Readable & {
  method: string;
  url: string;
  headers: Record<string, string>;
} {
  const stream = Readable.from(body === undefined ? [] : [JSON.stringify(body)]) as Readable & {
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  stream.method = method;
  stream.url = url;
  stream.headers = {};
  return stream;
}

function parsed(response: TestResponse): any {
  return JSON.parse(response.body);
}

function binaryRequest(method: string, url: string, contentType: string, bytes: Buffer): Readable & {
  method: string;
  url: string;
  headers: Record<string, string>;
} {
  const stream = Readable.from([bytes]) as Readable & {
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  stream.method = method;
  stream.url = url;
  stream.headers = { "content-type": contentType };
  return stream;
}

function testStore(): MealStore {
  let nextId = 0;
  return new MealStore({
    now: () => 1_700_000_000_000,
    idFactory: () => `id-${++nextId}`,
  });
}

test("meal routes return standard envelopes through create, analyze, read, and confirm", async () => {
  const handler = createMealRouteHandler({ store: testStore(), allowDevelopmentFixtures: true });
  const context = { userId: "user-a", correlationId: "corr-1" };

  const createResponse = new TestResponse();
  assert.equal(await handler(request("POST", "/v1/meals/drafts", {
    localDate: "2026-08-01",
    mealType: "lunch",
    sourceType: "sample",
    note: "fixture:chicken-curry-rice",
  }), createResponse, context), true);
  assert.equal(createResponse.statusCode, 201);
  const created = parsed(createResponse);
  assert.equal(created.schemaVersion, 1);
  assert.equal(created.correlationId, "corr-1");
  assert.equal(created.error, null);
  const draftId = created.data.draft.draftId;

  const analysisResponse = new TestResponse();
  await handler(request("POST", "/v1/meals/analysis", {
    draftId,
    idempotencyKey: "analysis-route-1",
  }), analysisResponse, context);
  assert.equal(analysisResponse.statusCode, 200);
  const analysis = parsed(analysisResponse);
  assert.equal(analysis.data.analysisRequest.state, "COMPLETED");
  const requestId = analysis.data.analysisRequest.requestId;

  const getResponse = new TestResponse();
  await handler(request("GET", `/v1/meals/analysis/${requestId}`), getResponse, context);
  assert.equal(getResponse.statusCode, 200);
  assert.equal(parsed(getResponse).data.analysisRequest.requestId, requestId);

  const confirmResponse = new TestResponse();
  await handler(request("POST", "/v1/meals/confirm", {
    draftId,
    idempotencyKey: "confirm-route-1",
    confirmed: true,
    items: analysis.data.analysisRequest.result.items,
  }), confirmResponse, context);
  assert.equal(confirmResponse.statusCode, 201);
  assert.equal(parsed(confirmResponse).data.meal.status, "CONFIRMED");
  assert.equal(parsed(confirmResponse).data.totals.confirmedMealCount, 1);

  const listResponse = new TestResponse();
  await handler(request("GET", "/v1/meals?localDate=2026-08-01"), listResponse, context);
  assert.equal(listResponse.statusCode, 200);
  assert.equal(parsed(listResponse).data.count, 1);
  assert.equal(parsed(listResponse).data.meals[0].mealId, parsed(confirmResponse).data.meal.mealId);

  const detailResponse = new TestResponse();
  await handler(request("GET", `/v1/meals/${parsed(confirmResponse).data.meal.mealId}`), detailResponse, context);
  assert.equal(detailResponse.statusCode, 200);
  assert.equal(parsed(detailResponse).data.meal.status, "CONFIRMED");

  const privateDetailResponse = new TestResponse();
  await handler(request("GET", `/v1/meals/${parsed(confirmResponse).data.meal.mealId}`), privateDetailResponse, { userId: "user-b" });
  assert.equal(privateDetailResponse.statusCode, 404);
  assert.equal(parsed(privateDetailResponse).error.code, "meal_not_found");
});


test("binary meal image upload attaches private owner-partitioned media to the authenticated draft", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "movefuel-meal-image-test-"));
  try {
    const store = testStore();
    const handler = createMealRouteHandler({ store, imageStorage: new LocalMealImageStore(root), allowDevelopmentFixtures: true });
    const context = { userId: "user-a", correlationId: "binary-image" };

    const createResponse = new TestResponse();
    await handler(request("POST", "/v1/meals/drafts", {
      localDate: "2026-08-07",
      mealType: "lunch",
      sourceType: "camera",
    }), createResponse, context);
    const draftId = parsed(createResponse).data.draft.draftId;

    const uploadResponse = new TestResponse();
    await handler(binaryRequest("PUT", `/v1/meals/drafts/${draftId}/image`, "image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xd9])), uploadResponse, context);
    assert.equal(uploadResponse.statusCode, 200);
    const uploaded = parsed(uploadResponse).data;
    assert.match(uploaded.image.objectId, /^local-meal-image:[a-f0-9]{24}:/);
    assert.equal(uploaded.draft.imageRef.objectId, uploaded.image.objectId);
    assert.equal(uploaded.draft.imageRef.mediaType, "image/jpeg");

    const otherUserResponse = new TestResponse();
    await handler(binaryRequest("PUT", `/v1/meals/drafts/${draftId}/image`, "image/jpeg", Buffer.from([1, 2, 3])), otherUserResponse, { userId: "user-b" });
    assert.equal(otherUserResponse.statusCode, 404);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("analysis retry/cancel and confirmed-meal revision/tombstone routes preserve envelopes", async () => {
  const handler = createMealRouteHandler({ store: testStore(), allowDevelopmentFixtures: true });
  const context = { userId: "user-a", correlationId: "mutation-correlation" };
  const createResponse = new TestResponse();
  await handler(request("POST", "/v1/meals/drafts", {
    localDate: "2026-08-01",
    mealType: "lunch",
    sourceType: "sample",
    note: "fixture:chicken-curry-rice",
  }), createResponse, context);
  const draftId = parsed(createResponse).data.draft.draftId;
  const analysisResponse = new TestResponse();
  await handler(request("POST", "/v1/meals/analysis", { draftId, idempotencyKey: "route-analysis" }), analysisResponse, context);
  const analysis = parsed(analysisResponse).data.analysisRequest;
  const confirmResponse = new TestResponse();
  await handler(request("POST", "/v1/meals/confirm", {
    draftId,
    idempotencyKey: "route-confirm",
    confirmed: true,
    items: analysis.result.items,
  }), confirmResponse, context);
  const mealId = parsed(confirmResponse).data.meal.mealId;

  const reviseResponse = new TestResponse();
  await handler(request("PATCH", `/v1/meals/${mealId}`, {
    idempotencyKey: "route-revision",
    expectedRevision: 1,
    items: [{ displayName: "Edited lunch", portionGrams: 100, energyKcal: 100, proteinGrams: 10 }],
  }), reviseResponse, context);
  assert.equal(reviseResponse.statusCode, 200);
  assert.equal(parsed(reviseResponse).data.meal.currentRevision, 2);

  const deleteResponse = new TestResponse();
  await handler(request("DELETE", `/v1/meals/${mealId}`, {
    idempotencyKey: "route-delete",
    expectedRevision: 2,
  }), deleteResponse, context);
  assert.equal(deleteResponse.statusCode, 200);
  assert.equal(parsed(deleteResponse).data.status, "DELETED");

  const listResponse = new TestResponse();
  await handler(request("GET", "/v1/meals?localDate=2026-08-01"), listResponse, context);
  assert.equal(parsed(listResponse).data.count, 0);
});

test("meal routes require an authenticated integration context and preserve errors in envelopes", async () => {
  const handler = createMealRouteHandler({ store: testStore(), allowDevelopmentFixtures: true });
  const unauthenticatedResponse = new TestResponse();
  await handler(request("POST", "/v1/meals/drafts", {}), unauthenticatedResponse);
  assert.equal(unauthenticatedResponse.statusCode, 401);
  assert.equal(parsed(unauthenticatedResponse).error.code, "unauthenticated");

  const invalidResponse = new TestResponse();
  await handler(request("POST", "/v1/meals/confirm", {
    draftId: "missing",
    idempotencyKey: "confirm-1",
    confirmed: false,
  }), invalidResponse, { userId: "user-a" });
  assert.equal(invalidResponse.statusCode, 400);
  assert.equal(parsed(invalidResponse).schemaVersion, 1);
  assert.equal(parsed(invalidResponse).data, null);
  assert.equal(parsed(invalidResponse).error.code, "confirmation_required");
});

test("nutrition catalog routes are authenticated, bounded, and explicit about fixture status", async () => {
  const handler = createMealRouteHandler({ store: testStore(), allowDevelopmentFixtures: true });
  const searchResponse = new TestResponse();
  await handler(request("GET", "/v1/nutrition/search?q=oatmeal&limit=5"), searchResponse, { userId: "user-a" });
  assert.equal(searchResponse.statusCode, 200);
  const search = parsed(searchResponse);
  assert.equal(search.data.source, "local_fixture");
  assert.equal(search.data.authorityStatus, "not_claimed");
  assert.ok(search.data.foods.length > 0);

  const sourceId = search.data.foods[0].sourceId;
  const detailResponse = new TestResponse();
  await handler(request("GET", `/v1/nutrition/foods/${encodeURIComponent(sourceId)}`), detailResponse, { userId: "user-a" });
  assert.equal(detailResponse.statusCode, 200);
  assert.equal(parsed(detailResponse).data.food.sourceId, sourceId);

  const invalidResponse = new TestResponse();
  await handler(request("GET", "/v1/nutrition/search?q=x"), invalidResponse, { userId: "user-a" });
  assert.equal(invalidResponse.statusCode, 400);
  assert.equal(parsed(invalidResponse).error.code, "invalid_nutrition_query");
});

test("legacy Gemini meal-analysis route is fail-closed and cannot become nutrition authority", async () => {
  const meals = testStore();
  const handler = createMealRouteHandler({ store: meals, allowDevelopmentFixtures: true });
  const context = { userId: "user-a" };
  const draftResponse = new TestResponse();
  await handler(request("POST", "/v1/meals/drafts", {
    localDate: "2026-08-01",
    mealType: "dinner",
    sourceType: "photo_picker",
    imageRef: "object-1",
  }), draftResponse, context);
  const draftId = parsed(draftResponse).data.draft.draftId;

  const analysisResponse = new TestResponse();
  await handler(request("POST", "/v1/meals/analysis", {
    draftId,
    idempotencyKey: "gemini-route-1",
    provider: "gemini",
  }), analysisResponse, context);
  assert.equal(analysisResponse.statusCode, 503);
  const body = parsed(analysisResponse);
  assert.equal(body.error, null);
  assert.equal(body.data.analysisRequest.errorCode, "provider_not_implemented");
});

test("development meal fixtures and fixture nutrition catalogue are fail-closed by default", async () => {
  const handler = createMealRouteHandler({ store: testStore() });
  const context = { userId: "user-a" };
  const sample = new TestResponse();
  await handler(request("POST", "/v1/meals/drafts", {
    localDate: "2026-08-12", mealType: "lunch", sourceType: "sample", note: "fixture:chicken-curry-rice",
  }), sample, context);
  assert.equal(sample.statusCode, 400);
  assert.equal(parsed(sample).error.code, "development_fixture_disabled");

  const catalog = new TestResponse();
  await handler(request("GET", "/v1/nutrition/search?q=rice"), catalog, context);
  assert.equal(catalog.statusCode, 400);
  assert.equal(parsed(catalog).error.code, "nutrition_catalog_not_configured");
});

test("saved meal routes list and create owner-scoped templates", async () => {
  const handler = createMealRouteHandler({ store: testStore(), allowDevelopmentFixtures: true });
  const context = { userId: "user-a", correlationId: "saved-correlation" };
  const items = [{
    displayName: "Rice bowl",
    portionGrams: 250,
    energyKcal: 400,
    proteinGrams: 12,
    carbGrams: 70,
    fatGrams: 8,
    fiberGrams: 4,
  }];
  const createResponse = new TestResponse();
  await handler(request("POST", "/v1/saved-meals", {
    idempotencyKey: "saved-route-1",
    name: "Weekday bowl",
    items,
  }), createResponse, context);
  assert.equal(createResponse.statusCode, 201);
  assert.equal(parsed(createResponse).data.savedMeal.name, "Weekday bowl");

  const listResponse = new TestResponse();
  await handler(request("GET", "/v1/saved-meals?query=weekday"), listResponse, context);
  assert.equal(listResponse.statusCode, 200);
  assert.equal(parsed(listResponse).data.savedMeals.length, 1);

  const otherUserResponse = new TestResponse();
  await handler(request("GET", "/v1/saved-meals"), otherUserResponse, { userId: "user-b" });
  assert.equal(parsed(otherUserResponse).data.savedMeals.length, 0);
});

test("personal food routes support create, list, update, delete, and owner isolation", async () => {
  const handler = createMealRouteHandler({ store: testStore(), allowDevelopmentFixtures: true });
  const context = { userId: "user-a", correlationId: "food-correlation" };
  const createResponse = new TestResponse();
  await handler(request("POST", "/v1/personal-food", {
    idempotencyKey: "food-route-1",
    name: "Oats",
    basisAmount: 100,
    basisUnit: "g",
    energyKcal: 389,
    proteinG: 16.9,
    carbG: 66.3,
    fatG: 6.9,
    fiberG: 10.6,
  }), createResponse, context);
  assert.equal(createResponse.statusCode, 201);
  const created = parsed(createResponse).data.food;

  const listResponse = new TestResponse();
  await handler(request("GET", "/v1/personal-food"), listResponse, context);
  assert.equal(listResponse.statusCode, 200);
  assert.equal(parsed(listResponse).data.personalFoods.length, 1);

  const updateResponse = new TestResponse();
  await handler(request("PATCH", `/v1/personal-food/${created.personalFoodId}`, { expectedRevision: 1, name: "Steel-cut oats" }), updateResponse, context);
  assert.equal(updateResponse.statusCode, 200);
  assert.equal(parsed(updateResponse).data.food.revision, 2);

  const otherUserResponse = new TestResponse();
  await handler(request("GET", "/v1/personal-food"), otherUserResponse, { userId: "user-b" });
  assert.equal(parsed(otherUserResponse).data.personalFoods.length, 0);

  const deleteResponse = new TestResponse();
  await handler(request("DELETE", `/v1/personal-food/${created.personalFoodId}`, { expectedRevision: 2 }), deleteResponse, context);
  assert.equal(deleteResponse.statusCode, 200);
  assert.equal(parsed(deleteResponse).data.status, "DELETED");
});

test("persisted confirmed meals remain editable and deletable after backend process restart", async () => {
  class DurableConfirmedStore {
    private readonly meals = new Map<string, any>();
    async persist(userId: string, meal: any) { this.meals.set(`${userId}:${meal.mealId}`, structuredClone(meal)); }
    async list(userId: string, localDate?: string) {
      return [...this.meals.entries()]
        .filter(([key, meal]) => key.startsWith(`${userId}:`) && meal.status === "CONFIRMED" && (localDate === undefined || meal.localDate === localDate))
        .map(([, meal]) => structuredClone(meal));
    }
    async get(userId: string, mealId: string) { return structuredClone(this.meals.get(`${userId}:${mealId}`) ?? null); }
  }

  const durable = new DurableConfirmedStore();
  const context = { userId: "restart-user", correlationId: "restart-regression" };
  const first = createMealRouteHandler({ store: testStore(), confirmedMealStore: durable, allowDevelopmentFixtures: true });
  const createResponse = new TestResponse();
  await first(request("POST", "/v1/meals/drafts", {
    localDate: "2026-08-12", mealType: "lunch", sourceType: "sample", note: "fixture:chicken-curry-rice",
  }), createResponse, context);
  const draftId = parsed(createResponse).data.draft.draftId;
  const analysisResponse = new TestResponse();
  await first(request("POST", "/v1/meals/analysis", { draftId, idempotencyKey: "restart-analysis" }), analysisResponse, context);
  const confirmResponse = new TestResponse();
  await first(request("POST", "/v1/meals/confirm", {
    draftId, idempotencyKey: "restart-confirm", confirmed: true,
    items: parsed(analysisResponse).data.analysisRequest.result.items,
  }), confirmResponse, context);
  const mealId = parsed(confirmResponse).data.meal.mealId;

  // Simulate backend restart: a new MealStore has no RAM projection, while the
  // durable confirmed store still contains the meal.
  const second = createMealRouteHandler({ store: testStore(), confirmedMealStore: durable, allowDevelopmentFixtures: true });
  const reviseResponse = new TestResponse();
  await second(request("PATCH", `/v1/meals/${mealId}`, {
    idempotencyKey: "restart-revise", expectedRevision: 1,
    items: [{ displayName: "Persisted lunch", portionGrams: 120, energyKcal: 150, proteinGrams: 12 }],
  }), reviseResponse, context);
  assert.equal(reviseResponse.statusCode, 200);
  assert.equal(parsed(reviseResponse).data.meal.currentRevision, 2);

  const third = createMealRouteHandler({ store: testStore(), confirmedMealStore: durable, allowDevelopmentFixtures: true });
  const deleteResponse = new TestResponse();
  await third(request("DELETE", `/v1/meals/${mealId}`, {
    idempotencyKey: "restart-delete", expectedRevision: 2,
  }), deleteResponse, context);
  assert.equal(deleteResponse.statusCode, 200);
  assert.equal(parsed(deleteResponse).data.meal.currentRevision, 3);
  assert.equal(parsed(deleteResponse).data.status, "DELETED");

  // A lost HTTP response followed by another process restart must not turn a
  // successful delete into a false failure.
  const fourth = createMealRouteHandler({ store: testStore(), confirmedMealStore: durable, allowDevelopmentFixtures: true });
  const retryDeleteResponse = new TestResponse();
  await fourth(request("DELETE", `/v1/meals/${mealId}`, {
    idempotencyKey: "restart-delete", expectedRevision: 2,
  }), retryDeleteResponse, context);
  assert.equal(retryDeleteResponse.statusCode, 200);
  assert.equal(parsed(retryDeleteResponse).data.meal.status, "DELETED");
});


test("candidate-only image estimate route abstains on unknown mass and recalculates reviewed grams without another vision call", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "movefuel-v6-route-test-"));
  try {
    const store = testStore();
    const imageStorage = new LocalMealImageStore(root);
    const calls = { segmentation: 0, candidates: 0 };
    const segmentation = new MockSegmentationAdapter({
      regions: [{ regionId: "region-1", segmentationConfidence: 0.95 }],
    });
    const candidates = new MockCandidateProvider({
      byRegion: {
        "region-1": [{ name: "Rice", searchTerms: ["rice"], foodType: "BASIC", providerConfidence: 0.96 }],
      },
    });
    const sceneAdapter = {
      async segment(input: Parameters<typeof segmentation.segment>[0]) {
        calls.segmentation += 1;
        return segmentation.segment(input);
      },
      async generateCandidates(input: Parameters<typeof candidates.generateCandidates>[0]) {
        calls.candidates += 1;
        return candidates.generateCandidates(input);
      },
    };
    const imageEstimateService = new LiveImageEstimateService({
      imageStore: imageStorage,
      sceneAdapter,
      nutritionSearch: async () => [{
        fdcId: 1001,
        dataType: "FOUNDATION",
        description: "Rice",
        normalizedName: "rice",
        nutrientIds: [1008, 1003, 1005, 1004, 1079],
        energyKcal: 130,
        proteinG: 2.7,
        carbG: 28,
        fatG: 0.3,
        fiberG: 0.4,
        sodiumMg: 1,
      }],
      pixelQualityAssessor: null,
    });
    let learnedConfirmations = 0;
    const originalLearnConfirmed = imageEstimateService.learnConfirmed.bind(imageEstimateService);
    imageEstimateService.learnConfirmed = (resultId, ownerUserId) => {
      learnedConfirmations += 1;
      originalLearnConfirmed(resultId, ownerUserId);
    };
    const handler = createMealRouteHandler({ store, imageStorage, imageEstimateService, allowDevelopmentFixtures: true });
    const context = { userId: "user-a", correlationId: "v6-route" };

    const createResponse = new TestResponse();
    await handler(request("POST", "/v1/meals/drafts", {
      localDate: "2026-08-12", mealType: "lunch", sourceType: "camera",
    }), createResponse, context);
    const draftId = parsed(createResponse).data.draft.draftId;

    const uploadResponse = new TestResponse();
    await handler(binaryRequest("PUT", `/v1/meals/drafts/${draftId}/image`, "image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xd9])), uploadResponse, context);
    assert.equal(uploadResponse.statusCode, 200);

    const estimateResponse = new TestResponse();
    await handler(request("POST", "/v1/meals/estimates", {
      draftId, idempotencyKey: "v6-route-estimate",
    }), estimateResponse, context);
    assert.equal(estimateResponse.statusCode, 200);
    const initial = parsed(estimateResponse).data.estimate;
    assert.equal(initial.state, "PORTION_INSUFFICIENT");
    assert.equal(initial.items[0].candidates[0].name, "Rice");
    assert.equal(initial.items[0].selectedSource.fdcId, 1001);
    assert.equal(initial.items[0].nutrients, null);
    assert.equal(initial.confirmed, false);
    assert.deepEqual(calls, { segmentation: 1, candidates: 1 });

    const readResponse = new TestResponse();
    await handler(request("GET", `/v1/meals/estimates/${encodeURIComponent(initial.resultId)}`), readResponse, context);
    assert.equal(readResponse.statusCode, 200);
    assert.equal(parsed(readResponse).data.estimate.resultId, initial.resultId);

    const correctionResponse = new TestResponse();
    await handler(request("POST", `/v1/meals/estimates/${encodeURIComponent(initial.resultId)}/corrections`, {
      itemId: initial.items[0].itemId,
      kind: "portion_grams",
      minimumGrams: 190,
      centralGrams: 200,
      maximumGrams: 210,
    }), correctionResponse, context);
    assert.equal(correctionResponse.statusCode, 200);
    const corrected = parsed(correctionResponse).data.estimate;
    assert.equal(corrected.state, "COMPLETED_NEEDS_CONFIRMATION");
    assert.equal(corrected.items[0].portion.centralGrams, 200);
    assert.equal(corrected.items[0].nutrients.energyKcal.central, 260);
    assert.deepEqual(calls, { segmentation: 1, candidates: 1 }, "reviewed grams must not trigger another vision/provider call");

    const confirmResponse = new TestResponse();
    await handler(request("POST", "/v1/meals/confirm", {
      draftId,
      idempotencyKey: "v6-route-confirm",
      confirmed: true,
      expectedRevision: 1,
    }), confirmResponse, context);
    assert.equal(confirmResponse.statusCode, 201);
    assert.equal(parsed(confirmResponse).data.meal.items[0].displayName, "Rice");
    assert.equal(parsed(confirmResponse).data.meal.totals.energyKcal, 260);
    assert.equal(learnedConfirmations, 1, "only explicit confirmation admits the serving to personalization");

    const duplicateConfirmResponse = new TestResponse();
    await handler(request("POST", "/v1/meals/confirm", {
      draftId, idempotencyKey: "v6-route-confirm", confirmed: true, expectedRevision: 1,
    }), duplicateConfirmResponse, context);
    assert.equal(duplicateConfirmResponse.statusCode, 200);
    assert.equal(learnedConfirmations, 1, "idempotent confirmation retry must not double-learn");

    const otherUserResponse = new TestResponse();
    await handler(request("GET", `/v1/meals/estimates/${encodeURIComponent(initial.resultId)}`), otherUserResponse, { userId: "user-b" });
    assert.equal(otherUserResponse.statusCode, 403);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
