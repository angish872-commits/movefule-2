import type {
  AlgorithmContext,
  AlgorithmResult,
  EvidenceRef,
} from "../core/contracts";

export type TargetGoal =
  | "MAINTAIN"
  | "GAIN"
  | "LOSE"
  | "PERFORMANCE"
  | "GENERAL_HEALTH";

export interface TargetPolicyInput {
  goal: TargetGoal;
  ageYears: number | null;
  profileComplete: boolean;
  weightManagementRequested: boolean;
}

export interface TargetPolicyOutput {
  goal: TargetGoal;
  allowAutomaticWeightManagementTarget: boolean;
  requireGuardianOrProfessionalPath: boolean;
}

/**
 * Safety/eligibility gate that runs before numeric target estimation.
 * MoveFuel-2 does not automatically generate weight-management prescriptions
 * for minors. Missing age/profile evidence produces HOLD rather than guessed data.
 */
export function evaluateTargetPolicy(
  context: AlgorithmContext,
  input: TargetPolicyInput,
  evidence: EvidenceRef[] = [],
): AlgorithmResult<TargetPolicyOutput> {
  if (input.ageYears === null || !input.profileComplete) {
    return {
      algorithmId: "MF-001",
      status: "HOLD",
      reasonCodes: ["TARGET_PROFILE_EVIDENCE_INCOMPLETE"],
      evidence,
      versions: context.versions,
      generatedAt: context.now,
    };
  }

  const youth = input.ageYears < 18;

  if (youth && input.weightManagementRequested) {
    return {
      algorithmId: "MF-001",
      status: "HOLD",
      output: {
        goal: input.goal,
        allowAutomaticWeightManagementTarget: false,
        requireGuardianOrProfessionalPath: true,
      },
      reasonCodes: ["YOUTH_WEIGHT_MANAGEMENT_AUTOMATION_BLOCKED"],
      evidence,
      versions: context.versions,
      generatedAt: context.now,
    };
  }

  return {
    algorithmId: "MF-001",
    status: "SUCCESS",
    output: {
      goal: input.goal,
      allowAutomaticWeightManagementTarget: !youth,
      requireGuardianOrProfessionalPath: false,
    },
    reasonCodes: youth ? ["YOUTH_SAFE_TARGET_MODE"] : [],
    evidence,
    versions: context.versions,
    generatedAt: context.now,
  };
}
