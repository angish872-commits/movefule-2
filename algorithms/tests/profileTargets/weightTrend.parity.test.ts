import assert from "node:assert/strict";
import { test } from "node:test";

import {
  normalizeWeightObservations,
  proposeWeightTrendRecalibration,
  type WeightObservation,
} from "../../src/profileTargets/weightTrend";

function series(
  startKg: number,
  stepKg: number,
  days = [0, 3, 6, 9, 12, 15, 18],
): WeightObservation[] {
  const base = Date.UTC(2026, 0, 1);
  return days.map((offset, index) => ({
    localDate: new Date(base + offset * 86_400_000)
      .toISOString()
      .slice(0, 10),
    weightKg: startKg + stepKg * index,
  }));
}

test("FORMULA_PARITY: fewer than 7 valid observations HOLD", () => {
  const result = proposeWeightTrendRecalibration({
    goal: "Maintain",
    currentEnergyTargetKcal: 2200,
    observations: series(70, 0, [0, 3, 6, 9, 12, 15]),
  });

  assert.equal(result.status, "HOLD");
  assert.equal(result.eligible, false);
  assert.equal(result.proposedAdjustmentKcal, 0);
  assert.equal(result.proposedTargetKcal, 2200);
});

test("FORMULA_PARITY: 7 observations with less than 14-day span HOLD", () => {
  const result = proposeWeightTrendRecalibration({
    goal: "Maintain",
    currentEnergyTargetKcal: 2200,
    observations: series(70, 0, [0, 2, 4, 6, 8, 10, 12]),
  });

  assert.equal(result.status, "HOLD");
  assert.equal(result.eligible, false);
  assert.equal(result.spanDays, 12);
});

test("FORMULA_PARITY: flat trend proposes no adjustment", () => {
  const result = proposeWeightTrendRecalibration({
    goal: "Maintain",
    currentEnergyTargetKcal: 2200,
    observations: series(70, 0),
  });

  assert.equal(result.status, "READY");
  assert.equal(result.proposedAdjustmentKcal, 0);
  assert.equal(result.proposedTargetKcal, 2200);
  assert.equal(result.observedWeeklyChangePercent, 0);
});

test("FORMULA_PARITY: trend inside goal band proposes no adjustment", () => {
  const result = proposeWeightTrendRecalibration({
    goal: "Maintain",
    currentEnergyTargetKcal: 2200,
    observations: series(70, 0.01),
  });

  assert.equal(result.status, "READY");
  assert.ok(result.observedWeeklyChangePercent !== null);
  assert.ok(result.observedWeeklyChangePercent <= 0.20);
  assert.ok(result.observedWeeklyChangePercent >= -0.20);
  assert.equal(result.proposedAdjustmentKcal, 0);
});

test("FORMULA_PARITY: trend above band proposes minus 100 kcal only", () => {
  const result = proposeWeightTrendRecalibration({
    goal: "Maintain",
    currentEnergyTargetKcal: 2200,
    observations: series(70, 0.25),
  });

  assert.equal(result.status, "READY");
  assert.ok((result.observedWeeklyChangePercent ?? 0) > 0.20);
  assert.equal(result.proposedAdjustmentKcal, -100);
  assert.equal(result.proposedTargetKcal, 2100);
  assert.equal(result.requiresUserConfirmation, true);
});

test("FORMULA_PARITY: trend below band proposes plus 100 kcal only", () => {
  const result = proposeWeightTrendRecalibration({
    goal: "Maintain",
    currentEnergyTargetKcal: 2200,
    observations: series(70, -0.25),
  });

  assert.equal(result.status, "READY");
  assert.ok((result.observedWeeklyChangePercent ?? 0) < -0.20);
  assert.equal(result.proposedAdjustmentKcal, 100);
  assert.equal(result.proposedTargetKcal, 2300);
  assert.equal(result.requiresUserConfirmation, true);
});

test("INTENTIONAL_MOVEFUEL_2_CHANGE: duplicate dates are averaged deterministically", () => {
  const observations: WeightObservation[] = [
    ...series(70, 0),
    { localDate: "2026-01-01", weightKg: 72 },
    { localDate: "2026-01-01", weightKg: 68 },
  ];

  const normalized = normalizeWeightObservations(observations);
  const first = normalized.find(
    (item) => item.day === Math.floor(Date.UTC(2026, 0, 1) / 86_400_000),
  );

  assert.equal(normalized.length, 7);
  assert.equal(first?.weightKg, 70);
});

test("INTENTIONAL_MOVEFUEL_2_CHANGE: invalid weights are ignored and out-of-order input is sorted", () => {
  const valid = series(70, 0);
  const observations: WeightObservation[] = [
    valid[6]!,
    { localDate: "not-a-date", weightKg: 70 },
    valid[0]!,
    { localDate: "2026-01-05", weightKg: -1 },
    ...valid.slice(1, 6).reverse(),
  ];

  const normalized = normalizeWeightObservations(observations);
  assert.equal(normalized.length, 7);

  for (let i = 1; i < normalized.length; i++) {
    assert.ok(normalized[i - 1]!.day < normalized[i]!.day);
  }

  const result = proposeWeightTrendRecalibration({
    goal: "Maintain",
    currentEnergyTargetKcal: 2200,
    observations,
  });

  assert.equal(result.status, "READY");
  assert.equal(result.proposedAdjustmentKcal, 0);
});

test("FORMULA_PARITY: one anomalous scale reading cannot produce an adjustment larger than 100 kcal", () => {
  const observations = series(70, 0);
  observations[3] = {
    ...observations[3]!,
    weightKg: 76,
  };

  const result = proposeWeightTrendRecalibration({
    goal: "Maintain",
    currentEnergyTargetKcal: 2200,
    observations,
  });

  assert.equal(result.status, "READY");
  assert.ok(Math.abs(result.proposedAdjustmentKcal) <= 100);
  assert.ok(
    Math.abs(result.proposedTargetKcal - 2200) <= 100,
  );
  assert.equal(result.requiresUserConfirmation, true);
});
