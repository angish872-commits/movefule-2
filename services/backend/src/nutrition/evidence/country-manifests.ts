import type { CountryEvidenceManifest } from "./contracts.ts";

export const COUNTRY_EVIDENCE_MANIFESTS: readonly CountryEvidenceManifest[] = [
  {
    schemaVersion: 1,
    countryCode: "GLOBAL",
    regionalReferenceSourceIds: [],
    productionCompositionSourceIds: ["USDA_FDC_2026_04"],
    guidelineSourceIds: ["WHO_HEALTHY_DIET_2026", "FAO_INFOODS_STANDARDS_2022"],
    packagedLookupSourceIds: ["OPEN_FOOD_FACTS_LIVE_2026_08_30"],
    rules: [
      "Never treat a cross-country composition match as exact without food-form and provenance compatibility.",
      "Packaged label data and generic composition data remain separate evidence classes.",
    ],
  },
  {
    schemaVersion: 1,
    countryCode: "US",
    regionalReferenceSourceIds: ["USDA_FDC_2026_04"],
    productionCompositionSourceIds: ["USDA_FDC_2026_04"],
    guidelineSourceIds: ["WHO_HEALTHY_DIET_2026", "FAO_INFOODS_STANDARDS_2022"],
    packagedLookupSourceIds: ["OPEN_FOOD_FACTS_LIVE_2026_08_30"],
    rules: [
      "Preserve the FoodData Central data type and source record provenance.",
      "Branded-label values are not equivalent to analytically sampled Foundation Foods.",
    ],
  },
  {
    schemaVersion: 1,
    countryCode: "NP",
    regionalReferenceSourceIds: ["NEPAL_DFTQC_PUBLICATIONS_2026_08_30"],
    productionCompositionSourceIds: ["USDA_FDC_2026_04"],
    guidelineSourceIds: ["WHO_HEALTHY_DIET_2026", "FAO_INFOODS_STANDARDS_2022"],
    packagedLookupSourceIds: ["OPEN_FOOD_FACTS_LIVE_2026_08_30"],
    rules: [
      "DFTQC remains benchmark/reference-only until reuse rights are cleared.",
      "USDA fallback requires explicit food/form matching and must not erase Nepal-specific uncertainty.",
      "A local alias match is not sufficient evidence to copy a nutrient profile across food forms.",
    ],
  },
  {
    schemaVersion: 1,
    countryCode: "IN",
    regionalReferenceSourceIds: ["INDIA_IFCT_2017"],
    productionCompositionSourceIds: ["USDA_FDC_2026_04"],
    guidelineSourceIds: ["WHO_HEALTHY_DIET_2026", "FAO_INFOODS_STANDARDS_2022"],
    packagedLookupSourceIds: ["OPEN_FOOD_FACTS_LIVE_2026_08_30"],
    rules: [
      "IFCT remains benchmark/reference-only until permission is documented.",
      "Cross-country fallback must preserve uncertainty and food-form differences.",
    ],
  },
  {
    schemaVersion: 1,
    countryCode: "BD",
    regionalReferenceSourceIds: ["BANGLADESH_FCT_2013"],
    productionCompositionSourceIds: ["USDA_FDC_2026_04"],
    guidelineSourceIds: ["WHO_HEALTHY_DIET_2026", "FAO_INFOODS_STANDARDS_2022"],
    packagedLookupSourceIds: ["OPEN_FOOD_FACTS_LIVE_2026_08_30"],
    rules: [
      "Bangladesh FCT remains benchmark/reference-only until commercial reuse rights are explicit.",
      "Free access does not imply redistribution permission.",
      "Cross-country fallback must remain visibly provisional when the local food or preparation differs.",
    ],
  },
] as const;
