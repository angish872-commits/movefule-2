import assert from "node:assert/strict";
import test from "node:test";
import { PersonalFoodContractError, PersonalFoodStore } from "../../meal/personal-food.ts";

function input(idempotencyKey: string) {
  return {
    idempotencyKey,
    name: "Oats",
    basisAmount: 100,
    basisUnit: "g",
    energyKcal: 389,
    proteinG: 16.9,
    carbG: 66.3,
    fatG: 6.9,
    fiberG: 10.6,
    provenanceNote: "User-entered estimate",
  };
}

test("personal food is idempotent, user-isolated, revision-checked, and soft-deletable", () => {
  let nextId = 0;
  let now = 1_700_000_000_000;
  const store = new PersonalFoodStore({ now: () => now, idFactory: () => `food-${++nextId}` });
  const created = store.create("user-a", input("food-1"));
  assert.equal(created.status, "CREATED");
  assert.equal(store.create("user-a", input("food-1")).status, "DUPLICATE");
  assert.equal(store.list("user-b").length, 0);

  assert.throws(
    () => store.create("user-a", { ...input("food-1"), name: "Different" }),
    (error: unknown) => error instanceof PersonalFoodContractError && error.code === "personal_food_idempotency_reused",
  );

  now += 1_000;
  const updated = store.update("user-a", created.food.personalFoodId, { expectedRevision: 1, name: "Steel-cut oats" });
  assert.equal(updated.status, "UPDATED");
  assert.equal(updated.food.revision, 2);
  assert.throws(
    () => store.update("user-a", created.food.personalFoodId, { expectedRevision: 1, name: "Stale" }),
    (error: unknown) => error instanceof PersonalFoodContractError && error.code === "personal_food_revision_conflict",
  );

  const deleted = store.delete("user-a", created.food.personalFoodId, 2);
  assert.equal(deleted.status, "DELETED");
  assert.equal(store.list("user-a").length, 0);
});
