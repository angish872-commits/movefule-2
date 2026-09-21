import type {
  AlgorithmContext,
  AlgorithmResult,
  EvidenceRef,
} from "../core/contracts";

export type RecipeImportStage =
  | "URL_VALIDATED"
  | "METADATA_READY"
  | "TEXT_EVIDENCE_READY"
  | "INGREDIENTS_EXTRACTED"
  | "FOODS_RESOLVED"
  | "NUTRITION_CALCULATED"
  | "REVIEW_REQUIRED"
  | "READY_TO_SAVE";

export interface RecipeIngredientDraft {
  rawText: string;
  quantity?: number;
  unit?: string;
  resolvedFoodId?: string;
  confidence?: number;
}

export interface VideoRecipeDraft {
  sourceUrl: string;
  videoId: string;
  title?: string;
  servings?: number;
  ingredients: RecipeIngredientDraft[];
  instructions: string[];
  stage: RecipeImportStage;
  unresolvedIngredientCount: number;
}

export function parseYouTubeUrl(
  rawUrl: string,
): { canonicalUrl: string; videoId: string } | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com"
  ) {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else if (url.pathname.startsWith("/shorts/")) {
      videoId = url.pathname.split("/")[2] ?? null;
    }
  }

  if (!videoId || !/^[A-Za-z0-9_-]{6,}$/.test(videoId)) return null;

  return {
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

/**
 * Creates the canonical import job from a user-shared YouTube link.
 * Transcript/metadata acquisition is performed by an authorized provider
 * adapter; AI extraction remains draft evidence until ingredient resolution
 * and user review are complete.
 */
export function startYouTubeRecipeImport(
  context: AlgorithmContext,
  rawUrl: string,
  evidence: EvidenceRef[] = [],
): AlgorithmResult<VideoRecipeDraft> {
  const parsed = parseYouTubeUrl(rawUrl);

  if (!parsed) {
    return {
      algorithmId: "MF-052",
      status: "HOLD",
      reasonCodes: ["INVALID_OR_UNSUPPORTED_YOUTUBE_URL"],
      evidence,
      versions: context.versions,
      generatedAt: context.now,
    };
  }

  return {
    algorithmId: "MF-052",
    status: "PARTIAL",
    output: {
      sourceUrl: parsed.canonicalUrl,
      videoId: parsed.videoId,
      ingredients: [],
      instructions: [],
      stage: "URL_VALIDATED",
      unresolvedIngredientCount: 0,
    },
    reasonCodes: ["AWAITING_AUTHORIZED_VIDEO_EVIDENCE_EXTRACTION"],
    evidence,
    versions: context.versions,
    generatedAt: context.now,
  };
}

export function finalizeRecipeDraft(
  context: AlgorithmContext,
  draft: VideoRecipeDraft,
  evidence: EvidenceRef[] = [],
): AlgorithmResult<VideoRecipeDraft> {
  const unresolved = draft.ingredients.filter(
    (ingredient) => !ingredient.resolvedFoodId,
  ).length;

  const next: VideoRecipeDraft = {
    ...draft,
    unresolvedIngredientCount: unresolved,
    stage: unresolved > 0 ? "REVIEW_REQUIRED" : "READY_TO_SAVE",
  };

  return {
    algorithmId: "MF-052",
    status: unresolved > 0 ? "NEEDS_CONFIRMATION" : "SUCCESS",
    output: next,
    reasonCodes:
      unresolved > 0
        ? ["RECIPE_HAS_UNRESOLVED_INGREDIENTS"]
        : ["RECIPE_READY_FOR_USER_CONFIRMATION"],
    evidence,
    versions: context.versions,
    generatedAt: context.now,
  };
}
