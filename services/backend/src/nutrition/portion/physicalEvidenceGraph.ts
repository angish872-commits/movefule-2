/**
 * Physical-evidence graph and robust mass fusion for the canonical MoveFuel nutrition engine.
 *
 * The graph operates only after upstream evidence has been converted into mass
 * hypotheses using explicit conversions (e.g. reviewed piece weight or
 * source-bound density). It never turns pixels or an unscaled bounding box into
 * grams. Behavioral priors are intentionally weak and cannot override direct or
 * calibrated physical measurements.
 */

import type { PortionEvidenceRecord, PortionEvidenceType, ValidationState } from "./portionEvidence.ts";

export const PHYSICAL_EVIDENCE_GRAPH_VERSION = "1.0.0";
export const MASS_DISTRIBUTION_VERSION = "1.0.0";

export type MassHypothesis = {
  record: PortionEvidenceRecord;
  minimumGrams: number;
  centralGrams: number;
  maximumGrams: number;
  assumptions: readonly string[];
  uncertainties: readonly string[];
};

export type MassDistribution = {
  family: "ROBUST_NORMAL_APPROX" | "DIRECT_INTERVAL" | "NO_EVIDENCE";
  p10Grams: number;
  p50Grams: number;
  p90Grams: number;
  standardDeviationGrams: number | null;
  effectiveEvidenceCount: number;
  version: typeof MASS_DISTRIBUTION_VERSION;
};

export type PhysicalEvidenceNode = {
  evidenceType: PortionEvidenceType;
  reliabilityTier: number;
  validationState: ValidationState;
  role: "DIRECT" | "PHYSICAL" | "CONVERSION" | "BEHAVIORAL_PRIOR" | "VISUAL_PRIOR";
  centralGrams: number;
  minimumGrams: number;
  maximumGrams: number;
  baseWeight: number;
};

export type PhysicalEvidenceGraph = {
  version: typeof PHYSICAL_EVIDENCE_GRAPH_VERSION;
  nodes: readonly PhysicalEvidenceNode[];
  conflicts: readonly string[];
  containsDirectMass: boolean;
  containsPhysicalMeasurement: boolean;
  containsBehavioralPrior: boolean;
  containsVisualPrior: boolean;
};

export type FusedMass = {
  minimumGrams: number;
  centralGrams: number;
  maximumGrams: number;
  used: readonly MassHypothesis[];
  rejected: readonly MassHypothesis[];
  assumptions: readonly string[];
  uncertainties: readonly string[];
  conflicting: boolean;
  fusionMethod: "NONE" | "DIRECT_AUTHORITY" | "SINGLE_EVIDENCE" | "ROBUST_PRECISION_FUSION" | "PRIOR_ONLY";
  distribution: MassDistribution;
  graph: PhysicalEvidenceGraph;
};

const round3 = (value: number): number => Math.round(value * 1000) / 1000;
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

function roleOf(type: PortionEvidenceType): PhysicalEvidenceNode["role"] {
  if (type === "MANUAL_GRAMS" || type === "PACKAGE_LABEL") return "DIRECT";
  if (type === "PREVIOUS_CONFIRMED_PORTION" || type === "USER_SELECTED_SERVING") return "BEHAVIORAL_PRIOR";
  if (type === "VISUAL_MODEL_PORTION_PRIOR") return "VISUAL_PRIOR";
  if (type === "BARCODE_SERVING" || type === "PIECE_COUNT" || type === "RECIPE_SERVING") return "CONVERSION";
  return "PHYSICAL";
}

function validationWeight(state: ValidationState): number {
  switch (state) {
    case "CONFIRMED": return 1;
    case "REVIEWED": return 0.92;
    case "ESTIMATED": return 0.65;
    case "UNVERIFIED": return 0.4;
    case "REJECTED": return 0;
  }
}

function tierWeight(tier: number): number {
  switch (tier) {
    case 1: return 1;
    case 2: return 0.82;
    case 3: return 0.58;
    case 4: return 0.36;
    case 5: return 0.08; // user history: deliberately weak prior
    default: return 0;
  }
}

