import { totalsForItems, clone } from "./nutrition.ts";
import type { NutritionItem, NutritionTotals } from "./contracts.ts";

export type NutritionFixture = {
  key: string;
  title: string;
  items: NutritionItem[];
};

const item = (
  itemId: string,
  displayName: string,
  portionGrams: number,
  energyKcal: number,
  proteinGrams: number,
  carbGrams: number,
  fatGrams: number,
  fiberGrams: number,
  min: number,
  max: number,
): NutritionItem => ({
  itemId,
  displayName,
  portionGrams,
  energyKcal,
  proteinGrams,
  carbGrams,
  fatGrams,
  fiberGrams,
  confidence: "medium",
  energyRangeKcal: { min, max },
});

export const NUTRITION_FIXTURES: readonly NutritionFixture[] = [
  {
    key: "chicken-curry-rice",
    title: "Chicken curry and rice",
    items: [
      item("chicken-curry", "Chicken curry", 250, 420, 28, 18, 24, 3, 360, 500),
      item("steamed-rice", "Steamed rice", 220, 200, 6, 44, 1, 1, 170, 240),
    ],
  },
  {
    key: "oatmeal-berries",
    title: "Oatmeal with berries",
    items: [
      item("oats", "Oatmeal", 260, 310, 11, 52, 8, 7, 260, 370),
      item("berries", "Mixed berries", 100, 55, 1, 13, 0, 4, 40, 75),
    ],
  },
  {
    key: "chicken-salad",
    title: "Chicken salad",
    items: [
      item("salad-chicken", "Grilled chicken", 150, 248, 46, 0, 5, 0, 210, 290),
      item("salad-greens", "Mixed salad greens", 180, 70, 4, 12, 2, 6, 50, 90),
      item("salad-dressing", "Dressing", 30, 120, 0, 2, 12, 0, 90, 150),
    ],
  },
] as const;

export function fixtureTotals(fixture: NutritionFixture): NutritionTotals {
  return totalsForItems(fixture.items);
}

/** Explicit lookup only: no arbitrary live text may select a nutrition fixture. */
export function fixtureByKey(key: string): NutritionFixture | undefined {
  return NUTRITION_FIXTURES.find((fixture) => fixture.key === key);
}

export function cloneFixtureItems(fixture: NutritionFixture): NutritionItem[] {
  return clone(fixture.items);
}
