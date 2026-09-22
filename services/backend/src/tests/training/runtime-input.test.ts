import assert from "node:assert/strict";
import test from "node:test";
import type { TrainingHistorySession } from "../../../../../algorithms/training/src/contracts.ts";
import type { CalendarSnapshot } from "../../calendar/types.ts";
import type { ProfileResult } from "../../foundation/profile.ts";
import type { RepositoryRow } from "../../foundation/repository.ts";
import { TrainingRuntimeInputBuilder } from "../../training/runtime-input.ts";
import type { StoredTrainingSetup } from "../../training/setup-service.ts";

const profile = (dateOfBirth = "2000-01-01"): ProfileResult => ({
  userId: "user-a",
  source: "appwrite",
  profile: { $id: "user-a", userId: "user-a", dateOfBirth, timeZone: "UTC", revision: 3, updatedAt: "2026-08-29T00:00:00.000Z" },
  onboarding: {},
  preferences: {},
  goal: { goalType: "GENERAL_FITNESS" },
  target: null,
});

const setup: StoredTrainingSetup = {
  experienceBand: "BEGINNER",
  equipmentCodes: [],
  environmentCodes: ["HOME"],
  availabilityMinutesByDay: { SUNDAY: 60, MONDAY: 45 },
  preferenceCodes: [],
  limitationCodes: [],
  revision: 2,
  updatedAt: "2026-08-29T01:00:00.000Z",
};

const emptyCalendar: CalendarSnapshot = { revision: { schemaVersion: 1, calendarRevisionId: "cal-1", userId: "user-a", revision: 1, baseRevision: 0, entryHash: "h", operationId: "op", idempotencyKey: "key", reasonCodes: [], publishedAt: "2026-08-29T00:00:00.000Z" }, entries: [] };

function builder(options: {
  profileResult?: ProfileResult | null;
  trainingSetup?: StoredTrainingSetup | null;
  calendar?: CalendarSnapshot | null;
  canonicalHistory?: readonly TrainingHistorySession[];
  wellness?: readonly RepositoryRow[];
} = {}) {
  return new TrainingRuntimeInputBuilder({
    profileFor: async () => options.profileResult === undefined ? profile() : options.profileResult,
    setupFor: async () => options.trainingSetup === undefined ? setup : options.trainingSetup,
    canonicalHistoryFor: async () => options.canonicalHistory ?? [],
    calendarFor: async () => options.calendar === undefined ? emptyCalendar : options.calendar,
    wellnessFor: async () => options.wellness ?? [],
  });
}

test("missing setup returns a typed setup action and does not invent equipment or availability", async () => {
  const result = await builder({ trainingSetup: null }).build("user-a", "2026-08-30T03:00:00.000Z");
  assert.equal(result.status, "MISSING_INFORMATION");
  if (result.status !== "MISSING_INFORMATION") return;
  assert.equal(result.action.type, "TRAINING_SETUP");
  assert.ok(result.action.missingFields.includes("equipmentCodes"));
  assert.ok(result.action.missingFields.includes("availabilityMinutesByDay"));
  assert.deepEqual(result.partialProfile.equipmentCodes, []);
  assert.deepEqual(result.partialProfile.availabilityMinutesByDay, {});
});

test("missing date of birth keeps policy band unknown instead of assuming adult", async () => {
  const result = await builder({ profileResult: profile("") }).build("user-a", "2026-08-30T03:00:00.000Z");
  assert.equal(result.status, "MISSING_INFORMATION");
  if (result.status !== "MISSING_INFORMATION") return;
  assert.ok(result.action.missingFields.includes("policyBand"));
});

test("runtime derives explicit youth policy and leaves absent readiness observations unknown", async () => {
  const result = await builder({ profileResult: profile("2012-01-01") }).build("user-a", "2026-08-30T03:00:00.000Z");
  assert.equal(result.status, "READY");
  if (result.status !== "READY") return;
  assert.equal(result.input.policyBand, "YOUTH");
  assert.equal(result.input.readiness.sleepQuality, null);
  assert.equal(result.input.readiness.energy, null);
  assert.equal(result.input.readiness.motivation, null);
  assert.equal(result.input.readiness.soreness, null);
});

test("Calendar consumes time but never invents a replacement window", async () => {
  const calendar: CalendarSnapshot = {
    ...emptyCalendar,
    entries: [{
      schemaVersion: 1,
      entryId: "busy-1",
      userId: "user-a",
      calendarRevisionId: "cal-1",
      calendarRevision: 1,
      semanticObjectType: "OTHER",
      semanticObjectId: "event-1",
      startAt: "2026-08-30T10:00:00.000Z",
      endAt: "2026-08-30T10:30:00.000Z",
      timezone: "UTC",
      localDate: "2026-08-30",
      status: "SCHEDULED",
      locked: false,
      reasonCodes: [],
    }],
  };
  const result = await builder({ calendar }).build("user-a", "2026-08-30T03:00:00.000Z");
  assert.equal(result.status, "READY");
  if (result.status !== "READY") return;
  const sunday = result.input.availability.find((slot) => slot.localDate === "2026-08-30");
  assert.equal(sunday?.availableMinutes, 30);
});

test("runtime preserves canonical performed history and augments it with Calendar MISSED", async () => {
  const calendar: CalendarSnapshot = {
    ...emptyCalendar,
    entries: [{
      schemaVersion: 1,
      entryId: "missed-1",
      userId: "user-a",
      calendarRevisionId: "cal-1",
      calendarRevision: 1,
      semanticObjectType: "TRAINING_SESSION",
      semanticObjectId: "session-missed",
      startAt: "2026-08-24T10:00:00.000Z",
      endAt: "2026-08-24T10:30:00.000Z",
      timezone: "UTC",
      localDate: "2026-08-24",
      status: "MISSED",
      locked: false,
      reasonCodes: [],
    }],
  };
  const canonicalHistory: readonly TrainingHistorySession[] = [{
    sessionId: "session-completed",
    localDate: "2026-08-23",
    status: "COMPLETED",
    planRevisionId: "plan-rev-1",
    durationMinutes: 30,
    exerciseIds: ["row", "squat"],
    totalSets: 3,
  }];
  const source = builder({ calendar, canonicalHistory });
  const first = await source.build("user-a", "2026-08-30T03:00:00.000Z");
  const second = await source.build("user-a", "2026-08-30T03:00:00.000Z");
  assert.deepEqual(second, first);
  assert.equal(first.status, "READY");
  if (first.status !== "READY") return;
  assert.deepEqual(first.input.history.map((item) => item.status), ["COMPLETED", "MISSED"]);
  assert.deepEqual(first.input.history[0]?.exerciseIds, ["row", "squat"]);
  assert.equal(first.input.history[0]?.totalSets, 3);
  assert.equal(first.input.history[0]?.durationMinutes, 30);
});
