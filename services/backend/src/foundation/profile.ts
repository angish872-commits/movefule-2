import { sha256 } from "../domain/sync-store.ts";
import type { OwnerScopedRepository, RepositoryRow, ServerOwnedRepository } from "./repository.ts";
import { previewPersonalTargets } from "./target-engine.ts";
import { canonicalTargetEligibilityPolicy } from "./target-eligibility-policy.ts";

export type ProfileInput = {
  displayName: string;
  dateOfBirth?: string;
  countryRegion: string;
  timeZone?: string;
  metricUnits: boolean;
  height?: string;
  weight?: string;
  goal?: string;
  activityLevel?: string;
  trainingFrequency?: string;
  sexForEnergyEstimation?: string;
  calorieTarget?: string;
  proteinTarget?: string;
  dietaryPreferences?: string;
  bodyCompositionRange?: string;
  preferredSessionMinutes?: number;
  cameraConsent: boolean;
  healthConsent: boolean;
  watchConnection?: string;
  notificationsEnabled: boolean;
  analyticsAllowed: boolean;
  completed?: boolean;
  onboardingStep?: number;
};

export type ProfileResult = {
  userId: string;
  source: "appwrite" | "local_fixture";
  profile: Record<string, unknown>;
  onboarding: Record<string, unknown>;
  preferences: Record<string, unknown>;
  goal: Record<string, unknown> | null;
  target: Record<string, unknown> | null;
};

export class ProfileContractError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = "ProfileContractError";
    this.code = code;
  }
}

type ProfileRows = {
  profile: RepositoryRow;
  onboarding: RepositoryRow;
  preferences: RepositoryRow;
  goal: RepositoryRow | null;
  target: RepositoryRow | null;
};

function text(value: unknown, field: string, maxLength = 256, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw new ProfileContractError(`invalid_${field}`, `${field} is required.`);
    return "";
  }
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new ProfileContractError(`invalid_${field}`, `${field} must be a string of at most ${maxLength} characters.`);
  }
  const normalized = value.trim();
  if (required && !normalized) throw new ProfileContractError(`invalid_${field}`, `${field} is required.`);
  return normalized;
}

function numeric(value: string, field: string): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value.replace(/[^0-9.+-]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ProfileContractError(`invalid_${field}`, `${field} must be a non-negative number when provided.`);
  }
  return parsed;
}

function profileId(userId: string): string {
  return userId;
}

function goalId(userId: string, startedAt: string, goalType: string): string {
  return `goal-${sha256(`${userId}:${startedAt}:${goalType}`).slice(0, 28)}`;
}

function targetId(userId: string, effectiveDate: string, revision: number): string {
  return `target-${sha256(`${userId}:${effectiveDate}:${revision}`).slice(0, 28)}`;
}

function isGoalRow(row: RepositoryRow): boolean {
  return typeof row.goalType === "string" && typeof row.status === "string";
}

function isTargetRow(row: RepositoryRow): boolean {
  return typeof row.effectiveDate === "string" && typeof row.revision === "number" &&
    row.eligibilityDecision === "ELIGIBLE" && row.userConfirmed === true &&
    typeof row.energyKcal === "number" && typeof row.proteinG === "number";
}

function latestActiveGoal(rows: readonly RepositoryRow[]): RepositoryRow | null {
  return rows
    .filter((row) => isGoalRow(row) && row.status === "ACTIVE")
    .sort((left, right) => String(right.startDate ?? right.createdAt ?? "").localeCompare(String(left.startDate ?? left.createdAt ?? "")))[0] ?? null;
}

function latestTarget(rows: readonly RepositoryRow[]): RepositoryRow | null {
  return rows
    .filter(isTargetRow)
    .sort((left, right) => {
      const byDate = String(right.effectiveDate).localeCompare(String(left.effectiveDate));
      return byDate !== 0 ? byDate : Number(right.revision ?? 0) - Number(left.revision ?? 0);
    })[0] ?? null;
}

function toMillimeters(value: string, metricUnits: boolean): number | null {
  const parsed = numeric(value, "height");
  if (parsed === null) return null;
  return Math.round(metricUnits ? parsed * 10 : parsed * 25.4);
}

function toGrams(value: string, metricUnits: boolean): number | null {
  const parsed = numeric(value, "weight");
  if (parsed === null) return null;
  return Math.round(metricUnits ? parsed * 1_000 : parsed * 453.59237);
}

function targetNumber(value: string, field: string): number | null {
  const parsed = numeric(value, field);
  return parsed === null ? null : Math.round(parsed);
}

function asResult(userId: string, source: ProfileResult["source"], rows: ProfileRows): ProfileResult {
  return {
    userId,
    source,
    profile: rows.profile,
    onboarding: rows.onboarding,
    preferences: rows.preferences,
    goal: rows.goal,
    target: rows.target,
  };
}

