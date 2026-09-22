/** Identity-bound confirmed serving history for MoveFuel personalization. */

import { createHash } from "node:crypto";
import type { AppwriteTablesClient } from "../../foundation/repository.ts";
import type { NutritionSource } from "../algorithm/contracts.ts";
import type { RegionFoodCandidate } from "../vision/candidateProviderAdapter.ts";
import { buildPersonalServingPrior, type ConfirmedServingObservation, type PersonalServingPrior } from "./personalServingPrior.ts";

export const SERVING_PRIOR_STORE_VERSION = "2.0.0";
export const SERVING_PRIOR_TABLE_ID = "serving_prior_observation" as const;

export type ServingPriorIdentity = {
  ownerUserId: string;
  source: NutritionSource;
  candidate: RegionFoodCandidate;
  preparationLabel?: string | null;
};

/**
 * Serving priors are asynchronous because the production implementation is
 * durable. The algorithm awaits the lookup while collecting weak evidence;
 * failure to load history must never become fabricated physical evidence.
 */
export interface ServingPriorStore {
  recordConfirmed(identity: ServingPriorIdentity, grams: number, confirmedAt?: string): Promise<void>;
  resolve(identity: ServingPriorIdentity): Promise<PersonalServingPrior | null>;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function servingPriorIdentityKey(identity: ServingPriorIdentity): string {
  const sourceKey = identity.source.source === "USDA_FDC"
    ? `fdc:${identity.source.fdcId ?? "unknown"}`
    : `recipe:${identity.source.recipeRevisionId ?? normalize(identity.source.description)}`;
  return [
    normalize(identity.ownerUserId),
    sourceKey,
    normalize(identity.candidate.name),
    normalize(identity.preparationLabel ?? identity.candidate.preparationCandidates[0]?.label),
  ].join("|");
}

function deterministicObservationId(identityKey: string, grams: number, confirmedAt: string): string {
  return `spo_${createHash("sha256").update(`${identityKey}|${grams.toFixed(3)}|${confirmedAt}`).digest("hex").slice(0, 40)}`;
}

function validObservation(row: { grams?: unknown; confirmedAt?: unknown }): ConfirmedServingObservation | null {
  const grams = typeof row.grams === "number" ? row.grams : Number(row.grams);
  const confirmedAt = typeof row.confirmedAt === "string" ? row.confirmedAt : "";
  if (!Number.isFinite(grams) || grams <= 0 || Number.isNaN(Date.parse(confirmedAt))) return null;
  return { grams, confirmedAt };
}

/** In-process implementation for local development and deterministic tests. */
export class MemoryServingPriorStore implements ServingPriorStore {
  private readonly rows = new Map<string, ConfirmedServingObservation[]>();
  private readonly minimumSamples: number;
  private readonly maxObservationsPerIdentity: number;

  constructor(options: { minimumSamples?: number; maxObservationsPerIdentity?: number } = {}) {
    this.minimumSamples = Math.max(2, options.minimumSamples ?? 5);
    this.maxObservationsPerIdentity = Math.max(this.minimumSamples, options.maxObservationsPerIdentity ?? 40);
  }

  async recordConfirmed(identity: ServingPriorIdentity, grams: number, confirmedAt = new Date().toISOString()): Promise<void> {
    if (!Number.isFinite(grams) || grams <= 0 || Number.isNaN(Date.parse(confirmedAt))) return;
    const key = servingPriorIdentityKey(identity);
    const current = this.rows.get(key) ?? [];
    if (current.some((entry) => entry.grams === grams && entry.confirmedAt === confirmedAt)) return;
    const next = [...current, { grams, confirmedAt }]
      .sort((a, b) => Date.parse(a.confirmedAt) - Date.parse(b.confirmedAt))
      .slice(-this.maxObservationsPerIdentity);
    this.rows.set(key, next);
  }

  async resolve(identity: ServingPriorIdentity): Promise<PersonalServingPrior | null> {
    return buildPersonalServingPrior(this.rows.get(servingPriorIdentityKey(identity)) ?? [], this.minimumSamples);
  }
}

type AppwriteServingPriorRow = {
  observationId?: unknown;
  ownerUserId?: unknown;
  identityKey?: unknown;
  sourceType?: unknown;
  sourceReference?: unknown;
  candidateName?: unknown;
  preparationLabel?: unknown;
  grams?: unknown;
  confirmedAt?: unknown;
  createdAt?: unknown;
};

/**
 * Server-only durable store. Clients cannot directly seed this table: rows are
 * admitted only after the backend observes an explicit confirmed meal result.
 */
export class AppwriteServingPriorStore implements ServingPriorStore {
  private readonly client: AppwriteTablesClient;
  private readonly databaseId: string;
  private readonly minimumSamples: number;
  private readonly maxObservationsPerIdentity: number;

  constructor(
    client: AppwriteTablesClient,
    databaseId: string,
    options: { minimumSamples?: number; maxObservationsPerIdentity?: number } = {},
  ) {
    this.client = client;
    this.databaseId = databaseId;
    this.minimumSamples = Math.max(2, options.minimumSamples ?? 5);
    this.maxObservationsPerIdentity = Math.max(this.minimumSamples, options.maxObservationsPerIdentity ?? 40);
  }

  async recordConfirmed(identity: ServingPriorIdentity, grams: number, confirmedAt = new Date().toISOString()): Promise<void> {
    if (!Number.isFinite(grams) || grams <= 0 || Number.isNaN(Date.parse(confirmedAt))) return;
    const identityKey = servingPriorIdentityKey(identity);
    const observationId = deterministicObservationId(identityKey, grams, confirmedAt);
    const existing = await this.client.getRow<AppwriteServingPriorRow>(this.databaseId, SERVING_PRIOR_TABLE_ID, observationId);
    if (existing) return;
    const sourceReference = identity.source.source === "USDA_FDC"
      ? `fdc:${identity.source.fdcId ?? "unknown"}`
      : `recipe:${identity.source.recipeRevisionId ?? normalize(identity.source.description)}`;
    const data: AppwriteServingPriorRow = {
      observationId,
      ownerUserId: identity.ownerUserId,
      identityKey,
      sourceType: identity.source.source,
      sourceReference,
      candidateName: identity.candidate.name,
      preparationLabel: identity.preparationLabel ?? identity.candidate.preparationCandidates[0]?.label ?? "",
      grams,
      confirmedAt,
      createdAt: new Date().toISOString(),
    };
    try {
      await this.client.createRow(this.databaseId, SERVING_PRIOR_TABLE_ID, observationId, data, []);
    } catch (error) {
      // A concurrent idempotent confirmation can race between get/create. If
      // the deterministic row now exists, the desired state has been reached.
      const raced = await this.client.getRow<AppwriteServingPriorRow>(this.databaseId, SERVING_PRIOR_TABLE_ID, observationId).catch(() => null);
      if (!raced) throw error;
    }
  }

  async resolve(identity: ServingPriorIdentity): Promise<PersonalServingPrior | null> {
    const identityKey = servingPriorIdentityKey(identity);
    const result = await this.client.listRows<AppwriteServingPriorRow>({
      databaseId: this.databaseId,
      tableId: SERVING_PRIOR_TABLE_ID,
      queries: [
        { field: "ownerUserId", operator: "equal", value: identity.ownerUserId },
        { field: "identityKey", operator: "equal", value: identityKey },
      ],
      limit: this.maxObservationsPerIdentity,
    });
    const observations = result.rows.flatMap((row) => {
      const parsed = validObservation(row);
      return parsed ? [parsed] : [];
    });
    return buildPersonalServingPrior(observations, this.minimumSamples);
  }
}
