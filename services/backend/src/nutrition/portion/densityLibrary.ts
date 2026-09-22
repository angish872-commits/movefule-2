/**
 * Versioned food-density knowledge for physical volume -> mass conversion.
 *
 * There is deliberately no generic 1.0 g/mL fallback. A density may only be
 * used when the food/preparation/form match is explicit and the record carries
 * provenance. Unknown density means unresolved mass, not a fabricated value.
 */

export const DENSITY_LIBRARY_SCHEMA_VERSION = 1 as const;

export type DensityEvidenceQuality = "MEASURED" | "REVIEWED" | "DERIVED" | "EXPERIMENTAL";

export type FoodDensityRecord = {
  densityId: string;
  foodKey: string;
  preparation: string;
  physicalForm: string;
  densityCentralGPerMl: number;
  densityMinGPerMl: number;
  densityMaxGPerMl: number;
  sourceId: string;
  sourceRevision: string;
  evidenceQuality: DensityEvidenceQuality;
  sampleCount?: number;
  regionCuisine?: string;
  effectiveFrom: string;
  retiredAt?: string | null;
};

export type DensityRange = {
  minimumGPerMl: number;
  centralGPerMl: number;
  maximumGPerMl: number;
  densityId: string;
  sourceId: string;
  sourceRevision: string;
  evidenceQuality: DensityEvidenceQuality;
};

export type DensityQuery = {
  foodKey: string;
  preparation?: string;
  physicalForm?: string;
  regionCuisine?: string;
  at?: string;
};

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

export function validateDensityRecord(record: FoodDensityRecord): string[] {
  const errors: string[] = [];
  if (!record.densityId.trim()) errors.push("blank_density_id");
  if (!record.foodKey.trim()) errors.push("blank_food_key");
  if (!record.preparation.trim()) errors.push("blank_preparation");
  if (!record.physicalForm.trim()) errors.push("blank_physical_form");
  const values = [record.densityMinGPerMl, record.densityCentralGPerMl, record.densityMaxGPerMl];
  if (values.some((v) => !Number.isFinite(v) || v <= 0)) errors.push("invalid_density_range");
  if (!(record.densityMinGPerMl <= record.densityCentralGPerMl && record.densityCentralGPerMl <= record.densityMaxGPerMl)) {
    errors.push("unordered_density_range");
  }
  if (!record.sourceId.trim() || !record.sourceRevision.trim()) errors.push("missing_provenance");
  if (!isIsoDate(record.effectiveFrom)) errors.push("invalid_effective_from");
  if (record.retiredAt && !isIsoDate(record.retiredAt)) errors.push("invalid_retired_at");
  if (record.sampleCount !== undefined && (!Number.isInteger(record.sampleCount) || record.sampleCount < 0)) errors.push("invalid_sample_count");
  return errors;
}

const evidenceRank: Record<DensityEvidenceQuality, number> = {
  MEASURED: 4,
  REVIEWED: 3,
  DERIVED: 2,
  EXPERIMENTAL: 1,
};

/** Small deterministic resolver. Persistence can sit behind this class later. */
export class DensityLibrary {
  private readonly records: readonly FoodDensityRecord[];

  constructor(records: readonly FoodDensityRecord[] = []) {
    const invalid = records.flatMap((record) => validateDensityRecord(record).map((error) => `${record.densityId}:${error}`));
    if (invalid.length > 0) throw new Error(`invalid_density_library:${invalid.join(",")}`);
    this.records = [...records];
  }

  resolve(query: DensityQuery): DensityRange | null {
    const atMs = Date.parse(query.at ?? new Date().toISOString());
    const foodKey = normalize(query.foodKey);
    const preparation = normalize(query.preparation);
    const physicalForm = normalize(query.physicalForm);
    const region = normalize(query.regionCuisine);

    const candidates = this.records
      .filter((record) => normalize(record.foodKey) === foodKey)
      .filter((record) => Date.parse(record.effectiveFrom) <= atMs)
      .filter((record) => !record.retiredAt || Date.parse(record.retiredAt) > atMs)
      .map((record) => {
        let score = evidenceRank[record.evidenceQuality] * 100;
        const recordPrep = normalize(record.preparation);
        const recordForm = normalize(record.physicalForm);
        const recordRegion = normalize(record.regionCuisine);
        if (preparation) {
          if (recordPrep === preparation) score += 40;
          else if (recordPrep === "unspecified" || recordPrep === "any") score += 5;
          else return null;
        }
        if (physicalForm) {
          if (recordForm === physicalForm) score += 25;
          else if (recordForm === "unspecified" || recordForm === "any") score += 3;
          else return null;
        }
        if (region && recordRegion) score += recordRegion === region ? 10 : -2;
        score += Math.min(record.sampleCount ?? 0, 100) / 100;
        return { record, score };
      })
      .filter((entry): entry is { record: FoodDensityRecord; score: number } => entry !== null)
      .sort((a, b) => b.score - a.score || Date.parse(b.record.effectiveFrom) - Date.parse(a.record.effectiveFrom));

    const selected = candidates[0]?.record;
    if (!selected) return null;
    return {
      minimumGPerMl: selected.densityMinGPerMl,
      centralGPerMl: selected.densityCentralGPerMl,
      maximumGPerMl: selected.densityMaxGPerMl,
      densityId: selected.densityId,
      sourceId: selected.sourceId,
      sourceRevision: selected.sourceRevision,
      evidenceQuality: selected.evidenceQuality,
    };
  }
}
