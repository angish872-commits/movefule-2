import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildProductionPreflightReport } from "../production-preflight.ts";

const productionAppwrite = {
  MOVEFUEL_ENV: "production",
  MOVEFUEL_AUTH_MODE: "appwrite",
  MOVEFUEL_RUNTIME: "appwrite-functions",
  APPWRITE_ENDPOINT: "https://fra.cloud.appwrite.io/v1",
  APPWRITE_PROJECT_ID: "project_123",
  APPWRITE_DATABASE_ID: "movefuel_mvp",
  FUNCTION_API_ID: "movefuel_api",
};

test("production preflight requires the same durable Appwrite persistence inputs as server startup", () => {
  const report = buildProductionPreflightReport(productionAppwrite);
  assert.equal(report.ready, false);
  assert.equal(report.deploymentVerified, false);
  assert.deepEqual(report.issues.filter((issue) => issue.severity === "error").map((issue) => issue.code), ["meal_media_persistence_missing"]);
  assert.deepEqual(report.checks, {
    appwriteEndpoint: true,
    appwriteProjectId: true,
    appwriteDatabaseId: true,
    canonicalFunctionId: true,
    appwriteAuthMode: true,
    serverMediaPersistence: false,
    paidFeaturesSafe: true,
    publicAccuracyClaimsSafe: true,
    appwriteFunctionsRuntime: true,
    algorithmKnowledgeReady: false,
    portionCalibrationReady: false,
    reviewedRecipeArtifactValid: true,
    cameraReleaseSafe: true,
  });
});

test("production preflight rejects placeholders, insecure endpoints, and local auth mode", () => {
  const report = buildProductionPreflightReport({
    ...productionAppwrite,
    MOVEFUEL_AUTH_MODE: "local-test",
    APPWRITE_ENDPOINT: "http://localhost:8787/v1",
    APPWRITE_PROJECT_ID: "REPLACE_ME",
    APPWRITE_DATABASE_ID: "",
  });
  assert.equal(report.ready, false);
  assert.deepEqual(report.issues.filter((issue) => issue.severity === "error").map((issue) => issue.code), [
    "appwrite_endpoint_invalid",
    "appwrite_project_invalid",
    "appwrite_database_invalid",
    "production_auth_mode_invalid",
    "meal_media_persistence_missing",
  ]);
});

test("production preflight blocks live photo analysis until server-side Appwrite media persistence is complete", () => {
  const report = buildProductionPreflightReport({ ...productionAppwrite, GEMINI_API_KEY: "configured-test-key" });
  assert.equal(report.ready, false);
  assert.equal(report.checks.serverMediaPersistence, false);
  assert.deepEqual(report.issues.filter((issue) => issue.severity === "error").map((issue) => issue.code), ["meal_media_persistence_missing"]);

  const mediaReady = buildProductionPreflightReport({
    ...productionAppwrite,
    GEMINI_API_KEY: "configured-test-key",
    BUCKET_MEAL_MEDIA_ID: "meal-history-private",
  });
  assert.equal(mediaReady.ready, true);
});


test("production preflight fails closed when unverified billing or nutrition accuracy claims are enabled", () => {
  const report = buildProductionPreflightReport({
    ...productionAppwrite,
    BUCKET_MEAL_MEDIA_ID: "meal-history-private",
    MOVEFUEL_PAID_FEATURES_ENABLED: "true",
    MOVEFUEL_PUBLIC_NUTRITION_ACCURACY_CLAIM: "95% accurate",
  });
  assert.equal(report.ready, false);
  assert.equal(report.checks.paidFeaturesSafe, false);
  assert.equal(report.checks.publicAccuracyClaimsSafe, false);
  assert.deepEqual(report.issues.filter((issue) => issue.severity === "error").map((issue) => issue.code), [
    "production_billing_verifier_unimplemented",
    "nutrition_accuracy_claim_unverified",
  ]);
});


test("public camera release requires reviewed density and calibration artifacts", () => {
  const root = mkdtempSync(path.join(tmpdir(), "movefuel-preflight-artifacts-"));
  try {
    const knowledge = path.join(root, "knowledge.json");
    const calibration = path.join(root, "calibration.json");
    writeFileSync(knowledge, JSON.stringify({
      format: "movefuel-food-kb-snapshot-v1",
      density_records: [{
        density_id: "density-rice", source_id: "usda_fdc", source_version: "2026-08",
        food_name: "Rice, cooked", density_central_g_ml: 0.8, density_min_g_ml: 0.7, density_max_g_ml: 0.9,
        evidence_quality: "DERIVED", source_reference: "FoodData Central fdcId 1001",
      }],
    }));
    writeFileSync(calibration, JSON.stringify({ profiles: [{
      profileId: "global-portion-v3", scopeKey: "global", algorithmVersion: "3.1.0",
      targetCoverage: 0.9, lowerMultiplier: 0.8, medianMultiplier: 1, upperMultiplier: 1.2,
      sampleCount: 100, benchmarkVersion: "blind-held-out-1", calibratedAt: "2026-08-17T00:00:00Z",
    }] }));

    const missing = buildProductionPreflightReport({
      ...productionAppwrite,
      BUCKET_MEAL_MEDIA_ID: "meal-history-private",
      MOVEFUEL_CAMERA_PUBLIC_ENABLED: "true",
      MOVEFUEL_CAMERA_VALIDATION_ARTIFACT: "reviewed-benchmark-2026-08",
    });
    assert.equal(missing.ready, false);
    assert.deepEqual(missing.issues.filter((issue) => issue.severity === "error").map((issue) => issue.code), [
      "algorithm_knowledge_snapshot_missing",
      "portion_calibration_missing",
    ]);

    const ready = buildProductionPreflightReport({
      ...productionAppwrite,
      BUCKET_MEAL_MEDIA_ID: "meal-history-private",
      MOVEFUEL_CAMERA_PUBLIC_ENABLED: "true",
      MOVEFUEL_CAMERA_VALIDATION_ARTIFACT: "reviewed-benchmark-2026-08",
      MOVEFUEL_KNOWLEDGE_SNAPSHOT: knowledge,
      MOVEFUEL_PORTION_CALIBRATION_PROFILES: calibration,
    });
    assert.equal(ready.ready, true);
    assert.equal(ready.checks.algorithmKnowledgeReady, true);
    assert.equal(ready.checks.portionCalibrationReady, true);
    assert.equal(ready.checks.cameraReleaseSafe, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("production preflight freezes the canonical database, Function, and meal bucket ids", () => {
  const report = buildProductionPreflightReport({
    ...productionAppwrite,
    APPWRITE_DATABASE_ID: "movefuel-production",
    FUNCTION_API_ID: "movefuel_api-v2",
    BUCKET_MEAL_MEDIA_ID: "meal_media",
  });
  assert.equal(report.ready, false);
  assert.deepEqual(report.issues.filter((issue) => issue.severity === "error").map((issue) => issue.code), [
    "appwrite_database_invalid",
    "appwrite_function_invalid",
    "meal_media_bucket_invalid",
    "meal_media_persistence_missing",
  ]);
});
