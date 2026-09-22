import type { LocalAliasRecord } from "./contracts.ts";

/**
 * Multilingual/local alias foundation only. Non-English entries deliberately
 * remain ALIAS_REFERENCE_ONLY until native-speaker/source review promotes an
 * individual alias to SOURCE_VERIFIED. Alias matching never authorizes nutrient
 * copying across preparation forms or jurisdictions.
 */
export const LOCAL_ALIAS_FOUNDATION: readonly LocalAliasRecord[] = [
  { schemaVersion: 1, conceptId: "rice", locale: "en", alias: "rice", form: "GENERIC_FOOD", reviewStatus: "SOURCE_VERIFIED", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "rice", locale: "ne", alias: "चामल", form: "INGREDIENT", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "rice", locale: "hi", alias: "चावल", form: "GENERIC_FOOD", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "rice", locale: "bn", alias: "চাল", form: "INGREDIENT", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },

  { schemaVersion: 1, conceptId: "lentil", locale: "en", alias: "lentil", form: "INGREDIENT", reviewStatus: "SOURCE_VERIFIED", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "lentil", locale: "ne", alias: "दाल", form: "GENERIC_FOOD", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "lentil", locale: "hi", alias: "दाल", form: "GENERIC_FOOD", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "lentil", locale: "bn", alias: "ডাল", form: "GENERIC_FOOD", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },

  { schemaVersion: 1, conceptId: "milk", locale: "en", alias: "milk", form: "GENERIC_FOOD", reviewStatus: "SOURCE_VERIFIED", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "milk", locale: "ne", alias: "दूध", form: "GENERIC_FOOD", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "milk", locale: "hi", alias: "दूध", form: "GENERIC_FOOD", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "milk", locale: "bn", alias: "দুধ", form: "GENERIC_FOOD", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },

  { schemaVersion: 1, conceptId: "egg", locale: "en", alias: "egg", form: "GENERIC_FOOD", reviewStatus: "SOURCE_VERIFIED", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "egg", locale: "ne", alias: "अण्डा", form: "GENERIC_FOOD", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "egg", locale: "hi", alias: "अंडा", form: "GENERIC_FOOD", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "egg", locale: "bn", alias: "ডিম", form: "GENERIC_FOOD", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },

  { schemaVersion: 1, conceptId: "banana", locale: "en", alias: "banana", form: "GENERIC_FOOD", reviewStatus: "SOURCE_VERIFIED", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "banana", locale: "ne", alias: "केरा", form: "GENERIC_FOOD", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "banana", locale: "hi", alias: "केला", form: "GENERIC_FOOD", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "banana", locale: "bn", alias: "কলা", form: "GENERIC_FOOD", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },

  { schemaVersion: 1, conceptId: "potato", locale: "en", alias: "potato", form: "INGREDIENT", reviewStatus: "SOURCE_VERIFIED", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "potato", locale: "ne", alias: "आलु", form: "INGREDIENT", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "potato", locale: "hi", alias: "आलू", form: "INGREDIENT", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },
  { schemaVersion: 1, conceptId: "potato", locale: "bn", alias: "আলু", form: "INGREDIENT", reviewStatus: "NEEDS_NATIVE_SPEAKER_REVIEW", allowedUse: "ALIAS_REFERENCE_ONLY" },
] as const;
