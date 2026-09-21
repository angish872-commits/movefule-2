import type { NutrientUnit } from "./nutrientCalculator";

export type CanonicalNutrientId =
  | "ENERGY"
  | "PROTEIN"
  | "CARBOHYDRATE"
  | "FAT"
  | "FIBER"
  | "SODIUM"
  | "SATURATED_FAT"
  | "TOTAL_SUGARS"
  | "POTASSIUM"
  | "CALCIUM"
  | "IRON"
  | "VITAMIN_C"
  | "VITAMIN_A_RAE"
  | "VITAMIN_D"
  | "VITAMIN_E"
  | "VITAMIN_K"
  | "THIAMIN_B1"
  | "RIBOFLAVIN_B2"
  | "NIACIN_B3"
  | "PANTOTHENIC_ACID_B5"
  | "VITAMIN_B6"
  | "BIOTIN_B7"
  | "FOLATE_B9"
  | "VITAMIN_B12"
  | "MAGNESIUM"
  | "PHOSPHORUS"
  | "ZINC"
  | "COPPER"
  | "MANGANESE"
  | "SELENIUM"
  | "IODINE"
  | "CHOLINE"
  | "CHOLESTEROL"
  | "WATER";

export type NutrientCategory =
  | "ENERGY"
  | "MACRO"
  | "VITAMIN"
  | "MINERAL"
  | "OTHER";

export type ProviderMappingStatus =
  | "IMPORTED_OLD_MOVEFUEL"
  | "REQUIRES_REVIEW";

export interface CanonicalNutrientDefinition {
  id: CanonicalNutrientId;
  displayName: string;
  canonicalUnit: NutrientUnit;
  category: NutrientCategory;
  /**
   * FDC nutrient numbers verified in the old MoveFuel research/runtime.
   * Empty means MoveFuel_2 still needs a reviewed provider mapping.
   */
  usdaNutrientNumbers: readonly number[];
  providerMappingStatus: ProviderMappingStatus;
}

const old = (
  id: CanonicalNutrientId,
  displayName: string,
  canonicalUnit: NutrientUnit,
  category: NutrientCategory,
  usdaNutrientNumbers: readonly number[],
): CanonicalNutrientDefinition => ({
  id,
  displayName,
  canonicalUnit,
  category,
  usdaNutrientNumbers,
  providerMappingStatus: "IMPORTED_OLD_MOVEFUEL",
});

const pending = (
  id: CanonicalNutrientId,
  displayName: string,
  canonicalUnit: NutrientUnit,
  category: NutrientCategory,
): CanonicalNutrientDefinition => ({
  id,
  displayName,
  canonicalUnit,
  category,
  usdaNutrientNumbers: [],
  providerMappingStatus: "REQUIRES_REVIEW",
});

/**
 * Old MoveFuel production runtime supported:
 * ENERGY, PROTEIN, CARBOHYDRATE, FAT, FIBER, SODIUM.
 *
 * Old research mapping additionally established:
 * SATURATED_FAT, TOTAL_SUGARS, POTASSIUM, CALCIUM, IRON,
 * VITAMIN_C, CHOLESTEROL, WATER.
 *
 * The remaining micronutrient IDs are deliberately present without invented
 * USDA mappings. They must be reviewed before provider data can populate them.
 */
export const CANONICAL_NUTRIENT_REGISTRY: readonly CanonicalNutrientDefinition[] = [
  old("ENERGY", "Energy", "kcal", "ENERGY", [1008, 2047, 2048]),
  old("PROTEIN", "Protein", "g", "MACRO", [1003]),
  old("CARBOHYDRATE", "Carbohydrate", "g", "MACRO", [1005]),
  old("FAT", "Total fat", "g", "MACRO", [1004]),
  old("FIBER", "Dietary fiber", "g", "MACRO", [1079]),
  old("SODIUM", "Sodium", "mg", "MINERAL", [1093]),

  old("SATURATED_FAT", "Saturated fat", "g", "MACRO", [606]),
  old("TOTAL_SUGARS", "Total sugars", "g", "MACRO", [269]),
  old("POTASSIUM", "Potassium", "mg", "MINERAL", [306]),
  old("CALCIUM", "Calcium", "mg", "MINERAL", [301]),
  old("IRON", "Iron", "mg", "MINERAL", [303]),
  old("VITAMIN_C", "Vitamin C", "mg", "VITAMIN", [401]),
  old("CHOLESTEROL", "Cholesterol", "mg", "OTHER", [601]),
  old("WATER", "Water", "g", "OTHER", [255]),

  pending("VITAMIN_A_RAE", "Vitamin A (RAE)", "ug", "VITAMIN"),
  pending("VITAMIN_D", "Vitamin D", "ug", "VITAMIN"),
  pending("VITAMIN_E", "Vitamin E", "mg", "VITAMIN"),
  pending("VITAMIN_K", "Vitamin K", "ug", "VITAMIN"),
  pending("THIAMIN_B1", "Thiamin (B1)", "mg", "VITAMIN"),
  pending("RIBOFLAVIN_B2", "Riboflavin (B2)", "mg", "VITAMIN"),
  pending("NIACIN_B3", "Niacin (B3)", "mg", "VITAMIN"),
  pending("PANTOTHENIC_ACID_B5", "Pantothenic acid (B5)", "mg", "VITAMIN"),
  pending("VITAMIN_B6", "Vitamin B6", "mg", "VITAMIN"),
  pending("BIOTIN_B7", "Biotin (B7)", "ug", "VITAMIN"),
  pending("FOLATE_B9", "Folate (B9)", "ug", "VITAMIN"),
  pending("VITAMIN_B12", "Vitamin B12", "ug", "VITAMIN"),
  pending("MAGNESIUM", "Magnesium", "mg", "MINERAL"),
  pending("PHOSPHORUS", "Phosphorus", "mg", "MINERAL"),
  pending("ZINC", "Zinc", "mg", "MINERAL"),
  pending("COPPER", "Copper", "mg", "MINERAL"),
  pending("MANGANESE", "Manganese", "mg", "MINERAL"),
  pending("SELENIUM", "Selenium", "ug", "MINERAL"),
  pending("IODINE", "Iodine", "ug", "MINERAL"),
  pending("CHOLINE", "Choline", "mg", "OTHER"),
] as const;

const BY_ID = new Map(
  CANONICAL_NUTRIENT_REGISTRY.map((definition) => [
    definition.id,
    definition,
  ]),
);

export function nutrientDefinition(
  id: CanonicalNutrientId,
): CanonicalNutrientDefinition {
  const definition = BY_ID.get(id);
  if (!definition) {
    throw new Error(`Unknown canonical nutrient id: ${id}`);
  }
  return definition;
}
