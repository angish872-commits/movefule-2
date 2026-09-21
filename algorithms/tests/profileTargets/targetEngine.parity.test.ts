import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_FAT_ENERGY_SHARE,
  calculateMaintenanceEnergy,
  calculatePersonalTargets,
  type ActivityCategory,
  type EnergyEquationCategory,
  type TargetGoal,
} from "../../src/profileTargets/targetEngine";

type ReferenceEquation = readonly [number, number, number, number];

const ADULT_MALE: Record<ActivityCategory, ReferenceEquation> = {
  INACTIVE: [753.07, -10.83, 6.50, 14.10],
  LOW_ACTIVE: [581.47, -10.83, 8.30, 14.94],
  ACTIVE: [1004.82, -10.83, 6.52, 15.91],
  VERY_ACTIVE: [-517.88, -10.83, 15.61, 19.11],
};

const ADULT_FEMALE: Record<ActivityCategory, ReferenceEquation> = {
  INACTIVE: [584.90, -7.01, 5.72, 11.71],
  LOW_ACTIVE: [575.77, -7.01, 6.60, 12.14],
  ACTIVE: [710.25, -7.01, 6.54, 12.34],
  VERY_ACTIVE: [511.83, -7.01, 9.07, 12.56],
};

const AGE18_MALE: Record<ActivityCategory, ReferenceEquation> = {
  INACTIVE: [-447.51, 3.68, 13.01, 13.15],
  LOW_ACTIVE: [19.12, 3.68, 8.62, 20.28],
  ACTIVE: [-388.19, 3.68, 12.66, 20.46],
  VERY_ACTIVE: [-671.75, 3.68, 15.38, 23.25],
};

const AGE18_FEMALE: Record<ActivityCategory, ReferenceEquation> = {
  INACTIVE: [55.59, -22.25, 8.43, 17.07],
  LOW_ACTIVE: [-297.54, -22.25, 12.77, 14.73],
  ACTIVE: [-189.55, -22.25, 11.74, 18.34],
  VERY_ACTIVE: [-709.59, -22.25, 18.22, 14.25],
};

function referenceMaintenance(
  energyCategory: EnergyEquationCategory,
  activity: ActivityCategory,
  age: number,
  heightCm: number,
  weightKg: number,
): number {
  const age18 = age === 18;
  const table = age18
    ? energyCategory === "MALE"
      ? AGE18_MALE
      : AGE18_FEMALE
    : energyCategory === "MALE"
      ? ADULT_MALE
      : ADULT_FEMALE;

  const [a, b, c, d] = table[activity];
  return Math.round(
    a + b * age + c * heightCm + d * weightKg + (age18 ? 20 : 0),
  );
}

function goalAdjustment(goal: TargetGoal): number {
  return goal === "LOSE" ? -250 : goal === "GAIN" ? 200 : 0;
}

function round10(value: number): number {
  return Math.round(value / 10) * 10;
}

function round5(value: number): number {
  return Math.max(0, Math.round(value / 5) * 5);
}

function expectedRmse(
  energyCategory: EnergyEquationCategory,
  age: number,
): number {
  if (age === 18) return energyCategory === "MALE" ? 259 : 237;
  return energyCategory === "MALE" ? 339 : 246;
}

function expectedFixture(
  energyCategory: EnergyEquationCategory,
  activity: ActivityCategory,
  age: number,
  heightCm: number,
  weightKg: number,
  goal: TargetGoal,
) {
  const maintenance = referenceMaintenance(
    energyCategory,
    activity,
    age,
    heightCm,
    weightKg,
  );
  const suggested = Math.max(
    1000,
    round10(maintenance + goalAdjustment(goal)),
  );
  const centralMultiplier =
    goal === "GAIN" || goal === "PERFORMANCE" || goal === "LOSE"
      ? 1.6
      : 1.4;
  const protein = round5(weightKg * centralMultiplier);
  const proteinMin = round5(weightKg * 1.2);
  const proteinMax = round5(weightKg * 1.6);
  const fat = Math.max(
    0,
    Math.round((suggested * DEFAULT_FAT_ENERGY_SHARE) / 9),
  );
  const carbs = Math.max(
    0,
    Math.round((suggested - protein * 4 - fat * 9) / 4),
  );
  const fiber = Math.max(0, Math.round((suggested / 1000) * 14));
  const rmse = expectedRmse(energyCategory, age);
  const halfWidth = Math.max(suggested * 0.15, rmse);
  const rangeMin = Math.max(1000, round10(suggested - halfWidth));
  const rangeMax = round10(suggested + halfWidth);

  return {
    maintenance,
    suggested,
    protein,
    proteinMin,
    proteinMax,
    fat,
    carbs,
    fiber,
    rangeMin,
    rangeMax,
    rmse,
  };
}

