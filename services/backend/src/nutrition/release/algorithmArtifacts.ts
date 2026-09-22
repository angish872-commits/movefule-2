import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizePortionCalibrationProfile } from "../confidence/intervalCalibration.ts";
import { productionDensityRecordsFromSnapshot, type KnowledgeSnapshot } from "../identity/knowledgeSnapshot.ts";
import { productionReviewedRecipes } from "../identity/reviewedRecipeSnapshot.ts";
import { PORTION_ESTIMATOR_VERSION } from "../portion/portionEstimator.ts";

export type AlgorithmArtifactStatus = {
  knowledgeReady: boolean;
  calibrationReady: boolean;
  productionDensityCount: number;
  reviewedRecipeCount: number;
  matchingCalibrationProfiles: number;
};

function readJson(file: string | undefined): unknown | null {
  const candidate = file?.trim() ?? "";
  if (!candidate) return null;
  try {
    return JSON.parse(readFileSync(path.resolve(candidate), "utf8")) as unknown;
  } catch {
    return null;
  }
}

export function inspectAlgorithmArtifacts(input: {
  knowledgeSnapshotFile?: string;
  calibrationProfilesFile?: string;
  reviewedRecipeSnapshotFile?: string;
}): AlgorithmArtifactStatus {
  const knowledge = readJson(input.knowledgeSnapshotFile);
  const productionDensityCount = knowledge && typeof knowledge === "object"
    ? productionDensityRecordsFromSnapshot(knowledge as KnowledgeSnapshot).length
    : 0;

  const reviewedRecipeSnapshot = readJson(input.reviewedRecipeSnapshotFile);
  const reviewedRecipeCount = productionReviewedRecipes(reviewedRecipeSnapshot).length;

  const calibration = readJson(input.calibrationProfilesFile);
  const rows = Array.isArray(calibration)
    ? calibration
    : calibration && typeof calibration === "object" && Array.isArray((calibration as { profiles?: unknown }).profiles)
      ? (calibration as { profiles: unknown[] }).profiles
      : [];
  const matchingCalibrationProfiles = rows.flatMap((row) => {
    const profile = normalizePortionCalibrationProfile(row);
    return profile ? [profile] : [];
  }).filter((profile) => profile.portionEstimatorVersion === PORTION_ESTIMATOR_VERSION && profile.sampleCount >= 30).length;

  return {
    knowledgeReady: productionDensityCount > 0,
    calibrationReady: matchingCalibrationProfiles > 0,
    productionDensityCount,
    reviewedRecipeCount,
    matchingCalibrationProfiles,
  };
}