function baseWeight(h: MassHypothesis): number {
  const role = roleOf(h.record.evidenceType);
  const roleMultiplier = role === "VISUAL_PRIOR" ? 0.2 : role === "BEHAVIORAL_PRIOR" ? 0.35 : role === "DIRECT" ? 1 : 0.9;
  return tierWeight(h.record.reliabilityTier) * validationWeight(h.record.validationState) * roleMultiplier;
}

function intervalSigma(h: MassHypothesis): number {
  const central = Math.max(0, h.centralGrams);
  const halfWidth = Math.max(0, h.maximumGrams - h.minimumGrams) / 2;
  // Treat supplied min/max as an approximately 80% interval. Add a reliability
  // floor so an unrealistically narrow upstream range cannot dominate fusion.
  const fromInterval = halfWidth / 1.2815515655446004;
  const floorFraction = h.record.reliabilityTier <= 2 ? 0.04 : h.record.reliabilityTier === 3 ? 0.10 : h.record.reliabilityTier === 4 ? 0.16 : 0.28;
  return Math.max(0.5, fromInterval, central * floorFraction);
}

function weightedMedian(entries: readonly { value: number; weight: number }[]): number {
  if (entries.length === 0) return 0;
  const sorted = [...entries].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return sorted[Math.floor(sorted.length / 2)]!.value;
  let cumulative = 0;
  for (const entry of sorted) {
    cumulative += entry.weight;
    if (cumulative >= total / 2) return entry.value;
  }
  return sorted.at(-1)!.value;
}

function intervalsConflict(a: MassHypothesis, b: MassHypothesis): boolean {
  if (a.maximumGrams < b.minimumGrams || b.maximumGrams < a.minimumGrams) return true;
  const denom = Math.max(1, Math.min(a.centralGrams, b.centralGrams));
  return Math.abs(a.centralGrams - b.centralGrams) / denom > 0.4;
}

export function buildPhysicalEvidenceGraph(hypotheses: readonly MassHypothesis[]): PhysicalEvidenceGraph {
  const nodes = hypotheses.map((hypothesis) => ({
    evidenceType: hypothesis.record.evidenceType,
    reliabilityTier: hypothesis.record.reliabilityTier,
    validationState: hypothesis.record.validationState,
    role: roleOf(hypothesis.record.evidenceType),
    centralGrams: hypothesis.centralGrams,
    minimumGrams: hypothesis.minimumGrams,
    maximumGrams: hypothesis.maximumGrams,
    baseWeight: round3(baseWeight(hypothesis)),
  }));
  const conflicts: string[] = [];
  for (let i = 0; i < hypotheses.length; i += 1) {
    for (let j = i + 1; j < hypotheses.length; j += 1) {
      if (intervalsConflict(hypotheses[i]!, hypotheses[j]!)) {
        conflicts.push(`${hypotheses[i]!.record.evidenceType}<->${hypotheses[j]!.record.evidenceType}`);
      }
    }
  }
  return {
    version: PHYSICAL_EVIDENCE_GRAPH_VERSION,
    nodes,
    conflicts,
    containsDirectMass: nodes.some((node) => node.role === "DIRECT"),
    containsPhysicalMeasurement: nodes.some((node) => node.role === "PHYSICAL" || node.role === "DIRECT"),
    containsBehavioralPrior: nodes.some((node) => node.role === "BEHAVIORAL_PRIOR"),
    containsVisualPrior: nodes.some((node) => node.role === "VISUAL_PRIOR"),
  };
}

