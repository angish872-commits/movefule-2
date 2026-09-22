import assert from "node:assert/strict";
import test from "node:test";
import type { MealImageStore } from "../../meal/local-image-store.ts";
import { MealMediaLifecycleService } from "../../privacy/meal-media-lifecycle.ts";
import { PrivacyPreferenceService, defaultPrivacyProfile } from "../../privacy/preferences.ts";

class FakeImageStore implements MealImageStore {
  public readonly deleted: string[] = [];
  public failDelete = false;

  async save() { throw new Error("not_used"); }
  async read() { throw new Error("not_used"); }
  async readForUser() { throw new Error("not_used"); }
  async delete(objectId: string): Promise<void> {
    if (this.failDelete) throw new Error("transient_delete_failure");
    this.deleted.push(objectId);
  }
}

const now = "2026-08-30T03:00:00.000Z";

function setup() {
  const images = new FakeImageStore();
  const preferences = new PrivacyPreferenceService();
  const lifecycle = new MealMediaLifecycleService(images, preferences);
  return { images, preferences, lifecycle };
}

test("default privacy profile retains nothing and opts out of analytics/model improvement", () => {
  const profile = defaultPrivacyProfile("user-a");
  assert.equal(profile.retainMealImages, false);
  assert.equal(profile.imageRetentionDays, null);
  assert.equal(profile.analyticsAllowed, false);
  assert.equal(profile.modelImprovementAllowed, false);
});

test("retain=false deletes media at confirmation", async () => {
  const { images, lifecycle } = setup();
  await lifecycle.registerTemporary("user-a", "draft-a", "local-media-a", undefined, now);
  const result = await lifecycle.applyConfirmedPolicy("user-a", "local-media-a", "meal-a", undefined, now);
  assert.equal(result.outcome, "DELETED");
  assert.deepEqual(images.deleted, ["local-media-a"]);
});

test("retention=true applies bounded expiry", async () => {
  const { preferences, lifecycle } = setup();
  await preferences.save("user-a", {
    retainMealImages: true,
    imageRetentionDays: 7,
    analyticsAllowed: false,
    modelImprovementAllowed: false,
  });
  await lifecycle.registerTemporary("user-a", "draft-a", "local-media-a", undefined, now);
  const result = await lifecycle.applyConfirmedPolicy("user-a", "local-media-a", "meal-a", undefined, now);
  assert.deepEqual(result, { outcome: "RETAINED", deleteAfter: "2026-09-06T03:00:00.000Z" });
});

test("due purge deletes and duplicate purge is idempotent", async () => {
  const { images, lifecycle } = setup();
  await lifecycle.registerTemporary("user-a", "draft-a", "local-media-a", undefined, "2026-08-28T00:00:00.000Z");
  const first = await lifecycle.purgeDue("user-a", undefined, "2026-08-30T01:00:00.000Z");
  assert.equal(first.deleted, 1);
  assert.equal(images.deleted.length, 1);
  const second = await lifecycle.purgeDue("user-a", undefined, "2026-08-30T02:00:00.000Z");
  assert.equal(second.alreadyDeleted, 1);
  assert.equal(images.deleted.length, 1);
});

test("deleted media cannot be resurrected by another temporary registration", async () => {
  const { lifecycle } = setup();
  await lifecycle.registerTemporary("user-a", "draft-a", "local-media-a", undefined, now);
  await lifecycle.applyConfirmedPolicy("user-a", "local-media-a", "meal-a", undefined, now);
  const retry = await lifecycle.registerTemporary("user-a", "draft-a", "local-media-a", undefined, "2026-08-31T03:00:00.000Z");
  assert.equal(retry.outcome, "ALREADY_DELETED");
});

test("failed blob deletion schedules a retry rather than retaining indefinitely", async () => {
  const { images, lifecycle } = setup();
  images.failDelete = true;
  await lifecycle.registerTemporary("user-a", "draft-a", "local-media-a", undefined, now);
  const result = await lifecycle.applyConfirmedPolicy("user-a", "local-media-a", "meal-a", undefined, now);
  assert.deepEqual(result, { outcome: "DELETE_SCHEDULED", deleteAfter: now });
});

test("cross-user media never becomes eligible", async () => {
  const { preferences, lifecycle } = setup();
  await preferences.save("user-a", {
    retainMealImages: true,
    imageRetentionDays: 30,
    analyticsAllowed: true,
    modelImprovementAllowed: true,
  });
  await preferences.save("user-b", {
    retainMealImages: true,
    imageRetentionDays: 30,
    analyticsAllowed: true,
    modelImprovementAllowed: true,
  });
  await lifecycle.registerTemporary("user-a", "draft-a", "local-media-a", undefined, now);
  await lifecycle.applyConfirmedPolicy("user-a", "local-media-a", "meal-a", undefined, now);
  assert.equal(await lifecycle.isModelImprovementEligible("user-b", "local-media-a", undefined, now), false);
  assert.equal((await lifecycle.applyConfirmedPolicy("user-b", "local-media-a", "meal-b", undefined, now)).outcome, "NOT_FOUND");
});

test("analytics consent does not imply model-improvement consent", async () => {
  const { preferences, lifecycle } = setup();
  await preferences.save("user-a", {
    retainMealImages: true,
    imageRetentionDays: 30,
    analyticsAllowed: true,
    modelImprovementAllowed: false,
  });
  const profile = await preferences.get("user-a");
  assert.equal(profile.analyticsAllowed, true);
  assert.equal(profile.modelImprovementAllowed, false);
  await lifecycle.registerTemporary("user-a", "draft-a", "local-media-a", undefined, now);
  await lifecycle.applyConfirmedPolicy("user-a", "local-media-a", "meal-a", undefined, now);
  assert.equal(await lifecycle.isModelImprovementEligible("user-a", "local-media-a", undefined, now), false);
});

test("model improvement requires explicit consent and active retained media", async () => {
  const { preferences, lifecycle } = setup();
  await preferences.save("user-a", {
    retainMealImages: true,
    imageRetentionDays: 30,
    analyticsAllowed: false,
    modelImprovementAllowed: true,
  });
  await lifecycle.registerTemporary("user-a", "draft-a", "local-media-a", undefined, now);
  assert.equal(await lifecycle.isModelImprovementEligible("user-a", "local-media-a", undefined, now), false);
  await lifecycle.applyConfirmedPolicy("user-a", "local-media-a", "meal-a", undefined, now);
  assert.equal(await lifecycle.isModelImprovementEligible("user-a", "local-media-a", undefined, now), true);
  assert.equal((await preferences.get("user-a")).analyticsAllowed, false);
});
