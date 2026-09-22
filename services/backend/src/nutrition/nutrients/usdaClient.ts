import type { FoodDataType } from "../algorithm/contracts.ts";
import type { NutritionRecord } from "../identity/knowledgeNutritionResolver.ts";
import { CANONICAL_NUTRIENT_IDS } from "./nutrientNormalizer.ts";

/**
 * USDA FoodData Central API client (server-only).
 *
 * Reads the key from the environment variable USDA_FDC_API_KEY only. No
 * key is ever embedded in source, Android files, logs, reports or Git
 * history. The production server may use the bounded fetch transport when the
 * backend environment provides a real key; tests continue to inject mocks.
 * `DEMO_KEY` is never used in production.
 */

export type FdcApiConfig = {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
};

export type FdcSearchResponse = {
  foods: ReadonlyArray<{
    fdcId: number;
    dataType: string;
    description: string;
    gtinUpc?: string;
    brandName?: string;
    publicationDate?: string;
    foodNutrients?: ReadonlyArray<{ nutrientId?: number; value?: number }>;
  }>;
};

export type RateLimitInfo = {
  limit: string | null;
  remaining: string | null;
  reset: string | null;
};

export type Transport = {
  request(input: {
    url: string;
    method: "GET" | "POST";
    headers: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  }): Promise<{ status: number; headers: Headers; text: string }>;
};

export class FdcApiError extends Error {
  public readonly code: string;
  public readonly status: number | null;
  public readonly retryable: boolean;
  constructor(code: string, message: string, status: number | null = null, retryable = false) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.name = "FdcApiError";
  }
}

export class FdcApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly transport: Transport;
  private readonly sleeper: (ms: number) => Promise<void>;

  constructor(transport: Transport, config: FdcApiConfig = {}) {
    const key = config.apiKey ?? process.env.USDA_FDC_API_KEY ?? "";
    if (!key) {
      throw new FdcApiError("missing_api_key", "USDA_FDC_API_KEY is required (backend environment only).");
    }
    this.transport = transport;
    this.baseUrl = config.baseUrl ?? "https://api.nal.usda.gov/fdc/v1";
    this.apiKey = key;
    this.timeoutMs = config.timeoutMs ?? 10_000;
    this.maxRetries = config.maxRetries ?? 3;
    this.sleeper = config.sleep ?? sleep;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "X-Api-Key": this.apiKey,
    };
  }

  private rateLimit(headers: Headers): RateLimitInfo {
    return {
      limit: headers.get("X-RateLimit-Limit"),
      remaining: headers.get("X-RateLimit-Remaining"),
      reset: headers.get("X-RateLimit-Reset"),
    };
  }

  private async requestWithRetry(url: string, method: "GET" | "POST", body?: string): Promise<{ text: string; rateLimit: RateLimitInfo }> {
    let attempt = 0;
    while (true) {
      attempt += 1;
      let response: Awaited<ReturnType<Transport["request"]>>;
      try {
        response = await this.transport.request({ url, method, headers: this.headers(), body, timeoutMs: this.timeoutMs });
      } catch (error) {
        const retryable = error instanceof FdcApiError ? error.retryable : true;
        if (!retryable || attempt > this.maxRetries) throw error;
        await this.sleeper(jitter(attempt));
        continue;
      }
      const rateLimit = this.rateLimit(response.headers);
      // Food search is a fixed collection endpoint: a sporadic 404 is an
      // upstream routing failure, not evidence that the searched food is absent.
      const retryableStatus = response.status === 404 || response.status === 429 || response.status >= 500;
      if (retryableStatus && attempt <= this.maxRetries) {
        await this.sleeper(retryAfterMs(response.headers) ?? jitter(attempt));
        continue;
      }
      if (response.status < 200 || response.status >= 300) {
        const retryable = retryableStatus;
        const code = response.status === 429 ? "rate_limited" : response.status === 408 ? "timeout" : "http_error";
        throw new FdcApiError(code, `FDC API returned ${response.status}`, response.status, retryable);
      }
      return { text: response.text, rateLimit };
    }
  }

  /** Search foods by query terms. */
  async search(query: string, pageSize = 10): Promise<FdcSearchResponse> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) throw new FdcApiError("invalid_request", "FDC search query must not be blank.");
    const url = `${this.baseUrl}/foods/search`;
    const body = JSON.stringify({
      query: normalizedQuery,
      pageSize: Math.max(1, Math.min(50, Math.round(pageSize))),
      pageNumber: 1,
    });
    const { text, rateLimit } = await this.requestWithRetry(url, "POST", body);
    this.latestRateLimit = rateLimit;
    const parsed = safeParse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !Array.isArray((parsed as Record<string, unknown>).foods)) {
      throw new FdcApiError("malformed_response", "FDC API response did not contain a foods array.");
    }
    return parsed as FdcSearchResponse;
  }

  /**
   * Search FDC and normalize rows into the synchronous record shape consumed by
   * the trusted nutrition knowledge resolver. Unknown data types are ignored rather than being
   * promoted to nutrition authority, and missing nutrients remain null.
   */
  async searchNutritionRecords(query: string, pageSize = 20, limit = 20): Promise<NutritionRecord[]> {
    const result = await this.search(query, Math.max(1, Math.min(pageSize, 50)));
    const records: NutritionRecord[] = [];
    for (const food of result.foods) {
      if (records.length >= Math.max(1, limit)) break;
      const dataType = normalizeFdcDataType(food.dataType);
      if (dataType === null || !Number.isInteger(food.fdcId) || food.fdcId <= 0 || !food.description?.trim()) continue;
      const nutrients = canonicalNutrients(food.foodNutrients ?? []);
      records.push({
        fdcId: food.fdcId,
        dataType,
        description: food.description.trim(),
        normalizedName: normalizeFoodName(food.description),
        ...(food.gtinUpc?.trim() ? { gtinUpc: food.gtinUpc.trim() } : {}),
        ...(food.brandName?.trim() ? { brandName: food.brandName.trim() } : {}),
        ...(food.publicationDate?.trim() ? { publicationDate: food.publicationDate.trim() } : {}),
        nutrientIds: [...new Set((food.foodNutrients ?? []).flatMap((row) => Number.isInteger(row.nutrientId) ? [row.nutrientId!] : []))],
        energyKcal: nutrients.energyKcal,
        proteinG: nutrients.proteinG,
        carbG: nutrients.carbG,
        fatG: nutrients.fatG,
        fiberG: nutrients.fiberG,
        sodiumMg: nutrients.sodiumMg,
      });
    }
    return records;
  }

  /** Get a single food record by fdcId. */
  async getFood(fdcId: number): Promise<unknown> {
    const url = `${this.baseUrl}/food/${fdcId}?format=full`;
    const { text, rateLimit } = await this.requestWithRetry(url, "GET");
    this.latestRateLimit = rateLimit;
    return safeParse(text);
  }

  /** List food records by fdcIds. */
  async listFoods(fdcIds: readonly number[]): Promise<unknown> {
    const url = `${this.baseUrl}/foods/list`;
    const { text, rateLimit } = await this.requestWithRetry(url, "POST", JSON.stringify({ fdcIds: [...fdcIds] }));
    this.latestRateLimit = rateLimit;
    return safeParse(text);
  }

  private latestRateLimit: RateLimitInfo = { limit: null, remaining: null, reset: null };
  get lastRateLimit(): RateLimitInfo {
    return this.latestRateLimit;
  }
}

