import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { TrainingPlanEnvelope } from "../../../../../algorithms/training/src/contracts.ts";
import { sha256 } from "../../domain/sync-store.ts";
import { CurrentTrainingPlanStore } from "../../training/current-plan-store.ts";
import {
  MemoryOwnerRepository,
  MemoryTablesClient,
} from "../helpers/memoryRepositories.ts";

const USER_A = "user-a";
const USER_B = "user-b";

function planEnvelope(
  planId = "plan-a",
  planRevision = 1,
  overrides: Partial<TrainingPlanEnvelope> = {},
): TrainingPlanEnvelope {
  return {
    schemaVersion: 1,
    planId,
    planRevision,
    programStateRef: "derived:history-a",
    profileRevision: 4,
    sessions: [
      {
        semanticSessionId: "session-1",
        localDate: "2026-08-31",
        purpose: "GENERAL_FITNESS",
        exercises: [],
      },
    ],
    exerciseCatalogVersion: "catalog-v1",
    trainingPolicyVersion: "training-policy-v1",
    programAlgorithmVersion: "program-v1",
    exerciseScoringVersion: "score-v1",
    progressionVersion: "progression-v1",
    algorithmBundleVersion: "bundle-v1",
    generatedAt: "2026-08-30T12:00:00.000Z",
    validity: {
      validFrom: "2026-08-30T12:00:00.000Z",
      expiresAt: null,
    },
    reasonCodes: ["CANONICAL_TEST_PLAN"],
    limitations: [],
    seed: "seed-a",
    ...overrides,
  };
}

function revisionRowId(planId: string, revision: number): string {
  return `wpr-${sha256(`${planId}:${revision}`).slice(0, 28)}`;
}

function seedHead(
  owner: MemoryOwnerRepository,
  userId: string,
  planId: string,
  revision: number,
  status = "ACTIVE",
): void {
  owner.seed("workout_plan", `wp-${planId}`, {
    userId,
    planId,
    currentRevision: revision,
    status,
    name: "MoveFuel Training Plan",
  });
}

function seedRevision(
  tables: MemoryTablesClient,
  plan: TrainingPlanEnvelope,
  overrides: Record<string, unknown> = {},
): string {
  const rowId = revisionRowId(plan.planId, plan.planRevision);
  const envelopeJson = JSON.stringify(plan);
  tables.seed("workout_plan_revision", rowId, {
    planRevisionId: rowId,
    planId: plan.planId,
    revision: plan.planRevision,
    envelopeJson,
    envelopeHash: sha256(envelopeJson),
    ...overrides,
  });
  return rowId;
}

function validFixture(planId = "plan-a", revision = 1) {
  const owner = new MemoryOwnerRepository();
  const tables = new MemoryTablesClient();
  const plan = planEnvelope(planId, revision);
  seedHead(owner, USER_A, planId, revision);
  seedRevision(tables, plan);
  const store = new CurrentTrainingPlanStore(owner, tables);
  return { owner, tables, plan, store };
}

async function storeSource(): Promise<string> {
  return readFile(new URL("../../training/current-plan-store.ts", import.meta.url), "utf8");
}

test("[PLAN 01/18] authenticated owner with ACTIVE head receives the exact stored canonical envelope", async () => {
  const { store, plan } = validFixture();
  const result = await store.readCurrent(USER_A);
  assert.equal(result.state, "CURRENT");
  assert.deepEqual(result.plan, plan);
});

test("[PLAN 02/18] returned plan ID equals the canonical head plan ID", async () => {
  const { store } = validFixture("canonical-plan-id", 3);
  const result = await store.readCurrent(USER_A);
  assert.equal(result.state, "CURRENT");
  assert.equal(result.plan?.planId, "canonical-plan-id");
});

test("[PLAN 03/18] returned revision equals the canonical head revision", async () => {
  const { store } = validFixture("plan-revision-match", 7);
  const result = await store.readCurrent(USER_A);
  assert.equal(result.state, "CURRENT");
  assert.equal(result.plan?.planRevision, 7);
});

