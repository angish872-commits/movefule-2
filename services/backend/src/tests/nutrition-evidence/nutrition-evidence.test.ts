import assert from "node:assert/strict";
import test from "node:test";

import { LOCAL_ALIAS_FOUNDATION } from "../../nutrition/evidence/aliases.ts";
import { CONSTITUTIONAL_NUTRITION_SCENARIOS } from "../../nutrition/evidence/constitutional-scenarios.ts";
import {
  evidenceUseAllowed,
  knownZero,
  sourceIdentityChecksum,
  validateEvidenceSource,
  validateNutrientObservation,
  type EvidenceSourceManifest,
  type NutrientObservation,
} from "../../nutrition/evidence/contracts.ts";
import { COUNTRY_EVIDENCE_MANIFESTS } from "../../nutrition/evidence/country-manifests.ts";
import { GOLD_REFERENCE_CASES } from "../../nutrition/evidence/gold-reference-cases.ts";
import { GUIDELINE_RULES } from "../../nutrition/evidence/guidelines.ts";
import {
  NUTRITION_EVIDENCE_SIMULATION_SCALES,
  runNutritionEvidenceSimulation,
} from "../../nutrition/evidence/simulation.ts";
import { EVIDENCE_SOURCE_BY_ID, EVIDENCE_SOURCE_MANIFESTS } from "../../nutrition/evidence/source-manifests.ts";

function source(sourceId: string): EvidenceSourceManifest {
  const resolved = EVIDENCE_SOURCE_BY_ID.get(sourceId);
  assert.ok(resolved, `missing evidence source ${sourceId}`);
  return resolved;
}