const activities: readonly ActivityCategory[] = [
  "INACTIVE",
  "LOW_ACTIVE",
  "ACTIVE",
  "VERY_ACTIVE",
];

const energyCategories: readonly EnergyEquationCategory[] = [
  "MALE",
  "FEMALE",
];

test("FORMULA_PARITY: NASEM 2023 maintenance equations match independent transcription", () => {
  for (const energyCategory of energyCategories) {
    for (const activity of activities) {
      for (const profile of [
        { age: 18, height: 168.5, weight: 64.2 },
        { age: 30, height: 175, weight: 75 },
        { age: 52, height: 162.4, weight: 81.3 },
      ]) {
        const actual = calculateMaintenanceEnergy(
          energyCategory,
          activity,
          profile.age,
          profile.height,
          profile.weight,
        );

        assert.equal(
          actual.maintenanceEnergyKcal,
          referenceMaintenance(
            energyCategory,
            activity,
            profile.age,
            profile.height,
            profile.weight,
          ),
        );
      }
    }
  }
});

test("FORMULA_PARITY: target fixtures preserve old goal, macro, fiber, and uncertainty math", () => {
  const fixtures = [
    {
      age: 30,
      height: 175,
      weight: 75,
      energyCategory: "MALE" as const,
      activity: "ACTIVE" as const,
      activityLabel: "Moderate",
      goal: "MAINTAIN" as const,
      goalLabel: "Maintain weight",
    },
    {
      age: 30,
      height: 175,
      weight: 75,
      energyCategory: "MALE" as const,
      activity: "ACTIVE" as const,
      activityLabel: "Moderate",
      goal: "GAIN" as const,
      goalLabel: "Gain muscle",
    },
    {
      age: 41,
      height: 164,
      weight: 68,
      energyCategory: "FEMALE" as const,
      activity: "LOW_ACTIVE" as const,
      activityLabel: "Light",
      goal: "LOSE" as const,
      goalLabel: "Lose weight",
    },
    {
      age: 18,
      height: 170,
      weight: 63,
      energyCategory: "FEMALE" as const,
      activity: "VERY_ACTIVE" as const,
      activityLabel: "Very active",
      goal: "PERFORMANCE" as const,
      goalLabel: "Improve performance",
    },
  ];

  for (const fixture of fixtures) {
    const expected = expectedFixture(
      fixture.energyCategory,
      fixture.activity,
      fixture.age,
      fixture.height,
      fixture.weight,
      fixture.goal,
    );

    const actual = calculatePersonalTargets({
      ageYears: fixture.age,
      heightCm: fixture.height,
      weightKg: fixture.weight,
      energyCategory: fixture.energyCategory,
      activityCategory: fixture.activityLabel,
      goal: fixture.goalLabel,
    });

    assert.equal(actual.eligibility, "READY");
    assert.equal(actual.activityCategory, fixture.activity);
    assert.equal(
      actual.maintenanceEnergy?.maintenanceEnergyKcal,
      expected.maintenance,
    );
    assert.equal(actual.energyTarget?.central, expected.suggested);
    assert.equal(actual.energyTarget?.min, expected.rangeMin);
    assert.equal(actual.energyTarget?.max, expected.rangeMax);
    assert.equal(actual.energyTarget?.rmseKcal, expected.rmse);
    assert.equal(actual.protein?.central, expected.protein);
    assert.equal(actual.protein?.min, expected.proteinMin);
    assert.equal(actual.protein?.max, expected.proteinMax);
    assert.equal(actual.fatG, expected.fat);
    assert.equal(actual.carbohydrateG, expected.carbs);
    assert.equal(actual.fiberG, expected.fiber);
    assert.equal(actual.requiresUserConfirmation, true);
  }
});