function directFusion(direct: readonly MassHypothesis[], all: readonly MassHypothesis[], graph: PhysicalEvidenceGraph): FusedMass {
  const rejected = all.filter((entry) => !direct.includes(entry));
  if (direct.length === 1) {
    const h = direct[0]!;
    return {
      minimumGrams: h.minimumGrams,
      centralGrams: h.centralGrams,
      maximumGrams: h.maximumGrams,
      used: direct,
      rejected,
      assumptions: h.assumptions,
      uncertainties: [
        ...h.uncertainties,
        ...(rejected.some((entry) => roleOf(entry.record.evidenceType) === "BEHAVIORAL_PRIOR") ? ["behavioral prior ignored because direct mass is available"] : []),
      ],
      conflicting: false,
      fusionMethod: "DIRECT_AUTHORITY",
      distribution: {
        family: "DIRECT_INTERVAL",
        p10Grams: h.minimumGrams,
        p50Grams: h.centralGrams,
        p90Grams: h.maximumGrams,
        standardDeviationGrams: null,
        effectiveEvidenceCount: 1,
        version: MASS_DISTRIBUTION_VERSION,
      },
      graph,
    };
  }

  const centers = direct.map((entry) => entry.centralGrams).sort((a, b) => a - b);
  const mid = Math.floor(centers.length / 2);
  const central = centers.length % 2 ? centers[mid]! : (centers[mid - 1]! + centers[mid]!) / 2;
  const intersectionMin = Math.max(...direct.map((entry) => entry.minimumGrams));
  const intersectionMax = Math.min(...direct.map((entry) => entry.maximumGrams));
  const conflicting = intersectionMin > intersectionMax;
  const minimum = conflicting ? Math.min(...direct.map((entry) => entry.minimumGrams)) : intersectionMin;
  const maximum = conflicting ? Math.max(...direct.map((entry) => entry.maximumGrams)) : intersectionMax;
  return {
    minimumGrams: round3(minimum),
    centralGrams: round3(clamp(central, minimum, maximum)),
    maximumGrams: round3(maximum),
    used: direct,
    rejected,
    assumptions: direct.flatMap((entry) => entry.assumptions),
    uncertainties: [
      ...direct.flatMap((entry) => entry.uncertainties),
      ...(conflicting ? ["direct mass evidence conflicts; interval widened to contain all direct evidence"] : []),
      ...(rejected.some((entry) => roleOf(entry.record.evidenceType) === "BEHAVIORAL_PRIOR") ? ["behavioral prior ignored because direct mass is available"] : []),
    ],
    conflicting,
    fusionMethod: "DIRECT_AUTHORITY",
    distribution: {
      family: "DIRECT_INTERVAL",
      p10Grams: round3(minimum),
      p50Grams: round3(clamp(central, minimum, maximum)),
      p90Grams: round3(maximum),
      standardDeviationGrams: null,
      effectiveEvidenceCount: direct.length,
      version: MASS_DISTRIBUTION_VERSION,
    },
    graph,
  };
}

