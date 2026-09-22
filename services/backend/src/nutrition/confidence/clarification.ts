/**
 * Clarification-question engine (Phase 6).
 *
 * Asks only questions expected to materially reduce uncertainty. Rules:
 *  - do not ask unnecessary questions;
 *  - do not repeat a question already answered;
 *  - do not ask for a photograph of the user's body;
 *  - do not block manual entry;
 *  - do not claim that answering guarantees accuracy.
 */

import type { FoodTypeKind } from "../algorithm/contracts.ts";
import type { PortionEstimate } from "../portion/portionEstimator.ts";
import type { PortionEvidenceType } from "../portion/portionEvidence.ts";
import type { RegionFoodCandidate } from "../vision/candidateProviderAdapter.ts";

export const CLARIFICATION_POLICY_VERSION = 2 as const;

export type InformationGainCategory =
  | "PORTION_SIZE"
  | "PREPARATION"
  | "IDENTITY"
  | "ADDED_FAT"
  | "SAUCE"
  | "COMPOSITION"
  | "PROVENANCE"
  | "MANUAL_ENTRY";

export type ClarificationResponseType =
  | "INTEGER"
  | "ENUM"
  | "NUMBER"
  | "BOOLEAN"
  | "IMAGE_UPLOAD"
  | "CANDIDATE_SELECT"
  | "MANUAL_ENTRY";

export type ImageClarificationQuestion = {
  questionId: string;
  reason: string;
  affectedUncertainty: InformationGainCategory;
  informationGainCategory: InformationGainCategory;
  responseType: ClarificationResponseType;
  optional: boolean;
  fallbackIfSkipped: string;
  nextState: string;
};

export type ClarificationContext = {
  itemId: string;
  itemType: FoodTypeKind;
  candidates: readonly RegionFoodCandidate[];
  portion: PortionEstimate | null;
  evidenceTypes: readonly PortionEvidenceType[];
  pieceBased: boolean;
  occlusionWarning?: boolean;
  /** Joint identity/source confidence after candidate-graph resolution. */
  identityResolutionConfidence?: number | null;
  /** Confidence of the selected preparation, when one is known. */
  preparationConfidence?: number | null;
  /** Width of the p10-p90 (or min-max) mass range divided by central mass. */
  relativeMassIntervalWidth?: number | null;
  sourceResolved?: boolean;
  answeredQuestionIds: readonly string[];
};

export type ClarificationRule = {
  priority: number;
  question: ImageClarificationQuestion;
};

export type ClarificationPolicy = {
  version: number;
  maxQuestionsPerGeneration: number;
};

export const DEFAULT_CLARIFICATION_POLICY: ClarificationPolicy = {
  version: 2,
  maxQuestionsPerGeneration: 4,
};

