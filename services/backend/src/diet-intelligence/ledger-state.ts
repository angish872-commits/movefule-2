import { createHash } from "node:crypto";
import type {
  DataQuality,
  FreshnessState,
  NutritionDataQuality,
  NutritionProfile,
  NutritionState,
  RevisionRef,
  TargetState,
} from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import type { AggregateNutrientCode, ConfirmedMeal as LegacyConfirmedMeal, NutritionTotals } from "../meal/contracts.ts";

export const NUTRITION_STATE_SCHEMA_VERSION = 1 as const;

export interface ConfirmedMealReadSource {
  list(userId: string, localDate?: string): LegacyConfirmedMeal[] | Promise<LegacyConfirmedMeal[]>;
}

export type ConfirmedNutritionLedgerSnapshot = {
  readonly userId: string;
  readonly localDate: string;
  readonly meals: readonly LegacyConfirmedMeal[];
  readonly totals: Readonly<NutritionTotals> | null;
  readonly confirmedMealRevisionHash: string;
  readonly evidenceRefs: readonly RevisionRef[];
  readonly latestUpdatedAt: string | null;
};

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

export function nutritionHash(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("hex");
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function immutableClone<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function sum(meals: readonly LegacyConfirmedMeal[]): NutritionTotals | null {
  if (meals.length === 0) return null;
  const totals: NutritionTotals = { energyKcal: 0, proteinGrams: 0, carbGrams: 0, fatGrams: 0, fiberGrams: 0 };
  const unknownNutrients = new Set<AggregateNutrientCode>();
  for (const meal of meals) {
    totals.energyKcal += meal.totals.energyKcal;
    totals.proteinGrams += meal.totals.proteinGrams;
    totals.carbGrams += meal.totals.carbGrams;
    totals.fatGrams += meal.totals.fatGrams;
    totals.fiberGrams += meal.totals.fiberGrams;
    for (const nutrient of meal.totals.unknownNutrients ?? []) unknownNutrients.add(nutrient);
  }
  return unknownNutrients.size > 0
    ? { ...totals, unknownNutrients: [...unknownNutrients].sort() }
    : totals;
}

function latestByMealId(rows: readonly LegacyConfirmedMeal[]): readonly LegacyConfirmedMeal[] {
  const latest = new Map<string, LegacyConfirmedMeal>();
  for (const row of rows) {
    const current = latest.get(row.mealId);
    if (!current || row.currentRevision > current.currentRevision ||
      (row.currentRevision === current.currentRevision && row.updatedAtEpochMillis > current.updatedAtEpochMillis)) {
      latest.set(row.mealId, row);
    }
  }
  return [...latest.values()];
}

/** Diet reads canonical confirmed facts only; it never invokes Food recognition. */
export class ConfirmedNutritionLedgerReader {
  public read(source: ConfirmedMealReadSource, userId: string, localDate: string): ConfirmedNutritionLedgerSnapshot {
    if (!userId.trim()) throw new Error("LEDGER_USER_REQUIRED");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) throw new Error("LEDGER_LOCAL_DATE_INVALID");

    const sourceRows = source.list(userId, localDate);
    if (sourceRows instanceof Promise) {
      throw new Error("LEDGER_ASYNC_SOURCE_REQUIRES_READ_ASYNC");
    }
    return this.fromRows(sourceRows, userId, localDate);
  }

  /** Appwrite-backed confirmed meals are asynchronous; preserve the synchronous
   * fixture API while allowing the same canonical projection in production. */
  public async readAsync(source: ConfirmedMealReadSource, userId: string, localDate: string): Promise<ConfirmedNutritionLedgerSnapshot> {
    if (!userId.trim()) throw new Error("LEDGER_USER_REQUIRED");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) throw new Error("LEDGER_LOCAL_DATE_INVALID");
    return this.fromRows(await source.list(userId, localDate), userId, localDate);
  }

  private fromRows(sourceRows: readonly LegacyConfirmedMeal[], userId: string, localDate: string): ConfirmedNutritionLedgerSnapshot {
    for (const row of sourceRows) {
      if (row.userId !== userId) throw new Error("LEDGER_CROSS_USER_ROW_REJECTED");
    }
    const latest = latestByMealId(sourceRows).filter((meal) => meal.status === "CONFIRMED" && meal.localDate === localDate);
    const ordered = latest.sort((a, b) => a.mealId.localeCompare(b.mealId));
    const revisions = ordered.map((meal) => ({ mealId: meal.mealId, revision: meal.currentRevision, updatedAt: meal.updatedAtEpochMillis }));
    const totals = sum(ordered);
    const latestUpdated = ordered.reduce<number | null>((current, meal) => current === null ? meal.updatedAtEpochMillis : Math.max(current, meal.updatedAtEpochMillis), null);
    const evidenceRefs: RevisionRef[] = ordered.map((meal) => ({ entityId: meal.mealId, revision: meal.currentRevision, schemaVersion: 1 }));

    return immutableClone({
      userId,
      localDate,
      meals: ordered,
      totals,
      confirmedMealRevisionHash: nutritionHash(revisions),
      evidenceRefs,
      latestUpdatedAt: latestUpdated === null ? null : new Date(latestUpdated).toISOString(),
    });
  }
}

