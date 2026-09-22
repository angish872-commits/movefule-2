import assert from "node:assert/strict";
import test from "node:test";
import { ReportStore, reportSnapshotFromProgress } from "../../report/report-store.ts";
import type { ReportNarrativeInput } from "../../report/report-narrative.ts";

const snapshot: ReportNarrativeInput = {
  reportType: "weekly", periodStart: "2026-08-01", periodEnd: "2026-08-07", score: 82,
  scoreLabel: "Strong consistency", confidence: "High", observedDays: 7, totalDays: 7,
  confirmedMeals: 18, completedWorkouts: 4, workoutMinutes: 160,
  averageRecordedCalories: 2200, averageRecordedProteinGrams: 135,
  averageRecordedCarbohydrateGrams: 240, averageRecordedFatGrams: 70, averageRecordedFiberGrams: 27,
  strongestSignal: "Training consistency led the week.", nextAction: "Keep breakfast protein consistent.",
  evidenceNote: "Missing data is not treated as zero.",
  components: [{ key: "training", label: "Training", score: 100, evidence: "4 completed sessions" }],
};

test("report store freezes deterministic snapshot and exports the same score", async () => {
  const store = new ReportStore();
  const first = await store.create("u1", snapshot);
  const duplicate = await store.create("u1", snapshot);
  assert.equal(first.reportId, duplicate.reportId);
  const restored = await store.get("u1", first.reportId);
  assert.equal(restored?.snapshot.score, 82);
  const exported = await store.export("u1", first.reportId);
  assert.match(exported.content, /\"score\": 82/);
  assert.equal(exported.state, "COMPLETED");
});

test("backend progress creates a stable owner-scoped report snapshot and list", async () => {
  const progress = {
    periodStart: "2026-08-01", periodEnd: "2026-08-07", days: [],
    totals: { confirmedMeals: 3, completedWorkouts: 1, workoutMinutes: 45, completedSets: 6, trainingVolumeKg: 120, steps: null, activeEnergyKcal: null },
    averages: { recordedEnergyKcal: 2100, recordedProteinGrams: 110, recordedCarbGrams: null, recordedFatGrams: null, recordedFiberGrams: null, steps: null },
    coverage: { totalDays: 7, mealObservedDays: 2, stepObservedDays: 0, workoutObservedDays: 1 }, weightTrend: [],
  } as const;
  const store = new ReportStore();
  const created = await store.create("owner-a", reportSnapshotFromProgress(progress, "weekly"));
  assert.equal(created.snapshot.score, null);
  assert.equal((await store.list("owner-a")).length, 1);
  assert.equal((await store.list("owner-b")).length, 0);
});