const QUESTION_TEMPLATES: Record<string, Omit<ImageClarificationQuestion, "questionId">> = {
  PIECE_COUNT: {
    reason: "The piece count materially tightens the portion range for piece-based foods.",
    affectedUncertainty: "PORTION_SIZE",
    informationGainCategory: "PORTION_SIZE",
    responseType: "INTEGER",
    optional: false,
    fallbackIfSkipped: "Keep the portion unresolved until reviewed piece weight or manual grams are available.",
    nextState: "PORTION_ESTIMATED",
  },
  PLATE_SIZE: {
    reason: "A known plate size calibrates the image scale for a much tighter estimate.",
    affectedUncertainty: "PORTION_SIZE",
    informationGainCategory: "PORTION_SIZE",
    responseType: "ENUM",
    optional: true,
    fallbackIfSkipped: "Keep scale uncertainty explicit and continue only with evidence that does not require an assumed plate size.",
    nextState: "PORTION_ESTIMATED",
  },
  BOWL_OR_CUP_SIZE: {
    reason: "Liquids require container/volume evidence to convert to grams.",
    affectedUncertainty: "PORTION_SIZE",
    informationGainCategory: "PORTION_SIZE",
    responseType: "ENUM",
    optional: true,
    fallbackIfSkipped: "Keep volume-to-mass unresolved until container size/fill and source-bound density evidence are available.",
    nextState: "PORTION_ESTIMATED",
  },
  COOKING_METHOD: {
    reason: "Steamed, fried, baked and grilled versions differ materially in added fat and cooked weight.",
    affectedUncertainty: "PREPARATION",
    informationGainCategory: "PREPARATION",
    responseType: "ENUM",
    optional: true,
    fallbackIfSkipped: "Keep preparation uncertain and present candidate preparations for review.",
    nextState: "SOURCE_RANKED",
  },
  ADDED_OIL_GHEE_BUTTER: {
    reason: "Hidden oil/ghee/butter is the largest uncertainty in mixed-dish energy.",
    affectedUncertainty: "ADDED_FAT",
    informationGainCategory: "ADDED_FAT",
    responseType: "ENUM",
    optional: true,
    fallbackIfSkipped: "Keep added-fat uncertainty explicit; do not invent an oil/ghee/butter amount.",
    nextState: "PORTION_ESTIMATED",
  },
  SAUCE_INCLUDED: {
    reason: "Whether the sauce is part of the portion changes the energy total.",
    affectedUncertainty: "SAUCE",
    informationGainCategory: "SAUCE",
    responseType: "BOOLEAN",
    optional: true,
    fallbackIfSkipped: "Keep sauce inclusion unresolved and flag it for user review.",
    nextState: "PORTION_ESTIMATED",
  },
  HOMEMADE_RESTAURANT_PACKAGED: {
    reason: "Provenance selects the right source class (recipe vs branded vs FNDDS).",
    affectedUncertainty: "PROVENANCE",
    informationGainCategory: "PROVENANCE",
    responseType: "ENUM",
    optional: true,
    fallbackIfSkipped: "Rank available sources and present them for review.",
    nextState: "SOURCE_RANKED",
  },
  SECOND_IMAGE: {
    reason: "A second side-angle image provides depth evidence that reduces portion error.",
    affectedUncertainty: "PORTION_SIZE",
    informationGainCategory: "PORTION_SIZE",
    responseType: "IMAGE_UPLOAD",
    optional: true,
    fallbackIfSkipped: "Proceed with the single image and a broader range.",
    nextState: "PORTION_ESTIMATED",
  },
  APPROXIMATE_GRAMS: {
    reason: "Any approximate gram value is far better than no scale reference.",
    affectedUncertainty: "PORTION_SIZE",
    informationGainCategory: "PORTION_SIZE",
    responseType: "NUMBER",
    optional: true,
    fallbackIfSkipped: "Continue with the current broad estimate.",
    nextState: "PORTION_ESTIMATED",
  },
  CANDIDATE_SELECTION: {
    reason: "The top candidates are close; your selection removes the identity ambiguity.",
    affectedUncertainty: "IDENTITY",
    informationGainCategory: "IDENTITY",
    responseType: "CANDIDATE_SELECT",
    optional: false,
    fallbackIfSkipped: "Keep identity unresolved until the user selects a candidate or trusted evidence resolves it.",
    nextState: "SOURCE_RESOLUTION",
  },
  HIDDEN_FOOD: {
    reason: "An obstructed item may contain a second food underneath.",
    affectedUncertainty: "COMPOSITION",
    informationGainCategory: "COMPOSITION",
    responseType: "BOOLEAN",
    optional: true,
    fallbackIfSkipped: "Keep occluded composition uncertain and flag it for review.",
    nextState: "SEGMENTATION",
  },
  MANUAL_ENTRY: {
    reason: "Manual entry is always available and never blocked.",
    affectedUncertainty: "PORTION_SIZE",
    informationGainCategory: "MANUAL_ENTRY",
    responseType: "MANUAL_ENTRY",
    optional: false,
    fallbackIfSkipped: "Manual entry is the fallback itself.",
    nextState: "MANUAL_ENTRY",
  },
};

export const QUESTION_IDS = Object.freeze(Object.keys(QUESTION_TEMPLATES));

function question(id: string, itemId: string): ImageClarificationQuestion {
  const template = QUESTION_TEMPLATES[id]!;
  return { questionId: id, ...template };
}

/** Versioned keyword heuristic used to flag piece-based foods. */
const PIECE_BASED_KEYWORDS = [
  "dumpling",
  "momo",
  "samosa",
  "pakora",
  "fritter",
  "cookie",
  "biscuit",
  "meatball",
  "ball",
  "roll",
  "piece",
  "nugget",
  "slice",
];

