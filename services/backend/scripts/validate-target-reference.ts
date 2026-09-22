import fs from "node:fs";
import path from "node:path";
import {
  adultMaintenanceEnergyKcal,
  adolescentMaintenanceEnergyKcal,
  previewPersonalTargets,
  type ActivityCategory,
} from "../src/foundation/target-engine.ts";

type Sex = "male" | "female";

function referenceAdult(sex: Sex, activity: ActivityCategory, age: number, height: number, weight: number): number {
  // Independent transcription from NASEM 2023 Table S-1/S-3, intentionally
  // not calling MoveFuel's coefficient selector.
  const m: Record<ActivityCategory, [number, number, number, number]> = {
    inactive: [753.07, -10.83, 6.50, 14.10],
    low_active: [581.47, -10.83, 8.30, 14.94],
    active: [1004.82, -10.83, 6.52, 15.91],
    very_active: [-517.88, -10.83, 15.61, 19.11],
  };
  const f: Record<ActivityCategory, [number, number, number, number]> = {
    inactive: [584.90, -7.01, 5.72, 11.71],
    low_active: [575.77, -7.01, 6.60, 12.14],
    active: [710.25, -7.01, 6.54, 12.34],
    very_active: [511.83, -7.01, 9.07, 12.56],
  };
  const [a, b, c, d] = (sex === "male" ? m : f)[activity];
  return Math.round(a + b * age + c * height + d * weight);
}

function referenceAge18(sex: Sex, activity: ActivityCategory, age: number, height: number, weight: number): number {
  const m: Record<ActivityCategory, [number, number, number, number]> = {
    inactive: [-447.51, 3.68, 13.01, 13.15],
    low_active: [19.12, 3.68, 8.62, 20.28],
    active: [-388.19, 3.68, 12.66, 20.46],
    very_active: [-671.75, 3.68, 15.38, 23.25],
  };
  const f: Record<ActivityCategory, [number, number, number, number]> = {
    inactive: [55.59, -22.25, 8.43, 17.07],
    low_active: [-297.54, -22.25, 12.77, 14.73],
    active: [-189.55, -22.25, 11.74, 18.34],
    very_active: [-709.59, -22.25, 18.22, 14.25],
  };
  const [a, b, c, d] = (sex === "male" ? m : f)[activity];
  return Math.round(a + b * age + c * height + d * weight + 20);
}

let state = 0x51f15e;
function rand(): number {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 0x1_0000_0000;
}
function between(min: number, max: number): number { return min + rand() * (max - min); }

const activities: ActivityCategory[] = ["inactive", "low_active", "active", "very_active"];
const sexes: Sex[] = ["male", "female"];
const failures: unknown[] = [];
let parityCases = 0;
let goalMatrixCases = 0;
const goalMatrixFailures: unknown[] = [];

for (let i = 0; i < 240; i++) {
  const sex = sexes[i % sexes.length];
  const activity = activities[i % activities.length];
  const age = i < 32 ? 18 : Math.floor(between(19, 81));
  const height = Math.round(between(145, 201) * 10) / 10;
  const weight = Math.round(between(45, 151) * 10) / 10;
  const actual = age === 18
    ? adolescentMaintenanceEnergyKcal(sex, activity, age, height, weight)
    : adultMaintenanceEnergyKcal(sex, activity, age, height, weight);
  const expected = age === 18
    ? referenceAge18(sex, activity, age, height, weight)
    : referenceAdult(sex, activity, age, height, weight);
  parityCases++;
  if (actual !== expected) failures.push({ i, sex, activity, age, height, weight, expected, actual });

  const dob = `${2026 - age}-08-10`;
  const activityLabel = activity === "inactive" ? "Sedentary" : activity === "low_active" ? "Light" : activity === "active" ? "Moderate" : "Very active";
  for (const goal of ["Lose weight", "Maintain weight", "Gain muscle", "Improve performance"]) {
    const preview = previewPersonalTargets({
      dateOfBirth: dob,
      heightCm: height,
      weightKg: weight,
      sexForEnergyEstimate: sex === "male" ? "Male" : "Female",
      activityLevel: activityLabel,
      goal,
      now: new Date("2026-08-10T00:00:00Z"),
    });
    goalMatrixCases++;
    const roundedEer = Math.round(expected / 10) * 10;
    const expectedSuggested = goal === "Lose weight"
      ? Math.max(1000, Math.round((expected - 250) / 10) * 10)
      : goal === "Gain muscle"
        ? Math.max(1000, Math.round((expected + 200) / 10) * 10)
        : Math.max(1000, roundedEer);
    const proteinMultiplier = goal === "Maintain weight" ? 1.4 : 1.6;
    const expectedProtein = Math.max(0, Math.round((weight * proteinMultiplier) / 5) * 5);
    const rangeContainsSuggested = preview.energyRangeKcal !== null && preview.suggestedEnergyKcal !== null
      && preview.energyRangeKcal.minimum <= preview.suggestedEnergyKcal
      && preview.energyRangeKcal.maximum >= preview.suggestedEnergyKcal;
    if (
      !preview.supported
      || preview.maintenanceEnergyKcal !== expected
      || preview.suggestedEnergyKcal !== expectedSuggested
      || preview.proteinG !== expectedProtein
      || !rangeContainsSuggested
      || preview.proteinRangeG === null
      || preview.proteinRangeG.minimum > (preview.proteinG ?? 0)
      || preview.proteinRangeG.maximum < (preview.proteinG ?? 0)
    ) {
      goalMatrixFailures.push({
        i, sex, activity, age, height, weight, goal, expectedMaintenance: expected, expectedSuggested, expectedProtein, preview,
      });
    }
  }
}

