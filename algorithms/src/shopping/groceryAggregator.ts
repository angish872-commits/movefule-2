import type {
  AlgorithmContext,
  AlgorithmResult,
  EvidenceRef,
} from "../core/contracts";

export interface GroceryRequirement {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  sourceRecipeId?: string;
}

export interface PantryItem {
  ingredientId: string;
  availableQuantity: number;
  unit: string;
}

export interface GroceryLine {
  ingredientId: string;
  name: string;
  requiredQuantity: number;
  pantryQuantityUsed: number;
  buyQuantity: number;
  unit: string;
  sourceRecipeIds: string[];
}

/**
 * Aggregates recipe/meal-plan requirements, merges duplicates and subtracts
 * compatible pantry quantities. Package-size optimization is a later layer.
 */
export function aggregateGroceryList(
  context: AlgorithmContext,
  requirements: readonly GroceryRequirement[],
  pantry: readonly PantryItem[],
  evidence: EvidenceRef[] = [],
): AlgorithmResult<readonly GroceryLine[]> {
  const byIngredient = new Map<string, GroceryLine>();

  for (const requirement of requirements) {
    if (!Number.isFinite(requirement.quantity) || requirement.quantity < 0) {
      continue;
    }

    const existing = byIngredient.get(requirement.ingredientId);
    if (existing && existing.unit === requirement.unit) {
      existing.requiredQuantity += requirement.quantity;
      if (requirement.sourceRecipeId) {
        existing.sourceRecipeIds.push(requirement.sourceRecipeId);
      }
    } else if (!existing) {
      byIngredient.set(requirement.ingredientId, {
        ingredientId: requirement.ingredientId,
        name: requirement.name,
        requiredQuantity: requirement.quantity,
        pantryQuantityUsed: 0,
        buyQuantity: requirement.quantity,
        unit: requirement.unit,
        sourceRecipeIds: requirement.sourceRecipeId
          ? [requirement.sourceRecipeId]
          : [],
      });
    }
  }

  for (const pantryItem of pantry) {
    const line = byIngredient.get(pantryItem.ingredientId);
    if (!line || line.unit !== pantryItem.unit) continue;

    const used = Math.min(
      Math.max(0, pantryItem.availableQuantity),
      line.requiredQuantity,
    );
    line.pantryQuantityUsed = used;
    line.buyQuantity = Math.max(0, line.requiredQuantity - used);
  }

  const output = [...byIngredient.values()]
    .filter((line) => line.buyQuantity > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    algorithmId: "MF-056",
    status: "SUCCESS",
    output,
    reasonCodes: [],
    evidence,
    versions: context.versions,
    generatedAt: context.now,
  };
}
