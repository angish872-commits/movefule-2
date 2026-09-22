// Canonical public surface for the MoveFuel nutrition engine.
// Production composition starts at algorithm/moveFuelAlgorithm.ts.
export * from "./algorithm/contracts.ts";
export * from "./algorithm/imageEstimatePipeline.ts";
export * from "./algorithm/moveFuelAlgorithm.ts";

export * from "./vision/candidateGraph.ts";
export * from "./vision/candidateProviderAdapter.ts";
export * from "./vision/configuredVision.ts";
export * from "./vision/configuredVisionRouter.ts";
export * from "./vision/qualityAssessment.ts";
export * from "./vision/segmentationAdapter.ts";
export * from "./vision/visionEnsemble.ts";
export * from "./vision/providers/openRouterFoodSceneAdapter.ts";
export * from "./vision/providers/geminiFoodSceneAdapter.ts";

export * from "./identity/foodResolver.ts";
export * from "./identity/knowledgeNutritionResolver.ts";
export * from "./identity/knowledgeSnapshot.ts";
export * from "./identity/reviewedRecipeCalculator.ts";

export * from "./portion/depthScaleAdapter.ts";
export * from "./portion/densityLibrary.ts";
export * from "./portion/physicalEvidenceGraph.ts";
export * from "./portion/portionEstimator.ts";
export * from "./portion/portionEvidence.ts";
export * from "./portion/shapeAwareEvidence.ts";
export * from "./portion/volumeReconstruction.ts";

export * from "./nutrients/nutrientCalculator.ts";
export * from "./nutrients/nutrientNormalizer.ts";
export * from "./nutrients/usdaClient.ts";
export * from "./evidence/evidence-source-registry.ts";

export * from "./confidence/clarification.ts";
export * from "./confidence/confidence.ts";
export * from "./confidence/intervalCalibration.ts";
export * from "./personalization/personalServingPrior.ts";
export * from "./personalization/servingPriorStore.ts";
export * from "./service/liveImageEstimateService.ts";