const referenceProfile = {
  dateOfBirth: "1996-08-10",
  heightCm: 175,
  weightKg: 75,
  sexForEnergyEstimate: "Male",
  activityLevel: "Moderate",
  trainingFrequency: "4 days",
  now: new Date("2026-08-10T00:00:00Z"),
};

const goals = ["Lose weight", "Maintain weight", "Gain muscle", "Improve performance"];
const goalChecks = goals.map((goal) => {
  const preview = previewPersonalTargets({ ...referenceProfile, goal });
  return {
    goal,
    maintenanceEnergyKcal: preview.maintenanceEnergyKcal,
    suggestedEnergyKcal: preview.suggestedEnergyKcal,
    energyRangeKcal: preview.energyRangeKcal,
    proteinG: preview.proteinG,
    proteinRangeG: preview.proteinRangeG,
    carbohydrateG: preview.carbohydrateG,
    fatG: preview.fatG,
    fiberG: preview.fiberG,
    supported: preview.supported,
  };
});

const maintenance = goalChecks.find((x) => x.goal === "Maintain weight")!;
const lose = goalChecks.find((x) => x.goal === "Lose weight")!;
const gain = goalChecks.find((x) => x.goal === "Gain muscle")!;
const performance = goalChecks.find((x) => x.goal === "Improve performance")!;
const roundedMaintenance = maintenance.maintenanceEnergyKcal === null ? null : Math.round(maintenance.maintenanceEnergyKcal / 10) * 10;
const roundedPerformanceMaintenance = performance.maintenanceEnergyKcal === null ? null : Math.round(performance.maintenanceEnergyKcal / 10) * 10;
const goalInvariants = {
  maintenanceEqualsRoundedEer: maintenance.suggestedEnergyKcal === roundedMaintenance,
  loseStartsBelowMaintenance: (lose.suggestedEnergyKcal ?? Infinity) < (lose.maintenanceEnergyKcal ?? -Infinity),
  gainStartsAboveMaintenance: (gain.suggestedEnergyKcal ?? -Infinity) > (gain.maintenanceEnergyKcal ?? Infinity),
  performanceStartsAtRoundedMaintenance: performance.suggestedEnergyKcal === roundedPerformanceMaintenance,
  muscleProteinAtUpperGeneralBand: gain.proteinG === 120 && gain.proteinRangeG?.minimum === 90 && gain.proteinRangeG?.maximum === 120,
  allRequireSupportedTargets: goalChecks.every((g) => g.supported),
};

const payload = {
  validationVersion: "movefuel-target-reference-v4-2",
  generatedAt: new Date().toISOString(),
  referenceBasis: [
    "NASEM 2023 EER equations: independently transcribed parity check",
    "MoveFuel goal deltas remain provisional product rules and are validated as behavior, not as universal physiological truth",
    "Protein general planning band: 1.2-1.6 g/kg/day; muscle/performance/weight-loss central starts at 1.6 g/kg/day",
  ],
  parity: {
    cases: parityCases,
    failures: failures.length,
    passed: failures.length === 0,
    failureExamples: failures.slice(0, 10),
  },
  goalMatrix: {
    cases: goalMatrixCases,
    failures: goalMatrixFailures.length,
    passed: goalMatrixFailures.length === 0,
    failureExamples: goalMatrixFailures.slice(0, 10),
  },
  goalChecks,
  goalInvariants,
  passed: failures.length === 0 && goalMatrixFailures.length === 0 && Object.values(goalInvariants).every(Boolean),
};

const out = process.argv[2] ?? path.resolve(process.cwd(), "../../research/nutrition-research/reports/target-reference-validation.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(JSON.stringify(payload, null, 2));
if (!payload.passed) process.exitCode = 1;
