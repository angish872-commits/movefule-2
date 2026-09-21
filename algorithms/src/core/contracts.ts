export type AlgorithmId = `MF-${string}`;

export type ValueState =
  | "KNOWN"
  | "UNKNOWN"
  | "ESTIMATED"
  | "NOT_APPLICABLE";

export type EvidenceSource =
  | "USER"
  | "DEVICE"
  | "USDA"
  | "OPEN_FOOD_FACTS"
  | "MOVEFUEL"
  | "EXERCISE_KNOWLEDGE"
  | "CALENDAR"
  | "AI_PROVIDER"
  | "OTHER";

export interface EvidenceRef {
  id: string;
  source: EvidenceSource;
  sourceRevision?: string;
  capturedAt?: string;
  confidence?: number;
}

export interface VersionRef {
  algorithmVersion: string;
  policyVersion?: string;
  formulaVersion?: string;
  dataRevision?: string;
}

export interface KnownValue<T> {
  state: "KNOWN";
  value: T;
  evidence: EvidenceRef[];
}

export interface EstimatedValue<T> {
  state: "ESTIMATED";
  value: T;
  lowerBound?: T;
  upperBound?: T;
  evidence: EvidenceRef[];
}

export interface UnknownValue {
  state: "UNKNOWN";
  reasonCode: string;
  evidence: EvidenceRef[];
}

export interface NotApplicableValue {
  state: "NOT_APPLICABLE";
  reasonCode: string;
}

export type MoveFuelValue<T> =
  | KnownValue<T>
  | EstimatedValue<T>
  | UnknownValue
  | NotApplicableValue;

export interface AlgorithmContext {
  userId: string;
  now: string;
  ageYears?: number;
  requestId: string;
  versions: VersionRef;
}

export type AlgorithmStatus =
  | "SUCCESS"
  | "PARTIAL"
  | "HOLD"
  | "STOP"
  | "NEEDS_CONFIRMATION";

export interface AlgorithmResult<T> {
  algorithmId: AlgorithmId;
  status: AlgorithmStatus;
  output?: T;
  reasonCodes: string[];
  evidence: EvidenceRef[];
  versions: VersionRef;
  generatedAt: string;
}

export function known<T>(
  value: T,
  evidence: EvidenceRef[] = [],
): KnownValue<T> {
  return { state: "KNOWN", value, evidence };
}

export function estimated<T>(
  value: T,
  evidence: EvidenceRef[] = [],
  lowerBound?: T,
  upperBound?: T,
): EstimatedValue<T> {
  return { state: "ESTIMATED", value, lowerBound, upperBound, evidence };
}

export function unknown(
  reasonCode: string,
  evidence: EvidenceRef[] = [],
): UnknownValue {
  return { state: "UNKNOWN", reasonCode, evidence };
}

export function notApplicable(reasonCode: string): NotApplicableValue {
  return { state: "NOT_APPLICABLE", reasonCode };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function assertFiniteNumber(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be finite`);
  }
}
