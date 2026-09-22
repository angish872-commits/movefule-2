/**
 * Image-quality assessment contracts for the canonical production pipeline.
 *
 * Quality assessment is split into two clearly separated capabilities:
 *  - metadata-only validation (deterministic, no decoder required), and
 *  - pixel/model-based assessment from a verified adapter such as the local
 *    OpenCV quality worker.
 *
 * This module never fabricates pixel-level quality results when no decoder
 * or quality model has actually run. Results produced from metadata only
 * are always labelled `METADATA_ONLY`.
 */

export const IMAGE_QUALITY_POLICY_VERSION = 1 as const;

/** Strict, ordered image-quality states. */
export type QualityState =
  | "ACCEPTABLE"
  | "REVIEW_RECOMMENDED"
  | "RETAKE_REQUIRED"
  | "INVALID_IMAGE"
  | "UNSUPPORTED";

export type QualityIssueCode =
  | "UNSUPPORTED_MIME_TYPE"
  | "CORRUPT_IMAGE"
  | "IMAGE_TOO_SMALL"
  | "IMAGE_TOO_LARGE"
  | "EXCESSIVE_BLUR"
  | "UNDEREXPOSED"
  | "OVEREXPOSED"
  | "GLARE"
  | "LOW_CONTRAST"
  | "FOOD_NOT_VISIBLE"
  | "FOOD_HEAVILY_OBSTRUCTED"
  | "TOO_MANY_OVERLAPPING_ITEMS"
  | "ORIENTATION_UNAVAILABLE"
  | "ANALYSIS_PROVIDER_UNAVAILABLE";

/** How the assessment was produced. */
export type ValidationMode = "METADATA_ONLY" | "PIXEL_MODEL" | "PROVIDER_BASED";

export type RetryRecommendation = "RETRY" | "RETAKE" | "NO_RETRY";

/** Where a non-acceptable result safely leads. Manual entry is never blocked. */
export type SafeFallback = "MANUAL_ENTRY" | "SKIP_ITEM" | "USE_METADATA_ONLY";

export type ImageQualityResult = {
  state: QualityState;
  issueCodes: readonly QualityIssueCode[];
  userMessage: string;
  retryRecommendation: RetryRecommendation;
  safeFallback: SafeFallback;
  /** e.g. "metadata" | "opencv-pixel-quality@1.0.0" | provider name. */
  evidenceSource: string;
  analyserVersion: string;
  validationMode: ValidationMode;
};

/**
 * Metadata available without decoding the image. Raw pixel bytes are never
 * passed around; only a safe temporary object identifier is used.
 */
export type ImageMetadataInput = {
  imageReference: string;
  mimeType?: string;
  widthPx?: number;
  heightPx?: number;
  bytes?: number;
  checksum?: string;
  correlationId?: string;
};

/**
 * Pixel/model-based quality assessment. This stays separate from metadata
 * validation so a missing decoder never fabricates pixel evidence.
 */
export interface PixelQualityAssessor {
  readonly name: string;
  assessPixels(input: ImageMetadataInput): ImageQualityResult | Promise<ImageQualityResult>;
}

export interface ImageQualityAssessor {
  readonly name: string;
  /** Deterministic metadata-only validation, always labelled METADATA_ONLY. */
  validateMetadata(input: ImageMetadataInput): ImageQualityResult;
}

/**
 * Versioned thresholds for metadata gates. These are policy constants, not
 * scientific facts, and must be benchmarked before production use.
 */
export type QualityPolicy = {
  version: number;
  supportedMimeTypes: readonly string[];
  minWidthPx: number;
  minHeightPx: number;
  maxWidthPx: number;
  maxHeightPx: number;
  maxBytes: number;
};

export const DEFAULT_QUALITY_POLICY: QualityPolicy = {
  version: 1,
  supportedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
  minWidthPx: 320,
  minHeightPx: 320,
  maxWidthPx: 8000,
  maxHeightPx: 8000,
  maxBytes: 20 * 1024 * 1024,
};