export function isPieceBasedName(name: string): boolean {
  const lower = name.toLowerCase();
  return PIECE_BASED_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export class ClarificationEngine {
  private readonly policy: ClarificationPolicy;

  constructor(policy: ClarificationPolicy = DEFAULT_CLARIFICATION_POLICY) {
    this.policy = policy;
  }

  generate(context: ClarificationContext): readonly ImageClarificationQuestion[] {
    const rules: ClarificationRule[] = [];
    const answered = new Set(context.answeredQuestionIds);

    const push = (priority: number, id: string): void => {
      if (answered.has(id)) return;
      rules.push({ priority, question: question(id, context.itemId) });
    };

    // Ask first about uncertainty that can change the selected nutrition
    // identity. Candidate ambiguity has higher information value than cosmetic
    // portion refinements because the wrong food/preparation invalidates every
    // downstream nutrient calculation.
    const providerAmbiguous = context.candidates.length >= 2 &&
      context.candidates[0]!.providerConfidence - context.candidates[1]!.providerConfidence < 0.1;
    const resolvedAmbiguous = context.identityResolutionConfidence !== undefined &&
      context.identityResolutionConfidence !== null && context.identityResolutionConfidence < 0.72;
    if (providerAmbiguous || resolvedAmbiguous || context.sourceResolved === false) {
      push(1, "CANDIDATE_SELECTION");
    }

    if (context.pieceBased && !context.evidenceTypes.includes("PIECE_COUNT") && !context.evidenceTypes.includes("MANUAL_GRAMS")) {
      push(2, "PIECE_COUNT");
    }

    if (context.itemType === "LIQUID" && !context.evidenceTypes.includes("KNOWN_BOWL_VOLUME") && !context.evidenceTypes.includes("MANUAL_GRAMS")) {
      push(3, "BOWL_OR_CUP_SIZE");
    }

    const confidence = context.portion?.confidence ?? "INSUFFICIENT";
    const broadMassInterval = (context.relativeMassIntervalWidth ?? 0) > 0.6;
    if (confidence === "LOW" || confidence === "INSUFFICIENT" || broadMassInterval) {
      push(4, "SECOND_IMAGE");
      push(5, "APPROXIMATE_GRAMS");
    }

    const preparationUncertain = context.preparationConfidence === undefined ||
      context.preparationConfidence === null || context.preparationConfidence < 0.72;
    if ((context.itemType === "PREPARED" || context.itemType === "MIXED_DISH") && preparationUncertain) {
      push(6, "COOKING_METHOD");
    }

    if (context.itemType === "MIXED_DISH") {
      // Added fat is frequently invisible, so this remains valuable even when
      // visual food identity is strong.
      push(7, "ADDED_OIL_GHEE_BUTTER");
      push(8, "SAUCE_INCLUDED");
    }

    if (context.sourceResolved === false && (context.itemType === "PREPARED" || context.itemType === "MIXED_DISH")) {
      push(9, "HOMEMADE_RESTAURANT_PACKAGED");
    }

    if (context.occlusionWarning) {
      push(10, "HIDDEN_FOOD");
    }

    const hasPlateReference = context.evidenceTypes.includes("KNOWN_PLATE_DIAMETER") || context.evidenceTypes.includes("REFERENCE_CARD");
    const geometryOnly = context.evidenceTypes.includes("SEGMENTATION_AREA") || context.evidenceTypes.includes("BOUNDING_BOX_AREA");
    if (geometryOnly && !hasPlateReference) {
      push(11, "PLATE_SIZE");
    }

    if (confidence === "INSUFFICIENT") {
      push(12, "MANUAL_ENTRY");
    }

    const ordered = [...rules].sort((a, b) => a.priority - b.priority);
    const slice = ordered.slice(0, this.policy.maxQuestionsPerGeneration);
    const questions = slice.map((rule) => rule.question);

    // The manual-entry safety valve is never dropped, even when the cap is
    // reached: manual entry is always available and never blocked.
    if (confidence === "INSUFFICIENT" && !questions.some((q) => q.questionId === "MANUAL_ENTRY")) {
      questions.push(question("MANUAL_ENTRY", context.itemId));
    }
    return questions;
  }
}

export class ClarificationError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ClarificationError";
  }
}
