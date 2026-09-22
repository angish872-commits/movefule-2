import { ImageEstimatePipelineError, type EstimateCorrection, type ImageEstimatePersistenceSnapshot, type ImageEstimateResult } from "../nutrition/algorithm/imageEstimatePipeline.ts";
import type {
  DraftEstimateInput,
  LiveImageEstimateServiceLike,
} from "../nutrition/service/liveImageEstimateService.ts";

export type ImageEstimatePrivacyPolicy = {
  mealImageAnalysisAllowed(context: { userId: string; accessToken?: string }): boolean | Promise<boolean>;
  modelImprovementAllowed(context: { userId: string; accessToken?: string }): boolean | Promise<boolean>;
};

/**
 * Privacy boundary around the external meal-image pipeline. The provider never
 * decides consent, and confirmed meal data cannot enter personalization when
 * model-improvement is disabled.
 */
export class PrivacyGuardedImageEstimateService implements LiveImageEstimateServiceLike {
  private readonly delegate: LiveImageEstimateServiceLike;
  private readonly policy: ImageEstimatePrivacyPolicy;

  constructor(
    delegate: LiveImageEstimateServiceLike,
    policy: ImageEstimatePrivacyPolicy,
  ) {
    this.delegate = delegate;
    this.policy = policy;
  }

  get configured(): boolean {
    return this.delegate.configured;
  }

  get algorithmVersion(): string {
    return this.delegate.algorithmVersion;
  }

  async estimate(input: DraftEstimateInput): Promise<ImageEstimateResult> {
    if (!await this.policy.mealImageAnalysisAllowed({
      userId: input.ownerUserId,
      ...(input.accessToken ? { accessToken: input.accessToken } : {}),
    })) {
      throw new ImageEstimatePipelineError(
        "meal_image_analysis_consent_required",
        "Meal-image analysis is disabled in privacy settings.",
      );
    }
    return this.delegate.estimate(input);
  }

  get(resultId: string, ownerUserId: string): ImageEstimateResult {
    return this.delegate.get(resultId, ownerUserId);
  }

  correct(resultId: string, ownerUserId: string, itemId: string, correction: EstimateCorrection): ImageEstimateResult {
    return this.delegate.correct(resultId, ownerUserId, itemId, correction);
  }

  exportResult(resultId: string, ownerUserId: string): ImageEstimatePersistenceSnapshot {
    if (!this.delegate.exportResult) throw new ImageEstimatePipelineError("estimate_persistence_unavailable", "Estimate persistence is unavailable.");
    return this.delegate.exportResult(resultId, ownerUserId);
  }

  hydrateResult(snapshot: ImageEstimatePersistenceSnapshot): void {
    this.delegate.hydrateResult?.(snapshot);
  }

  async learnConfirmed(resultId: string, ownerUserId: string, accessToken?: string): Promise<void> {
    if (!await this.policy.modelImprovementAllowed({
      userId: ownerUserId,
      ...(accessToken ? { accessToken } : {}),
    })) return;
    await this.delegate.learnConfirmed?.(resultId, ownerUserId, accessToken);
  }
}
