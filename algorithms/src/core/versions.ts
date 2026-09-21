/**
 * Canonical MoveFuel-2 algorithm version registry.
 *
 * Versions are intentionally separated by responsibility. A reference-data
 * update must not imply that the EER formula changed, and a target-policy
 * change must not imply that nutrient scaling changed.
 */

export const NUTRIENT_SCALER_VERSION = "movefuel-nutrient-scaler-v1";
export const TARGET_EER_FORMULA_VERSION = "nasem-2023-eer-v1";
export const TARGET_POLICY_VERSION = "movefuel-target-policy-v1";
export const MACRO_POLICY_VERSION = "movefuel-macro-policy-v1";
export const FIBER_POLICY_VERSION = "movefuel-fiber-policy-v1";
export const WEIGHT_TREND_VERSION = "movefuel-weight-trend-v1";
export const NUTRIENT_REFERENCE_SCHEMA_VERSION =
  "movefuel-nutrient-reference-schema-v1";
export const ADEQUACY_POLICY_VERSION = "movefuel-adequacy-policy-v1";
export const COVERAGE_POLICY_VERSION = "movefuel-coverage-policy-v1";

export interface TargetAlgorithmVersions {
  eerFormulaVersion: typeof TARGET_EER_FORMULA_VERSION;
  targetPolicyVersion: typeof TARGET_POLICY_VERSION;
  macroPolicyVersion: typeof MACRO_POLICY_VERSION;
  fiberPolicyVersion: typeof FIBER_POLICY_VERSION;
}

export const TARGET_ALGORITHM_VERSIONS: TargetAlgorithmVersions = {
  eerFormulaVersion: TARGET_EER_FORMULA_VERSION,
  targetPolicyVersion: TARGET_POLICY_VERSION,
  macroPolicyVersion: MACRO_POLICY_VERSION,
  fiberPolicyVersion: FIBER_POLICY_VERSION,
};