/** Map issue codes to a retry recommendation (versioned policy table). */
export function retryRecommendationFor(
  issues: readonly QualityIssueCode[],
  policyVersion: number = IMAGE_QUALITY_POLICY_VERSION,
): RetryRecommendation {
  // Versioned, but currently a single table.
  void policyVersion;
  for (const issue of issues) {
    switch (issue) {
      case "CORRUPT_IMAGE":
      case "FOOD_NOT_VISIBLE":
      case "IMAGE_TOO_SMALL":
      case "EXCESSIVE_BLUR":
      case "IMAGE_TOO_LARGE":
        return "RETAKE";
      case "ANALYSIS_PROVIDER_UNAVAILABLE":
        return "RETRY";
      default:
        break;
    }
  }
  return "NO_RETRY";
}

export class MetadataOnlyQualityAssessor implements ImageQualityAssessor {
  readonly name = "metadata-only";
  private readonly policy: QualityPolicy;

  constructor(policy: QualityPolicy = DEFAULT_QUALITY_POLICY) {
    this.policy = policy;
  }

  validateMetadata(input: ImageMetadataInput): ImageQualityResult {
    const issues: QualityIssueCode[] = [];

    if (!input.imageReference || input.imageReference.trim().length === 0) {
      return this.result("INVALID_IMAGE", [], "No image reference was provided.", "NO_RETRY", "MANUAL_ENTRY", "metadata");
    }

    if (input.mimeType !== undefined && !this.policy.supportedMimeTypes.includes(input.mimeType)) {
      issues.push("UNSUPPORTED_MIME_TYPE");
    }

    if (input.widthPx !== undefined || input.heightPx !== undefined) {
      const width = input.widthPx ?? 0;
      const height = input.heightPx ?? 0;
      const belowMin = (input.widthPx ?? 0) > 0 && width < this.policy.minWidthPx;
      const belowMinH = (input.heightPx ?? 0) > 0 && height < this.policy.minHeightPx;
      const aboveMax = (input.widthPx ?? 0) > 0 && width > this.policy.maxWidthPx;
      const aboveMaxH = (input.heightPx ?? 0) > 0 && height > this.policy.maxHeightPx;
      if (belowMin || belowMinH) issues.push("IMAGE_TOO_SMALL");
      if (aboveMax || aboveMaxH) issues.push("IMAGE_TOO_LARGE");
    }

    if (input.bytes !== undefined && input.bytes > this.policy.maxBytes) {
      issues.push("IMAGE_TOO_LARGE");
    }

    if (issues.includes("UNSUPPORTED_MIME_TYPE")) {
      return this.result("UNSUPPORTED", issues, "This image format is not supported.", "NO_RETRY", "MANUAL_ENTRY", "metadata");
    }
    if (issues.length > 0) {
      return this.result("RETAKE_REQUIRED", issues, "The image does not meet minimum quality gates.", "RETAKE", "MANUAL_ENTRY", "metadata");
    }
    return this.result("ACCEPTABLE", [], "Image metadata passed all gates. Pixel-level assessment has not been run.", "NO_RETRY", "USE_METADATA_ONLY", "metadata");
  }

  private result(
    state: QualityState,
    issueCodes: readonly QualityIssueCode[],
    userMessage: string,
    retryRecommendation: RetryRecommendation,
    safeFallback: SafeFallback,
    evidenceSource: string,
  ): ImageQualityResult {
    return {
      state,
      issueCodes,
      userMessage,
      retryRecommendation,
      safeFallback,
      evidenceSource,
      analyserVersion: "metadata-only@" + IMAGE_QUALITY_POLICY_VERSION,
      validationMode: "METADATA_ONLY",
    };
  }
}

export class ImageQualityError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ImageQualityError";
  }
}
