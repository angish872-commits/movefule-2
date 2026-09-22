import assert from "node:assert/strict";
import test from "node:test";
import type { CalendarEntry } from "../../calendar/types.ts";
import { createCanonicalTrainingAdaptationRequester } from "../../training/calendar-adaptation-requester.ts";
import { TrainingGenerationError, type GenerateCanonicalTrainingCommand, type TrainingGenerationCoordinator } from "../../training/generation-coordinator.ts";
import type { AppwriteTrainingPlanStore } from "../../training/plan-store.ts";

const entry = (overrides: Partial<CalendarEntry> = {}): CalendarEntry => ({
  schemaVersion: 1,
  entryId: "calendar-workout-1",
  userId: "u1",
  calendarRevisionId: "calendar-revision-1",
  calendarRevision: 1,
  semanticObjectType: "WORKOUT",
  semanticObjectId: "training-session-semantic-1",
  startAt: "2026-08-31T10:00:00.000Z",
  endAt: "2026-08-31T10:20:00.000Z",
  timezone: "UTC",
  localDate: "2026-08-31",
  status: "SCHEDULED",
  locked: false,
  reasonCodes: ["INITIAL_PLACEMENT"],
  ...overrides,
});

function harness(result: "READY" | "BLOCKED" = "READY") {
  const calls: Array<{ userId: string; command: GenerateCanonicalTrainingCommand }> = [];
  const coordinator = {
    generate: async (userId: string, command: GenerateCanonicalTrainingCommand) => {
      calls.push({ userId, command });
      if (result === "BLOCKED") return { status: "BLOCKED", reasonCodes: ["BLOCKED_FOR_TEST"], missingFields: [] } as const;
      return {
        status: "READY",
        plan: {} as never,
        dailyCandidates: [],
        persistenceOutcome: "CREATED",
      } as const;
    },
  } as Pick<TrainingGenerationCoordinator, "generate">;
  const revisions: Array<{ userId: string; planId: string }> = [];
  const plans = {
    currentRevision: async (userId: string, planId: string) => {
      revisions.push({ userId, planId });
      return 7;
    },
  } as Pick<AppwriteTrainingPlanStore, "currentRevision">;
  return { calls, revisions, requester: createCanonicalTrainingAdaptationRequester({ coordinator, plans }) };
}

test("Calendar adaptation requester forwards only WHEN constraint into canonical Training generation", async () => {
  const { calls, revisions, requester } = harness();
  await requester({ userId: "u1", entry: entry(), request: "SHORTEN", reasonCode: "USER_SHORTEN", operationId: "calendar-op-1" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.userId, "u1");
  assert.equal(calls[0]!.command.expectedPlanRevision, 7);
  assert.deepEqual(calls[0]!.command.calendarConstraint, {
    localDate: "2026-08-31",
    semanticSessionId: "training-session-semantic-1",
    availableMinutes: 20,
  });
  assert.equal("exercises" in (calls[0]!.command.calendarConstraint as object), false);
  assert.equal("sets" in (calls[0]!.command.calendarConstraint as object), false);
  assert.equal("reps" in (calls[0]!.command.calendarConstraint as object), false);
  assert.equal("progression" in (calls[0]!.command.calendarConstraint as object), false);
  assert.equal(revisions.length, 1);
  assert.match(revisions[0]!.planId, /^training-plan-/);
});

test("same Calendar operation derives the same Training idempotency key", async () => {
  const { calls, requester } = harness();
  const input = { userId: "u1", entry: entry(), request: "ADAPT" as const, reasonCode: "CALENDAR_CONFLICT", operationId: "calendar-op-stable" };
  await requester(input);
  await requester(input);
  assert.equal(calls.length, 2);
  assert.equal(calls[0]!.command.idempotencyKey, calls[1]!.command.idempotencyKey);
});

test("Calendar adaptation fails closed for a sub-10-minute placement before Training generation", async () => {
  const { calls, requester } = harness();
  await assert.rejects(
    requester({ userId: "u1", entry: entry({ endAt: "2026-08-31T10:09:59.000Z" }), request: "SHORTEN", reasonCode: "TOO_SHORT", operationId: "calendar-op-short" }),
    (error: unknown) => error instanceof TrainingGenerationError && error.code === "invalid_training_generation",
  );
  assert.equal(calls.length, 0);
});

test("Calendar adaptation requires the canonical semantic Training session", async () => {
  const { calls, requester } = harness();
  await assert.rejects(
    requester({ userId: "u1", entry: entry({ semanticObjectId: "" }), request: "ADAPT", reasonCode: "NO_SESSION", operationId: "calendar-op-no-session" }),
    (error: unknown) => error instanceof TrainingGenerationError && error.code === "invalid_training_generation",
  );
  assert.equal(calls.length, 0);
});

test("Calendar only acknowledges adaptation when deterministic Training returns READY", async () => {
  const { requester } = harness("BLOCKED");
  await assert.rejects(
    requester({ userId: "u1", entry: entry(), request: "ADAPT", reasonCode: "CONFLICT", operationId: "calendar-op-blocked" }),
    (error: unknown) => error instanceof TrainingGenerationError && error.code === "training_generation_recovery_failed",
  );
});