function normalizeFoodName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}

function normalizeFdcDataType(value: string): FoodDataType | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "foundation") return "FOUNDATION";
  if (normalized === "survey (fndds)" || normalized === "fndds" || normalized.includes("fndds")) return "FNDDS";
  if (normalized === "branded") return "BRANDED";
  if (normalized === "sr legacy" || normalized === "sr_legacy") return "SR_LEGACY";
  if (normalized === "experimental") return "EXPERIMENTAL";
  return null;
}

type CanonicalNutrition = { energyKcal: number | null; proteinG: number | null; carbG: number | null; fatG: number | null; fiberG: number | null; sodiumMg: number | null };

function canonicalNutrients(rows: ReadonlyArray<{ nutrientId?: number; value?: number }>): CanonicalNutrition {
  const valueFor = (ids: readonly number[]): number | null => {
    for (const id of ids) {
      const row = rows.find((entry) => entry.nutrientId === id && typeof entry.value === "number" && Number.isFinite(entry.value) && entry.value >= 0);
      if (row?.value !== undefined) return row.value;
    }
    return null;
  };
  return {
    energyKcal: valueFor(CANONICAL_NUTRIENT_IDS.energyKcal),
    proteinG: valueFor(CANONICAL_NUTRIENT_IDS.proteinG),
    carbG: valueFor(CANONICAL_NUTRIENT_IDS.carbG),
    fatG: valueFor(CANONICAL_NUTRIENT_IDS.fatG),
    fiberG: valueFor(CANONICAL_NUTRIENT_IDS.fiberG),
    sodiumMg: valueFor(CANONICAL_NUTRIENT_IDS.sodiumMg),
  };
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new FdcApiError("malformed_response", "FDC API returned invalid JSON.");
  }
}

function retryAfterMs(headers: Headers): number | null {
  const value = headers.get("Retry-After")?.trim();
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(30_000, Math.round(seconds * 1_000));
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return Math.min(30_000, Math.max(0, timestamp - Date.now()));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Bounded exponential backoff with jitter (attempt is 1-based). */
function jitter(attempt: number): number {
  const base = 250 * 2 ** Math.min(attempt - 1, 5);
  return Math.round(base * (0.5 + Math.random() * 0.5));
}


/** Production fetch transport with an explicit abort timeout. */
export const fetchFdcTransport: Transport = {
  async request(input) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1_000, input.timeoutMs ?? 10_000));
    try {
      const response = await fetch(input.url, {
        method: input.method,
        headers: input.headers,
        ...(input.body === undefined ? {} : { body: input.body }),
        signal: controller.signal,
      });
      return { status: response.status, headers: response.headers, text: await response.text() };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new FdcApiError("timeout", "FDC API request timed out.", null, true);
      }
      throw new FdcApiError("network_error", "FDC API request failed.", null, true);
    } finally {
      clearTimeout(timer);
    }
  },
};