test("[PLAN 04/18] recovery reads the exact immutable revision named by the current head", async () => {
  const owner = new MemoryOwnerRepository();
  const tables = new MemoryTablesClient();
  seedHead(owner, USER_A, "plan-a", 2);
  seedRevision(tables, planEnvelope("plan-a", 1, { reasonCodes: ["OLD_REVISION"] }));
  seedRevision(tables, planEnvelope("plan-a", 2, { reasonCodes: ["CURRENT_REVISION"] }));

  const result = await new CurrentTrainingPlanStore(owner, tables).readCurrent(USER_A);
  assert.equal(result.state, "CURRENT");
  assert.equal(result.plan?.planRevision, 2);
  assert.deepEqual(result.plan?.reasonCodes, ["CURRENT_REVISION"]);
});

test("[PLAN 05/18] owner with no active/current plan receives NO_CURRENT_PLAN", async () => {
  const result = await new CurrentTrainingPlanStore(
    new MemoryOwnerRepository(),
    new MemoryTablesClient(),
  ).readCurrent(USER_A);
  assert.deepEqual(result, { state: "NO_CURRENT_PLAN", plan: null });
});

test("[PLAN 06/18] authenticated owner cannot read a foreign owner's current plan", async () => {
  const owner = new MemoryOwnerRepository();
  const tables = new MemoryTablesClient();
  const foreign = planEnvelope("foreign-plan", 1);
  seedHead(owner, USER_B, foreign.planId, foreign.planRevision);
  seedRevision(tables, foreign);

  const result = await new CurrentTrainingPlanStore(owner, tables).readCurrent(USER_A);
  assert.deepEqual(result, { state: "NO_CURRENT_PLAN", plan: null });
});

test("[PLAN 07/18] archived or inactive plan is never presented as current", async () => {
  const owner = new MemoryOwnerRepository();
  const tables = new MemoryTablesClient();
  const archived = planEnvelope("archived-plan", 1);
  seedHead(owner, USER_A, archived.planId, archived.planRevision, "ARCHIVED");
  seedRevision(tables, archived);

  const result = await new CurrentTrainingPlanStore(owner, tables).readCurrent(USER_A);
  assert.deepEqual(result, { state: "NO_CURRENT_PLAN", plan: null });
});

test("[PLAN 08/18] missing referenced immutable revision fails safely", async () => {
  const owner = new MemoryOwnerRepository();
  const tables = new MemoryTablesClient();
  seedHead(owner, USER_A, "missing-revision-plan", 4);

  const result = await new CurrentTrainingPlanStore(owner, tables).readCurrent(USER_A);
  assert.equal(result.state, "INTEGRITY_FAILURE");
  assert.equal(result.plan, null);
  assert.equal(result.reasonCode, "TRAINING_PLAN_REVISION_MISSING");
  assert.equal(result.canonicalPlanId, "missing-revision-plan");
  assert.equal(result.canonicalRevision, 4);
});

test("[PLAN 09/18] immutable revision plan ID mismatch fails safely", async () => {
  const owner = new MemoryOwnerRepository();
  const tables = new MemoryTablesClient();
  const plan = planEnvelope("plan-a", 2);
  seedHead(owner, USER_A, plan.planId, plan.planRevision);
  seedRevision(tables, plan, { planId: "different-plan" });

  const result = await new CurrentTrainingPlanStore(owner, tables).readCurrent(USER_A);
  assert.equal(result.state, "INTEGRITY_FAILURE");
  assert.equal(result.reasonCode, "TRAINING_PLAN_REVISION_PLAN_ID_MISMATCH");
});

test("[PLAN 10/18] immutable revision number mismatch fails safely", async () => {
  const owner = new MemoryOwnerRepository();
  const tables = new MemoryTablesClient();
  const plan = planEnvelope("plan-a", 2);
  seedHead(owner, USER_A, plan.planId, plan.planRevision);
  seedRevision(tables, plan, { revision: 1 });

  const result = await new CurrentTrainingPlanStore(owner, tables).readCurrent(USER_A);
  assert.equal(result.state, "INTEGRITY_FAILURE");
  assert.equal(result.reasonCode, "TRAINING_PLAN_REVISION_NUMBER_MISMATCH");
});

