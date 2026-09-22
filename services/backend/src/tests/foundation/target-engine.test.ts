import assert from "node:assert/strict";
import test from "node:test";
import {
  adolescentMaintenanceEnergyKcal,
  adultMaintenanceEnergyKcal,
  ageInYears,
  parseActivityCategory,
  previewPersonalTargets,
  recalibrateEnergyFromWeightTrend,
} from "../../foundation/target-engine.ts";

test("adult EER uses the 2023 male inactive equation", () => {
  assert.equal(adultMaintenanceEnergyKcal("male", "inactive", 30, 175, 75), 2623);
});

test("adult EER uses the 2023 female active equation", () => {
  assert.equal(adultMaintenanceEnergyKcal("female", "active", 30, 165, 60), 2319);
});

test("age-18 EER uses the 2023 adolescent equation plus growth allowance", () => {
  assert.equal(adolescentMaintenanceEnergyKcal("male", "active", 18, 175, 75), 3448);
  assert.equal(adolescentMaintenanceEnergyKcal("female", "active", 18, 165, 60), 2467);
});

test("age calculation uses completed years", () => {
  assert.equal(ageInYears("2000-08-08", new Date("2026-08-07T00:00:00Z")), 25);
  assert.equal(ageInYears("2000-08-07", new Date("2026-08-07T00:00:00Z")), 26);
});

test("explicit overall activity category outranks training frequency", () => {
  assert.equal(parseActivityCategory("Inactive", "6 days"), "inactive");
  assert.equal(parseActivityCategory("Moderate", "1 day"), "active");
});

test("training frequency is a fallback when overall activity is unspecified", () => {
  assert.equal(parseActivityCategory("Not specified", "4 days"), "active");
});

test("preview produces science-calibrated energy, protein, macros and fiber for a supported adult", () => {
  const preview = previewPersonalTargets({
    dateOfBirth: "1996-08-07",
    heightCm: 175,
    weightKg: 75,
    sexForEnergyEstimate: "Male",
    activityLevel: "Moderate",
    trainingFrequency: "4 days",
    goal: "Gain muscle",
    now: new Date("2026-08-07T00:00:00Z"),
  });
  assert.equal(preview.supported, true);
  assert.equal(preview.maintenanceEnergyKcal, 3014);
  assert.equal(preview.suggestedEnergyKcal, 3210);
  assert.equal(preview.proteinG, 120);
  assert.deepEqual(preview.proteinRangeG, { minimum: 90, maximum: 120 });
  assert.equal(preview.fiberG, 45);
  assert.equal(preview.requiresUserConfirmation, true);
  assert.ok(preview.energyRangeKcal);
  assert.ok(preview.energyRangeKcal!.minimum <= Math.round(3210 * 0.85 / 10) * 10);
  assert.ok(preview.energyRangeKcal!.maximum >= Math.round(3210 * 1.15 / 10) * 10);
});

test("18-year-old users receive the reviewed adolescent EER path", () => {
  const preview = previewPersonalTargets({
    dateOfBirth: "2008-08-07",
    heightCm: 175,
    weightKg: 75,
    sexForEnergyEstimate: "Male",
    activityLevel: "Moderate",
    goal: "Maintain weight",
    now: new Date("2026-08-07T00:00:00Z"),
  });
  assert.equal(preview.ageYears, 18);
  assert.equal(preview.maintenanceEnergyKcal, 3448);
  assert.equal(preview.suggestedEnergyKcal, 3450);
  assert.equal(preview.supported, true);
});

test("automatic calorie targets stay unavailable below the commercial 18+ boundary", () => {
  const preview = previewPersonalTargets({
    dateOfBirth: "2010-08-07",
    heightCm: 170,
    weightKg: 60,
    sexForEnergyEstimate: "Male",
    activityLevel: "Moderate",
    goal: "Maintain weight",
    now: new Date("2026-08-07T00:00:00Z"),
  });
  assert.equal(preview.suggestedEnergyKcal, null);
  assert.equal(preview.supported, false);
  assert.ok(preview.notes.some((note) => note.includes("18+")));
});

test("general maintenance protein uses the current 1.2-1.6 g/kg planning range", () => {
  const preview = previewPersonalTargets({
    dateOfBirth: "1990-01-01",
    heightCm: 170,
    weightKg: 70,
    sexForEnergyEstimate: "Female",
    activityLevel: "Inactive",
    goal: "Maintain weight",
    now: new Date("2026-08-07T00:00:00Z"),
  });
  assert.equal(preview.proteinG, 100);
  assert.deepEqual(preview.proteinRangeG, { minimum: 85, maximum: 110 });
});

test("weight-trend calibration does not react before two weeks of data", () => {
  const result = recalibrateEnergyFromWeightTrend({
    goal: "Lose weight",
    currentEnergyTargetKcal: 2200,
    observations: [
      { localDate: "2026-08-01", weightKg: 80 },
      { localDate: "2026-08-03", weightKg: 79.9 },
      { localDate: "2026-08-05", weightKg: 79.8 },
    ],
  });
  assert.equal(result.eligible, false);
  assert.equal(result.recommendedEnergyAdjustmentKcal, 0);
});

test("weight-trend calibration proposes a small correction when loss is too slow", () => {
  const observations = Array.from({ length: 15 }, (_, i) => ({
    localDate: `2026-07-${String(15 + i).padStart(2, "0")}`,
    weightKg: 80 - i * 0.005,
  }));
  const result = recalibrateEnergyFromWeightTrend({
    goal: "Lose weight",
    currentEnergyTargetKcal: 2200,
    observations,
  });
  assert.equal(result.eligible, true);
  assert.ok(result.observedWeeklyWeightChangePercent! > -0.25);
  assert.equal(result.recommendedEnergyAdjustmentKcal, -100);
  assert.equal(result.proposedEnergyTargetKcal, 2100);
  assert.equal(result.requiresUserConfirmation, true);
});

test("extreme profiles surface an AMDR review warning instead of false macro certainty", () => {
  const preview = previewPersonalTargets({
    dateOfBirth: "1986-08-10",
    heightCm: 150,
    weightKg: 180,
    sexForEnergyEstimate: "Female",
    activityLevel: "Inactive",
    goal: "Lose weight",
    now: new Date("2026-08-10T00:00:00Z"),
  });
  assert.equal(preview.supported, true);
  assert.ok(preview.notes.some((note) => note.includes("AMDR")));
});

test("malformed training text never elevates activity from embedded digits", () => {
  assert.equal(parseActivityCategory("Not specified", "note: trained 7 years ago"), "inactive");
  assert.equal(parseActivityCategory("Not specified", "17 days"), "inactive");
});
