import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

import {
  evidenceUseAllowed,
  validateEvidenceSource,
  validateNutrientObservation,
  type MoveFuelEvidenceUse,
  type NutrientObservation,
} from "./contracts.ts";
import { EVIDENCE_SOURCE_MANIFESTS } from "./source-manifests.ts";

export const NUTRITION_EVIDENCE_SIMULATION_SCALES = [100, 1_000, 10_000, 50_000] as const;

const USES: readonly MoveFuelEvidenceUse[] = [
  "PRODUCTION_NUTRIENT_LOOKUP",
  "PACKAGED_LOOKUP",
  "BENCHMARK_VALIDATION",
  "REGIONAL_REFERENCE",
  "GUIDELINE_RULE",
  "ALIAS_REFERENCE",
] as const;

const OBSERVATIONS: readonly NutrientObservation[] = [
  { state: "KNOWN", value: 0, unit: "g/100g" },
  { state: "KNOWN", value: 7.25, unit: "g/100g" },
  { state: "UNKNOWN", value: null, unit: "g/100g" },
  { state: "NOT_REPORTED", value: null, unit: "mg/100g" },
  { state: "NOT_APPLICABLE", value: null, unit: null },
] as const;

export type EvidenceSimulationResult = {
  casesRun: number;
  seed: number;
  failures: readonly string[];
  fingerprint: string;
  sourceDecisionCounts: Readonly<Record<string, number>>;
  observationStateCounts: Readonly<Record<NutrientObservation["state"], number>>;
};

function nextRandom(state: number): number {
  let value = state | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

function recordFailure(failures: string[], message: string): void {
  if (failures.length < 100) failures.push(message);
}

function constitutionalExpectedUse(sourceId: string, use: MoveFuelEvidenceUse): boolean | null {
  if (use === "PRODUCTION_NUTRIENT_LOOKUP") return sourceId === "USDA_FDC_2026_04";
  if (use === "PACKAGED_LOOKUP") return sourceId === "OPEN_FOOD_FACTS_LIVE_2026_08_30";
  if (sourceId === "UNKNOWN_LICENSE_FIXTURE") return false;
  return null;
}

export function runNutritionEvidenceSimulation(casesRun: number, seed = 0x4d465f34): EvidenceSimulationResult {
  if (!Number.isInteger(casesRun) || casesRun <= 0 || casesRun > 1_000_000) {
    throw new Error("nutrition_evidence_simulation_count_out_of_range");
  }

  const manifestErrors = EVIDENCE_SOURCE_MANIFESTS.flatMap((source) =>
    validateEvidenceSource(source).map((error) => `${source.sourceId}:${error}`),
  );
  if (manifestErrors.length) throw new Error(`invalid_evidence_manifest:${manifestErrors.join(",")}`);

  const failures: string[] = [];
  const digest = createHash("sha256");
  const sourceDecisionCounts: Record<string, number> = {};
  const observationStateCounts: Record<NutrientObservation["state"], number> = {
    KNOWN: 0,
    UNKNOWN: 0,
    NOT_REPORTED: 0,
    NOT_APPLICABLE: 0,
  };
  let state = seed >>> 0;

  for (let index = 0; index < casesRun; index += 1) {
    state = nextRandom(state);
    const source = EVIDENCE_SOURCE_MANIFESTS[state % EVIDENCE_SOURCE_MANIFESTS.length]!;
    state = nextRandom(state);
    const use = USES[state % USES.length]!;
    state = nextRandom(state);
    const observation = OBSERVATIONS[state % OBSERVATIONS.length]!;
    const allowed = evidenceUseAllowed(source, use);
    const constitutionalExpected = constitutionalExpectedUse(source.sourceId, use);

    if (constitutionalExpected !== null && allowed !== constitutionalExpected) {
      recordFailure(failures, `${index}:constitutional_authority_mismatch:${source.sourceId}:${use}`);
    }
    if ((source.licenseStatus === "UNKNOWN" || source.licenseStatus === "RIGHTS_GATED") && use === "PRODUCTION_NUTRIENT_LOOKUP" && allowed) {
      recordFailure(failures, `${index}:rights_gate_bypassed:${source.sourceId}`);
    }
    if (source.sourceRoles.includes("BENCHMARK_ONLY") && use === "PRODUCTION_NUTRIENT_LOOKUP" && allowed) {
      recordFailure(failures, `${index}:benchmark_promoted_to_production:${source.sourceId}`);
    }
    if (source.sourceRoles.includes("PACKAGED_LOOKUP") && use === "PRODUCTION_NUTRIENT_LOOKUP" && allowed) {
      recordFailure(failures, `${index}:packaged_provider_promoted_to_composition:${source.sourceId}`);
    }
    if (validateNutrientObservation(observation).length !== 0) {
      recordFailure(failures, `${index}:invalid_observation:${observation.state}`);
    }

    const decisionKey = `${source.sourceId}:${use}:${allowed ? "ALLOW" : "DENY"}`;
    sourceDecisionCounts[decisionKey] = (sourceDecisionCounts[decisionKey] ?? 0) + 1;
    observationStateCounts[observation.state] += 1;
    digest.update(`${index}|${source.sourceId}|${use}|${allowed ? 1 : 0}|${observation.state}|${observation.value ?? "null"}\n`);
  }

  return {
    casesRun,
    seed: seed >>> 0,
    failures,
    fingerprint: digest.digest("hex"),
    sourceDecisionCounts,
    observationStateCounts,
  };
}

function parseCliCount(value: string | undefined): number {
  if (!value) return 100;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error("nutrition_evidence_simulation_count_must_be_integer");
  return parsed;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  const count = parseCliCount(process.argv[2] ?? process.env.MOVEFUEL_NUTRITION_EVIDENCE_SIM_CASES);
  const result = runNutritionEvidenceSimulation(count);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.failures.length) process.exitCode = 1;
}
