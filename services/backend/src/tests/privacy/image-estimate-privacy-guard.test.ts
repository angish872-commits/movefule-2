import assert from "node:assert/strict";
import test from "node:test";
import { ImageEstimatePipelineError, type EstimateCorrection, type ImageEstimateResult } from "../../nutrition/algorithm/imageEstimatePipeline.ts";
import type { DraftEstimateInput, LiveImageEstimateServiceLike } from "../../nutrition/service/liveImageEstimateService.ts";
import { PrivacyGuardedImageEstimateService } from "../../privacy/image-estimate-privacy-guard.ts";

function delegate(calls: { estimate: number; learn: number }): LiveImageEstimateServiceLike {
  const result = { resultId: "result-1", ownerUserId: "user-a" } as unknown as ImageEstimateResult;
  return {
    configured: true,
    algorithmVersion: "test",
    async estimate() { calls.estimate += 1; return result; },
    get() { return result; },
    correct(_resultId: string, _ownerUserId: string, _itemId: string, _correction: EstimateCorrection) { return result; },
    async learnConfirmed() { calls.learn += 1; },
  };
}

const request: DraftEstimateInput = {
  ownerUserId: "user-a",
  draftId: "draft-1",
  idempotencyKey: "estimate-1",
  imageReference: "private-object-1",
};

test("external meal-image analysis is blocked before the provider when camera analysis is not allowed", async () => {
  const calls = { estimate: 0, learn: 0 };
  const guarded = new PrivacyGuardedImageEstimateService(delegate(calls), {
    mealImageAnalysisAllowed: async () => false,
    modelImprovementAllowed: async () => false,
  });
  await assert.rejects(
    guarded.estimate(request),
    (error: unknown) => error instanceof ImageEstimatePipelineError && error.code === "meal_image_analysis_consent_required",
  );
  assert.equal(calls.estimate, 0);
});

test("disabling model improvement prevents confirmed meal data from entering personalization", async () => {
  const calls = { estimate: 0, learn: 0 };
  const guarded = new PrivacyGuardedImageEstimateService(delegate(calls), {
    mealImageAnalysisAllowed: async () => true,
    modelImprovementAllowed: async () => false,
  });
  await guarded.estimate(request);
  await guarded.learnConfirmed("result-1", "user-a");
  assert.equal(calls.estimate, 1);
  assert.equal(calls.learn, 0);
});

test("model-improvement opt-in is independent from meal-image analysis permission", async () => {
  const calls = { estimate: 0, learn: 0 };
  const guarded = new PrivacyGuardedImageEstimateService(delegate(calls), {
    mealImageAnalysisAllowed: async () => true,
    modelImprovementAllowed: async () => true,
  });
  await guarded.estimate(request);
  await guarded.learnConfirmed("result-1", "user-a");
  assert.equal(calls.estimate, 1);
  assert.equal(calls.learn, 1);
});

test("forwards the request-scoped Appwrite token to privacy policy checks", async () => {
  const calls = { estimate: 0, learn: 0 };
  let seen: { userId: string; accessToken?: string } | undefined;
  const guarded = new PrivacyGuardedImageEstimateService(delegate(calls), {
    mealImageAnalysisAllowed: async (context) => {
      seen = context;
      return false;
    },
    modelImprovementAllowed: async () => false,
  });
  await assert.rejects(guarded.estimate({ ...request, accessToken: "jwt-for-test" }));
  assert.deepEqual(seen, { userId: "user-a", accessToken: "jwt-for-test" });
  assert.equal(calls.estimate, 0);
});
