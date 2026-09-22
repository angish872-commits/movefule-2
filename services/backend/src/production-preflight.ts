import { inspectAlgorithmArtifacts } from "./nutrition/release/algorithmArtifacts.ts";

type Environment = Record<string, string | undefined>;

export type ProductionPreflightIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
};

export type ProductionPreflightReport = {
  ready: boolean;
  /** Always false until an authenticated operator performs connected acceptance. */
  deploymentVerified: false;
  connectedValidationRequired: readonly string[];
  issues: ProductionPreflightIssue[];
  checks: {
    appwriteEndpoint: boolean;
    appwriteProjectId: boolean;
    appwriteDatabaseId: boolean;
    canonicalFunctionId: boolean;
    appwriteAuthMode: boolean;
    serverMediaPersistence: boolean;
    paidFeaturesSafe: boolean;
    publicAccuracyClaimsSafe: boolean;
    appwriteFunctionsRuntime: boolean;
    algorithmKnowledgeReady: boolean;
    portionCalibrationReady: boolean;
    reviewedRecipeArtifactValid: boolean;
    cameraReleaseSafe: boolean;
  };
};

function configured(value: string | undefined): boolean {
  const normalized = value?.trim() ?? "";
  const upper = normalized.toUpperCase();
  return Boolean(normalized) && !upper.startsWith("REPLACE_") && upper !== "REPLACE_ME" && !upper.includes("PLACEHOLDER");
}

function appwriteId(value: string | undefined): boolean {
  return configured(value) && /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/.test(value?.trim() ?? "");
}

