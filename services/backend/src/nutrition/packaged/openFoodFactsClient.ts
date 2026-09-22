import { normalizeBarcode } from "./barcode.ts";

export const OPEN_FOOD_FACTS_PROVIDER_VERSION = "off-v2-2026-08";

export type PackagedNutrientsPer100g = {
  energyKcal: number;
  proteinG: number;
  carbG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sodiumMg: number | null;
};

export type PackagedFoodRecord = {
  barcode: string;
  productName: string;
  brand: string | null;
  sourceType: "OPEN_FOOD_FACTS";
  sourceReference: string;
  sourceRevision: string | null;
  nutrientsPer100g: PackagedNutrientsPer100g;
  servingGrams: number | null;
  servingLabel: string | null;
  quantityLabel: string | null;
  limitations: readonly string[];
};

export type PackagedFoodLookupResult =
  | { status: "FOUND"; record: PackagedFoodRecord }
  | { status: "NOT_FOUND"; barcode: string }
  | { status: "MALFORMED"; barcode: string; reason: string }
  | { status: "UNAVAILABLE"; barcode: string; reason: "TIMEOUT" | "RATE_LIMITED" | "HTTP_ERROR" | "NETWORK_ERROR" };

export type OpenFoodFactsClientOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  userAgent: string;
  baseUrl?: string;
};

const finiteNonNegative = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sourceRevision(product: Record<string, unknown>): string | null {
  if (typeof product.rev === "number" && Number.isFinite(product.rev)) return `rev:${product.rev}`;
  if (typeof product.rev === "string" && product.rev.trim()) return `rev:${product.rev.trim()}`;
  if (typeof product.last_modified_t === "number" && Number.isFinite(product.last_modified_t)) return `modified:${product.last_modified_t}`;
  return null;
}

function servingGrams(product: Record<string, unknown>): number | null {
  const quantity = typeof product.serving_quantity === "number"
    ? product.serving_quantity
    : typeof product.serving_quantity === "string" && product.serving_quantity.trim()
      ? Number(product.serving_quantity)
      : NaN;
  const unit = text(product.serving_quantity_unit)?.toLowerCase();
  if (!Number.isFinite(quantity) || quantity <= 0 || unit !== "g") return null;
  return quantity;
}

function normalizeProduct(product: Record<string, unknown>, barcode: string): PackagedFoodRecord | null {
  const productName = text(product.product_name);
  const returnedCode = text(product.code);
  const nutriments = record(product.nutriments);
  if (!productName || !nutriments || (returnedCode && normalizeBarcode(returnedCode) !== barcode)) return null;

  const energyKcal = finiteNonNegative(nutriments["energy-kcal_100g"]);
  const proteinG = finiteNonNegative(nutriments.proteins_100g);
  if (energyKcal === null || proteinG === null) return null;
  const sodiumG = finiteNonNegative(nutriments.sodium_100g);
  const limitations: string[] = [];
  const carbG = finiteNonNegative(nutriments.carbohydrates_100g);
  const fatG = finiteNonNegative(nutriments.fat_100g);
  const fiberG = finiteNonNegative(nutriments.fiber_100g);
  if (carbG === null) limitations.push("CARBOHYDRATE_UNKNOWN");
  if (fatG === null) limitations.push("FAT_UNKNOWN");
  if (fiberG === null) limitations.push("FIBER_UNKNOWN");
  if (sodiumG === null) limitations.push("SODIUM_UNKNOWN");

  return {
    barcode,
    productName,
    brand: text(product.brands),
    sourceType: "OPEN_FOOD_FACTS",
    sourceReference: `barcode:${barcode}`,
    sourceRevision: sourceRevision(product),
    nutrientsPer100g: {
      energyKcal,
      proteinG,
      carbG,
      fatG,
      fiberG,
      sodiumMg: sodiumG === null ? null : Math.round(sodiumG * 1000 * 1000) / 1000,
    },
    servingGrams: servingGrams(product),
    servingLabel: text(product.serving_size),
    quantityLabel: text(product.quantity),
    limitations,
  };
}

export class OpenFoodFactsClient {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly userAgent: string;
  private readonly baseUrl: string;

  constructor(options: OpenFoodFactsClientOptions) {
    if (!options.userAgent.trim()) throw new Error("open_food_facts_user_agent_required");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = Math.max(250, Math.min(options.timeoutMs ?? 4_000, 15_000));
    this.userAgent = options.userAgent.trim();
    this.baseUrl = (options.baseUrl ?? "https://world.openfoodfacts.org").replace(/\/$/, "");
  }

  async lookup(rawBarcode: string): Promise<PackagedFoodLookupResult> {
    const barcode = normalizeBarcode(rawBarcode);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const fields = "code,product_name,brands,nutriments,nutrition_data_per,serving_size,serving_quantity,serving_quantity_unit,quantity,rev,last_modified_t";
      const response = await this.fetchImpl(`${this.baseUrl}/api/v2/product/${barcode}.json?fields=${encodeURIComponent(fields)}`, {
        method: "GET",
        headers: { accept: "application/json", "user-agent": this.userAgent },
        signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 429) return { status: "UNAVAILABLE", barcode, reason: "RATE_LIMITED" };
        if (response.status === 408) return { status: "UNAVAILABLE", barcode, reason: "TIMEOUT" };
        return { status: "UNAVAILABLE", barcode, reason: "HTTP_ERROR" };
      }
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        return { status: "MALFORMED", barcode, reason: "INVALID_JSON" };
      }
      const root = record(payload);
      if (!root) return { status: "MALFORMED", barcode, reason: "INVALID_RESPONSE" };
      if (root.status === 0) return { status: "NOT_FOUND", barcode };
      if (root.status !== 1) return { status: "MALFORMED", barcode, reason: "INVALID_STATUS" };
      const product = record(root.product);
      if (!product) return { status: "MALFORMED", barcode, reason: "PRODUCT_MISSING" };
      let normalized: PackagedFoodRecord | null;
      try {
        normalized = normalizeProduct(product, barcode);
      } catch {
        normalized = null;
      }
      if (!normalized) return { status: "MALFORMED", barcode, reason: "PRODUCT_NUTRITION_INCOMPLETE" };
      return { status: "FOUND", record: normalized };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return { status: "UNAVAILABLE", barcode, reason: "TIMEOUT" };
      return { status: "UNAVAILABLE", barcode, reason: "NETWORK_ERROR" };
    } finally {
      clearTimeout(timeout);
    }
  }
}