export function fuseMassHypotheses(hypotheses: readonly MassHypothesis[]): FusedMass {
  const valid = hypotheses.filter((h) => h.record.validationState !== "REJECTED" && h.maximumGrams >= h.centralGrams && h.centralGrams >= h.minimumGrams && h.minimumGrams >= 0);
  const graph = buildPhysicalEvidenceGraph(valid);
  if (valid.length === 0) {
    return {
      minimumGrams: 0,
      centralGrams: 0,
      maximumGrams: 0,
      used: [],
      rejected: [],
      assumptions: [],
      uncertainties: ["no evidence can be converted to mass"],
      conflicting: false,
      fusionMethod: "NONE",
      distribution: { family: "NO_EVIDENCE", p10Grams: 0, p50Grams: 0, p90Grams: 0, standardDeviationGrams: null, effectiveEvidenceCount: 0, version: MASS_DISTRIBUTION_VERSION },
      graph,
    };
  }

  const direct = valid.filter((entry) => roleOf(entry.record.evidenceType) === "DIRECT");
  if (direct.length > 0) return directFusion(direct, valid, graph);
  if (valid.length === 1) {
    const h = valid[0]!;
    return {
      minimumGrams: h.minimumGrams,
      centralGrams: h.centralGrams,
      maximumGrams: h.maximumGrams,
      used: valid,
      rejected: [],
      assumptions: h.assumptions,
      uncertainties: h.uncertainties,
      conflicting: false,
      fusionMethod: ["BEHAVIORAL_PRIOR", "VISUAL_PRIOR"].includes(roleOf(h.record.evidenceType)) ? "PRIOR_ONLY" : "SINGLE_EVIDENCE",
      distribution: { family: "DIRECT_INTERVAL", p10Grams: h.minimumGrams, p50Grams: h.centralGrams, p90Grams: h.maximumGrams, standardDeviationGrams: intervalSigma(h), effectiveEvidenceCount: 1, version: MASS_DISTRIBUTION_VERSION },
      graph,
    };
  }

  const physical = valid.filter((entry) => !["BEHAVIORAL_PRIOR", "VISUAL_PRIOR"].includes(roleOf(entry.record.evidenceType)));
  const priors = valid.filter((entry) => ["BEHAVIORAL_PRIOR", "VISUAL_PRIOR"].includes(roleOf(entry.record.evidenceType)));
  const pool = physical.length > 0 ? [...physical, ...priors] : [...priors];

  const firstPass = pool.map((h) => ({ h, sigma: intervalSigma(h), base: baseWeight(h) }));
  const median = weightedMedian(firstPass.map((entry) => ({ value: entry.h.centralGrams, weight: entry.base })));
  const weighted = firstPass.map((entry) => {
    const residual = Math.abs(entry.h.centralGrams - median) / Math.max(1, entry.sigma);
    const huber = residual <= 2 ? 1 : 2 / residual;
    const priorCap = ["BEHAVIORAL_PRIOR", "VISUAL_PRIOR"].includes(roleOf(entry.h.record.evidenceType)) && physical.length > 0 ? 0.08 : 1;
    const precision = Math.min(entry.base, priorCap) * huber / (entry.sigma * entry.sigma);
    return { ...entry, precision, huber };
  });
  const precisionSum = weighted.reduce((sum, entry) => sum + entry.precision, 0);
  if (precisionSum <= 0) return fuseMassHypotheses([pool[0]!]);

  const central = weighted.reduce((sum, entry) => sum + entry.h.centralGrams * entry.precision, 0) / precisionSum;
  const rawPosteriorSigma = Math.sqrt(1 / precisionSum);
  const disagreementVariance = weighted.reduce((sum, entry) => sum + entry.precision * (entry.h.centralGrams - central) ** 2, 0) / precisionSum;
  const bestTier = Math.min(...physical.length > 0 ? physical.map((entry) => entry.record.reliabilityTier) : priors.map((entry) => entry.record.reliabilityTier));
  const floorFraction = bestTier <= 2 ? 0.06 : bestTier === 3 ? 0.10 : bestTier === 4 ? 0.16 : 0.25;
  const sigma = Math.max(rawPosteriorSigma, Math.sqrt(disagreementVariance) * 0.6, central * floorFraction, 0.5);
  const z = 1.2815515655446004;
  const p10 = Math.max(0, central - z * sigma);
  const p90 = central + z * sigma;
  const conflict = graph.conflicts.length > 0 || weighted.some((entry) => entry.huber < 0.75);

  return {
    minimumGrams: round3(p10),
    centralGrams: round3(central),
    maximumGrams: round3(p90),
    used: pool,
    rejected: [],
    assumptions: pool.flatMap((entry) => entry.assumptions),
    uncertainties: [
      ...pool.flatMap((entry) => entry.uncertainties),
      ...(physical.length > 0 && priors.length > 0 ? ["personal serving history entered only as a weak identity-bound prior"] : []),
      ...(conflict ? ["portion evidence is partially inconsistent; robust fusion down-weighted disagreement and widened uncertainty"] : []),
    ],
    conflicting: conflict,
    fusionMethod: physical.length === 0 ? "PRIOR_ONLY" : "ROBUST_PRECISION_FUSION",
    distribution: {
      family: "ROBUST_NORMAL_APPROX",
      p10Grams: round3(p10),
      p50Grams: round3(central),
      p90Grams: round3(p90),
      standardDeviationGrams: round3(sigma),
      effectiveEvidenceCount: pool.length,
      version: MASS_DISTRIBUTION_VERSION,
    },
    graph,
  };
}
