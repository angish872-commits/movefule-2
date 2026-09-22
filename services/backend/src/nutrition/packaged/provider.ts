import type { PackagedFoodLookupResult } from "./openFoodFactsClient.ts";

/** Backend-only provider seam for deterministic tests and bounded fallbacks. */
export interface PackagedFoodProvider {
  lookup(rawBarcode: string): Promise<PackagedFoodLookupResult>;
}
