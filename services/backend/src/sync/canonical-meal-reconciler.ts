import { sha256 } from "../domain/sync-store.ts";
import type { CanonicalInvalidationBoundary } from "../domain/invalidation-boundary.ts";
import type { OwnerScopedRepository, ServerOwnedRepository } from "../foundation/repository.ts";
import { AppwriteConfirmedMealStore } from "../meal/confirmed-meals.ts";
import { ConfirmedMealProjection } from "../meal/confirmed-meal-projection.ts";
import { MealContractError } from "../meal/contracts.ts";
import type { ConfirmedMealDeleteInput, ConfirmedMealRevisionInput } from "../meal/store-types.ts";
import { ContractError } from "../shared/contracts.ts";
import type { SyncEnvelope, SyncOutcome, SyncReceipt } from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import {
  CanonicalSyncCursorStore,
  CanonicalSyncJournal,
  CanonicalSyncSecurityGate,
  syncReceipt,
  validateSyncEnvelope,
} from "./canonical-reconciliation.ts";

export type CanonicalMealOperation = "MEAL_CONFIRM_REPLAY" | "MEAL_CORRECT" | "MEAL_DELETE";

type MealTombstoneRow = {
  tombstoneId: string;
  userId: string;
  mealId: string;
  deletedRevision: number;
  reason: string;
  createdAt: string;
  purgeAfter: string;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError("invalid_meal_sync_payload", "Meal sync payload must be an object.");
  }
  return value as Record<string, unknown>;
};

const requireString = (value: unknown, code: string, label: string): string => {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 128) {
    throw new ContractError(code, `${label} is required.`);
  }
  return value.trim();
};

const requireRevision = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ContractError("invalid_revision", "expectedRevision must be a non-negative integer.");
  }
  return value;
};

const tombstoneRowId = (userId: string, mealId: string): string =>
  `meal-tombstone-${sha256({ userId, mealId }).slice(0, 48)}`;

export class CanonicalMealReconciler {
  private readonly journal: CanonicalSyncJournal;
  private readonly cursor: CanonicalSyncCursorStore;
  private readonly security: CanonicalSyncSecurityGate;
  private readonly now: () => Date;
  private readonly store: AppwriteConfirmedMealStore;
  private readonly ownerRepository: OwnerScopedRepository;
  private readonly invalidation?: CanonicalInvalidationBoundary;

  constructor(
    store: AppwriteConfirmedMealStore,
    ownerRepository: OwnerScopedRepository,
    serverRepository: ServerOwnedRepository,
    invalidation?: CanonicalInvalidationBoundary,
    now: () => Date = () => new Date(),
  ) {
    this.store = store;
    this.ownerRepository = ownerRepository;
    this.invalidation = invalidation;
    this.now = now;
    this.journal = new CanonicalSyncJournal(serverRepository, now);
    this.cursor = new CanonicalSyncCursorStore(serverRepository, () => now().getTime());
    this.security = new CanonicalSyncSecurityGate(ownerRepository, () => now().getTime());
  }

  async reconcile(userId: string, envelope: SyncEnvelope<unknown>): Promise<SyncReceipt> {
    validateSyncEnvelope(envelope);
    if (envelope.entityType !== "meal") {
      throw new ContractError("invalid_meal_sync_envelope", "Meal reconciliation requires entityType=meal.");
    }
    await this.security.assertAuthorized(userId, envelope);
    const replay = await this.journal.replay(userId, envelope);
    if (replay) return replay;

    try {
      switch (envelope.operation as CanonicalMealOperation) {
        case "MEAL_CONFIRM_REPLAY":
          return await this.confirmReplay(userId, envelope);
        case "MEAL_CORRECT":
          return await this.correct(userId, envelope);
        case "MEAL_DELETE":
          return await this.delete(userId, envelope);
        default:
          return await this.reject(userId, envelope, "REJECTED", "UNSUPPORTED_MEAL_OPERATION");
      }
    } catch (error) {
      if (error instanceof MealContractError) {
        const mapped = this.mapMealError(error.code);
        return this.reject(userId, envelope, mapped.outcome, mapped.errorCode);
      }
      if (error instanceof ContractError) {
        return this.reject(userId, envelope, "REJECTED", error.code.toUpperCase());
      }
      throw error;
    }
  }