test("[PLAN 11/18] stored envelope identity mismatch fails safely", async () => {
  const owner = new MemoryOwnerRepository();
  const tables = new MemoryTablesClient();
  const headPlan = planEnvelope("plan-a", 2);
  const wrongEnvelope = planEnvelope("plan-b", 2);
  seedHead(owner, USER_A, headPlan.planId, headPlan.planRevision);
  const rowId = revisionRowId(headPlan.planId, headPlan.planRevision);
  const envelopeJson = JSON.stringify(wrongEnvelope);
  tables.seed("workout_plan_revision", rowId, {
    planRevisionId: rowId,
    planId: headPlan.planId,
    revision: headPlan.planRevision,
    envelopeJson,
    envelopeHash: sha256(envelopeJson),
  });

  const result = await new CurrentTrainingPlanStore(owner, tables).readCurrent(USER_A);
  assert.equal(result.state, "INTEGRITY_FAILURE");
  assert.equal(result.reasonCode, "TRAINING_PLAN_ENVELOPE_PLAN_ID_MISMATCH");
});

test("[PLAN 12/18] immutable envelope hash mismatch fails safely", async () => {
  const owner = new MemoryOwnerRepository();
  const tables = new MemoryTablesClient();
  const plan = planEnvelope("plan-a", 2);
  seedHead(owner, USER_A, plan.planId, plan.planRevision);
  seedRevision(tables, plan, { envelopeHash: "tampered-hash" });

  const result = await new CurrentTrainingPlanStore(owner, tables).readCurrent(USER_A);
  assert.equal(result.state, "INTEGRITY_FAILURE");
  assert.equal(result.reasonCode, "TRAINING_PLAN_ENVELOPE_HASH_MISMATCH");
});

test("[PLAN 13/18] repeated current-plan GET semantics return the same canonical envelope", async () => {
  const { store, plan } = validFixture("stable-plan", 5);
  const first = await store.readCurrent(USER_A);
  const second = await store.readCurrent(USER_A);
  assert.deepEqual(first, second);
  assert.equal(first.state, "CURRENT");
  assert.deepEqual(first.plan, plan);
});

test("[PLAN 14/18] repeated current-plan recovery performs zero repository writes", async () => {
  const { owner, tables, store } = validFixture("read-only-plan", 2);
  const ownerWritesBefore = owner.writeCalls;
  const tableWritesBefore = tables.writeCalls;

  await store.readCurrent(USER_A);
  await store.readCurrent(USER_A);

  assert.equal(owner.writeCalls, ownerWritesBefore);
  assert.equal(tables.writeCalls, tableWritesBefore);
});

test("[PLAN 15/18] current-plan recovery has zero Training generation call surface", async () => {
  const { store } = validFixture("no-generation-plan", 1);
  assert.equal((await store.readCurrent(USER_A)).state, "CURRENT");
  const source = await storeSource();
  assert.equal(source.includes("TrainingBackendService"), false);
  assert.equal(source.includes("generateAndPersist"), false);
  assert.equal(source.includes("generateTraining"), false);
});

test("[PLAN 16/18] current-plan recovery has zero progression call surface", async () => {
  const { store } = validFixture("no-progression-plan", 1);
  assert.equal((await store.readCurrent(USER_A)).state, "CURRENT");
  const source = await storeSource();
  assert.equal(/\bapplyProgression\b|\bprogressTraining\b|\bProgressionEngine\b/.test(source), false);
});

test("[PLAN 17/18] current-plan recovery performs zero Calendar mutations", async () => {
  const { owner, tables, store } = validFixture("no-calendar-plan", 1);
  const ownerWritesBefore = owner.writeCalls;
  const tableWritesBefore = tables.writeCalls;
  assert.equal((await store.readCurrent(USER_A)).state, "CURRENT");
  const source = await storeSource();

  assert.equal(source.includes("CalendarService"), false);
  assert.equal(owner.writeCalls, ownerWritesBefore);
  assert.equal(tables.writeCalls, tableWritesBefore);
});

test("[PLAN 18/18] failed recovery never creates a replacement canonical plan", async () => {
  const owner = new MemoryOwnerRepository();
  const tables = new MemoryTablesClient();
  seedHead(owner, USER_A, "broken-plan", 9);
  const ownerRowsBefore = owner.rows.size;
  const tableRowsBefore = tables.rows.size;

  const result = await new CurrentTrainingPlanStore(owner, tables).readCurrent(USER_A);
  assert.equal(result.state, "INTEGRITY_FAILURE");
  assert.equal(result.reasonCode, "TRAINING_PLAN_REVISION_MISSING");
  assert.equal(owner.rows.size, ownerRowsBefore);
  assert.equal(tables.rows.size, tableRowsBefore);
  assert.equal(owner.writeCalls, 0);
  assert.equal(tables.writeCalls, 0);
});
