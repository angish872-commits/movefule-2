import type {
  JsonValue,
  NutritionProfile,
} from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";

export const NUTRITION_PROFILE_SCHEMA_VERSION = 1 as const;

const CODE = /^[A-Z0-9][A-Z0-9_-]{0,63}$/;

function normalizedCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase().replace(/[\s./]+/g, "_").replace(/[^A-Z0-9_-]/g, "");
  return code && CODE.test(code) ? code : null;
}

function codeList(value: unknown, unknownFields: string[], field: string): readonly string[] {
  if (value === undefined || value === null) {
    unknownFields.push(field);
    return Object.freeze([]);
  }
  if (!Array.isArray(value)) {
    unknownFields.push(`${field}:INVALID_TYPE`);
    return Object.freeze([]);
  }
  const values = new Set<string>();
  for (const raw of value) {
    const code = normalizedCode(raw);
    if (code) values.add(code);
    else unknownFields.push(`${field}:INVALID_CODE`);
  }
  return Object.freeze([...values].sort());
}

function jsonObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parsePreferenceJson(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      return jsonObject(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return jsonObject(value);
}

function nullableCode(value: unknown, unknownFields: string[], field: string): string | null {
  if (value === undefined || value === null || value === "") {
    unknownFields.push(field);
    return null;
  }
  const code = normalizedCode(value);
  if (!code) {
    unknownFields.push(`${field}:INVALID_CODE`);
    return null;
  }
  return code;
}

export type NutritionProfileSource = {
  userId: string;
  profileRevision: number;
  preferenceRevision: number;
  updatedAt: string;
  countryCode?: unknown;
  unitSystem?: unknown;
  valueJson?: unknown;
};

export type NutritionHardConstraintContext = {
  readonly intoleranceCodes: readonly string[];
  readonly exclusionCodes: readonly string[];
};

export type NutritionPreferenceContext = {
  readonly regionCode: string | null;
  readonly unitSystem: string | null;
  readonly mealTimingPreferenceCodes: readonly string[];
  readonly pantryContext: JsonValue | null;
};

export type NormalizedNutritionProfile = {
  readonly profile: NutritionProfile;
  readonly hardConstraints: NutritionHardConstraintContext;
  readonly context: NutritionPreferenceContext;
};

/**
 * Converts only explicit, structured user declarations into hard nutrition
 * policy. Legacy free text is never interpreted as an allergen/religious rule.
 */
export function normalizeNutritionProfile(source: NutritionProfileSource): NormalizedNutritionProfile {
  if (!source.userId.trim()) throw new Error("NUTRITION_PROFILE_USER_REQUIRED");
  const unknownFields: string[] = [];
  const preferences = parsePreferenceJson(source.valueJson);
  if (!preferences) unknownFields.push("structuredPreferences");

  const structured = preferences ?? {};
  const legacyText = typeof structured.dietaryPreferences === "string" && structured.dietaryPreferences.trim();
  if (legacyText) unknownFields.push("legacyDietaryPreferences:UNPARSED");

  const dietaryPatternCodes = codeList(structured.dietaryPatternCodes, unknownFields, "dietaryPatternCodes");
  const allergenCodes = codeList(structured.allergenCodes, unknownFields, "allergenCodes");
  const religiousRestrictionCodes = codeList(structured.religiousRestrictionCodes, unknownFields, "religiousRestrictionCodes");
  const cookingCapabilityCodes = codeList(structured.cookingCapabilityCodes, unknownFields, "cookingCapabilityCodes");
  const intoleranceCodes = codeList(structured.intoleranceCodes, unknownFields, "intoleranceCodes");
  const exclusionCodes = codeList(structured.exclusionCodes, unknownFields, "exclusionCodes");
  const mealTimingPreferenceCodes = codeList(structured.mealTimingPreferenceCodes, unknownFields, "mealTimingPreferenceCodes");
  const budgetBand = nullableCode(structured.budgetBand, unknownFields, "budgetBand");
  const regionCode = nullableCode(source.countryCode, unknownFields, "regionCode");
  const unitSystem = nullableCode(source.unitSystem, unknownFields, "unitSystem");
  const pantry = structured.pantryContext;
  const pantryContext: JsonValue | null = pantry === undefined ? null : (pantry as JsonValue);
  if (pantry === undefined) unknownFields.push("pantryContext");

  const revision = Math.max(0, Math.trunc(Math.max(source.profileRevision, source.preferenceRevision)));
  const profile: NutritionProfile = Object.freeze({
    schemaVersion: NUTRITION_PROFILE_SCHEMA_VERSION,
    userId: source.userId,
    dietaryPatternCodes,
    allergenCodes,
    religiousRestrictionCodes,
    budgetBand,
    cookingCapabilityCodes,
    unknownFields: Object.freeze([...new Set(unknownFields)].sort()),
    revision,
    updatedAt: source.updatedAt,
  });

  return Object.freeze({
    profile,
    hardConstraints: Object.freeze({ intoleranceCodes, exclusionCodes }),
    context: Object.freeze({ regionCode, unitSystem, mealTimingPreferenceCodes, pantryContext }),
  });
}

// Nutrition consumes the shared foundation authority; it does not own a second policy.
export {
  TARGET_POLICY_VERSION,
  canonicalTargetEligibilityPolicy,
  evaluateTargetEligibility,
  normalizeTargetEligibilityRequest,
  type NormalizedTargetEligibilityRequest,
  type TargetEligibilityOutcome,
  type TargetEligibilityPolicy,
  type TargetEligibilityRequest,
} from "../foundation/target-eligibility-policy.ts";