  private async confirmReplay(userId: string, envelope: SyncEnvelope<unknown>): Promise<SyncReceipt> {
    const current = await this.store.get(userId, envelope.entityId);
    if (!current) return this.reject(userId, envelope, "CANONICAL_RECORD_MISSING", "MEAL_MISSING");
    const tombstone = await this.tombstone(userId, envelope.entityId);
    if (current.status === "DELETED" || tombstone) {
      return this.reject(userId, envelope, "DEPENDENCY_CHANGED", "MEAL_TOMBSTONED", current.currentRevision);
    }
    if (envelope.expectedEntityRevision !== null && envelope.expectedEntityRevision !== current.currentRevision) {
      return this.reject(userId, envelope, "STALE_REVISION", "MEAL_REVISION_STALE", current.currentRevision);
    }
    return this.finish(userId, envelope, "DUPLICATE", current.currentRevision);
  }

  private async correct(userId: string, envelope: SyncEnvelope<unknown>): Promise<SyncReceipt> {
    const payload = asRecord(envelope.payload);
    const mealId = requireString(payload.mealId, "invalid_meal_id", "mealId");
    const idempotencyKey = requireString(payload.idempotencyKey, "invalid_idempotency_key", "idempotencyKey");
    const expectedRevision = requireRevision(payload.expectedRevision);
    this.assertEnvelopeBinding(envelope, mealId, idempotencyKey, expectedRevision);

    const current = await this.store.get(userId, mealId);
    if (!current) return this.reject(userId, envelope, "CANONICAL_RECORD_MISSING", "MEAL_MISSING");
    if (current.status === "DELETED" || await this.tombstone(userId, mealId)) {
      return this.reject(userId, envelope, "DEPENDENCY_CHANGED", "MEAL_TOMBSTONED", current.currentRevision);
    }
    if (current.currentRevision !== expectedRevision) {
      return this.reject(userId, envelope, "STALE_REVISION", "MEAL_REVISION_STALE", current.currentRevision);
    }

    const projection = new ConfirmedMealProjection(() => this.now().getTime());
    projection.hydrate(userId, [current]);
    const input: ConfirmedMealRevisionInput = { mealId, idempotencyKey, expectedRevision, items: payload.items };
    const revised = projection.revise(userId, input);
    await this.store.persist(userId, revised);
    return this.finish(userId, envelope, "ACCEPTED", revised.currentRevision, revised.localDate, "MEAL_CORRECTED");
  }

  private async delete(userId: string, envelope: SyncEnvelope<unknown>): Promise<SyncReceipt> {
    const payload = asRecord(envelope.payload);
    const mealId = requireString(payload.mealId, "invalid_meal_id", "mealId");
    const idempotencyKey = requireString(payload.idempotencyKey, "invalid_idempotency_key", "idempotencyKey");
    const expectedRevision = requireRevision(payload.expectedRevision);
    this.assertEnvelopeBinding(envelope, mealId, idempotencyKey, expectedRevision);

    const existingTombstone = await this.tombstone(userId, mealId);
    const current = await this.store.get(userId, mealId);
    if (existingTombstone) {
      return this.finish(userId, envelope, "DUPLICATE", existingTombstone.deletedRevision);
    }
    if (!current) return this.reject(userId, envelope, "CANONICAL_RECORD_MISSING", "MEAL_MISSING");
    if (current.status === "DELETED") {
      await this.ensureTombstone(userId, current.mealId, current.currentRevision, "MEAL_DELETE_REPAIR");
      return this.finish(userId, envelope, "DUPLICATE", current.currentRevision);
    }
    if (current.currentRevision !== expectedRevision) {
      return this.reject(userId, envelope, "STALE_REVISION", "MEAL_REVISION_STALE", current.currentRevision);
    }

    const projection = new ConfirmedMealProjection(() => this.now().getTime());
    projection.hydrate(userId, [current]);
    const input: ConfirmedMealDeleteInput = { mealId, idempotencyKey, expectedRevision };
    const deleted = projection.delete(userId, input);
    await this.store.persist(userId, deleted);
    await this.ensureTombstone(
      userId,
      mealId,
      deleted.currentRevision,
      typeof payload.reasonCode === "string" && payload.reasonCode.trim() ? payload.reasonCode.trim().slice(0, 128) : "USER_DELETE",
    );
    return this.finish(userId, envelope, "ACCEPTED", deleted.currentRevision, deleted.localDate, "MEAL_DELETED");
  }