/**
 * Authenticated profile persistence. Owner-scoped resources stay behind the
 * owner repository; canonical target revisions are server-owned and therefore
 * use the server repository explicitly.
 */
export class ProfileService {
  private readonly local = new Map<string, ProfileResult>();
  private readonly serverRepository?: ServerOwnedRepository;

  public constructor(serverRepository?: ServerOwnedRepository) {
    this.serverRepository = serverRepository;
  }

  public async save(
    userId: string,
    input: ProfileInput,
    repository?: OwnerScopedRepository,
  ): Promise<ProfileResult> {
    const owner = text(userId, "user_id", 128, true);
    const displayName = text(input.displayName, "display_name", 120, true);
    const countryRegion = text(input.countryRegion, "country_region", 120, true);
    const timeZone = text(input.timeZone, "time_zone", 64) || "UTC";
    const dateOfBirth = text(input.dateOfBirth, "date_of_birth", 32);
    const goal = text(input.goal, "goal", 64);
    const activityLevel = text(input.activityLevel, "activity_level", 64);
    const trainingFrequency = text(input.trainingFrequency, "training_frequency", 64);
    const trainingFrequencyValue = trainingFrequency ? targetNumber(trainingFrequency, "training_frequency") : null;
    const sexForEnergyEstimation = text(input.sexForEnergyEstimation, "sex_for_energy_estimation", 64);
    const height = text(input.height, "height", 32);
    const weight = text(input.weight, "weight", 32);
    const calorieTarget = text(input.calorieTarget, "calorie_target", 32);
    const proteinTarget = text(input.proteinTarget, "protein_target", 32);
    const dietaryPreferences = text(input.dietaryPreferences, "dietary_preferences", 512);
    const bodyCompositionRange = text(input.bodyCompositionRange, "body_composition_range", 64);
    const preferredSessionMinutes = Math.max(10, Math.min(180, Math.trunc(input.preferredSessionMinutes ?? 30)));
    const watchConnection = text(input.watchConnection, "watch_connection", 64);
    const now = new Date().toISOString();
    const effectiveDate = now.slice(0, 10);
    const localPrior = repository ? null : this.local.get(owner);
    const existingProfile = repository
      ? await repository.getOwned("user_profile", owner, profileId(owner))
      : localPrior?.profile ?? null;
    const existingOnboarding = repository
      ? await repository.getOwned("onboarding_progress", owner, owner)
      : localPrior?.onboarding ?? null;
    const preferenceRowId = `profile-${sha256(owner).slice(0, 28)}`;
    const existingPreferences = repository
      ? await repository.getOwned("user_preference", owner, preferenceRowId)
      : localPrior?.preferences ?? null;
    const goalRows = repository
      ? (await repository.listOwned("user_goal", owner, { limit: 100 })).rows
      : localPrior?.goal ? [localPrior.goal as RepositoryRow] : [];
    const existingGoal = latestActiveGoal(goalRows);
    const targetRows = repository
      ? (await this.requireServerRepository().listForUser("target_revision", owner, { limit: 100 })).rows
      : localPrior?.target ? [localPrior.target as RepositoryRow] : [];
    const existingTarget = latestTarget(targetRows);

    const heightMm = toMillimeters(height, input.metricUnits);
    const currentWeightG = toGrams(weight, input.metricUnits);
    const targetPreview = previewPersonalTargets({
      dateOfBirth,
      heightCm: heightMm === null ? null : heightMm / 10,
      weightKg: currentWeightG === null ? null : currentWeightG / 1_000,
      sexForEnergyEstimate: sexForEnergyEstimation,
      activityLevel,
      trainingFrequency,
      goal,
    });

    const profileData = {
      displayName,
      dateOfBirth,
      countryCode: countryRegion,
      locale: input.metricUnits ? "en-Metric" : "en-Imperial",
      timeZone,
      sexForEnergyEstimate: sexForEnergyEstimation,
      heightMm,
      currentWeightG,
      goalWeightG: null,
      activityLevel,
      trainingFrequency: trainingFrequencyValue,
      onboardingState: input.completed === false ? "IN_PROGRESS" : "COMPLETED",
      revision: Number(existingProfile?.revision ?? 0) + 1,
      ...(existingProfile?.createdAt ? { createdAt: existingProfile.createdAt } : { createdAt: now }),
      updatedAt: now,
    };
    const onboardingStep = Math.max(0, Math.min(18, Math.trunc(input.onboardingStep ?? 0)));
    const onboardingData = {
      currentStep: input.completed === false ? onboardingStep : 18,
      completedStepsJson: input.completed === false
        ? JSON.stringify(Array.from({ length: onboardingStep }, (_, index) => index + 1))
        : JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]),
      draftValuesJson: JSON.stringify({
        displayName,
        dateOfBirth,
        countryRegion,
        timeZone,
        metricUnits: input.metricUnits,
        height,
        weight,
        goal,
        activityLevel,
        trainingFrequency,
        sexForEnergyEstimation,
        calorieTarget,
        proteinTarget,
        dietaryPreferences,
        bodyCompositionRange,
        preferredSessionMinutes,
        cameraConsent: input.cameraConsent,
        healthConsent: input.healthConsent,
        watchConnection,
        notificationsEnabled: input.notificationsEnabled,
        analyticsAllowed: input.analyticsAllowed,
        onboardingStep,
      }),
      schemaVersion: 1,
      revision: Number(existingOnboarding?.revision ?? 0) + 1,
      updatedAt: now,
    };
    const preferencesData = {
      preferenceId: preferenceRowId,
      key: "profile",
      valueJson: JSON.stringify({
        metricUnits: input.metricUnits,
        dietaryPreferences,
        bodyCompositionRange,
        preferredSessionMinutes,
        cameraConsent: input.cameraConsent,
        healthConsent: input.healthConsent,
        watchConnection,
        notificationsEnabled: input.notificationsEnabled,
        analyticsAllowed: input.analyticsAllowed,
        calculatedTargets: targetPreview,
      }),
      revision: Number(existingPreferences?.revision ?? 0) + 1,
      updatedAt: now,
    };

    const goalChanged = Boolean(goal) && String(existingGoal?.goalType ?? "") !== goal;
    const goalStartedAt = goalChanged || !existingGoal ? now : String(existingGoal.createdAt ?? now);
    const nextGoalId = goal ? (goalChanged || !existingGoal ? goalId(owner, goalStartedAt, goal) : existingGoal.$id) : null;
    const goalData = goal ? {
      goalId: nextGoalId!,
      goalType: goal,
      startDate: goalChanged || !existingGoal ? effectiveDate : String(existingGoal.startDate ?? effectiveDate),
      targetDate: existingGoal?.targetDate ?? null,
      targetWeightG: existingGoal?.targetWeightG ?? null,
      status: "ACTIVE",
      createdAt: goalChanged || !existingGoal ? now : String(existingGoal.createdAt ?? now),
      endedAt: null,
    } : null;
    const manualEnergyKcal = targetNumber(calorieTarget, "calorie_target");
    const manualProteinG = targetNumber(proteinTarget, "protein_target");
    const requestedTargetRevision = Number(existingTarget?.revision ?? 0) + 1;
    const eligibility = canonicalTargetEligibilityPolicy.evaluate({
      userId: owner,
      dateOfBirth,
      goal,
      effectiveDate,
      requestedRevision: requestedTargetRevision,
      manualEnergyKcal,
      manualProteinG,
      calculatedEnergyKcal: targetPreview.suggestedEnergyKcal,
      calculatedProteinG: targetPreview.proteinG,
      calculatedSupported: targetPreview.supported,
      now: new Date(now),
    });
    const userConfirmed = input.completed !== false;
    const eligibleTarget = userConfirmed && eligibility.canPersist ? {
      effectiveDate,
      energyKcal: eligibility.energyKcal!,
      proteinG: eligibility.proteinG!,
      targetValuesJson: JSON.stringify({
        energyKcal: eligibility.energyKcal,
        proteinG: eligibility.proteinG,
      }),
      movementTarget: targetPreview.movementMinutes,
      actionCategory: targetPreview.goalCategory,
      source: eligibility.targetState.source,
      manualEntry: eligibility.targetState.manualEntry,
      eligibilityDecision: eligibility.targetState.eligibilityDecision,
      eligibilityReasonCodesJson: JSON.stringify(eligibility.targetState.eligibilityReasonCodes),
      policyVersion: eligibility.targetState.policyVersion,
      populationClass: eligibility.targetState.populationClass,
      formulaVersion: eligibility.targetState.manualEntry ? "user-adjusted-v1" : targetPreview.formulaVersion,
      userConfirmed: true,
      schemaVersion: eligibility.targetState.schemaVersion,
    } : null;
    const targetChanged = Boolean(eligibleTarget) && (!existingTarget ||
      Number(existingTarget.energyKcal) !== eligibleTarget!.energyKcal ||
      Number(existingTarget.proteinG) !== eligibleTarget!.proteinG ||
      Number(existingTarget.movementTarget ?? -1) !== eligibleTarget!.movementTarget ||
      String(existingTarget.actionCategory ?? "") !== eligibleTarget!.actionCategory ||
      String(existingTarget.source ?? "") !== eligibleTarget!.source ||
      Boolean(existingTarget.manualEntry) !== eligibleTarget!.manualEntry ||
      String(existingTarget.eligibilityDecision ?? "") !== eligibleTarget!.eligibilityDecision ||
      String(existingTarget.eligibilityReasonCodesJson ?? "") !== eligibleTarget!.eligibilityReasonCodesJson ||
      String(existingTarget.policyVersion ?? "") !== eligibleTarget!.policyVersion ||
      String(existingTarget.populationClass ?? "") !== eligibleTarget!.populationClass ||
      String(existingTarget.formulaVersion ?? "") !== eligibleTarget!.formulaVersion ||
      existingTarget.userConfirmed !== true);
    const nextTargetRevision = targetChanged ? requestedTargetRevision : Number(existingTarget?.revision ?? 0);
    const nextTargetId = eligibleTarget
      ? targetChanged || !existingTarget ? targetId(owner, effectiveDate, nextTargetRevision) : existingTarget.$id
      : existingTarget?.$id ?? null;
    const targetData = eligibleTarget ? {
      targetRevisionId: nextTargetId!,
      ...eligibleTarget,
      revision: nextTargetRevision,
      createdAt: targetChanged || !existingTarget ? now : String(existingTarget.createdAt ?? now),
    } : existingTarget;

    if (userConfirmed && !eligibility.canPersist) {
      const denied = eligibility.targetState.eligibilityDecision === "INELIGIBLE" ||
        eligibility.targetState.eligibilityDecision === "REQUIRES_REVIEW";
      throw new ProfileContractError(
        denied ? "target_ineligible" : "targets_not_confirmed",
        denied
          ? "The canonical target eligibility policy did not authorize this target for persistence."
          : "A completed onboarding profile requires complete, eligible, user-confirmed targets.",
      );
    }

    const rows: ProfileRows = repository
      ? {
        profile: existingProfile
          ? await repository.updateOwned("user_profile", owner, profileId(owner), profileData)
          : await repository.createOwned("user_profile", owner, profileId(owner), profileData),
        onboarding: existingOnboarding
          ? await repository.updateOwned("onboarding_progress", owner, owner, onboardingData)
          : await repository.createOwned("onboarding_progress", owner, owner, onboardingData),
        preferences: existingPreferences
          ? await repository.updateOwned("user_preference", owner, preferenceRowId, preferencesData)
          : await repository.createOwned("user_preference", owner, preferenceRowId, preferencesData),
        goal: goalData
          ? goalChanged && existingGoal
            ? (await repository.updateOwned("user_goal", owner, existingGoal.$id, { status: "ENDED", endedAt: now }),
              await repository.createOwned("user_goal", owner, nextGoalId!, goalData))
            : existingGoal
              ? existingGoal
              : await repository.createOwned("user_goal", owner, nextGoalId!, goalData)
          : existingGoal
            ? (await repository.updateOwned("user_goal", owner, existingGoal.$id, { status: "ENDED", endedAt: now }), null)
            : null,
        target: eligibleTarget && targetChanged
          ? await this.requireServerRepository().createForUser("target_revision", owner, nextTargetId!, targetData!)
          : existingTarget,
      }
      : {
        profile: { $id: profileId(owner), userId: owner, ...profileData },
        onboarding: { $id: owner, userId: owner, ...onboardingData },
        preferences: { $id: preferenceRowId, userId: owner, ...preferencesData },
        goal: goalData ? { $id: nextGoalId!, userId: owner, ...goalData } : null,
        target: eligibleTarget && targetChanged
          ? { $id: nextTargetId!, userId: owner, ...targetData! }
          : existingTarget,
      };
    const result = asResult(owner, repository ? "appwrite" : "local_fixture", rows);
    this.local.set(owner, result);
    return result;
  }

  public async get(userId: string, repository?: OwnerScopedRepository): Promise<ProfileResult | null> {
    const owner = text(userId, "user_id", 128, true);
    if (!repository) return this.local.get(owner) ?? null;
    const profile = await repository.getOwned("user_profile", owner, profileId(owner));
    if (!profile) return null;
    const onboarding = await repository.getOwned("onboarding_progress", owner, owner);
    const preferenceRowId = `profile-${sha256(owner).slice(0, 28)}`;
    const preferences = await repository.getOwned("user_preference", owner, preferenceRowId);
    const goals = await repository.listOwned("user_goal", owner, { limit: 100 });
    const goal = latestActiveGoal(goals.rows);
    const targets = await this.requireServerRepository().listForUser("target_revision", owner, { limit: 100 });
    const target = latestTarget(targets.rows);
    if (!onboarding || !preferences) return null;
    return asResult(owner, "appwrite", { profile, onboarding, preferences, goal, target });
  }

  private requireServerRepository(): ServerOwnedRepository {
    if (!this.serverRepository) {
      throw new ProfileContractError("profile_server_repository_required", "Server-owned target revision persistence is not configured.");
    }
    return this.serverRepository;
  }
}
