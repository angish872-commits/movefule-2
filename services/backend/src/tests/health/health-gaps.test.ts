import assert from "node:assert/strict";
import test from "node:test";
import { HealthStore } from "../../health/health-store.ts";

test("health gap assessment distinguishes missing, observed, partial, and covered windows", () => {
  const store = new HealthStore({ now: () => 1_754_000_000_000 });
  const base = { connectionId: "health-a", platform: "manual" as const, sourceName: "Fixture", permissionState: "GRANTED" as const, dataType: "steps", samples: [{ localDate: "2026-08-03", value: 10, unit: "count", measuredStart: "2026-08-03T08:00:00.000Z", measuredEnd: "2026-08-03T12:00:00.000Z" }] };
  assert.equal(store.assessGap("user-a", { localDate: "2026-08-03", dataType: "steps" }).status, "MISSING");
  store.import("user-a", base);
  assert.equal(store.assessGap("user-a", { localDate: "2026-08-03", dataType: "steps" }).status, "OBSERVED");
  assert.equal(store.assessGap("user-a", { localDate: "2026-08-03", dataType: "steps", expectedStart: "2026-08-03T00:00:00.000Z", expectedEnd: "2026-08-03T23:59:59.000Z" }).status, "PARTIAL");
  assert.equal(store.assessGap("user-a", { localDate: "2026-08-03", dataType: "steps", expectedStart: "2026-08-03T08:00:00.000Z", expectedEnd: "2026-08-03T12:00:00.000Z" }).status, "COVERED");
});
