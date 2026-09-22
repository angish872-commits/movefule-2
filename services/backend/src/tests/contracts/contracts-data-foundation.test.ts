import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";

const backendRoot = resolve(import.meta.dirname, "../../..");
const repositoryRoot = resolve(backendRoot, "../..");
const migrations = resolve(backendRoot, "migrations");

async function json(path: string): Promise<any> {
  return JSON.parse(await readFile(path, "utf8"));
}

const requiredRecords = [
  "CoreProfile", "NutritionProfile", "TrainingProfile", "TargetState", "SetupState",
  "PrivacyProfile", "AccessibilityProfile", "DeviceProfile", "MealDraft", "FoodIdentity",
  "PortionEvidence", "NutritionSnapshot", "ConfirmedMeal", "CorrectionEvent", "NutritionState",
  "NutritionDataQuality", "RecommendationCandidate", "NutritionRecommendation", "TrainingProgramState",
  "SessionRequirement", "TrainingPlanEnvelope", "WorkoutSessionRevision", "WorkoutEvent",
  "CalendarRevision", "CalendarEntry", "MoveCalendarEntryCommand", "LockCalendarEntryCommand",
  "CalendarConflict", "DailyActionCandidate", "DailyDecisionEnvelope", "TodayState",
  "WatchTodayProjection", "SyncEnvelope", "SyncReceipt"
];

test("canonical registry freezes required v1 cross-platform contracts", async () => {
  const registry = await json(resolve(repositoryRoot, "contracts/canonical/v1/contracts.json"));
  assert.equal(registry.contractFamily, "movefuel");
  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.compatibility.unknownEnumPolicy, "reject");
  assert.equal(registry.compatibility.unknownFieldPolicy, "ignore");
  for (const name of requiredRecords) assert.ok(registry.records[name], `missing record ${name}`);
  for (const record of Object.values<any>(registry.records)) {
    if (record.fields.schemaVersion) assert.equal(record.fields.schemaVersion, "int");
  }
  assert.equal(registry.records.TargetState.fields.eligibilityDecision, "EligibilityDecision");
  assert.equal(registry.records.TargetState.fields.policyVersion, "string");
  assert.equal(registry.records.SyncEnvelope.fields.deviceSessionId, "string");
  assert.equal(registry.records.SyncEnvelope.fields.expectedEntityRevision, "int?");
});

test("generated platform contracts are checked in from the same registry", async () => {
  for (const path of [
    "contracts/generated/typescript/MoveFuelContractsV1.ts",
    "contracts/generated/kotlin/MoveFuelContractsV1.kt",
    "contracts/generated/swift/MoveFuelContractsV1.swift"
  ]) {
    const content = await readFile(resolve(repositoryRoot, path), "utf8");
    assert.match(content, /Generated from contracts\/canonical\/v1\/contracts\.json/);
    assert.match(content, /schemaVersion=1/);
    for (const name of ["CoreProfile", "ConfirmedMeal", "TrainingPlanEnvelope", "TodayState", "SyncReceipt"]) {
      assert.ok(content.includes(name), `${path} missing ${name}`);
    }
  }
});

test("reviewed 77-table snapshot plus four approved additions equals 81", async () => {
  const snapshot = await json(resolve(migrations, "appwrite-snapshot-20260802.json"));
  const serving = await json(resolve(migrations, "algorithm-personalization-wave.v1.json"));
  const workout = await json(resolve(migrations, "workout-session-revision-fix-wave.v1.json"));
  const foundation = await json(resolve(migrations, "contracts-data-foundation-wave.v1.json"));
  const reviewed = new Set(snapshot.resources.map((row: any) => row.id).filter(Boolean));
  assert.equal(reviewed.size, 77);
  const additions = [
    ...serving.resources.map((row: any) => row.id),
    ...workout.resources.map((row: any) => row.id),
    ...foundation.resourcePolicy.newTableIds
  ];
  assert.deepEqual(new Set(additions), new Set(["serving_prior_observation", "workout_session_revision", "calendar_revision", "calendar_entry"]));
  assert.equal(new Set([...reviewed, ...additions]).size, 81);
});

test("Calendar and workout revisions have immutable identity and lookup indexes", async () => {
  const foundation = await json(resolve(migrations, "contracts-data-foundation-wave.v1.json"));
  const workout = await json(resolve(migrations, "workout-session-revision-fix-wave.v1.json"));
  const resource = (manifest: any, id: string) => manifest.resources.find((row: any) => row.id === id);
  const index = (row: any, key: string) => row.indexDefinitions.find((item: any) => item.key === key);
  assert.deepEqual(index(resource(foundation, "calendar_revision"), "calendar_user_revision_unique").columns, ["userId", "revision"]);
  assert.deepEqual(index(resource(foundation, "calendar_entry"), "calendar_entry_revision_identity_unique").columns, ["calendarRevisionId", "entryId"]);
  assert.deepEqual(index(resource(workout, "workout_session_revision"), "workout_session_revision_unique").columns, ["sessionId", "revision"]);
  assert.equal(resource(workout, "workout_session_revision").requiresReview, true);
});

test("existing sync authorities are extended without duplicate resources", async () => {
  const foundation = await json(resolve(migrations, "contracts-data-foundation-wave.v1.json"));
  const expected = new Set(["sync_operation", "sync_cursor", "idempotency_key", "device_command", "watch_delivery", "watch_receipt", "target_revision", "daily_recommendation", "meal_revision"]);
  assert.deepEqual(new Set(foundation.resourcePolicy.extendedTableIds), expected);
  const actual = foundation.resources.filter((row: any) => row.operation === "extend_existing");
  assert.deepEqual(new Set(actual.map((row: any) => row.id)), expected);
  const cursor = actual.find((row: any) => row.id === "sync_cursor");
  assert.deepEqual(cursor.indexDefinitions.find((row: any) => row.key === "sync_cursor_scope_unique").columns, ["userId", "deviceId", "deviceSessionId", "stream"]);
});

test("manual targets persist a server policy decision", async () => {
  const foundation = await json(resolve(migrations, "contracts-data-foundation-wave.v1.json"));
  const target = foundation.resources.find((row: any) => row.id === "target_revision");
  const columns = new Set(target.typedColumns.map((row: any) => row.key));
  for (const key of ["manualEntry", "eligibilityDecision", "eligibilityReasonCodesJson", "policyVersion", "populationClass"]) assert.ok(columns.has(key));
  assert.equal(target.permissions.length, 0);
});
