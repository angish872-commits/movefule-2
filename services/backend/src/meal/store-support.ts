import { createHash } from "node:crypto";
import {
  MealContractError,
  type MealCreateDraftInput,
  type MealDraft,
  type MealType,
  type NutritionTotals,
} from "./contracts.ts";

export const userScopedKey = (userId: string, value: string): string => `${userId}:${value}`;
export const hash = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
export const isMealType = (value: unknown): value is MealType => value === "breakfast" || value === "lunch" || value === "dinner" || value === "snack" || value === "other";
export const isSourceType = (value: unknown): value is MealCreateDraftInput["sourceType"] =>
  value === "camera" || value === "photo_picker" || value === "barcode" || value === "manual" || value === "sample";

export function requireUserId(userId: string): void {
  if (!isNonEmptyString(userId)) throw new MealContractError("invalid_user_id", "A user id is required.");
}

export function requireIdempotencyKey(value: string): string {
  if (!isNonEmptyString(value) || value.length > 200) throw new MealContractError("invalid_idempotency_key", "A non-empty idempotency key is required.");
  return value.trim();
}

export function requireLocalDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new MealContractError("invalid_local_date", "localDate must use YYYY-MM-DD.");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== (month ?? 0) - 1 || date.getUTCDate() !== day) {
    throw new MealContractError("invalid_local_date", "localDate is not a real calendar date.");
  }
  return value;
}

export function normalizeImageRef(value: MealCreateDraftInput["imageRef"]): MealDraft["imageRef"] {
  if (value === undefined) return undefined;
  if (typeof value === "string") {
    if (!value.trim()) throw new MealContractError("invalid_image_ref", "imageRef cannot be blank.");
    return { objectId: value.trim() };
  }
  if (!value || typeof value !== "object" || !isNonEmptyString(value.objectId)) throw new MealContractError("invalid_image_ref", "imageRef must include an objectId.");
  return { objectId: value.objectId.trim(), ...(value.checksum ? { checksum: value.checksum } : {}), ...(value.mediaType ? { mediaType: value.mediaType } : {}) };
}

/** Empty confirmed intake is a known zero. Unknown propagation starts once an item is present. */
export function zeroTotals(): NutritionTotals {
  return { energyKcal: 0, proteinGrams: 0, carbGrams: 0, fatGrams: 0, fiberGrams: 0 };
}
