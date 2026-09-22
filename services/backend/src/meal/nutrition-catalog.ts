import { NUTRITION_FIXTURES } from "./nutrition-fixtures.ts";
import type { NutritionRecord } from "../nutrition/identity/knowledgeNutritionResolver.ts";

export type NutritionCatalogFood = {
  sourceId: string;
  displayName: string;
  aliases: readonly string[];
  basisAmount: 100;
  basisUnit: "g";
  energyKcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
  source: "local_fixture" | "usda_fdc";
  verificationStatus: "fixture_verified" | "provider_verified";
  authorityStatus: "not_claimed" | "trusted_reference";
};

export type NutritionCatalogSearchResult = {
  query: string;
  source: "local_fixture" | "usda_fdc";
  verificationStatus: "fixture_verified" | "provider_verified";
  authorityStatus: "not_claimed" | "trusted_reference";
  foods: NutritionCatalogFood[];
};

export interface NutritionCatalogStoreLike {
  search(query: string, limit?: number): NutritionCatalogSearchResult | Promise<NutritionCatalogSearchResult>;
  get(sourceId: string): NutritionCatalogFood | null | Promise<NutritionCatalogFood | null>;
}

function round(value: number): number { return Math.round(value * 100) / 100; }
function normalize(value: string): string { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " "); }

function catalogFromFixtures(): NutritionCatalogFood[] {
  return NUTRITION_FIXTURES.flatMap((fixture) => fixture.items.flatMap((item) => {
    // A fixture with an unknown nutrient cannot be promoted to this legacy
    // fully-numeric catalogue shape. Excluding it is safer than inventing 0.
    if (item.carbGrams === null || item.fatGrams === null || item.fiberGrams === null) return [];
    const ratio = 100 / Math.max(item.portionGrams, 1);
    const aliases = [item.displayName, fixture.title, fixture.key.replaceAll("-", " ")]
      .map(normalize).filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);
    return [{
      sourceId: `fixture:${fixture.key}:${item.itemId}`,
      displayName: item.displayName,
      aliases,
      basisAmount: 100,
      basisUnit: "g",
      energyKcal: round(item.energyKcal * ratio),
      proteinG: round(item.proteinGrams * ratio),
      carbG: round(item.carbGrams * ratio),
      fatG: round(item.fatGrams * ratio),
      fiberG: round(item.fiberGrams * ratio),
      source: "local_fixture",
      verificationStatus: "fixture_verified",
      authorityStatus: "not_claimed",
    } satisfies NutritionCatalogFood];
  }));
}

const CATALOG = catalogFromFixtures();
function score(food: NutritionCatalogFood, query: string): number {
  const normalizedQuery = normalize(query);
  const displayName = normalize(food.displayName);
  if (displayName === normalizedQuery) return 100;
  if (displayName.startsWith(normalizedQuery)) return 80;
  if (displayName.includes(normalizedQuery)) return 60;
  return food.aliases.some((alias) => alias.includes(normalizedQuery)) ? 40 : 0;
}

export class LocalNutritionCatalogStore implements NutritionCatalogStoreLike {
  search(query: string, limit = 20): NutritionCatalogSearchResult {
    const normalizedQuery = normalize(query);
    const boundedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
    const foods = normalizedQuery.length === 0 ? [] : CATALOG
      .map((food) => ({ food, rank: score(food, normalizedQuery) }))
      .filter(({ rank }) => rank > 0)
      .sort((left, right) => right.rank - left.rank || left.food.displayName.localeCompare(right.food.displayName))
      .slice(0, boundedLimit)
      .map(({ food }) => ({ ...food, aliases: [...food.aliases] }));
    return { query: query.trim(), source: "local_fixture", verificationStatus: "fixture_verified", authorityStatus: "not_claimed", foods };
  }
  get(sourceId: string): NutritionCatalogFood | null {
    const food = CATALOG.find((candidate) => candidate.sourceId === sourceId);
    return food ? { ...food, aliases: [...food.aliases] } : null;
  }
}

type FdcRecordSearch = (query: string, pageSize?: number, limit?: number) => Promise<readonly NutritionRecord[]>;

function finiteNonNegative(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value) && value >= 0;
}

function catalogFoodFromFdc(record: NutritionRecord): NutritionCatalogFood | null {
  // The route's catalog contract requires all core nutrients. Omitting an
  // incomplete provider row is safer than inventing zero for an unknown value.
  if (!finiteNonNegative(record.energyKcal) || !finiteNonNegative(record.proteinG) ||
      !finiteNonNegative(record.carbG) || !finiteNonNegative(record.fatG) ||
      !finiteNonNegative(record.fiberG)) return null;
  const aliases = [record.description, record.brandName ?? ""]
    .map((value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " "))
    .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);
  return {
    sourceId: `USDA_FDC:${record.fdcId}`,
    displayName: record.description,
    aliases,
    basisAmount: 100,
    basisUnit: "g",
    energyKcal: record.energyKcal,
    proteinG: record.proteinG,
    carbG: record.carbG,
    fatG: record.fatG,
    fiberG: record.fiberG,
    source: "usda_fdc",
    verificationStatus: "provider_verified",
    authorityStatus: "trusted_reference",
  };
}

/** Production nutrition catalogue backed by USDA FoodData Central. */
export class FdcNutritionCatalogStore implements NutritionCatalogStoreLike {
  private readonly cache = new Map<string, NutritionCatalogFood>();
  private readonly searchRecords: FdcRecordSearch;

  constructor(searchRecords: FdcRecordSearch) {
    this.searchRecords = searchRecords;
  }

  async search(query: string, limit = 20): Promise<NutritionCatalogSearchResult> {
    const boundedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
    const records = await this.searchRecords(query, Math.max(boundedLimit, 10), Math.max(boundedLimit, 20));
    const foods = records.flatMap((record) => {
      const food = catalogFoodFromFdc(record);
      if (!food) return [];
      this.cache.set(food.sourceId, food);
      return [food];
    }).slice(0, boundedLimit).map((food) => ({ ...food, aliases: [...food.aliases] }));
    return {
      query: query.trim(),
      source: "usda_fdc",
      verificationStatus: "provider_verified",
      authorityStatus: "trusted_reference",
      foods,
    };
  }

  async get(sourceId: string): Promise<NutritionCatalogFood | null> {
    const cached = this.cache.get(sourceId);
    if (cached) return { ...cached, aliases: [...cached.aliases] };
    const match = /^USDA_FDC:(\d+)$/.exec(sourceId);
    if (!match) return null;
    const records = await this.searchRecords(match[1]!, 10, 20);
    const food = records.map(catalogFoodFromFdc).find((candidate) => candidate?.sourceId === sourceId) ?? null;
    if (!food) return null;
    this.cache.set(sourceId, food);
    return { ...food, aliases: [...food.aliases] };
  }
}