function parseIso(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export type NutritionDataQualityInput = {
  ledger: ConfirmedNutritionLedgerSnapshot;
  profile: NutritionProfile;
  targetState: TargetState | null;
  now: Date;
  staleInputCodes?: readonly string[];
};

export function assessNutritionDataQuality(input: NutritionDataQualityInput): NutritionDataQuality {
  const missing = new Set<string>();
  const limitations = new Set<string>();
  const stale = new Set(input.staleInputCodes ?? []);

  if (input.ledger.meals.length === 0) missing.add("NO_CONFIRMED_MEALS_RECORDED");
  else limitations.add("RECORDED_INTAKE_MAY_BE_INCOMPLETE");
  for (const nutrient of input.ledger.totals?.unknownNutrients ?? []) {
    limitations.add(`NUTRIENT_UNKNOWN:${nutrient}`);
  }
  for (const field of input.profile.unknownFields) missing.add(`PROFILE_UNKNOWN:${field}`);
  if (!input.targetState) missing.add("TARGET_STATE_UNKNOWN");
  else if (input.targetState.eligibilityDecision !== "ELIGIBLE") limitations.add(`TARGET_${input.targetState.eligibilityDecision}`);

  const profileTime = parseIso(input.profile.updatedAt);
  if (profileTime === null) limitations.add("PROFILE_TIMESTAMP_INVALID");
  const targetTime = input.targetState ? parseIso(input.targetState.createdAt) : null;
  if (input.targetState && targetTime === null) limitations.add("TARGET_TIMESTAMP_INVALID");
  for (const code of stale) limitations.add(`STALE:${code}`);

  const ledgerScore = input.ledger.meals.length > 0 ? 0.45 : 0;
  const profileKnownCount = Math.max(0, 5 - input.profile.unknownFields.length);
  const profileScore = 0.25 * Math.min(1, profileKnownCount / 5);
  const targetScore = input.targetState?.eligibilityDecision === "ELIGIBLE" ? 0.30 : 0;
  const completeness = Math.round(Math.min(1, ledgerScore + profileScore + targetScore) * 1000) / 1000;

  let freshness: FreshnessState = "FRESH";
  if (stale.size > 0) freshness = "STALE";
  else if (input.ledger.meals.length === 0 || input.profile.unknownFields.length > 0 || !input.targetState) freshness = "PARTIAL";

  let overall: DataQuality = "UNKNOWN";
  if (completeness >= 0.85 && freshness === "FRESH") overall = "HIGH";
  else if (completeness >= 0.55) overall = "MEDIUM";
  else if (completeness > 0) overall = "LOW";

  return Object.freeze({
    schemaVersion: 1,
    overall,
    completeness,
    freshness,
    missingCodes: Object.freeze([...missing].sort()),
    limitationCodes: Object.freeze([...limitations].sort()),
    sourceRevisionHash: nutritionHash({
      ledger: input.ledger.confirmedMealRevisionHash,
      profileRevision: input.profile.revision,
      targetRevision: input.targetState?.revision ?? null,
      stale: [...stale].sort(),
    }),
  });
}

function targetNumbers(target: TargetState | null): { energyKcal: number | null; proteinG: number | null } {
  if (!target || target.eligibilityDecision !== "ELIGIBLE" || !target.targetValues || typeof target.targetValues !== "object" || Array.isArray(target.targetValues)) {
    return { energyKcal: null, proteinG: null };
  }
  const values = target.targetValues as Record<string, unknown>;
  const energy = typeof values.energyKcal === "number" && Number.isFinite(values.energyKcal) ? values.energyKcal : null;
  const protein = typeof values.proteinG === "number" && Number.isFinite(values.proteinG) ? values.proteinG : null;
  return { energyKcal: energy, proteinG: protein };
}

export type NutritionStateProjectionInput = {
  userId: string;
  localDate: string;
  ledger: ConfirmedNutritionLedgerSnapshot;
  profile: NutritionProfile;
  targetState: TargetState | null;
  revision: number;
  now?: Date;
  staleInputCodes?: readonly string[];
};

export function projectNutritionState(input: NutritionStateProjectionInput): NutritionState {
  if (input.ledger.userId !== input.userId || input.profile.userId !== input.userId || (input.targetState && input.targetState.userId !== input.userId)) {
    throw new Error("NUTRITION_STATE_CROSS_USER_INPUT_REJECTED");
  }
  if (input.ledger.localDate !== input.localDate) throw new Error("NUTRITION_STATE_DATE_MISMATCH");
  const now = input.now ?? new Date();
  const dataQuality = assessNutritionDataQuality({
    ledger: input.ledger,
    profile: input.profile,
    targetState: input.targetState,
    now,
    ...(input.staleInputCodes === undefined ? {} : { staleInputCodes: input.staleInputCodes }),
  });
  const target = targetNumbers(input.targetState);
  const recorded = input.ledger.totals;
  const totals = recorded === null
    ? {
      recorded: null,
      target: target.energyKcal === null && target.proteinG === null ? null : target,
      recordedGap: { energyKcal: null, proteinG: null },
    }
    : {
      recorded: { ...recorded },
      target: target.energyKcal === null && target.proteinG === null ? null : target,
      recordedGap: {
        energyKcal: target.energyKcal === null ? null : target.energyKcal - recorded.energyKcal,
        proteinG: target.proteinG === null ? null : target.proteinG - recorded.proteinGrams,
      },
    };
  const stateRevision = Math.max(1, Math.trunc(input.revision));
  const stateId = `nutrition-state:${nutritionHash({ userId: input.userId, localDate: input.localDate, ledger: input.ledger.confirmedMealRevisionHash, profile: input.profile.revision, target: input.targetState?.revision ?? null }).slice(0, 32)}`;
  return immutableClone({
    schemaVersion: NUTRITION_STATE_SCHEMA_VERSION,
    stateId,
    userId: input.userId,
    localDate: input.localDate,
    targetRevision: input.targetState?.revision ?? 0,
    profileRevision: input.profile.revision,
    confirmedMealRevisionHash: input.ledger.confirmedMealRevisionHash,
    dataQuality,
    totals,
    revision: stateRevision,
    generatedAt: now.toISOString(),
  });
}
