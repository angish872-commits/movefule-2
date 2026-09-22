export type FoundationTableId =
  | "user_profile"
  | "user_identity"
  | "user_session_metadata"
  | "onboarding_progress"
  | "consent_record"
  | "user_preference"
  | "privacy_preference"
  | "user_goal"
  | "target_revision"
  | "device"
  | "device_session"
  | "health_connection"
  | "health_import_cursor"
  | "health_sample_summary"
  | "device_command"
  | "meal_draft"
  | "meal_draft_revision"
  | "meal_analysis_request"
  | "meal"
  | "meal_revision"
  | "meal_item_revision"
  | "meal_item"
  | "meal_media"
  | "meal_tombstone"
  | "daily_summary"
  | "daily_aggregate"
  | "muscle_load"
  | "sync_operation"
  | "watch_delivery"
  | "watch_receipt"
  | "workout_plan"
  | "workout_plan_revision"
  | "workout_plan_step"
  | "workout_session"
  | "workout_session_revision"
  | "workout_event"
  | "workout_summary"
  | "calendar_revision"
  | "calendar_entry"
  | "usage_ledger"
  | "subscription"
  | "entitlement"
  | "export_job"
  | "export_artifact"
  | "deletion_request"
  | "support_ticket"
  | "content_report"
  | "report"
  | "report_section"
  | "report_evidence"
  | "saved_meal"
  | "saved_meal_item"
  | "personal_food"
  | "day_summary"
  | "daily_recommendation"
  | "action_completion"
  | "wellness_checkin"
  | "progress_insight"
  | "sync_cursor"
  | "notification"
  | "notification_delivery"
  | "exercise_catalog"
  | "exercise_muscle_map"
  | "audit_event"
  | "idempotency_key"
  | "prompt_template"
  | "prompt_version"
  | "model_configuration"
  | "provider_call"
  | "analysis_attempt"
  | "analysis_event"
  | "nutrition_source_cache"
  | "food_catalog_alias"
  | "recommendation_evidence"
  | "purchase_event"
  | "webhook_event"
  | "data_retention_job"
  | "deletion_job"
  | "feature_flag"
  | "serving_prior_observation"
  | "schema_migrations";

export type PermissionAction = "read" | "create" | "update" | "delete";
export type PermissionPrincipal = "owner" | "server";

export type PermissionDeclaration = {
  tableId: FoundationTableId;
  rowSecurity: true;
  defaultDeny: true;
  ownerField: "userId" | null;
  grants: Readonly<Partial<Record<PermissionPrincipal, readonly PermissionAction[]>>>;
};

const ownerCrud: readonly PermissionAction[] = ["read", "create", "update", "delete"];

function ownerScoped(tableId: Exclude<FoundationTableId, "schema_migrations">): PermissionDeclaration {
  return { tableId, rowSecurity: true, defaultDeny: true, ownerField: "userId", grants: { owner: ownerCrud } };
}

function serverScoped(
  tableId: FoundationTableId,
  actions: readonly PermissionAction[] = ["read", "create", "update"],
): PermissionDeclaration {
  return { tableId, rowSecurity: true, defaultDeny: true, ownerField: null, grants: { server: actions } };
}