function appwriteEndpoint(value: string | undefined): boolean {
  if (!configured(value)) return false;
  try {
    const url = new URL(value!.trim());
    return url.protocol === "https:" && !url.username && !url.password && /\/v1\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

const CANONICAL_DATABASE_ID = "movefuel_mvp";
const CANONICAL_FUNCTION_ID = "movefuel_api";
const CANONICAL_MEAL_MEDIA_BUCKET_ID = "meal-history-private";

/**
 * Offline production gate. It intentionally validates configuration shape
 * only; it never contacts Appwrite and never prints credential values.
 */
export function buildProductionPreflightReport(env: Environment = process.env): ProductionPreflightReport {
  const issues: ProductionPreflightIssue[] = [];
  const endpointOk = appwriteEndpoint(env.APPWRITE_ENDPOINT);
  const projectOk = appwriteId(env.APPWRITE_PROJECT_ID);
  const databaseOk = env.APPWRITE_DATABASE_ID?.trim() === CANONICAL_DATABASE_ID;
  const functionOk = env.FUNCTION_API_ID?.trim() === CANONICAL_FUNCTION_ID;
  const authModeOk = env.MOVEFUEL_ENV?.trim() === "production" && env.MOVEFUEL_AUTH_MODE?.trim() === "appwrite";
  const appwriteFunctionsRuntime = env.MOVEFUEL_RUNTIME?.trim() === "appwrite-functions";
  const apiKeyConfigured = configured(env.APPWRITE_API_KEY);
  const mediaBucketPresent = configured(env.BUCKET_MEAL_MEDIA_ID);
  const mediaBucketConfigured = env.BUCKET_MEAL_MEDIA_ID?.trim() === CANONICAL_MEAL_MEDIA_BUCKET_ID;
  const geminiConfigured = configured(env.GEMINI_API_KEY);
  const openRouterConfigured = configured(env.OPENROUTER_API_KEY);
  const foodVisionConfigured = geminiConfigured || openRouterConfigured;
  // Production server composition always requires durable private meal-media
  // persistence. Keep this check identical to production request-handler composition rather
  // than making it conditional on whether Gemini happens to be enabled.
  const mediaPersistenceOk = (apiKeyConfigured || appwriteFunctionsRuntime) && mediaBucketConfigured;
  // Production store verification is intentionally not implemented yet. Premium
  // may not be enabled merely because schema/entitlement tables exist.
  const paidFeaturesEnabled = env.MOVEFUEL_PAID_FEATURES_ENABLED?.trim().toLowerCase() === "true";
  const paidFeaturesSafe = !paidFeaturesEnabled;
  // A public nutrition-accuracy percentage requires real weighed-food evidence.
  // Until a signed benchmark artifact is wired into this gate, fail closed on
  // any configured percentage/marketing claim instead of trusting an env flag.
  const publicAccuracyClaimConfigured = configured(env.MOVEFUEL_PUBLIC_NUTRITION_ACCURACY_CLAIM);
  const publicAccuracyClaimsSafe = !publicAccuracyClaimConfigured;
  const cameraPublicEnabled = env.MOVEFUEL_CAMERA_PUBLIC_ENABLED?.trim().toLowerCase() === "true";
  const cameraValidationArtifact = configured(env.MOVEFUEL_CAMERA_VALIDATION_ARTIFACT);
  const algorithmArtifacts = inspectAlgorithmArtifacts({
    knowledgeSnapshotFile: env.MOVEFUEL_KNOWLEDGE_SNAPSHOT,
    calibrationProfilesFile: env.MOVEFUEL_PORTION_CALIBRATION_PROFILES,
    reviewedRecipeSnapshotFile: env.MOVEFUEL_REVIEWED_RECIPE_SNAPSHOT,
  });
  const reviewedRecipeConfigured = configured(env.MOVEFUEL_REVIEWED_RECIPE_SNAPSHOT);
  const reviewedRecipeArtifactValid = !reviewedRecipeConfigured || algorithmArtifacts.reviewedRecipeCount > 0;
  const cameraReleaseSafe = !cameraPublicEnabled || (
    cameraValidationArtifact
    && algorithmArtifacts.knowledgeReady
    && algorithmArtifacts.calibrationReady
  );

  if (!endpointOk) issues.push({ code: "appwrite_endpoint_invalid", severity: "error", message: "APPWRITE_ENDPOINT must be a non-placeholder HTTPS Appwrite /v1 endpoint." });
  if (!projectOk) issues.push({ code: "appwrite_project_invalid", severity: "error", message: "APPWRITE_PROJECT_ID must be a non-placeholder Appwrite ID." });
  if (!databaseOk) issues.push({ code: "appwrite_database_invalid", severity: "error", message: "APPWRITE_DATABASE_ID must be exactly movefuel_mvp." });
  if (!functionOk) issues.push({ code: "appwrite_function_invalid", severity: "error", message: "FUNCTION_API_ID must be exactly movefuel_api." });
  if (!authModeOk) issues.push({ code: "production_auth_mode_invalid", severity: "error", message: "Production requires MOVEFUEL_ENV=production and MOVEFUEL_AUTH_MODE=appwrite." });
  if (mediaBucketPresent && !mediaBucketConfigured) issues.push({ code: "meal_media_bucket_invalid", severity: "error", message: "BUCKET_MEAL_MEDIA_ID must be exactly meal-history-private." });
  if (mediaBucketConfigured && !apiKeyConfigured && !appwriteFunctionsRuntime) issues.push({ code: "meal_media_api_key_missing", severity: "error", message: "BUCKET_MEAL_MEDIA_ID requires APPWRITE_API_KEY outside Appwrite Functions." });
  if (!mediaBucketConfigured && !apiKeyConfigured) issues.push({ code: "meal_media_persistence_missing", severity: "error", message: "Production requires BUCKET_MEAL_MEDIA_ID and an Appwrite server credential so private meal media never falls back to process-local storage." });
  if (apiKeyConfigured && !mediaBucketConfigured) issues.push({ code: "meal_media_bucket_unset", severity: "error", message: "APPWRITE_API_KEY is configured but BUCKET_MEAL_MEDIA_ID is unset; production server media persistence is incomplete." });
  if (foodVisionConfigured && !mediaPersistenceOk && !issues.some((issue) => issue.code === "meal_media_persistence_missing")) issues.push({ code: "meal_media_persistence_missing", severity: "error", message: "Live provider-routed photo analysis requires durable private meal-media persistence." });
  if (!paidFeaturesSafe) issues.push({ code: "production_billing_verifier_unimplemented", severity: "error", message: "Paid features cannot be enabled until a production store receipt/webhook verifier is implemented and connected." });
  if (!publicAccuracyClaimsSafe) issues.push({ code: "nutrition_accuracy_claim_unverified", severity: "error", message: "A public nutrition-accuracy claim is blocked until real weighed-food benchmark evidence is collected and wired into release verification." });
  if (!appwriteFunctionsRuntime) issues.push({ code: "appwrite_functions_runtime_required", severity: "error", message: "Production must set MOVEFUEL_RUNTIME=appwrite-functions; do not deploy the local TCP server." });
  if (cameraPublicEnabled && !cameraValidationArtifact) issues.push({ code: "camera_validation_artifact_missing", severity: "error", message: "Public camera estimates require a reviewed MOVEFUEL_CAMERA_VALIDATION_ARTIFACT reference." });
  if (cameraPublicEnabled && !algorithmArtifacts.knowledgeReady) issues.push({ code: "algorithm_knowledge_snapshot_missing", severity: "error", message: "Public camera estimates require a readable MOVEFUEL_KNOWLEDGE_SNAPSHOT with production-cleared density evidence." });
  if (cameraPublicEnabled && !algorithmArtifacts.calibrationReady) issues.push({ code: "portion_calibration_missing", severity: "error", message: "Public camera estimates require a valid MOVEFUEL_PORTION_CALIBRATION_PROFILES artifact for the current portion estimator with at least 30 held-out samples." });
  if (!reviewedRecipeArtifactValid) issues.push({ code: "reviewed_recipe_snapshot_invalid", severity: "error", message: "MOVEFUEL_REVIEWED_RECIPE_SNAPSHOT was configured but contains no checksum-valid human-reviewed production recipe record." });
  if (!cameraPublicEnabled && !algorithmArtifacts.knowledgeReady) issues.push({ code: "algorithm_knowledge_snapshot_not_configured", severity: "warning", message: "Camera release is disabled and no production density snapshot is configured." });
  if (!cameraPublicEnabled && !algorithmArtifacts.calibrationReady) issues.push({ code: "portion_calibration_not_configured", severity: "warning", message: "Camera release is disabled and no production portion-calibration artifact is configured." });

  return {
    ready: !issues.some((issue) => issue.severity === "error"),
    deploymentVerified: false,
    connectedValidationRequired: [
      "Authenticate as a non-admin test user and run the Appwrite schema/row-permission acceptance against the reviewed migration ledger.",
      "Verify private meal-media upload/read/delete using an Appwrite bucket and server-only API key scopes.",
      "Configure and test store-specific billing receipt/webhook verification; the current verifier intentionally fails closed.",
      "Run signed physical phone and Wear sync acceptance with production credentials after the connected checks pass.",
    ],
    issues,
    checks: {
      appwriteEndpoint: endpointOk,
      appwriteProjectId: projectOk,
      appwriteDatabaseId: databaseOk,
      canonicalFunctionId: functionOk,
      appwriteAuthMode: authModeOk,
      serverMediaPersistence: mediaPersistenceOk,
      paidFeaturesSafe,
      publicAccuracyClaimsSafe,
      appwriteFunctionsRuntime,
      algorithmKnowledgeReady: algorithmArtifacts.knowledgeReady,
      portionCalibrationReady: algorithmArtifacts.calibrationReady,
      reviewedRecipeArtifactValid,
      cameraReleaseSafe,
    },
  };
}

if (process.argv[1]?.endsWith("production-preflight.ts")) {
  const report = buildProductionPreflightReport();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ready) process.exitCode = 2;
}
