export { normalizeBarcode, hasValidGtinCheckDigit, BarcodeError } from "./barcode.ts";
export {
  OpenFoodFactsClient,
  OPEN_FOOD_FACTS_PROVIDER_VERSION,
  type PackagedFoodLookupResult,
  type PackagedFoodRecord,
  type PackagedNutrientsPer100g,
} from "./openFoodFactsClient.ts";
export {
  packagedFoodCandidateFromLookup,
  type PackagedFoodCandidate,
  type PackagedFoodResolution,
} from "./packagedFoodService.ts";