export const FOUNDATION_PERMISSION_DECLARATIONS: Readonly<Record<FoundationTableId, PermissionDeclaration>> = {
  user_profile: ownerScoped("user_profile"),
  user_identity: ownerScoped("user_identity"),
  user_session_metadata: ownerScoped("user_session_metadata"),
  onboarding_progress: ownerScoped("onboarding_progress"),
  consent_record: ownerScoped("consent_record"),
  user_preference: ownerScoped("user_preference"),
  privacy_preference: ownerScoped("privacy_preference"),
  user_goal: ownerScoped("user_goal"),
  device: ownerScoped("device"),
  device_session: ownerScoped("device_session"),
  health_connection: ownerScoped("health_connection"),
  health_import_cursor: ownerScoped("health_import_cursor"),
  health_sample_summary: ownerScoped("health_sample_summary"),
  meal_draft: ownerScoped("meal_draft"),
  meal_draft_revision: ownerScoped("meal_draft_revision"),
  meal_analysis_request: ownerScoped("meal_analysis_request"),
  meal: ownerScoped("meal"),
  meal_item: ownerScoped("meal_item"),
  meal_media: ownerScoped("meal_media"),
  meal_tombstone: ownerScoped("meal_tombstone"),
  daily_summary: ownerScoped("daily_summary"),
  daily_aggregate: ownerScoped("daily_aggregate"),
  muscle_load: ownerScoped("muscle_load"),

  // Canonical foundation: user-associated rows, server-only mutation.
  target_revision: serverScoped("target_revision", ["read", "create"]),
  device_command: serverScoped("device_command"),
  meal_revision: serverScoped("meal_revision", ["read", "create"]),
  sync_operation: serverScoped("sync_operation"),
  sync_cursor: serverScoped("sync_cursor"),
  watch_delivery: serverScoped("watch_delivery"),
  watch_receipt: serverScoped("watch_receipt"),
  workout_plan_revision: serverScoped("workout_plan_revision", ["read", "create"]),
  workout_plan_step: serverScoped("workout_plan_step", ["read", "create"]),
  workout_session_revision: serverScoped("workout_session_revision", ["read", "create"]),
  calendar_revision: serverScoped("calendar_revision", ["read", "create"]),
  calendar_entry: serverScoped("calendar_entry", ["read", "create"]),
  daily_recommendation: serverScoped("daily_recommendation"),

  workout_plan: ownerScoped("workout_plan"),
  workout_session: ownerScoped("workout_session"),
  workout_event: ownerScoped("workout_event"),
  workout_summary: ownerScoped("workout_summary"),
  usage_ledger: ownerScoped("usage_ledger"),
  subscription: ownerScoped("subscription"),
  entitlement: ownerScoped("entitlement"),
  export_job: ownerScoped("export_job"),
  export_artifact: ownerScoped("export_artifact"),
  deletion_request: ownerScoped("deletion_request"),
  support_ticket: ownerScoped("support_ticket"),
  content_report: ownerScoped("content_report"),
  report: ownerScoped("report"),
  saved_meal: ownerScoped("saved_meal"),
  saved_meal_item: ownerScoped("saved_meal_item"),
  personal_food: ownerScoped("personal_food"),
  day_summary: ownerScoped("day_summary"),
  action_completion: ownerScoped("action_completion"),
  wellness_checkin: ownerScoped("wellness_checkin"),
  progress_insight: ownerScoped("progress_insight"),
  notification: ownerScoped("notification"),

  report_section: serverScoped("report_section"),
  report_evidence: serverScoped("report_evidence"),
  notification_delivery: serverScoped("notification_delivery"),
  exercise_catalog: serverScoped("exercise_catalog"),
  exercise_muscle_map: serverScoped("exercise_muscle_map"),
  audit_event: serverScoped("audit_event", ["read", "create"]),
  idempotency_key: serverScoped("idempotency_key", ["read", "create", "update", "delete"]),
  prompt_template: serverScoped("prompt_template"),
  prompt_version: serverScoped("prompt_version"),
  model_configuration: serverScoped("model_configuration"),
  provider_call: serverScoped("provider_call", ["read", "create"]),
  serving_prior_observation: serverScoped("serving_prior_observation", ["read", "create"]),
  meal_item_revision: serverScoped("meal_item_revision", ["read", "create"]),
  analysis_attempt: serverScoped("analysis_attempt", ["read", "create"]),
  analysis_event: serverScoped("analysis_event", ["read", "create"]),
  nutrition_source_cache: serverScoped("nutrition_source_cache"),
  food_catalog_alias: serverScoped("food_catalog_alias"),
  recommendation_evidence: serverScoped("recommendation_evidence", ["read", "create"]),
  purchase_event: serverScoped("purchase_event", ["read", "create"]),
  webhook_event: serverScoped("webhook_event", ["read", "create"]),
  data_retention_job: serverScoped("data_retention_job"),
  deletion_job: serverScoped("deletion_job"),
  feature_flag: serverScoped("feature_flag"),
  schema_migrations: serverScoped("schema_migrations"),
};

export function permissionFor(tableId: FoundationTableId): PermissionDeclaration {
  return FOUNDATION_PERMISSION_DECLARATIONS[tableId];
}

export function isOwnerScoped(tableId: FoundationTableId): boolean {
  return permissionFor(tableId).ownerField === "userId";
}

export function canPrincipal(
  tableId: FoundationTableId,
  principal: PermissionPrincipal,
  action: PermissionAction,
): boolean {
  return permissionFor(tableId).grants[principal]?.includes(action) ?? false;
}