test("evidence source manifests are versioned, fingerprinted and fail closed", () => {
  assert.equal(EVIDENCE_SOURCE_MANIFESTS.length, 8);
  const fingerprints = new Set<string>();
  for (const manifest of EVIDENCE_SOURCE_MANIFESTS) {
    assert.deepEqual(validateEvidenceSource(manifest), [], manifest.sourceId);
    assert.match(manifest.reviewDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(manifest.provenance.checksum.value, /^[a-f0-9]{64}$/);
    assert.equal(manifest.provenance.checksum.value, sourceIdentityChecksum({
      sourceId: manifest.sourceId,
      organization: manifest.organization,
      version: manifest.version,
      canonicalUri: manifest.provenance.canonicalUri,
      licenseUri: manifest.provenance.licenseUri,
      reviewDate: manifest.reviewDate,
    }));
    fingerprints.add(manifest.provenance.checksum.value);
  }
  assert.equal(fingerprints.size, EVIDENCE_SOURCE_MANIFESTS.length);

  const malformed: EvidenceSourceManifest = {
    ...source("UNKNOWN_LICENSE_FIXTURE"),
    allowedUses: ["PRODUCTION_NUTRIENT_LOOKUP"],
    prohibitedUses: [],
  };
  assert.ok(validateEvidenceSource(malformed).includes("RIGHTS_GATED_SOURCE_CANNOT_BE_PRODUCTION_AUTHORITY"));
});

test("initial source authority roles match MoveFuel evidence law", () => {
  const usda = source("USDA_FDC_2026_04");
  assert.equal(usda.sourceRoles.includes("PRODUCTION_NUTRITION_AUTHORITY"), true);
  assert.equal(evidenceUseAllowed(usda, "PRODUCTION_NUTRIENT_LOOKUP"), true);
  assert.equal(evidenceUseAllowed(usda, "PACKAGED_LOOKUP"), false);

  const off = source("OPEN_FOOD_FACTS_LIVE_2026_08_30");
  assert.equal(off.sourceRoles.includes("PACKAGED_LOOKUP"), true);
  assert.equal(evidenceUseAllowed(off, "PACKAGED_LOOKUP"), true);
  assert.equal(evidenceUseAllowed(off, "PRODUCTION_NUTRIENT_LOOKUP"), false);

  for (const id of ["NEPAL_DFTQC_PUBLICATIONS_2026_08_30", "INDIA_IFCT_2017", "BANGLADESH_FCT_2013"] as const) {
    const regional = source(id);
    assert.equal(regional.sourceRoles.includes("REGIONAL_REFERENCE"), true);
    assert.equal(regional.sourceRoles.includes("BENCHMARK_ONLY"), true);
    assert.equal(evidenceUseAllowed(regional, "BENCHMARK_VALIDATION"), true);
    assert.equal(evidenceUseAllowed(regional, "PRODUCTION_NUTRIENT_LOOKUP"), false);
  }
  assert.equal(evidenceUseAllowed(source("UNKNOWN_LICENSE_FIXTURE"), "PRODUCTION_NUTRIENT_LOOKUP"), false);
});

test("country evidence manifests resolve only declared evidence sources", () => {
  assert.deepEqual(COUNTRY_EVIDENCE_MANIFESTS.map((entry) => entry.countryCode), ["GLOBAL", "US", "NP", "IN", "BD"]);
  for (const country of COUNTRY_EVIDENCE_MANIFESTS) {
    const allIds = [
      ...country.regionalReferenceSourceIds,
      ...country.productionCompositionSourceIds,
      ...country.guidelineSourceIds,
      ...country.packagedLookupSourceIds,
    ];
    for (const sourceId of allIds) assert.ok(EVIDENCE_SOURCE_BY_ID.has(sourceId), `${country.countryCode}:${sourceId}`);
  }
  assert.ok(COUNTRY_EVIDENCE_MANIFESTS.find((entry) => entry.countryCode === "NP")?.rules.some((rule) => rule.includes("rights")));
  assert.ok(COUNTRY_EVIDENCE_MANIFESTS.find((entry) => entry.countryCode === "IN")?.rules.some((rule) => rule.includes("permission")));
  assert.ok(COUNTRY_EVIDENCE_MANIFESTS.find((entry) => entry.countryCode === "BD")?.rules.some((rule) => rule.includes("Free access")));
});

test("guideline artifacts retain source class, population scope and semantic caveats", () => {
  assert.equal(GUIDELINE_RULES.length, 7);
  for (const rule of GUIDELINE_RULES) {
    const manifest = source(rule.sourceId);
    assert.equal(rule.evidenceClass, manifest.evidenceClass);
    assert.ok(rule.population.length > 0);
    assert.ok(rule.sourceSection.length > 0);
  }
  const sodium = GUIDELINE_RULES.find((rule) => rule.ruleId === "WHO_SODIUM_ADULT_LT_2000_MG_DAY");
  assert.ok(sodium);
  assert.equal(sodium.population.startsWith("ADULT_"), true);
  assert.equal(sodium.threshold, 2000);
  assert.equal(sodium.unit, "mg/day");
  const missingSemantics = GUIDELINE_RULES.find((rule) => rule.ruleId === "USDA_NOT_ANALYSED_DISTINCT_FROM_NOT_PRESENT");
  assert.equal(missingSemantics?.ruleRole, "DATA_SEMANTIC");
  assert.equal(missingSemantics?.threshold, null);
});

test("multilingual aliases are reference-only and unreviewed local aliases cannot become authority", () => {
  assert.equal(LOCAL_ALIAS_FOUNDATION.length, 24);
  const keys = new Set<string>();
  for (const alias of LOCAL_ALIAS_FOUNDATION) {
    assert.equal(alias.allowedUse, "ALIAS_REFERENCE_ONLY");
    const key = `${alias.conceptId}:${alias.locale}:${alias.alias}:${alias.form}`;
    assert.equal(keys.has(key), false, key);
    keys.add(key);
    if (alias.locale !== "en") assert.equal(alias.reviewStatus, "NEEDS_NATIVE_SPEAKER_REVIEW");
  }
});

test("UNKNOWN, NOT_REPORTED, NOT_APPLICABLE and known zero remain distinct", () => {
  const observations: readonly NutrientObservation[] = [
    knownZero("g/100g"),
    { state: "UNKNOWN", value: null, unit: "g/100g" },
    { state: "NOT_REPORTED", value: null, unit: "g/100g" },
    { state: "NOT_APPLICABLE", value: null, unit: null },
  ];
  assert.deepEqual(observations.map((entry) => entry.state), ["KNOWN", "UNKNOWN", "NOT_REPORTED", "NOT_APPLICABLE"]);
  assert.equal(observations[0]?.state, "KNOWN");
  assert.equal(observations[0]?.value, 0);
  for (const observation of observations) assert.deepEqual(validateNutrientObservation(observation), []);

  const malformed = { state: "UNKNOWN", value: 0, unit: "g/100g" } as unknown as NutrientObservation;
  assert.deepEqual(validateNutrientObservation(malformed), ["NON_KNOWN_STATE_MUST_NOT_CARRY_VALUE"]);
});

test("first 100 Gold reference cases are deterministic source-policy cases, not LLM truth", () => {
  assert.equal(GOLD_REFERENCE_CASES.length, 100);
  assert.equal(new Set(GOLD_REFERENCE_CASES.map((entry) => entry.caseId)).size, 100);
  for (const gold of GOLD_REFERENCE_CASES) {
    assert.equal(gold.oracle, "DETERMINISTIC_EVIDENCE_POLICY");
    assert.equal(gold.truthBasis, "SOURCE_POLICY_PLUS_SYNTHETIC_SENTINEL");
    const manifest = source(gold.sourceId);
    assert.equal(evidenceUseAllowed(manifest, gold.requestedUse), gold.expectedUseAllowed, gold.caseId);
    assert.deepEqual(validateNutrientObservation(gold.observation), [], gold.caseId);
    assert.equal(gold.observation.state, gold.expectedObservationState);
    assert.equal(gold.observation.state === "KNOWN" ? gold.observation.value : null, gold.expectedNumericValue);
  }
});

test("first 100 constitutional Nutrition scenarios cover all 20 invariants across five jurisdictions", () => {
  assert.equal(CONSTITUTIONAL_NUTRITION_SCENARIOS.length, 100);
  assert.equal(new Set(CONSTITUTIONAL_NUTRITION_SCENARIOS.map((entry) => entry.scenarioId)).size, 100);
  assert.equal(new Set(CONSTITUTIONAL_NUTRITION_SCENARIOS.map((entry) => entry.invariant)).size, 20);
  assert.deepEqual([...new Set(CONSTITUTIONAL_NUTRITION_SCENARIOS.map((entry) => entry.countryCode))].sort(), ["BD", "GLOBAL", "IN", "NP", "US"]);
  for (const scenario of CONSTITUTIONAL_NUTRITION_SCENARIOS) {
    assert.equal(scenario.oracle, "DETERMINISTIC_CONSTITUTION");
    assert.equal(scenario.expected, "INVARIANT_MUST_HOLD");
    assert.ok(scenario.forbiddenOutcomes.length > 0);
  }
  const crossDomain = CONSTITUTIONAL_NUTRITION_SCENARIOS.filter((entry) => entry.invariant === "NUTRITION_NO_TRAINING_PUNISHMENT");
  assert.equal(crossDomain.length, 5);
  assert.ok(crossDomain.every((entry) => entry.forbiddenOutcomes.includes("MISSED_NUTRITION_TARGET_ADDS_EXERCISE")));
});

test("deterministic simulation passes 100, 1k, 10k and 50k scales", () => {
  assert.deepEqual(NUTRITION_EVIDENCE_SIMULATION_SCALES, [100, 1_000, 10_000, 50_000]);
  for (const scale of NUTRITION_EVIDENCE_SIMULATION_SCALES) {
    const result = runNutritionEvidenceSimulation(scale);
    assert.equal(result.casesRun, scale);
    assert.deepEqual(result.failures, [], `simulation scale ${scale}`);
    assert.match(result.fingerprint, /^[a-f0-9]{64}$/);
    assert.equal(Object.values(result.observationStateCounts).reduce((sum, count) => sum + count, 0), scale);
  }
});

test("same simulation seed and canonical inputs replay to the same fingerprint", () => {
  const first = runNutritionEvidenceSimulation(10_000, 0x12345678);
  const second = runNutritionEvidenceSimulation(10_000, 0x12345678);
  const changedSeed = runNutritionEvidenceSimulation(10_000, 0x87654321);
  assert.deepEqual(first.failures, []);
  assert.equal(first.fingerprint, second.fingerprint);
  assert.notEqual(first.fingerprint, changedSeed.fingerprint);
});
