/**
 * Runtime-safe loader for the compact MoveFuel food-knowledge snapshot.
 *
 * Only density sources explicitly cleared for product use are admitted.  FAO
 * density rows remain useful validation references but are not silently loaded
 * as production evidence while their product-integration rights gate is open.
 */
import type { DensityRange, FoodDensityRecord } from "../portion/densityLibrary.ts";
import { DensityLibrary } from "../portion/densityLibrary.ts";

export type KnowledgeSnapshotDensityRow = {
  density_id?: string;
  source_id?: string;
  source_version?: string;
  food_name?: string;
  normalized_food_name?: string;
  preparation?: string;
  physical_form?: string;
  density_central_g_ml?: number;
  density_min_g_ml?: number;
  density_max_g_ml?: number;
  region?: string | null;
  evidence_quality?: string;
  source_reference?: string | null;
};

export type KnowledgeSnapshot = {
  format?: string;
  density_records?: readonly KnowledgeSnapshotDensityRow[];
};

const PRODUCTION_DENSITY_SOURCE_IDS = new Set(["usda_fdc", "movefuel_reviewed", "movefuel_regional_reviewed"]);
const QUALITY = new Set(["MEASURED", "REVIEWED", "DERIVED", "EXPERIMENTAL"]);

function finitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function densityRecordFromSnapshot(row: KnowledgeSnapshotDensityRow): FoodDensityRecord | null {
  const sourceId = row.source_id?.trim() ?? "";
  if (!PRODUCTION_DENSITY_SOURCE_IDS.has(sourceId)) return null;
  const densityId = row.density_id?.trim() ?? "";
  const foodKey = (row.food_name || row.normalized_food_name || "").trim();
  const sourceRevision = row.source_version?.trim() ?? "";
  const q = (row.evidence_quality ?? "").toUpperCase();
  if (!densityId || !foodKey || !sourceRevision || !QUALITY.has(q)) return null;
  if (!finitePositive(row.density_min_g_ml) || !finitePositive(row.density_central_g_ml) || !finitePositive(row.density_max_g_ml)) return null;
  if (!(row.density_min_g_ml <= row.density_central_g_ml && row.density_central_g_ml <= row.density_max_g_ml)) return null;
  return {
    densityId,
    foodKey,
    preparation: row.preparation?.trim() || "any",
    physicalForm: row.physical_form?.trim() || "any",
    densityCentralGPerMl: row.density_central_g_ml,
    densityMinGPerMl: row.density_min_g_ml,
    densityMaxGPerMl: row.density_max_g_ml,
    sourceId,
    sourceRevision,
    evidenceQuality: q as FoodDensityRecord["evidenceQuality"],
    ...(row.region?.trim() ? { regionCuisine: row.region.trim() } : {}),
    effectiveFrom: "1970-01-01T00:00:00Z",
  };
}

export function productionDensityRecordsFromSnapshot(snapshot: KnowledgeSnapshot): FoodDensityRecord[] {
  return (snapshot.density_records ?? []).flatMap((row) => {
    const parsed = densityRecordFromSnapshot(row);
    return parsed ? [parsed] : [];
  });
}

export function productionDensityLibraryFromSnapshot(snapshot: KnowledgeSnapshot): DensityLibrary {
  return new DensityLibrary(productionDensityRecordsFromSnapshot(snapshot));
}

/** Extract the FDC id embedded by the USDA-derived density importer. */
export function fdcIdFromDensityReference(row: KnowledgeSnapshotDensityRow): number | null {
  if (row.source_id !== "usda_fdc") return null;
  const match = /fdcId\s+(\d+)/i.exec(row.source_reference ?? "");
  const id = match ? Number(match[1]) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}


export function recipeRevisionIdFromDensityReference(row: KnowledgeSnapshotDensityRow): string | null {
  if (row.source_id !== "movefuel_reviewed" && row.source_id !== "movefuel_regional_reviewed") return null;
  const match = /recipeRevisionId\s*[:=]?\s*([A-Za-z0-9._-]+)/i.exec(row.source_reference ?? "");
  return match?.[1]?.trim() || null;
}

function preferredDensityRange(candidates: FoodDensityRecord[]): DensityRange | null {
  if (candidates.length === 0) return null;
  const rank: Record<FoodDensityRecord["evidenceQuality"], number> = { MEASURED: 4, REVIEWED: 3, DERIVED: 2, EXPERIMENTAL: 1 };
  candidates.sort((a, b) => {
    const q = rank[b.evidenceQuality] - rank[a.evidenceQuality];
    if (q !== 0) return q;
    const aw = (a.densityMaxGPerMl - a.densityMinGPerMl) / a.densityCentralGPerMl;
    const bw = (b.densityMaxGPerMl - b.densityMinGPerMl) / b.densityCentralGPerMl;
    return aw - bw || b.sourceRevision.localeCompare(a.sourceRevision) || a.densityId.localeCompare(b.densityId);
  });
  const selected = candidates[0]!;
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

/** Resolve a production-safe density row that was derived from the exact USDA FDC record selected for nutrition. */
export function productionDensityRangeForFdcId(snapshot: KnowledgeSnapshot, fdcId: number): DensityRange | null {
  if (!Number.isInteger(fdcId) || fdcId <= 0) return null;
  const candidates = (snapshot.density_records ?? []).flatMap((row) => {
    if (fdcIdFromDensityReference(row) !== fdcId) return [];
    const record = densityRecordFromSnapshot(row);
    return record ? [record] : [];
  });
  return preferredDensityRange(candidates);
}

/** Density may accompany a reviewed recipe only when the release artifact names that exact recipe revision. */
export function productionDensityRangeForRecipeRevisionId(snapshot: KnowledgeSnapshot, recipeRevisionId: string): DensityRange | null {
  const revision = recipeRevisionId.trim();
  if (!revision) return null;
  const candidates = (snapshot.density_records ?? []).flatMap((row) => {
    if (recipeRevisionIdFromDensityReference(row) !== revision) return [];
    const record = densityRecordFromSnapshot(row);
    return record ? [record] : [];
  });
  return preferredDensityRange(candidates);
}
