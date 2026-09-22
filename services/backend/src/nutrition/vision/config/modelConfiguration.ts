import type { AppwriteTablesClient } from "../../../foundation/repository.ts";

export const FOOD_VISION_TASK_TYPE = "food_vision";

export type AiProviderName = "openrouter" | "gemini";

export type ModelRoute = {
  modelConfigId: string;
  taskType: string;
  provider: AiProviderName;
  modelName: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  maxAttempts: number;
  retryBaseDelayMs: number;
  priority: number;
  providerOptions?: Record<string, unknown>;
};

export interface ModelConfigurationStore {
  activeRoutes(taskType: string): Promise<readonly ModelRoute[]>;
}

type ModelConfigurationRow = {
  modelConfigId?: unknown;
  taskType?: unknown;
  provider?: unknown;
  modelName?: unknown;
  temperature?: unknown;
  maxOutputTokens?: unknown;
  timeoutMs?: unknown;
  retryPolicyJson?: unknown;
  providerOptionsJson?: unknown;
  priority?: unknown;
  state?: unknown;
  updatedAt?: unknown;
};

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

function parseObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function parseModelRoute(row: ModelConfigurationRow): ModelRoute | null {
  const providerRaw = typeof row.provider === "string" ? row.provider.trim().toLowerCase() : "";
  if (providerRaw !== "openrouter" && providerRaw !== "gemini") return null;
  const taskType = typeof row.taskType === "string" ? row.taskType.trim() : "";
  const modelName = typeof row.modelName === "string" ? row.modelName.trim() : "";
  const modelConfigId = typeof row.modelConfigId === "string" ? row.modelConfigId.trim() : "";
  if (!taskType || !modelName || !modelConfigId) return null;
  if (typeof row.state === "string" && !["ACTIVE", "ENABLED"].includes(row.state.trim().toUpperCase())) return null;
  const retry = parseObject(row.retryPolicyJson) ?? {};
  const providerOptions = parseObject(row.providerOptionsJson);
  const maxAttempts = boundedNumber(retry.maxAttempts, 3, 1, 4);
  const retryBaseDelayMs = boundedNumber(retry.baseDelayMs, 750, 0, 8_000);
  return {
    modelConfigId,
    taskType,
    provider: providerRaw,
    modelName,
    temperature: boundedNumber(row.temperature, 0.1, 0, 1),
    maxOutputTokens: Math.round(boundedNumber(row.maxOutputTokens, 4096, 256, 8192)),
    timeoutMs: Math.round(boundedNumber(row.timeoutMs, 30_000, 500, 60_000)),
    maxAttempts: Math.round(maxAttempts),
    retryBaseDelayMs: Math.round(retryBaseDelayMs),
    priority: Math.round(boundedNumber(row.priority, 100, 0, 10_000)),
    ...(providerOptions ? { providerOptions } : {}),
  };
}

export class MemoryModelConfigurationStore implements ModelConfigurationStore {
  private readonly routes: readonly ModelRoute[];
  constructor(routes: readonly ModelRoute[]) { this.routes = routes; }
  async activeRoutes(taskType: string): Promise<readonly ModelRoute[]> {
    return this.routes.filter((route) => route.taskType === taskType).sort((a, b) => a.priority - b.priority || a.modelConfigId.localeCompare(b.modelConfigId));
  }
}

/** Server-only Appwrite model-configuration reader. No provider credential is stored in these rows. */
export class AppwriteModelConfigurationStore implements ModelConfigurationStore {
  private readonly client: AppwriteTablesClient;
  private readonly databaseId: string;
  private readonly cacheTtlMs: number;
  constructor(client: AppwriteTablesClient, databaseId: string, cacheTtlMs = 30_000) {
    this.client = client; this.databaseId = databaseId; this.cacheTtlMs = cacheTtlMs;
  }

  private readonly cache = new Map<string, { at: number; routes: readonly ModelRoute[] }>();

  async activeRoutes(taskType: string): Promise<readonly ModelRoute[]> {
    const cached = this.cache.get(taskType);
    if (cached && Date.now() - cached.at <= this.cacheTtlMs) return cached.routes;
    const result = await this.client.listRows<ModelConfigurationRow>({
      databaseId: this.databaseId,
      tableId: "model_configuration",
      queries: [{ field: "taskType", operator: "equal", value: taskType }],
      limit: 50,
    });
    const routes = result.rows
      .map((row) => parseModelRoute(row))
      .filter((route): route is ModelRoute => route !== null)
      .sort((a, b) => a.priority - b.priority || a.modelConfigId.localeCompare(b.modelConfigId));
    this.cache.set(taskType, { at: Date.now(), routes });
    return routes;
  }
}

export class FallbackModelConfigurationStore implements ModelConfigurationStore {
  private readonly stores: readonly ModelConfigurationStore[];
  constructor(stores: readonly ModelConfigurationStore[]) { this.stores = stores; }
  async activeRoutes(taskType: string): Promise<readonly ModelRoute[]> {
    const combined: ModelRoute[] = [];
    const seen = new Set<string>();
    for (const store of this.stores) {
      try {
        for (const route of await store.activeRoutes(taskType)) {
          const key = `${route.provider}:${route.modelName}:${route.modelConfigId}`;
          if (!seen.has(key)) { seen.add(key); combined.push(route); }
        }
      } catch {
        // A configuration-store outage must not suppress later server-secret
        // fallbacks. Each returned route is still checked for its credential.
      }
    }
    return combined;
  }
}
