/** Canonical meal-image constraints shared by local and Appwrite stores. */
export const MEAL_MEDIA_BUCKET_ID = "meal-history-private" as const;
export const MEAL_MEDIA_MAX_BYTES = 20 * 1024 * 1024;
export const MEAL_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type MealMediaType = typeof MEAL_MEDIA_TYPES[number];

export function isMealMediaType(value: unknown): value is MealMediaType {
  return MEAL_MEDIA_TYPES.includes(value as MealMediaType);
}
