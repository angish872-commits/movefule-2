import type { TrainingAdaptationRequester } from "../calendar/calendar-service.ts";
import { sha256 } from "../domain/sync-store.ts";
import {
  canonicalTrainingPlanId,
  TrainingGenerationError,
  type TrainingGenerationCoordinator,
} from "./generation-coordinator.ts";
import type { AppwriteTrainingPlanStore } from "./plan-store.ts";

function calendarAvailableMinutes(startAt: string, endAt: string): number {
  const start = Date.parse(startAt);
  const end = Date.parse(endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new TrainingGenerationError("invalid_training_generation", "Calendar adaptation requires a valid positive scheduling interval.");
  }
  const minutes = Math.floor((end - start) / 60_000);
  if (minutes < 10 || minutes > 240) {
    throw new TrainingGenerationError("invalid_training_generation", "Calendar adaptation interval must be between 10 and 240 whole minutes.");
  }
  return minutes;
}

export function createCanonicalTrainingAdaptationRequester(options: {
  coordinator: Pick<TrainingGenerationCoordinator, "generate">;
  plans: Pick<AppwriteTrainingPlanStore, "currentRevision">;
}): TrainingAdaptationRequester {
  return async ({ userId, entry, request, reasonCode, operationId }) => {
    const owner = userId.trim();
    const semanticSessionId = entry.semanticObjectId.trim();
    if (!owner || !semanticSessionId) {
      throw new TrainingGenerationError("invalid_training_generation", "Calendar adaptation requires an authenticated owner and semantic Training session.");
    }
    const availableMinutes = calendarAvailableMinutes(entry.startAt, entry.endAt);
    const planId = canonicalTrainingPlanId(owner);
    const expectedPlanRevision = await options.plans.currentRevision(owner, planId);
    const idempotencyKey = `calendar-adapt-${sha256({ operationId, request, reasonCode, entryId: entry.entryId }).slice(0, 48)}`;
    const result = await options.coordinator.generate(owner, {
      idempotencyKey,
      expectedPlanRevision,
      calendarConstraint: {
        localDate: entry.localDate,
        semanticSessionId,
        availableMinutes,
      },
    });
    if (result.status !== "READY") {
      throw new TrainingGenerationError(
        "training_generation_recovery_failed",
        `Training could not produce a validated plan for the Calendar adaptation (${result.status}).`,
      );
    }
  };
}
