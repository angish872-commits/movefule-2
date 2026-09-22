import assert from "node:assert/strict";
import test from "node:test";
import { ProfileService, ProfileContractError, AppwriteOwnerScopedRepository, AppwriteServerOwnedRepository, canonicalTargetEligibilityPolicy, type AppwriteTablesClient, type FoundationTableId, type ListRowsRequest, type ListRowsResult, type RepositoryRow } from "../../foundation/index.ts";

class ProfileTablesClient implements AppwriteTablesClient {
  readonly rows = new Map<string, RepositoryRow>();

  async listRows<T extends Record<string, unknown>>(request: ListRowsRequest): Promise<ListRowsResult<T>> {
    const owner = request.queries.find((query) => query.field === "userId")?.value;
    const rows = [...this.rows.values()].filter((row) => row.userId === owner) as RepositoryRow<T>[];
    return { rows, total: rows.length };
  }

  async getRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string): Promise<RepositoryRow<T> | null> {
    return (this.rows.get(`${tableId}:${rowId}`) ?? null) as RepositoryRow<T> | null;
  }

  async createRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string, data: T): Promise<RepositoryRow<T>> {
    const row = { $id: rowId, ...data } as RepositoryRow<T>;
    this.rows.set(`${tableId}:${rowId}`, row as RepositoryRow);
    return row;
  }

  async updateRow<T extends Record<string, unknown>>(_databaseId: string, tableId: FoundationTableId, rowId: string, data: Partial<T>): Promise<RepositoryRow<T>> {
    const row = { ...(this.rows.get(`${tableId}:${rowId}`) ?? {}), ...data, $id: rowId } as RepositoryRow<T>;
    this.rows.set(`${tableId}:${rowId}`, row as RepositoryRow);
    return row;
  }

  async deleteRow(): Promise<void> {}
}

const input = {
  displayName: "Ari",
  dateOfBirth: "2008-01-01",
  countryRegion: "NP",
  timeZone: "Asia/Kathmandu",
  metricUnits: true,
  height: "170",
  weight: "60",
  goal: "General wellness",
  activityLevel: "Moderate",
  trainingFrequency: "3-4 days",
  sexForEnergyEstimation: "Prefer not to say",
  calorieTarget: "2200",
  proteinTarget: "120",
  dietaryPreferences: "Vegetarian",
  cameraConsent: true,
  healthConsent: false,
  watchConnection: "Phone only",
  notificationsEnabled: true,
  analyticsAllowed: false,
  completed: true,
};

function persistedProfileFixture() {
  const client = new ProfileTablesClient();
  const repository = new AppwriteOwnerScopedRepository(client, "movefuel_mvp");
  const serverRepository = new AppwriteServerOwnedRepository(client, "movefuel_mvp");
  const service = new ProfileService(serverRepository);
  return { client, repository, service };
}

test("profile persistence creates owner-scoped profile, onboarding, preference, goal, and target rows", async () => {
  const { service, repository } = persistedProfileFixture();
  const first = await service.save("user-a", input, repository);
  assert.equal(first.source, "appwrite");
  assert.equal(first.profile.userId, "user-a");
  assert.equal(first.profile.heightMm, 1700);
  assert.equal(first.profile.currentWeightG, 60000);
  assert.equal(first.profile.timeZone, "Asia/Kathmandu");
  assert.equal(first.onboarding.currentStep, 18);
  assert.match(String(first.preferences.valueJson), /cameraConsent/);
  assert.equal(first.goal?.status, "ACTIVE");
  assert.equal(first.target?.energyKcal, 2200);
  assert.equal(first.target?.eligibilityDecision, "ELIGIBLE");
  assert.equal(first.target?.policyVersion, "movefuel-nutrition-target-policy-2026-08-v1");

  const second = await service.save("user-a", { ...input, displayName: "Updated Ari" }, repository);
  assert.equal(second.profile.displayName, "Updated Ari");
  assert.equal(second.profile.revision, 2);
  assert.equal((await service.get("user-a", repository))?.profile.displayName, "Updated Ari");
  assert.equal(await service.get("user-b", repository), null);
});

test("local profile persistence remains owner-isolated and revisioned", async () => {
  const service = new ProfileService();
  const first = await service.save("user-a", input);
  const second = await service.save("user-a", { ...input, displayName: "Updated Ari" });
  assert.equal(first.profile.revision, 1);
  assert.equal(second.profile.revision, 2);
  assert.equal((await service.get("user-a"))?.profile.displayName, "Updated Ari");
  assert.equal(await service.get("user-b"), null);
});

test("profile validation rejects missing owner-facing identity fields", async () => {
  const service = new ProfileService();
  await assert.rejects(
    service.save("user-a", { ...input, displayName: "" }),
    (error: unknown) => error instanceof Error && error.message === "display_name is required.",
  );
});

test("completed onboarding rejects a profile without confirmed calorie and protein targets", async () => {
  const service = new ProfileService();
  await assert.rejects(
    () => service.save("user-target-gate", {
      ...input,
      calorieTarget: "",
      proteinTarget: "",
      sexForEnergyEstimation: "Prefer not to say",
      completed: true,
    }),
    (error: unknown) => error instanceof ProfileContractError && error.code === "targets_not_confirmed",
  );
});