  private assertEnvelopeBinding(
    envelope: SyncEnvelope<unknown>,
    mealId: string,
    idempotencyKey: string,
    expectedRevision: number,
  ): void {
    if (envelope.entityId !== mealId) throw new ContractError("entity_contract_mismatch", "Meal entityId/mealId differ.");
    if (envelope.idempotencyKey !== idempotencyKey) throw new ContractError("idempotency_contract_mismatch", "Meal idempotency keys differ.");
    if (envelope.expectedEntityRevision !== expectedRevision) throw new ContractError("revision_contract_mismatch", "Meal expected revisions differ.");
  }

  private async tombstone(userId: string, mealId: string): Promise<MealTombstoneRow | null> {
    const rows = await this.ownerRepository.listOwned<MealTombstoneRow>("meal_tombstone", userId, {
      queries: [{ field: "mealId", operator: "equal", value: mealId }],
      limit: 2,
    });
    return rows.rows[0] ? rows.rows[0] as MealTombstoneRow : null;
  }

  private async ensureTombstone(userId: string, mealId: string, deletedRevision: number, reason: string): Promise<void> {
    if (await this.tombstone(userId, mealId)) return;
    const createdAt = this.now();
    const rowId = tombstoneRowId(userId, mealId);
    await this.ownerRepository.createOwned<MealTombstoneRow>("meal_tombstone", userId, rowId, {
      tombstoneId: rowId,
      userId,
      mealId,
      deletedRevision,
      reason,
      createdAt: createdAt.toISOString(),
      purgeAfter: new Date(createdAt.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  private async finish(
    userId: string,
    envelope: SyncEnvelope<unknown>,
    outcome: "ACCEPTED" | "DUPLICATE",
    canonicalRevision: number,
    localDate?: string,
    reasonCode = "MEAL_CANONICAL_ACK",
  ): Promise<SyncReceipt> {
    const cursor = await this.cursor.advance(userId, envelope, "meal");
    const receipt = syncReceipt(envelope, outcome, this.now().toISOString(), {
      canonicalRevision,
      canonicalCursor: cursor,
    });
    await this.journal.record(userId, envelope, receipt);
    if (outcome === "ACCEPTED" && this.invalidation) {
      for (const domain of ["MEAL", "NUTRITION_LEDGER", "NUTRITION", "TODAY"] as const) {
        await this.invalidation.markDirty({
          userId,
          domain,
          sourceType: "MEAL",
          sourceId: envelope.entityId,
          sourceRevision: canonicalRevision,
          operationId: envelope.operationId,
          reasonCode: localDate ? `${reasonCode}:${localDate}` : reasonCode,
        });
      }
    }
    return receipt;
  }

  private mapMealError(code: string): { outcome: SyncOutcome; errorCode: string } {
    switch (code) {
      case "draft_revision_conflict":
        return { outcome: "STALE_REVISION", errorCode: "MEAL_REVISION_STALE" };
      case "meal_already_deleted":
        return { outcome: "DEPENDENCY_CHANGED", errorCode: "MEAL_TOMBSTONED" };
      case "meal_not_found":
        return { outcome: "CANONICAL_RECORD_MISSING", errorCode: "MEAL_MISSING" };
      case "idempotency_key_reused":
        return { outcome: "REJECTED", errorCode: "IDEMPOTENCY_KEY_REUSED" };
      default:
        return { outcome: "REJECTED", errorCode: code.toUpperCase() };
    }
  }

  private async reject(
    userId: string,
    envelope: SyncEnvelope<unknown>,
    outcome: SyncOutcome,
    errorCode: string,
    canonicalRevision: number | null = null,
  ): Promise<SyncReceipt> {
    const receipt = syncReceipt(envelope, outcome, this.now().toISOString(), { canonicalRevision, errorCode });
    await this.journal.record(userId, envelope, receipt, errorCode);
    return receipt;
  }
}
