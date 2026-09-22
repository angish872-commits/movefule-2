import { createHash } from "node:crypto";
import type { AppwriteTablesClient } from "../../../foundation/repository.ts";
import type { OpenRouterUsage } from "../providers/openRouterFoodSceneAdapter.ts";

export type ProviderUsageEvent = OpenRouterUsage & {
  provider: "openrouter";
  ownerUserId?: string;
  requestId?: string;
  imageReference?: string;
  outputHash?: string;
};

function sha(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function periodKey(now: Date): string { return now.toISOString().slice(0, 7); }

/** Writes metadata only: never request bodies, images, prompts, auth headers, or provider credentials. */
export class AppwriteProviderCallRecorder {
  constructor(privateClient: AppwriteTablesClient, privateDatabaseId: string) {
    this.client = privateClient;
    this.databaseId = privateDatabaseId;
  }
  private readonly client: AppwriteTablesClient;
  private readonly databaseId: string;

  async record(event: ProviderUsageEvent): Promise<void> {
    if (!event.ownerUserId?.trim() || !event.requestId?.trim()) return;
    const now = new Date();
    const stable = sha(`${event.provider}:${event.requestId}:${event.model}`).slice(0, 40);
    const providerCallId = `pc_${stable}`;
    const inputHash = sha(event.imageReference ?? event.requestId);
    try {
      await this.client.createRow(this.databaseId, "provider_call", providerCallId, {
        providerCallId,
        userId: event.ownerUserId,
        taskType: "food_vision",
        requestId: event.requestId,
        provider: event.provider,
        model: event.model,
        inputHash,
        ...(event.outputHash ? { outputHash: event.outputHash } : {}),
        status: "COMPLETED",
        latencyMs: Math.max(0, Math.round(event.latencyMs)),
        tokenIn: Math.max(0, Math.round(event.promptTokens)),
        tokenOut: Math.max(0, Math.round(event.completionTokens)),
        createdAt: now.toISOString(),
      });
    } catch {
      // Telemetry is never allowed to turn a valid nutrition result into an outage.
    }
    if (event.costUsd !== undefined && Number.isFinite(event.costUsd) && event.costUsd >= 0) {
      const usageId = `usage_${stable}`;
      try {
        await this.client.createRow(this.databaseId, "usage_ledger", usageId, {
          usageId,
          userId: event.ownerUserId,
          usageType: "ai_provider_cost",
          quantity: event.costUsd,
          unit: "USD",
          requestId: event.requestId,
          provider: event.provider,
          model: event.model,
          periodKey: periodKey(now),
          occurredAt: now.toISOString(),
        }, [
          `read("user:${event.ownerUserId}")`,
          `write("user:${event.ownerUserId}")`,
          `update("user:${event.ownerUserId}")`,
          `delete("user:${event.ownerUserId}")`,
        ]);
      } catch {
        // Best-effort accounting; provider_call remains the authoritative technical log.
      }
    }
  }
}