test("goal changes preserve ended goal history and target changes create immutable revisions", async () => {
  const { client, service, repository } = persistedProfileFixture();

  const first = await service.save("history-user", input, repository);
  assert.equal(first.goal?.status, "ACTIVE");
  assert.equal(first.target?.revision, 1);

  const second = await service.save("history-user", {
    ...input,
    goal: "Gain muscle",
    calorieTarget: "2400",
    proteinTarget: "135",
  }, repository);
  assert.equal(second.goal?.goalType, "Gain muscle");
  assert.equal(second.goal?.status, "ACTIVE");
  assert.equal(second.target?.revision, 2);

  const rows = [...client.rows.values()] as RepositoryRow[];
  const goals = rows.filter((row) => typeof row.goalType === "string");
  assert.equal(goals.length, 2);
  assert.equal(goals.filter((row) => row.status === "ENDED").length, 1);
  assert.equal(goals.filter((row) => row.status === "ACTIVE").length, 1);
  const targets = rows.filter((row) => typeof row.energyKcal === "number" && typeof row.revision === "number");
  assert.equal(targets.length, 2);
  assert.deepEqual(targets.map((row) => row.revision).sort(), [1, 2]);

  const unchanged = await service.save("history-user", {
    ...input,
    displayName: "Same targets, new name",
    goal: "Gain muscle",
    calorieTarget: "2400",
    proteinTarget: "135",
  }, repository);
  assert.equal(unchanged.target?.revision, 2);
  const rowsAfter = [...client.rows.values()] as RepositoryRow[];
  assert.equal(rowsAfter.filter((row) => typeof row.energyKcal === "number" && typeof row.revision === "number").length, 2);
});

test("manual youth restrictive target is denied before any active target revision is persisted", async () => {
  const { client, service, repository } = persistedProfileFixture();
  await assert.rejects(
    service.save("youth-target-user", {
      ...input,
      dateOfBirth: "2012-01-01",
      goal: "Rapid calorie deficit",
      calorieTarget: "1600",
      proteinTarget: "90",
    }, repository),
    (error: unknown) => error instanceof ProfileContractError && error.code === "target_ineligible",
  );
  const targets = [...client.rows.values()].filter((row) => row.targetRevisionId !== undefined);
  assert.equal(targets.length, 0);
  assert.equal(await service.get("youth-target-user", repository), null);
});

test("ineligible adult target is rejected without mutating target history", async () => {
  const { client, service, repository } = persistedProfileFixture();
  await assert.rejects(
    service.save("adult-review-user", {
      ...input,
      dateOfBirth: "1990-01-01",
      calorieTarget: "900",
      proteinTarget: "100",
    }, repository),
    (error: unknown) => error instanceof ProfileContractError && error.code === "target_ineligible",
  );
  assert.equal([...client.rows.values()].filter((row) => row.targetRevisionId !== undefined).length, 0);
});

test("missing manual target component stays unknown and is never persisted as zero", async () => {
  const outcome = canonicalTargetEligibilityPolicy.evaluate({
    userId: "partial-target-user",
    dateOfBirth: "1990-01-01",
    goal: "General wellness",
    effectiveDate: "2026-08-29",
    requestedRevision: 1,
    manualEnergyKcal: 2200,
    manualProteinG: null,
    calculatedEnergyKcal: 2100,
    calculatedProteinG: 105,
    calculatedSupported: true,
    now: new Date("2026-08-29T12:00:00.000Z"),
  });
  assert.equal(outcome.canPersist, false);
  assert.equal(outcome.targetState.eligibilityDecision, "UNKNOWN");
  assert.deepEqual(outcome.targetState.targetValues, { energyKcal: 2200, proteinG: null });

  const { client, service, repository } = persistedProfileFixture();
  const draft = await service.save("partial-target-user", {
    ...input,
    dateOfBirth: "1990-01-01",
    calorieTarget: "2200",
    proteinTarget: "",
    completed: false,
  }, repository);
  assert.equal(draft.target, null);
  assert.equal([...client.rows.values()].filter((row) => row.targetRevisionId !== undefined).length, 0);
});

test("eligible target is idempotent, immutable, and remains cross-user isolated", async () => {
  const { client, service, repository } = persistedProfileFixture();
  const eligible = { ...input, dateOfBirth: "1990-01-01", calorieTarget: "2200", proteinTarget: "120" };
  const first = await service.save("eligible-user", eligible, repository);
  const firstSnapshot = JSON.stringify(first.target);
  const duplicate = await service.save("eligible-user", { ...eligible, displayName: "Profile-only change" }, repository);
  assert.equal(duplicate.target?.revision, 1);
  assert.equal(JSON.stringify(duplicate.target), firstSnapshot);
  assert.equal([...client.rows.values()].filter((row) => row.targetRevisionId !== undefined).length, 1);
  assert.equal(await service.get("different-user", repository), null);

  const revised = await service.save("eligible-user", { ...eligible, calorieTarget: "2300" }, repository);
  assert.equal(revised.target?.revision, 2);
  const history = [...client.rows.values()]
    .filter((row) => row.targetRevisionId !== undefined)
    .sort((left, right) => Number(left.revision) - Number(right.revision));
  assert.equal(history.length, 2);
  assert.equal(history[0]?.energyKcal, 2200);
  assert.equal(history[1]?.energyKcal, 2300);
  assert.equal(history.every((row) => row.eligibilityDecision === "ELIGIBLE"), true);
});
