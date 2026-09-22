import assert from "node:assert/strict";
import test from "node:test";
import type { WorkoutSession } from "../../sync/types.ts";
import { activeWorkoutContinuity } from "../../today/context-adapters.ts";

const NOW = "2026-08-30T04:30:00.000Z";

function workout(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    sessionId: "session-active",
    authorityDeviceId: "watch-a",
    workoutType: "STRENGTH",
    state: "ACTIVE",
    currentRevision: 7,
    startedAtEpochMillis: Date.parse("2026-08-30T04:00:00.000Z"),
    createdAtEpochMillis: Date.parse("2026-08-30T03:59:00.000Z"),
    elapsedSeconds: 1_800,
    ...overrides,
  };
}

test("active workout continuity uses reconciled session identity and no Training prescription fields", () => {
  const result = activeWorkoutContinuity("user-a", [workout()], NOW);
  assert.ok(result);
  assert.equal(result.input.candidate.domain, "TRAINING");
  assert.equal(result.input.candidate.type, "CONTINUE_ACTIVE_WORKOUT");
  assert.equal(result.input.candidate.sourceObjectId, "session-active");
  assert.equal(result.input.candidate.sourceRevision, "7");
  assert.equal(result.input.continuity, "ACTIVE_WORKOUT");
  assert.equal(result.input.dependencyState, "SATISFIED");
  assert.equal(result.input.freshness, "FRESH");
  const serialized = JSON.stringify(result.input.candidate.deepLink).toLowerCase();
  for (const forbidden of ["sets", "reps", "load", "progression", "exercise"]) {
    assert.equal(serialized.includes(forbidden), false);
  }
  assert.deepEqual(result.projection, {
    sessionId: "session-active",
    state: "ACTIVE",
    revision: 7,
    elapsedSeconds: 1_800,
    workoutType: "STRENGTH",
  });
});

test("active workout continuity deterministically prefers ACTIVE then latest canonical revision", () => {
  const result = activeWorkoutContinuity("user-a", [
    workout({ sessionId: "paused-newer", state: "PAUSED", currentRevision: 20 }),
    workout({ sessionId: "active-old", state: "ACTIVE", currentRevision: 6 }),
    workout({ sessionId: "active-new", state: "ACTIVE", currentRevision: 9 }),
  ], NOW);
  assert.equal(result?.input.candidate.sourceObjectId, "active-new");
  assert.equal(result?.input.candidate.sourceRevision, "9");
});

test("no ACTIVE or PAUSED canonical workout creates no Today continuity action", () => {
  const result = activeWorkoutContinuity("user-a", [
    workout({ state: "COMPLETED" }),
    workout({ sessionId: "failed", state: "FAILED" }),
  ], NOW);
  assert.equal(result, null);
});
