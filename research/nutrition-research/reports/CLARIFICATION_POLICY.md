# MoveFuel — Clarification Policy

Status: DRAFT (policy versioned in code, Phase 6)
Last updated: 2026-08-06

## Principles

The `ClarificationEngine` asks only questions expected to materially reduce
uncertainty. It never:

- asks unnecessary questions;
- repeats a question already answered;
- asks for a photograph of the user's body;
- blocks manual entry;
- claims that answering guarantees accuracy.

## Question catalogue

| ID | Category | Response type | Optional | Trigger |
|---|---|---|---|---|
| PIECE_COUNT | PORTION_SIZE | INTEGER | no | piece-based food without a known count |
| PLATE_SIZE | PORTION_SIZE | ENUM | yes | geometry-only evidence without a plate reference |
| BOWL_OR_CUP_SIZE | PORTION_SIZE | ENUM | yes | liquid without container/volume evidence |
| COOKING_METHOD | PREPARATION | ENUM | yes | prepared or mixed dish |
| ADDED_OIL_GHEE_BUTTER | ADDED_FAT | ENUM | yes | mixed dish |
| SAUCE_INCLUDED | SAUCE | BOOLEAN | yes | mixed dish |
| HOMEMADE_RESTAURANT_PACKAGED | PROVENANCE | ENUM | yes | prepared or mixed dish |
| SECOND_IMAGE | PORTION_SIZE | IMAGE_UPLOAD | yes | LOW/INSUFFICIENT portion confidence |
| APPROXIMATE_GRAMS | PORTION_SIZE | NUMBER | yes | LOW/INSUFFICIENT portion confidence |
| CANDIDATE_SELECTION | IDENTITY | CANDIDATE_SELECT | no | top-2 candidates within 0.1 confidence |
| HIDDEN_FOOD | COMPOSITION | BOOLEAN | yes | occlusion warning from segmentation |
| MANUAL_ENTRY | MANUAL_ENTRY | MANUAL_ENTRY | no | portion INSUFFICIENT (safety valve, never dropped) |

Every question carries: `reason`, `affectedUncertainty`,
`informationGainCategory`, `responseType`, `optional`, `fallbackIfSkipped`
and `nextState`.

## Rules

- Deduplication: one question per (item, questionId) per generation.
- Answered questions (`answeredQuestionIds`) are never repeated.
- A generation is capped (`maxQuestionsPerGeneration = 4`) so the most
  impactful questions surface first; question order is priority-ranked.
- The MANUAL_ENTRY question is always retained when the portion is
  INSUFFICIENT, even past the cap, because manual entry is never blocked.
- Piece-based detection uses a versioned keyword heuristic
  (`isPieceBasedName`, e.g. dumpling, momo, samosa, ball, roll).

## Fallback behaviour

When a user skips an optional question, `fallbackIfSkipped` describes the
safe continuation (e.g. default plate reference with a wider range, "assume
no added oil"). Skipping never blocks manual entry or the final review.