test("FORMULA_PARITY: all four old goal behaviors remain separate from EER", () => {
  const base = {
    ageYears: 30,
    heightCm: 175,
    weightKg: 75,
    energyCategory: "Male",
    activityCategory: "Moderate",
  };

  const maintain = calculatePersonalTargets({
    ...base,
    goal: "Maintain weight",
  });
  const gain = calculatePersonalTargets({
    ...base,
    goal: "Gain muscle",
  });
  const lose = calculatePersonalTargets({
    ...base,
    goal: "Lose weight",
  });
  const performance = calculatePersonalTargets({
    ...base,
    goal: "Improve performance",
  });

  const maintenance = maintain.maintenanceEnergy!.maintenanceEnergyKcal;

  assert.equal(maintain.energyTarget!.central, Math.max(1000, round10(maintenance)));
  assert.equal(performance.energyTarget!.central, Math.max(1000, round10(maintenance)));
  assert.equal(gain.energyTarget!.central, Math.max(1000, round10(maintenance + 200)));
  assert.equal(lose.energyTarget!.central, Math.max(1000, round10(maintenance - 250)));

  assert.equal(maintain.protein!.multiplierUsed, 1.4);
  assert.equal(gain.protein!.multiplierUsed, 1.6);
  assert.equal(lose.protein!.multiplierUsed, 1.6);
  assert.equal(performance.protein!.multiplierUsed, 1.6);
});

test("FORMULA_PARITY: explicit activity wins over training-frequency fallback", () => {
  const result = calculatePersonalTargets({
    ageYears: 30,
    heightCm: 175,
    weightKg: 75,
    energyCategory: "Male",
    activityCategory: "Light",
    trainingFrequency: "7 days",
    goal: "Maintain",
  });

  assert.equal(result.activityCategory, "LOW_ACTIVE");
  assert.equal(result.activitySource, "EXPLICIT");
});

test("FORMULA_PARITY: valid training-frequency fallback stays bounded", () => {
  const threeDays = calculatePersonalTargets({
    ageYears: 30,
    heightCm: 175,
    weightKg: 75,
    energyCategory: "Male",
    activityCategory: null,
    trainingFrequency: "3 days",
    goal: "Maintain",
  });

  const sixPlus = calculatePersonalTargets({
    ageYears: 30,
    heightCm: 175,
    weightKg: 75,
    energyCategory: "Male",
    activityCategory: null,
    trainingFrequency: "6+ days",
    goal: "Maintain",
  });

  assert.equal(threeDays.activityCategory, "ACTIVE");
  assert.equal(threeDays.activitySource, "TRAINING_FREQUENCY");
  assert.equal(sixPlus.activityCategory, "VERY_ACTIVE");
});

test("FORMULA_PARITY: malformed training text never elevates activity", () => {
  const result = calculatePersonalTargets({
    ageYears: 30,
    heightCm: 175,
    weightKg: 75,
    energyCategory: "Male",
    activityCategory: "???",
    trainingFrequency: "I exercise a lot 7 maybe",
    goal: "Maintain",
  });

  assert.equal(result.activityCategory, "INACTIVE");
  assert.equal(result.activitySource, "SAFE_DEFAULT");
  assert.ok(
    result.reasonCodes.includes(
      "ACTIVITY_INPUT_UNRECOGNIZED_DEFAULTED_INACTIVE",
    ),
  );
});

test("FORMULA_PARITY: missing required inputs HOLD instead of guessing", () => {
  const base = {
    ageYears: 30,
    heightCm: 175,
    weightKg: 75,
    energyCategory: "Male",
    activityCategory: "Moderate",
    goal: "Maintain",
  };

  const cases = [
    calculatePersonalTargets({ ...base, ageYears: null }),
    calculatePersonalTargets({ ...base, heightCm: null }),
    calculatePersonalTargets({ ...base, weightKg: null }),
    calculatePersonalTargets({ ...base, energyCategory: "unknown" }),
  ];

  for (const result of cases) {
    assert.equal(result.eligibility, "HOLD");
    assert.equal(result.energyTarget, null);
    assert.equal(result.protein, null);
  }
});

test("INTENTIONAL_MOVEFUEL_2_CHANGE: youth automatic calorie targets are blocked", () => {
  const result = calculatePersonalTargets({
    ageYears: 17,
    heightCm: 170,
    weightKg: 65,
    energyCategory: "Male",
    activityCategory: "Moderate",
    goal: "Lose weight",
  });

  assert.equal(result.eligibility, "UNSUPPORTED");
  assert.equal(result.maintenanceEnergy, null);
  assert.equal(result.energyTarget, null);
  assert.equal(result.protein, null);
  assert.equal(result.requiresUserConfirmation, false);
  assert.ok(
    result.reasonCodes.includes("YOUTH_AUTOMATIC_CALORIE_TARGETS_BLOCKED"),
  );
});
