import { createHash } from "node:crypto";
import type { NutritionSource } from "../algorithm/contracts.ts";
import type { Per100gNutrients } from "../algorithm/imageEstimatePipeline.ts";
import type { RegionFoodCandidate } from "../vision/candidateProviderAdapter.ts";

export const REVIEWED_RECIPE_SNAPSHOT_FORMAT = "movefuel-reviewed-recipes-v1" as const;

export type ReviewedRecipeNutrients = {
  energyKcal: number;
  proteinG: number;
  carbG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
  sodiumMg?: number | null;
};

export type ReviewedRecipeRecord = {
  recipeRevisionId: string;
  name: string;
  aliases?: readonly string[];
  preparationLabels?: readonly string[];
  regionTags?: readonly string[];
  effectiveDate: string;
  reviewerStatus: "REVIEWED_RECIPE_ESTIMATE";
  evidence: string;
  per100g: ReviewedRecipeNutrients;
  checksum: string;
};

export type ReviewedRecipeSnapshot = {
  format: typeof REVIEWED_RECIPE_SNAPSHOT_FORMAT;
  snapshotVersion: string;
  generatedAt: string;
  records: readonly ReviewedRecipeRecord[];
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function canonicalRecordPayload(record: Omit<ReviewedRecipeRecord, "checksum">): string {
  return JSON.stringify({
    recipeRevisionId: record.recipeRevisionId,
    name: record.name,
    aliases: [...(record.aliases ?? [])],
    preparationLabels: [...(record.preparationLabels ?? [])],
    regionTags: [...(record.regionTags ?? [])],
    effectiveDate: record.effectiveDate,
    reviewerStatus: record.reviewerStatus,
    evidence: record.evidence,
    per100g: {
      energyKcal: record.per100g.energyKcal,
      proteinG: record.per100g.proteinG,
      carbG: record.per100g.carbG ?? null,
      fatG: record.per100g.fatG ?? null,
      fiberG: record.per100g.fiberG ?? null,
      sodiumMg: record.per100g.sodiumMg ?? null,
    },
  });
}

export function reviewedRecipeChecksum(record: Omit<ReviewedRecipeRecord, "checksum">): string {
  return createHash("sha256").update(canonicalRecordPayload(record)).digest("hex");
}

function validRecord(record: unknown): record is ReviewedRecipeRecord {
  if (!record || typeof record !== "object" || Array.isArray(record)) return false;
  const row = record as Record<string, unknown>;
  if (row.reviewerStatus !== "REVIEWED_RECIPE_ESTIMATE") return false;
  for (const key of ["recipeRevisionId", "name", "effectiveDate", "evidence", "checksum"] as const) {
    if (typeof row[key] !== "string" || !(row[key] as string).trim()) return false;
  }
  if (!/^\d{4}-\d{2}-\d{2}/.test(row.effectiveDate as string)) return false;
  if (!row.per100g || typeof row.per100g !== "object" || Array.isArray(row.per100g)) return false;
  const nutrients = row.per100g as Record<string, unknown>;
  if (!finiteNonNegative(nutrients.energyKcal) || !finiteNonNegative(nutrients.proteinG)) return false;
  for (const key of ["carbG", "fatG", "fiberG", "sodiumMg"] as const) {
    const value = nutrients[key];
    if (value !== undefined && value !== null && !finiteNonNegative(value)) return false;
  }
  for (const key of ["aliases", "preparationLabels", "regionTags"] as const) {
    const value = row[key];
    if (value !== undefined && (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !entry.trim()))) return false;
  }
  const { checksum, ...withoutChecksum } = row as unknown as ReviewedRecipeRecord;
  return checksum.toLowerCase() === reviewedRecipeChecksum(withoutChecksum);
}

export function productionReviewedRecipes(snapshot: unknown): ReviewedRecipeRecord[] {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return [];
  const candidate = snapshot as Partial<ReviewedRecipeSnapshot>;
  if (candidate.format !== REVIEWED_RECIPE_SNAPSHOT_FORMAT || typeof candidate.snapshotVersion !== "string" || !candidate.snapshotVersion.trim()) return [];
  if (!Array.isArray(candidate.records)) return [];
  const ids = new Set<string>();
  const valid: ReviewedRecipeRecord[] = [];
  for (const record of candidate.records) {
    if (!validRecord(record) || ids.has(record.recipeRevisionId)) continue;
    ids.add(record.recipeRevisionId);
    valid.push(record);
  }
  return valid;
}

function matchScore(record: ReviewedRecipeRecord, candidate: RegionFoodCandidate): number {
  const candidateNames = [candidate.name, ...candidate.searchTerms].map(normalize).filter(Boolean);
  const recipeNames = [record.name, ...(record.aliases ?? [])].map(normalize).filter(Boolean);
  const identityMatch = candidateNames.some((name) => recipeNames.includes(name));
  if (!identityMatch) return 0;
  const candidatePreparations = candidate.preparationCandidates.map((entry) => normalize(entry.label)).filter(Boolean);
  const recipePreparations = (record.preparationLabels ?? []).map(normalize).filter(Boolean);
  const preparationMatch = recipePreparations.length === 0 || candidatePreparations.some((value) => recipePreparations.includes(value));
  return preparationMatch ? 1 : 0.8;
}

export function createReviewedRecipeSnapshotResolver(snapshot: unknown): (candidate: RegionFoodCandidate) => {
  source: NutritionSource;
  per100g: Partial<Per100gNutrients>;
} | null {
  const records = productionReviewedRecipes(snapshot);
  return (candidate) => {
    const ranked = records
      .map((record) => ({ record, score: matchScore(record, candidate) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || b.record.effectiveDate.localeCompare(a.record.effectiveDate) || a.record.recipeRevisionId.localeCompare(b.record.recipeRevisionId));
    const selected = ranked[0]?.record;
    if (!selected) return null;
    return {
      source: {
        source: "MOVEFUEL_RECIPE",
        fdcId: null,
        recipeRevisionId: selected.recipeRevisionId,
        dataType: "REVIEWED_RECIPE_ESTIMATE",
        description: selected.name,
      },
      per100g: selected.per100g,
    };
  };
}
