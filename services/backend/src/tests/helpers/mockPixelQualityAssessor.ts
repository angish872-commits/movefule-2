import type {
  ImageMetadataInput,
  ImageQualityResult,
  PixelQualityAssessor,
  QualityIssueCode,
  QualityState,
  RetryRecommendation,
  SafeFallback,
} from "../../nutrition/vision/qualityAssessment.ts";

/** Deterministic pixel-quality test double. Never exported by production modules. */
export class MockPixelQualityAssessor implements PixelQualityAssessor {
  readonly name = "test-pixel-quality";
  readonly providerVersion = "test-v1";
  private readonly issues: readonly QualityIssueCode[];

  constructor(issues: readonly QualityIssueCode[] = []) { this.issues = issues; }

  assessPixels(_input: ImageMetadataInput): ImageQualityResult {
    const issues = [...this.issues];
    if (issues.includes("ANALYSIS_PROVIDER_UNAVAILABLE")) {
      return this.result("REVIEW_RECOMMENDED", issues, "The pixel-quality provider is unavailable; proceeding with metadata only is risky.", "RETRY", "MANUAL_ENTRY");
    }
    if (issues.includes("CORRUPT_IMAGE")) return this.result("INVALID_IMAGE", issues, "The image could not be decoded.", "RETAKE", "MANUAL_ENTRY");
    const review = issues.some((issue) => ["UNDEREXPOSED", "OVEREXPOSED", "GLARE", "FOOD_HEAVILY_OBSTRUCTED", "TOO_MANY_OVERLAPPING_ITEMS", "ORIENTATION_UNAVAILABLE"].includes(issue));
    const retake = issues.some((issue) => ["EXCESSIVE_BLUR", "FOOD_NOT_VISIBLE", "IMAGE_TOO_SMALL"].includes(issue));
    if (retake) return this.result("RETAKE_REQUIRED", issues, "The image should be retaken before estimation.", "RETAKE", "MANUAL_ENTRY");
    if (review) return this.result("REVIEW_RECOMMENDED", issues, "The image is usable but flagged for review.", "NO_RETRY", "USE_METADATA_ONLY");
    return this.result("ACCEPTABLE", [], "Test pixel assessment found no quality issues.", "NO_RETRY", "USE_METADATA_ONLY");
  }

  private result(state: QualityState, issueCodes: readonly QualityIssueCode[], userMessage: string, retryRecommendation: RetryRecommendation, safeFallback: SafeFallback): ImageQualityResult {
    return { state, issueCodes, userMessage, retryRecommendation, safeFallback, evidenceSource: `${this.name}@${this.providerVersion}`, analyserVersion: `${this.name}@${this.providerVersion}`, validationMode: "PIXEL_MODEL" };
  }
}
