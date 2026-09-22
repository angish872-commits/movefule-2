import assert from "node:assert/strict";
import test from "node:test";
import { TrainingSetupContractError, TrainingSetupService } from "../../training/setup-service.ts";

test("training setup preserves explicit no-equipment without inventing gear", async () => {
  const service = new TrainingSetupService();
  const saved = await service.save("user-a", {
    experienceBand: "BEGINNER",
    equipmentCodes: [],
    environmentCodes: ["home"],
    availabilityMinutesByDay: { monday: 30, friday: 45 },
    preferenceCodes: [],
    limitationCodes: [],
  });
  assert.deepEqual(saved.equipmentCodes, []);
  assert.deepEqual(saved.environmentCodes, ["HOME"]);
  assert.deepEqual(saved.availabilityMinutesByDay, { FRIDAY: 45, MONDAY: 30 });
  assert.equal((await service.get("user-a"))?.revision, 1);
});

test("training setup is absent until explicitly provided", async () => {
  const service = new TrainingSetupService();
  assert.equal(await service.get("user-a"), null);
});

test("training setup rejects missing environment and fabricated availability", async () => {
  const service = new TrainingSetupService();
  await assert.rejects(
    service.save("user-a", {
      experienceBand: "BEGINNER",
      equipmentCodes: [],
      environmentCodes: [],
      availabilityMinutesByDay: { MONDAY: 30 },
      preferenceCodes: [],
      limitationCodes: [],
    }),
    TrainingSetupContractError,
  );
  await assert.rejects(
    service.save("user-a", {
      experienceBand: "BEGINNER",
      equipmentCodes: [],
      environmentCodes: ["HOME"],
      availabilityMinutesByDay: {},
      preferenceCodes: [],
      limitationCodes: [],
    }),
    TrainingSetupContractError,
  );
});

test("training setup normalizes aliases while preserving blocked exercise identity", async () => {
  const service = new TrainingSetupService();
  const first = await service.save("user-a", {
    experienceBand: "INTERMEDIATE",
    equipmentCodes: ["dumbbell", "DUMBBELL", "resistance band"],
    environmentCodes: ["home"],
    availabilityMinutesByDay: { wednesday: 60 },
    preferenceCodes: ["prefer_push"],
    limitationCodes: ["block_exercise:exercise-123"],
  });
  assert.deepEqual(first.equipmentCodes, ["DUMBBELL", "RESISTANCE_BAND"]);
  assert.deepEqual(first.limitationCodes, ["BLOCK_EXERCISE:exercise-123"]);
  const second = await service.save("user-a", {
    experienceBand: "INTERMEDIATE",
    equipmentCodes: ["RESISTANCE_BAND", "DUMBBELL"],
    environmentCodes: ["HOME"],
    availabilityMinutesByDay: { WEDNESDAY: 60 },
    preferenceCodes: ["PREFER_PUSH"],
    limitationCodes: ["BLOCK_EXERCISE:exercise-123"],
  });
  assert.deepEqual(second.equipmentCodes, first.equipmentCodes);
  assert.deepEqual(second.limitationCodes, first.limitationCodes);
  assert.equal(second.revision, 2);
});
