import assert from "node:assert/strict";
import test from "node:test";
import { resolveRegionalIdentity } from "../../nutrition/identity/regionalIdentity.ts";

const records = [
  {
    canonicalName: "Momo",
    aliases: ["momos", "मोमो"],
    countryCodes: ["NP"],
    regionCodes: ["NP-BA"],
    languageTags: ["ne-NP", "en-NP"],
    sourceReference: "movefuel-regional-foods",
    sourceRevision: "2026-08-30",
  },
  {
    canonicalName: "Momo dumpling",
    aliases: ["momos"],
    countryCodes: [],
    regionCodes: [],
    languageTags: ["en"],
    sourceReference: "reviewed-global-aliases",
    sourceRevision: "1",
  },
] as const;

test("regional context deterministically ranks reviewed aliases without becoming nutrient authority", () => {
  const match = resolveRegionalIdentity("momos", records, {
    profileCountryCode: "NP",
    currentRegionCode: "NP-BA",
    languageTag: "ne-NP",
  });
  assert.equal(match?.identity.canonicalName, "Momo");
  assert.equal(match?.nutrientAuthority, false);
  assert.equal(match?.identity.sourceType, "REGIONAL_REVIEWED_ALIAS");
});

test("unknown regional identity abstains instead of inventing a match", () => {
  assert.equal(resolveRegionalIdentity("not-a-real-reviewed-alias", records, {
    profileCountryCode: "NP",
    currentRegionCode: null,
    languageTag: "ne-NP",
  }), null);
});
