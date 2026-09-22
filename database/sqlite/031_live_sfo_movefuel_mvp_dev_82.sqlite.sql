-- Live Appwrite schema as SQLite (for IntelliJ / local dev)
-- Project: sfo / New project
-- Database: movefuel_mvp_dev
-- Tables: 82
-- Dialect: SQLite
-- Generated: 2026-09-22 from live Appwrite TablesDB API
-- Mapping: string/text/longtext/datetime->TEXT, integer/boolean->INTEGER, double->REAL
-- Note: boolean 0/1, datetime ISO8601 TEXT, first required *Id = PRIMARY KEY

PRAGMA foreign_keys=ON;
PRAGMA journal_mode=WAL;

-- Totals: 82 tables, 888 columns, 179 indexes

-- TABLE action_completion (Action completion)
CREATE TABLE IF NOT EXISTS [action_completion] (
  [completionId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [recommendationId] TEXT NOT NULL,
  [action] TEXT NOT NULL,
  [sourceDevice] TEXT NOT NULL,
  [idempotencyKey] TEXT NOT NULL,
  [occurredAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_action_completion_userId_idempotencyKey_unique] ON [action_completion] ([userId], [idempotencyKey]);
CREATE INDEX IF NOT EXISTS [ix_action_completion_recommendationId] ON [action_completion] ([recommendationId]);

-- TABLE analysis_attempt (Analysis attempt)
CREATE TABLE IF NOT EXISTS [analysis_attempt] (
  [attemptId] TEXT NOT NULL PRIMARY KEY,
  [requestId] TEXT NOT NULL,
  [attemptNo] INTEGER NOT NULL,
  [promptVersionId] TEXT NULL,
  [modelConfigId] TEXT NULL,
  [provider] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [inputHash] TEXT NOT NULL,
  [outputHash] TEXT NULL,
  [costMicrounits] INTEGER NULL,
  [latencyMs] INTEGER NULL,
  [createdAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_analysis_attempt_requestId_attemptNo_unique] ON [analysis_attempt] ([requestId], [attemptNo]);
CREATE INDEX IF NOT EXISTS [ix_analysis_attempt_state_createdAt] ON [analysis_attempt] ([state], [createdAt]);

-- TABLE analysis_event (Analysis event)
CREATE TABLE IF NOT EXISTS [analysis_event] (
  [eventId] TEXT NOT NULL PRIMARY KEY,
  [requestId] TEXT NOT NULL,
  [attemptId] TEXT NOT NULL,
  [stage] TEXT NOT NULL,
  [userSafeCode] TEXT NOT NULL,
  [occurredAt] TEXT NOT NULL,
  [sequence] INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_analysis_event_requestId_sequence_unique] ON [analysis_event] ([requestId], [sequence]);
CREATE INDEX IF NOT EXISTS [ix_analysis_event_requestId_occurredAt] ON [analysis_event] ([requestId], [occurredAt]);

-- TABLE audit_event (Audit event)
CREATE TABLE IF NOT EXISTS [audit_event] (
  [auditId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NULL,
  [actorType] TEXT NOT NULL,
  [actorIdHash] TEXT NULL,
  [action] TEXT NOT NULL,
  [objectType] TEXT NULL,
  [objectId] TEXT NULL,
  [result] TEXT NOT NULL,
  [correlationId] TEXT NOT NULL,
  [occurredAt] TEXT NOT NULL,
  [metadataJson] TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_audit_event_userId_occurredAt] ON [audit_event] ([userId], [occurredAt]);
CREATE INDEX IF NOT EXISTS [ix_audit_event_correlationId] ON [audit_event] ([correlationId]);
CREATE INDEX IF NOT EXISTS [ix_audit_event_action_occurredAt] ON [audit_event] ([action], [occurredAt]);

-- TABLE calendar_entry (Calendar entry)
CREATE TABLE IF NOT EXISTS [calendar_entry] (
  [entryRowId] TEXT NOT NULL PRIMARY KEY,
  [entryId] TEXT NOT NULL,
  [userId] TEXT NOT NULL,
  [calendarRevisionId] TEXT NOT NULL,
  [calendarRevision] INTEGER NOT NULL,
  [semanticObjectType] TEXT NOT NULL,
  [semanticObjectId] TEXT NOT NULL,
  [startAt] TEXT NOT NULL,
  [endAt] TEXT NOT NULL,
  [timezone] TEXT NOT NULL,
  [localDate] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [locked] INTEGER NOT NULL,
  [reasonCodesJson] TEXT NOT NULL,
  [schemaVersion] INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_calendar_entry_calendar_entry_user_revision] ON [calendar_entry] ([userId], [calendarRevision]);
CREATE INDEX IF NOT EXISTS [ix_calendar_entry_calendar_entry_user_date_start] ON [calendar_entry] ([userId], [localDate], [startAt]);
CREATE UNIQUE INDEX IF NOT EXISTS [ix_calendar_entry_calendar_entry_revision_ide_3yjqe4] ON [calendar_entry] ([calendarRevisionId], [entryId]);
CREATE INDEX IF NOT EXISTS [ix_calendar_entry_calendar_entry_user_semanti_142e3da] ON [calendar_entry] ([userId], [semanticObjectType], [semanticObjectId], [calendarRevision]);

-- TABLE calendar_revision (Calendar revision)
CREATE TABLE IF NOT EXISTS [calendar_revision] (
  [calendarRevisionId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [revision] INTEGER NOT NULL,
  [baseRevision] INTEGER NOT NULL,
  [entryHash] TEXT NOT NULL,
  [operationId] TEXT NOT NULL,
  [idempotencyKey] TEXT NOT NULL,
  [reasonCodesJson] TEXT NOT NULL,
  [schemaVersion] INTEGER NOT NULL,
  [publishedAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_calendar_revision_calendar_user_revision_unique] ON [calendar_revision] ([userId], [revision]);
CREATE UNIQUE INDEX IF NOT EXISTS [ix_calendar_revision_calendar_user_operation_unique] ON [calendar_revision] ([userId], [operationId]);
CREATE UNIQUE INDEX IF NOT EXISTS [ix_calendar_revision_calendar_user_idempotency_unique] ON [calendar_revision] ([userId], [idempotencyKey]);
CREATE INDEX IF NOT EXISTS [ix_calendar_revision_calendar_user_publishedAt] ON [calendar_revision] ([userId], [publishedAt]);

-- TABLE consent_record (Consent record)
CREATE TABLE IF NOT EXISTS [consent_record] (
  [consentId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [consentType] TEXT NOT NULL,
  [documentVersion] TEXT NOT NULL,
  [choice] TEXT NOT NULL,
  [jurisdiction] TEXT NULL,
  [sourcePlatform] TEXT NOT NULL,
  [recordedAt] TEXT NOT NULL,
  [revokedAt] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_consent_record_user_consent_version_unique] ON [consent_record] ([userId], [consentType], [documentVersion]);
CREATE INDEX IF NOT EXISTS [ix_consent_record_userId_recordedAt] ON [consent_record] ([userId], [recordedAt]);

-- TABLE content_report (Content report)
CREATE TABLE IF NOT EXISTS [content_report] (
  [reportId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [contentType] TEXT NOT NULL,
  [contentId] TEXT NOT NULL,
  [reason] TEXT NOT NULL,
  [note] TEXT NULL,
  [state] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_content_report_state_createdAt] ON [content_report] ([state], [createdAt]);
CREATE INDEX IF NOT EXISTS [ix_content_report_contentId] ON [content_report] ([contentId]);

-- TABLE daily_aggregate (Daily aggregate)
CREATE TABLE IF NOT EXISTS [daily_aggregate] (
  [aggregateId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [localDate] TEXT NOT NULL,
  [energyKcal] INTEGER NOT NULL,
  [proteinG] INTEGER NOT NULL,
  [carbG] INTEGER NOT NULL,
  [fatG] INTEGER NOT NULL,
  [fiberG] INTEGER NOT NULL,
  [movementUnit] TEXT NULL,
  [mealCount] INTEGER NOT NULL,
  [workoutCount] INTEGER NOT NULL,
  [targetRevisionId] TEXT NULL,
  [revision] INTEGER NOT NULL,
  [sourceUpdatedAt] TEXT NOT NULL,
  [movementValue] REAL NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_daily_aggregate_userId_localDate_unique] ON [daily_aggregate] ([userId], [localDate]);
CREATE INDEX IF NOT EXISTS [ix_daily_aggregate_userId_localDate] ON [daily_aggregate] ([userId], [localDate]);

-- TABLE daily_recommendation (Daily recommendation)
CREATE TABLE IF NOT EXISTS [daily_recommendation] (
  [recommendationId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [localDate] TEXT NOT NULL,
  [category] TEXT NOT NULL,
  [title] TEXT NOT NULL,
  [body] TEXT NOT NULL,
  [ruleId] TEXT NOT NULL,
  [ruleVersion] INTEGER NOT NULL,
  [state] TEXT NOT NULL,
  [inputRevisionHash] TEXT NOT NULL,
  [confidenceLabel] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [updatedAt] TEXT NULL,
  [revision] INTEGER NULL,
  [targetRevision] INTEGER NULL,
  [profileRevision] INTEGER NULL,
  [nutritionStateRevision] INTEGER NULL,
  [policyVersion] TEXT NULL,
  [validFrom] TEXT NULL,
  [validUntil] TEXT NULL,
  [supersededAt] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_daily_recommendation_userId_localDate_state] ON [daily_recommendation] ([userId], [localDate], [state]);
CREATE UNIQUE INDEX IF NOT EXISTS [ix_daily_recommendation_userId_localDate_state_input_uq] ON [daily_recommendation] ([userId], [localDate], [state], [inputRevisionHash]);

-- TABLE daily_summary (Daily summary)
CREATE TABLE IF NOT EXISTS [daily_summary] (
  [summaryId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [deviceId] TEXT NOT NULL,
  [revision] INTEGER NOT NULL,
  [payloadJson] TEXT NOT NULL,
  [source] TEXT NOT NULL,
  [updatedAt] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_daily_summary_userId_updatedAt] ON [daily_summary] ([userId], [updatedAt]);
CREATE UNIQUE INDEX IF NOT EXISTS [ix_daily_summary_userId_summaryId_revision_unique] ON [daily_summary] ([userId], [summaryId], [revision]);

-- TABLE data_retention_job (Data retention job)
CREATE TABLE IF NOT EXISTS [data_retention_job] (
  [retentionJobId] TEXT NOT NULL PRIMARY KEY,
  [policyKey] TEXT NOT NULL,
  [objectType] TEXT NOT NULL,
  [cutoffAt] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [candidateCount] INTEGER NOT NULL,
  [deletedCount] INTEGER NOT NULL,
  [startedAt] TEXT NULL,
  [completedAt] TEXT NULL,
  [errorCode] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_data_retention_job_state_cutoffAt] ON [data_retention_job] ([state], [cutoffAt]);

-- TABLE day_summary (Day summary)
CREATE TABLE IF NOT EXISTS [day_summary] (
  [daySummaryId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [localDate] TEXT NOT NULL,
  [hasMeals] INTEGER NOT NULL,
  [hasWorkout] INTEGER NOT NULL,
  [energyStatus] TEXT NOT NULL,
  [proteinStatus] TEXT NOT NULL,
  [syncState] TEXT NOT NULL,
  [revision] INTEGER NOT NULL,
  [updatedAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_day_summary_userId_localDate_unique] ON [day_summary] ([userId], [localDate]);
CREATE INDEX IF NOT EXISTS [ix_day_summary_userId_localDate] ON [day_summary] ([userId], [localDate]);

-- TABLE deletion_job (Deletion job)
CREATE TABLE IF NOT EXISTS [deletion_job] (
  [deletionJobId] TEXT NOT NULL PRIMARY KEY,
  [deletionRequestId] TEXT NOT NULL,
  [domain] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [attemptCount] INTEGER NOT NULL,
  [lastAttemptAt] TEXT NULL,
  [completedAt] TEXT NULL,
  [errorCode] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_deletion_job_deletionRequestId_domain_unique] ON [deletion_job] ([deletionRequestId], [domain]);
CREATE INDEX IF NOT EXISTS [ix_deletion_job_state_lastAttemptAt] ON [deletion_job] ([state], [lastAttemptAt]);

-- TABLE deletion_request (Deletion request)
CREATE TABLE IF NOT EXISTS [deletion_request] (
  [deletionRequestId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [scope] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [requestedAt] TEXT NOT NULL,
  [executeAfter] TEXT NOT NULL,
  [canceledAt] TEXT NULL,
  [recentAuthAt] TEXT NOT NULL,
  [reason] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_deletion_request_userId_state] ON [deletion_request] ([userId], [state]);
CREATE INDEX IF NOT EXISTS [ix_deletion_request_executeAfter] ON [deletion_request] ([executeAfter]);

-- TABLE device (Device)
CREATE TABLE IF NOT EXISTS [device] (
  [deviceId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [platform] TEXT NOT NULL,
  [deviceClass] TEXT NOT NULL,
  [installationIdHash] TEXT NOT NULL,
  [appVersion] TEXT NOT NULL,
  [capabilityJson] TEXT NOT NULL,
  [lastSeenAt] TEXT NOT NULL,
  [revokedAt] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_device_user_installation_unique] ON [device] ([userId], [installationIdHash]);
CREATE INDEX IF NOT EXISTS [ix_device_userId_deviceClass] ON [device] ([userId], [deviceClass]);
CREATE UNIQUE INDEX IF NOT EXISTS [ix_device_userId_deviceId_unique] ON [device] ([userId], [deviceId]);

-- TABLE device_command (Device command)
CREATE TABLE IF NOT EXISTS [device_command] (
  [commandId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [targetDeviceId] TEXT NOT NULL,
  [commandType] TEXT NOT NULL,
  [objectId] TEXT NULL,
  [objectRevision] INTEGER NULL,
  [state] TEXT NOT NULL,
  [requestedAt] TEXT NOT NULL,
  [acknowledgedAt] TEXT NULL,
  [errorCode] TEXT NULL,
  [operationId] TEXT NULL,
  [idempotencyKey] TEXT NULL,
  [requestHash] TEXT NULL,
  [payloadHash] TEXT NULL,
  [expiresAt] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_device_command_targetDevice_command_object_rev_uq] ON [device_command] ([targetDeviceId], [commandType], [objectId], [objectRevision]);
CREATE INDEX IF NOT EXISTS [ix_device_command_userId_state] ON [device_command] ([userId], [state]);

-- TABLE device_session (Device session)
CREATE TABLE IF NOT EXISTS [device_session] (
  [deviceSessionId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [phoneDeviceId] TEXT NOT NULL,
  [watchDeviceId] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [issuedAt] TEXT NOT NULL,
  [expiresAt] TEXT NULL,
  [revokedAt] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_device_session_phone_watch_state_unique] ON [device_session] ([phoneDeviceId], [watchDeviceId], [state]);
CREATE INDEX IF NOT EXISTS [ix_device_session_userId_state] ON [device_session] ([userId], [state]);

-- TABLE entitlement (Entitlement)
CREATE TABLE IF NOT EXISTS [entitlement] (
  [entitlementId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [entitlementKey] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [sourceSubscriptionId] TEXT NULL,
  [effectiveAt] TEXT NOT NULL,
  [expiresAt] TEXT NULL,
  [revision] INTEGER NOT NULL,
  [updatedAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_entitlement_user_ent_key_uq] ON [entitlement] ([userId], [entitlementKey]);
CREATE INDEX IF NOT EXISTS [ix_entitlement_user_state] ON [entitlement] ([userId], [state]);

-- TABLE exercise_catalog (Exercise catalog)
CREATE TABLE IF NOT EXISTS [exercise_catalog] (
  [exerciseId] TEXT NOT NULL PRIMARY KEY,
  [slug] TEXT NOT NULL,
  [name] TEXT NOT NULL,
  [instructionsJson] TEXT NOT NULL,
  [equipmentJson] TEXT NOT NULL,
  [mediaLicense] TEXT NULL,
  [mediaObjectId] TEXT NULL,
  [status] TEXT NOT NULL,
  [revision] INTEGER NOT NULL,
  [updatedAt] TEXT NOT NULL,
  [movementPattern] TEXT NULL,
  [environmentJson] TEXT NULL,
  [minimumExperience] TEXT NULL,
  [skillLevel] TEXT NULL,
  [substitutionGroup] TEXT NULL,
  [force] TEXT NULL,
  [mechanic] TEXT NULL,
  [category] TEXT NULL,
  [auditStatus] TEXT NULL,
  [mediaAuditStatus] TEXT NULL,
  [sourceRecordHash] TEXT NULL,
  [releaseId] TEXT NULL,
  [sourceLicenseVerified] INTEGER NULL,
  [fatigueCost] REAL NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_exercise_catalog_slug_unique] ON [exercise_catalog] ([slug]);
CREATE INDEX IF NOT EXISTS [ix_exercise_catalog_status_name] ON [exercise_catalog] ([status], [name]);

-- TABLE exercise_muscle_map (Exercise muscle map)
CREATE TABLE IF NOT EXISTS [exercise_muscle_map] (
  [mapId] TEXT NOT NULL PRIMARY KEY,
  [exerciseId] TEXT NOT NULL,
  [muscleGroup] TEXT NOT NULL,
  [role] TEXT NOT NULL,
  [sourceVersion] TEXT NOT NULL,
  [contributionWeight] REAL NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_exercise_muscle_map_exerciseId_muscleGroup_role_unique] ON [exercise_muscle_map] ([exerciseId], [muscleGroup], [role]);
CREATE INDEX IF NOT EXISTS [ix_exercise_muscle_map_muscleGroup] ON [exercise_muscle_map] ([muscleGroup]);

-- TABLE export_artifact (Export artifact)
CREATE TABLE IF NOT EXISTS [export_artifact] (
  [artifactId] TEXT NOT NULL PRIMARY KEY,
  [exportJobId] TEXT NOT NULL,
  [userId] TEXT NOT NULL,
  [bucketId] TEXT NOT NULL,
  [objectId] TEXT NOT NULL,
  [checksum] TEXT NOT NULL,
  [sizeBytes] INTEGER NOT NULL,
  [expiresAt] TEXT NOT NULL,
  [downloadedAt] TEXT NULL,
  [revokedAt] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_export_artifact_bucketId_objectId_unique] ON [export_artifact] ([bucketId], [objectId]);
CREATE INDEX IF NOT EXISTS [ix_export_artifact_userId_expiresAt] ON [export_artifact] ([userId], [expiresAt]);

-- TABLE export_job (Export job)
CREATE TABLE IF NOT EXISTS [export_job] (
  [exportJobId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [exportType] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [requestedAt] TEXT NOT NULL,
  [startedAt] TEXT NULL,
  [completedAt] TEXT NULL,
  [expiresAt] TEXT NULL,
  [errorCode] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_export_job_userId_state_requestedAt] ON [export_job] ([userId], [state], [requestedAt]);

-- TABLE feature_flag (Feature flag)
CREATE TABLE IF NOT EXISTS [feature_flag] (
  [flagId] TEXT NOT NULL PRIMARY KEY,
  [key] TEXT NOT NULL,
  [environment] TEXT NOT NULL,
  [enabled] INTEGER NOT NULL,
  [valueJson] TEXT NOT NULL,
  [minimumAppVersion] TEXT NULL,
  [updatedAt] TEXT NOT NULL,
  [rolloutPercent] REAL NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_feature_flag_key_environment_unique] ON [feature_flag] ([key], [environment]);
CREATE INDEX IF NOT EXISTS [ix_feature_flag_environment_enabled] ON [feature_flag] ([environment], [enabled]);

-- TABLE food_catalog_alias (Food catalog alias)
CREATE TABLE IF NOT EXISTS [food_catalog_alias] (
  [aliasId] TEXT NOT NULL PRIMARY KEY,
  [nutritionSourceId] TEXT NOT NULL,
  [locale] TEXT NOT NULL,
  [aliasNormalized] TEXT NOT NULL,
  [rank] INTEGER NOT NULL,
  [source] TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_food_catalog_alias_locale_aliasNormalized] ON [food_catalog_alias] ([locale], [aliasNormalized]);
CREATE INDEX IF NOT EXISTS [ix_food_catalog_alias_nutritionSourceId] ON [food_catalog_alias] ([nutritionSourceId]);

-- TABLE health_connection (Health connection)
CREATE TABLE IF NOT EXISTS [health_connection] (
  [connectionId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [platform] TEXT NOT NULL,
  [sourceName] TEXT NOT NULL,
  [permissionStateJson] TEXT NOT NULL,
  [lastSuccessAt] TEXT NULL,
  [lastErrorCode] TEXT NULL,
  [revision] INTEGER NOT NULL,
  [updatedAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_health_connection_userId_platform_sourceName_unique] ON [health_connection] ([userId], [platform], [sourceName]);
CREATE INDEX IF NOT EXISTS [ix_health_connection_userId_updatedAt] ON [health_connection] ([userId], [updatedAt]);

-- TABLE health_import_cursor (Health import cursor)
CREATE TABLE IF NOT EXISTS [health_import_cursor] (
  [cursorId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [connectionId] TEXT NOT NULL,
  [dataType] TEXT NOT NULL,
  [opaqueCursorEncrypted] TEXT NULL,
  [lastWindowEnd] TEXT NULL,
  [updatedAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_health_import_cursor_connectionId_dataType_unique] ON [health_import_cursor] ([connectionId], [dataType]);
CREATE INDEX IF NOT EXISTS [ix_health_import_cursor_userId] ON [health_import_cursor] ([userId]);

-- TABLE health_sample_summary (Health sample summary)
CREATE TABLE IF NOT EXISTS [health_sample_summary] (
  [summaryId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [localDate] TEXT NOT NULL,
  [dataType] TEXT NOT NULL,
  [unit] TEXT NOT NULL,
  [sourcePlatform] TEXT NOT NULL,
  [sourceDevice] TEXT NULL,
  [provenanceHash] TEXT NOT NULL,
  [revision] INTEGER NOT NULL,
  [measuredStart] TEXT NOT NULL,
  [measuredEnd] TEXT NOT NULL,
  [value] REAL NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_health_sample_summary_userId_dataType_provenanceHash_uq] ON [health_sample_summary] ([userId], [dataType], [provenanceHash]);
CREATE INDEX IF NOT EXISTS [ix_health_sample_summary_userId_localDate_dataType] ON [health_sample_summary] ([userId], [localDate], [dataType]);

-- TABLE idempotency_key (Idempotency key)
CREATE TABLE IF NOT EXISTS [idempotency_key] (
  [keyId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [scope] TEXT NOT NULL,
  [keyHash] TEXT NOT NULL,
  [requestHash] TEXT NOT NULL,
  [responseRef] TEXT NULL,
  [state] TEXT NOT NULL,
  [expiresAt] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_idempotency_key_idempotency_user_scope_key_unique] ON [idempotency_key] ([userId], [scope], [keyHash]);
CREATE INDEX IF NOT EXISTS [ix_idempotency_key_idempotency_expiresAt] ON [idempotency_key] ([expiresAt]);

-- TABLE meal (Meal)
CREATE TABLE IF NOT EXISTS [meal] (
  [mealId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [sourceDraftId] TEXT NOT NULL,
  [confirmedAt] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [updatedAt] TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_meal_userId_confirmedAt] ON [meal] ([userId], [confirmedAt]);
CREATE UNIQUE INDEX IF NOT EXISTS [ix_meal_userId_mealId_unique] ON [meal] ([userId], [mealId]);

-- TABLE meal_analysis_request (Meal analysis request)
CREATE TABLE IF NOT EXISTS [meal_analysis_request] (
  [requestId] TEXT NOT NULL PRIMARY KEY,
  [draftId] TEXT NOT NULL,
  [userId] TEXT NOT NULL,
  [provider] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [attempts] INTEGER NOT NULL,
  [requestedAt] TEXT NOT NULL,
  [completedAt] TEXT NULL,
  [errorCode] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_meal_analysis_request_userId_requestedAt] ON [meal_analysis_request] ([userId], [requestedAt]);
CREATE UNIQUE INDEX IF NOT EXISTS [ix_meal_analysis_request_userId_requestId_unique] ON [meal_analysis_request] ([userId], [requestId]);

-- TABLE meal_draft (Meal draft)
CREATE TABLE IF NOT EXISTS [meal_draft] (
  [draftId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [deviceId] TEXT NOT NULL,
  [mediaId] TEXT NULL,
  [status] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [updatedAt] TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_meal_draft_userId_updatedAt] ON [meal_draft] ([userId], [updatedAt]);
CREATE UNIQUE INDEX IF NOT EXISTS [ix_meal_draft_userId_draftId_unique] ON [meal_draft] ([userId], [draftId]);

-- TABLE meal_draft_revision (Meal draft revision)
CREATE TABLE IF NOT EXISTS [meal_draft_revision] (
  [draftRevisionId] TEXT NOT NULL PRIMARY KEY,
  [draftId] TEXT NOT NULL,
  [userId] TEXT NOT NULL,
  [revision] INTEGER NOT NULL,
  [payloadJson] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_meal_draft_revision_userId_draftId_revision_unique] ON [meal_draft_revision] ([userId], [draftId], [revision]);
CREATE INDEX IF NOT EXISTS [ix_meal_draft_revision_userId_createdAt] ON [meal_draft_revision] ([userId], [createdAt]);

-- TABLE meal_item (Meal item)
CREATE TABLE IF NOT EXISTS [meal_item] (
  [mealItemId] TEXT NOT NULL PRIMARY KEY,
  [mealId] TEXT NOT NULL,
  [userId] TEXT NOT NULL,
  [name] TEXT NOT NULL,
  [quantityUnit] TEXT NOT NULL,
  [nutritionJson] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [quantity] REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_meal_item_userId_mealId] ON [meal_item] ([userId], [mealId]);
CREATE UNIQUE INDEX IF NOT EXISTS [ix_meal_item_userId_mealItemId_unique] ON [meal_item] ([userId], [mealItemId]);

-- TABLE meal_item_revision (Meal item revision)
CREATE TABLE IF NOT EXISTS [meal_item_revision] (
  [itemRevisionId] TEXT NOT NULL PRIMARY KEY,
  [mealRevisionId] TEXT NOT NULL,
  [logicalItemId] TEXT NOT NULL,
  [operation] TEXT NOT NULL,
  [dataJson] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_meal_item_revision_mealRevisionId_logicalItemId] ON [meal_item_revision] ([mealRevisionId], [logicalItemId]);

-- TABLE meal_media (Meal media)
CREATE TABLE IF NOT EXISTS [meal_media] (
  [mediaId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [draftId] TEXT NULL,
  [mealId] TEXT NULL,
  [bucketId] TEXT NOT NULL,
  [objectId] TEXT NOT NULL,
  [variant] TEXT NOT NULL,
  [checksum] TEXT NOT NULL,
  [width] INTEGER NULL,
  [height] INTEGER NULL,
  [state] TEXT NOT NULL,
  [deleteAfter] TEXT NULL,
  [createdAt] TEXT NOT NULL,
  [deletedAt] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_meal_media_bucketId_objectId_unique] ON [meal_media] ([bucketId], [objectId]);
CREATE INDEX IF NOT EXISTS [ix_meal_media_userId_state_deleteAfter] ON [meal_media] ([userId], [state], [deleteAfter]);

-- TABLE meal_revision (Meal revision)
CREATE TABLE IF NOT EXISTS [meal_revision] (
  [mealRevisionId] TEXT NOT NULL PRIMARY KEY,
  [mealId] TEXT NOT NULL,
  [userId] TEXT NOT NULL,
  [revision] INTEGER NOT NULL,
  [payloadJson] TEXT NOT NULL,
  [payloadHash] TEXT NOT NULL,
  [idempotencyKey] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_meal_revision_meal_revision_user_meal_rev_1vfyvgl] ON [meal_revision] ([userId], [mealId], [revision]);
CREATE UNIQUE INDEX IF NOT EXISTS [ix_meal_revision_meal_revision_user_idempote_84jj0r] ON [meal_revision] ([userId], [idempotencyKey]);
CREATE INDEX IF NOT EXISTS [ix_meal_revision_meal_revision_user_createdAt] ON [meal_revision] ([userId], [createdAt]);

-- TABLE meal_tombstone (Meal tombstone)
CREATE TABLE IF NOT EXISTS [meal_tombstone] (
  [tombstoneId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [mealId] TEXT NOT NULL,
  [deletedRevision] INTEGER NOT NULL,
  [reason] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [purgeAfter] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_meal_tombstone_userId_mealId_deletedRevision_unique] ON [meal_tombstone] ([userId], [mealId], [deletedRevision]);
CREATE INDEX IF NOT EXISTS [ix_meal_tombstone_userId_createdAt] ON [meal_tombstone] ([userId], [createdAt]);

-- TABLE model_configuration (Model configuration)
CREATE TABLE IF NOT EXISTS [model_configuration] (
  [priority] INTEGER NULL,
  [providerOptionsJson] TEXT NULL,
  [modelConfigId] TEXT NOT NULL PRIMARY KEY,
  [taskType] TEXT NOT NULL,
  [provider] TEXT NOT NULL,
  [modelName] TEXT NOT NULL,
  [temperature] REAL NOT NULL,
  [maxOutputTokens] INTEGER NOT NULL,
  [timeoutMs] INTEGER NOT NULL,
  [retryPolicyJson] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [updatedAt] TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_model_configuration_taskType_state] ON [model_configuration] ([taskType], [state]);

-- TABLE muscle_load (Muscle load)
CREATE TABLE IF NOT EXISTS [muscle_load] (
  [muscleLoadId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [sessionId] TEXT NOT NULL,
  [localDate] TEXT NOT NULL,
  [muscleGroup] TEXT NOT NULL,
  [algorithmVersion] TEXT NOT NULL,
  [contribution] REAL NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_muscle_load_session_muscle_algo_uq] ON [muscle_load] ([sessionId], [muscleGroup], [algorithmVersion]);
CREATE INDEX IF NOT EXISTS [ix_muscle_load_userId_localDate_muscleGroup] ON [muscle_load] ([userId], [localDate], [muscleGroup]);

-- TABLE notification (Notification)
CREATE TABLE IF NOT EXISTS [notification] (
  [notificationId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [type] TEXT NOT NULL,
  [title] TEXT NOT NULL,
  [body] TEXT NOT NULL,
  [deepLink] TEXT NULL,
  [objectId] TEXT NULL,
  [priority] INTEGER NOT NULL,
  [createdAt] TEXT NOT NULL,
  [readAt] TEXT NULL,
  [expiresAt] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_notification_userId_readAt_createdAt] ON [notification] ([userId], [readAt], [createdAt]);
CREATE INDEX IF NOT EXISTS [ix_notification_expiresAt] ON [notification] ([expiresAt]);

-- TABLE notification_delivery (Notification delivery)
CREATE TABLE IF NOT EXISTS [notification_delivery] (
  [deliveryId] TEXT NOT NULL PRIMARY KEY,
  [notificationId] TEXT NOT NULL,
  [deviceId] TEXT NOT NULL,
  [provider] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [attemptCount] INTEGER NOT NULL,
  [lastAttemptAt] TEXT NULL,
  [providerMessageIdHash] TEXT NULL,
  [errorCode] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_notification_delivery_notificationId_deviceId_unique] ON [notification_delivery] ([notificationId], [deviceId]);
CREATE INDEX IF NOT EXISTS [ix_notification_delivery_state_lastAttemptAt] ON [notification_delivery] ([state], [lastAttemptAt]);

-- TABLE nutrition_source_cache (Nutrition source cache)
CREATE TABLE IF NOT EXISTS [nutrition_source_cache] (
  [nutritionSourceId] TEXT NOT NULL PRIMARY KEY,
  [provider] TEXT NOT NULL,
  [providerRecordId] TEXT NOT NULL,
  [locale] TEXT NOT NULL,
  [description] TEXT NOT NULL,
  [basis100gJson] TEXT NOT NULL,
  [rawVersion] TEXT NOT NULL,
  [fetchedAt] TEXT NOT NULL,
  [expiresAt] TEXT NOT NULL,
  [checksum] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_nutrition_source_cache_provider_record_version_uq] ON [nutrition_source_cache] ([provider], [providerRecordId], [rawVersion]);
CREATE INDEX IF NOT EXISTS [ix_nutrition_source_cache_description] ON [nutrition_source_cache] ([description]);
CREATE INDEX IF NOT EXISTS [ix_nutrition_source_cache_expiresAt] ON [nutrition_source_cache] ([expiresAt]);

-- TABLE onboarding_progress (Onboarding progress)
CREATE TABLE IF NOT EXISTS [onboarding_progress] (
  [userId] TEXT NOT NULL PRIMARY KEY,
  [currentStep] INTEGER NOT NULL,
  [completedStepsJson] TEXT NOT NULL,
  [draftValuesJson] TEXT NOT NULL,
  [schemaVersion] INTEGER NOT NULL,
  [revision] INTEGER NOT NULL,
  [updatedAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_onboarding_progress_userId_unique] ON [onboarding_progress] ([userId]);
CREATE INDEX IF NOT EXISTS [ix_onboarding_progress_updatedAt] ON [onboarding_progress] ([updatedAt]);

-- TABLE personal_food (Personal food)
CREATE TABLE IF NOT EXISTS [personal_food] (
  [personalFoodId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [name] TEXT NOT NULL,
  [basisUnit] TEXT NOT NULL,
  [energyKcal] INTEGER NOT NULL,
  [provenanceNote] TEXT NULL,
  [revision] INTEGER NOT NULL,
  [createdAt] TEXT NOT NULL,
  [updatedAt] TEXT NOT NULL,
  [deletedAt] TEXT NULL,
  [basisAmount] REAL NOT NULL,
  [proteinG] REAL NOT NULL,
  [carbG] REAL NOT NULL,
  [fatG] REAL NOT NULL,
  [fiberG] REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_personal_food_userId_name] ON [personal_food] ([userId], [name]);
CREATE INDEX IF NOT EXISTS [ix_personal_food_userId_updatedAt] ON [personal_food] ([userId], [updatedAt]);

-- TABLE privacy_preference (Privacy preference)
CREATE TABLE IF NOT EXISTS [privacy_preference] (
  [userId] TEXT NOT NULL PRIMARY KEY,
  [retainMealImages] INTEGER NOT NULL,
  [imageRetentionDays] INTEGER NULL,
  [analyticsAllowed] INTEGER NOT NULL,
  [modelImprovementAllowed] INTEGER NOT NULL,
  [exportLocale] TEXT NOT NULL,
  [revision] INTEGER NOT NULL,
  [updatedAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_privacy_preference_userId_unique] ON [privacy_preference] ([userId]);
CREATE INDEX IF NOT EXISTS [ix_privacy_preference_updatedAt] ON [privacy_preference] ([updatedAt]);

-- TABLE progress_insight (Progress insight)
CREATE TABLE IF NOT EXISTS [progress_insight] (
  [insightId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [periodStart] TEXT NOT NULL,
  [periodEnd] TEXT NOT NULL,
  [category] TEXT NOT NULL,
  [resultText] TEXT NOT NULL,
  [evidenceHash] TEXT NOT NULL,
  [ruleVersion] INTEGER NOT NULL,
  [state] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [updatedAt] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_progress_insight_userId_periodStart_periodEnd] ON [progress_insight] ([userId], [periodStart], [periodEnd]);
CREATE INDEX IF NOT EXISTS [ix_progress_insight_state] ON [progress_insight] ([state]);

-- TABLE prompt_template (Prompt template)
CREATE TABLE IF NOT EXISTS [prompt_template] (
  [promptId] TEXT NOT NULL PRIMARY KEY,
  [taskType] TEXT NOT NULL,
  [name] TEXT NOT NULL,
  [description] TEXT NOT NULL,
  [activeVersionId] TEXT NULL,
  [status] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [updatedAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_prompt_template_taskType_unique] ON [prompt_template] ([taskType]);
CREATE INDEX IF NOT EXISTS [ix_prompt_template_status] ON [prompt_template] ([status]);

-- TABLE prompt_version (Prompt version)
CREATE TABLE IF NOT EXISTS [prompt_version] (
  [promptVersionId] TEXT NOT NULL PRIMARY KEY,
  [promptId] TEXT NOT NULL,
  [version] INTEGER NOT NULL,
  [systemInstructionEncrypted] TEXT NOT NULL,
  [jsonSchemaJson] TEXT NOT NULL,
  [safetyRulesJson] TEXT NOT NULL,
  [testSuiteVersion] TEXT NOT NULL,
  [checksum] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [activatedAt] TEXT NULL,
  [retiredAt] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_prompt_version_promptId_version_unique] ON [prompt_version] ([promptId], [version]);
CREATE INDEX IF NOT EXISTS [ix_prompt_version_state] ON [prompt_version] ([state]);

-- TABLE provider_call (Provider call)
CREATE TABLE IF NOT EXISTS [provider_call] (
  [providerCallId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [taskType] TEXT NOT NULL,
  [requestId] TEXT NOT NULL,
  [provider] TEXT NOT NULL,
  [model] TEXT NOT NULL,
  [promptVersionId] TEXT NULL,
  [inputHash] TEXT NOT NULL,
  [outputHash] TEXT NULL,
  [status] TEXT NOT NULL,
  [latencyMs] INTEGER NULL,
  [tokenIn] INTEGER NULL,
  [tokenOut] INTEGER NULL,
  [createdAt] TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_provider_call_requestId] ON [provider_call] ([requestId]);
CREATE INDEX IF NOT EXISTS [ix_provider_call_status_createdAt] ON [provider_call] ([status], [createdAt]);
CREATE INDEX IF NOT EXISTS [ix_provider_call_userId_createdAt] ON [provider_call] ([userId], [createdAt]);

-- TABLE purchase_event (Purchase Event)
CREATE TABLE IF NOT EXISTS [purchase_event] (
  [purchaseEventId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NULL,
  [provider] TEXT NOT NULL,
  [externalEventIdHash] TEXT NOT NULL,
  [eventType] TEXT NOT NULL,
  [productId] TEXT NULL,
  [subscriptionId] TEXT NULL,
  [signedPayloadHash] TEXT NOT NULL,
  [occurredAt] TEXT NOT NULL,
  [receivedAt] TEXT NOT NULL,
  [verificationState] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_purchase_event_provider_event_uq] ON [purchase_event] ([provider], [externalEventIdHash]);
CREATE INDEX IF NOT EXISTS [ix_purchase_event_subscription_time] ON [purchase_event] ([subscriptionId], [occurredAt]);

-- TABLE recommendation_evidence (Recommendation evidence)
CREATE TABLE IF NOT EXISTS [recommendation_evidence] (
  [evidenceId] TEXT NOT NULL PRIMARY KEY,
  [recommendationId] TEXT NOT NULL,
  [evidenceType] TEXT NOT NULL,
  [objectId] TEXT NOT NULL,
  [summaryJson] TEXT NOT NULL,
  [sourceUpdatedAt] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_recommendation_evidence_recommendationId] ON [recommendation_evidence] ([recommendationId]);

-- TABLE report (Report)
CREATE TABLE IF NOT EXISTS [report] (
  [reportId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [reportType] TEXT NOT NULL,
  [periodStart] TEXT NOT NULL,
  [periodEnd] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [sourceRevisionHash] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [completedAt] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_report_report_scope_source_uq] ON [report] ([userId], [reportType], [periodStart], [periodEnd], [sourceRevisionHash]);
CREATE INDEX IF NOT EXISTS [ix_report_userId_status] ON [report] ([userId], [status]);

-- TABLE report_evidence (Report evidence)
CREATE TABLE IF NOT EXISTS [report_evidence] (
  [reportEvidenceId] TEXT NOT NULL PRIMARY KEY,
  [reportId] TEXT NOT NULL,
  [sectionId] TEXT NOT NULL,
  [sourceType] TEXT NOT NULL,
  [sourceObjectId] TEXT NOT NULL,
  [sourceRevision] INTEGER NOT NULL,
  [summaryJson] TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_report_evidence_reportId] ON [report_evidence] ([reportId]);
CREATE INDEX IF NOT EXISTS [ix_report_evidence_sectionId] ON [report_evidence] ([sectionId]);

-- TABLE report_section (Report section)
CREATE TABLE IF NOT EXISTS [report_section] (
  [sectionId] TEXT NOT NULL PRIMARY KEY,
  [reportId] TEXT NOT NULL,
  [sortOrder] INTEGER NOT NULL,
  [sectionType] TEXT NOT NULL,
  [title] TEXT NOT NULL,
  [narrative] TEXT NOT NULL,
  [chartSpecJson] TEXT NULL,
  [provenanceJson] TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_report_section_reportId_sortOrder] ON [report_section] ([reportId], [sortOrder]);

-- TABLE saved_meal (Saved meals)
CREATE TABLE IF NOT EXISTS [saved_meal] (
  [savedMealId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [name] TEXT NOT NULL,
  [currentRevision] INTEGER NOT NULL,
  [totalEnergyKcal] REAL NOT NULL,
  [totalProteinG] REAL NOT NULL,
  [createdAt] TEXT NOT NULL,
  [updatedAt] TEXT NOT NULL,
  [deletedAt] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_saved_meal_userId_updatedAt] ON [saved_meal] ([userId], [updatedAt]);
CREATE INDEX IF NOT EXISTS [ix_saved_meal_userId_name] ON [saved_meal] ([userId], [name]);

-- TABLE saved_meal_item (Saved meal items)
CREATE TABLE IF NOT EXISTS [saved_meal_item] (
  [savedMealItemId] TEXT NOT NULL PRIMARY KEY,
  [savedMealId] TEXT NOT NULL,
  [userId] TEXT NOT NULL,
  [sortOrder] INTEGER NOT NULL,
  [foodRef] TEXT NULL,
  [displayName] TEXT NOT NULL,
  [grams] REAL NULL,
  [portionJson] TEXT NOT NULL,
  [nutrientsJson] TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_saved_meal_item_savedMealId_sortOrder] ON [saved_meal_item] ([savedMealId], [sortOrder]);

-- TABLE schema_migrations (Schema migrations)
CREATE TABLE IF NOT EXISTS [schema_migrations] (
  [migrationId] TEXT NOT NULL PRIMARY KEY,
  [schemaVersion] INTEGER NOT NULL,
  [checksum] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [resourceSummaryJson] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [updatedAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_schema_migrations_migrationId_schemaVersion_unique] ON [schema_migrations] ([migrationId], [schemaVersion]);

-- TABLE serving_prior_observation (Serving prior observation)
CREATE TABLE IF NOT EXISTS [serving_prior_observation] (
  [observationId] TEXT NOT NULL PRIMARY KEY,
  [ownerUserId] TEXT NOT NULL,
  [identityKey] TEXT NOT NULL,
  [sourceType] TEXT NOT NULL,
  [sourceReference] TEXT NOT NULL,
  [sourceMealId] TEXT NOT NULL,
  [sourceMealRevision] INTEGER NOT NULL,
  [confirmationKind] TEXT NOT NULL,
  [evidenceQuality] TEXT NOT NULL,
  [candidateName] TEXT NOT NULL,
  [preparationLabel] TEXT NULL,
  [grams] REAL NOT NULL,
  [acceptedPolicyVersion] TEXT NOT NULL,
  [confirmedAt] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [excludedAt] TEXT NULL,
  [exclusionReasonCode] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_serving_prior_observation_serving_prior_owner_observa_1qxjveg] ON [serving_prior_observation] ([ownerUserId], [observationId]);
CREATE INDEX IF NOT EXISTS [ix_serving_prior_observation_serving_prior_owner_identit_17k52lh] ON [serving_prior_observation] ([ownerUserId], [identityKey], [confirmedAt]);
CREATE INDEX IF NOT EXISTS [ix_serving_prior_observation_serving_prior_owner_confirmedAt] ON [serving_prior_observation] ([ownerUserId], [confirmedAt]);

-- TABLE soreness_report (Soreness report)
CREATE TABLE IF NOT EXISTS [soreness_report] (
  [reportId] TEXT NOT NULL PRIMARY KEY,
  [muscleGroupId] TEXT NOT NULL,
  [side] TEXT NOT NULL,
  [score] INTEGER NOT NULL,
  [reportedAt] TEXT NOT NULL,
  [expiresAt] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [source] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [updatedAt] TEXT NOT NULL,
  [userId] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_soreness_report_soreness_owner_report_unique] ON [soreness_report] ([userId], [reportId]);
CREATE INDEX IF NOT EXISTS [ix_soreness_report_soreness_owner_muscle_state] ON [soreness_report] ([userId], [muscleGroupId], [side], [state]);
CREATE INDEX IF NOT EXISTS [ix_soreness_report_soreness_owner_expiry_state] ON [soreness_report] ([userId], [expiresAt], [state]);

-- TABLE subscription (Subscription)
CREATE TABLE IF NOT EXISTS [subscription] (
  [subscriptionId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [provider] TEXT NOT NULL,
  [productId] TEXT NOT NULL,
  [originalTransactionIdHash] TEXT NULL,
  [purchaseTokenHash] TEXT NULL,
  [state] TEXT NOT NULL,
  [startAt] TEXT NULL,
  [expiresAt] TEXT NULL,
  [autoRenew] INTEGER NULL,
  [environment] TEXT NOT NULL,
  [revision] INTEGER NOT NULL,
  [updatedAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_subscription_provider_orig_tx_uq] ON [subscription] ([provider], [originalTransactionIdHash]);
CREATE UNIQUE INDEX IF NOT EXISTS [ix_subscription_provider_token_uq] ON [subscription] ([provider], [purchaseTokenHash]);
CREATE INDEX IF NOT EXISTS [ix_subscription_user_state] ON [subscription] ([userId], [state]);

-- TABLE support_ticket (Support ticket)
CREATE TABLE IF NOT EXISTS [support_ticket] (
  [ticketId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [category] TEXT NOT NULL,
  [subject] TEXT NOT NULL,
  [bodyRedacted] TEXT NOT NULL,
  [safeContextJson] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [updatedAt] TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_support_ticket_userId_state] ON [support_ticket] ([userId], [state]);
CREATE INDEX IF NOT EXISTS [ix_support_ticket_state_updatedAt] ON [support_ticket] ([state], [updatedAt]);

-- TABLE sync_cursor (sync_cursor)
CREATE TABLE IF NOT EXISTS [sync_cursor] (
  [deviceSessionId] TEXT NULL,
  [stream] TEXT NULL,
  [lastAckedOperationId] TEXT NULL,
  [updatedAt] TEXT NULL,
  [domain] TEXT NOT NULL,
  [opaqueCursor] TEXT NOT NULL,
  [lastSyncAt] TEXT NOT NULL,
  [cursorId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [deviceId] TEXT NOT NULL,
  [schemaVersion] INTEGER NOT NULL,
  [cursorToken] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_sync_cursor_userId_deviceId_domain_unique] ON [sync_cursor] ([userId], [deviceId], [domain]);
CREATE INDEX IF NOT EXISTS [ix_sync_cursor_userId_lastSyncAt] ON [sync_cursor] ([userId], [lastSyncAt]);

-- TABLE sync_operation (sync_operation)
CREATE TABLE IF NOT EXISTS [sync_operation] (
  [deviceSessionId] TEXT NULL,
  [sourcePlatform] TEXT NULL,
  [expectedEntityRevision] INTEGER NULL,
  [clientSequence] INTEGER NULL,
  [conflictCode] TEXT NULL,
  [errorCode] TEXT NULL,
  [canonicalRevision] INTEGER NULL,
  [canonicalEventId] TEXT NULL,
  [canonicalCursor] TEXT NULL,
  [retryClass] TEXT NULL,
  [occurredAtUtc] TEXT NULL,
  [occurredLocalDate] TEXT NULL,
  [timezone] TEXT NULL,
  [receivedAt] TEXT NULL,
  [schemaVersion] INTEGER NULL,
  [operationId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [deviceId] TEXT NOT NULL,
  [entityType] TEXT NOT NULL,
  [entityId] TEXT NOT NULL,
  [entityRevision] INTEGER NOT NULL,
  [operationType] TEXT NOT NULL,
  [idempotencyKey] TEXT NOT NULL,
  [requestHash] TEXT NOT NULL,
  [payloadHash] TEXT NOT NULL,
  [outcome] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [operation] TEXT NULL,
  [cursorToken] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_sync_operation_userId_deviceId_idempotency_unique] ON [sync_operation] ([userId], [deviceId], [idempotencyKey]);
CREATE INDEX IF NOT EXISTS [ix_sync_operation_userId_createdAt] ON [sync_operation] ([userId], [createdAt]);
CREATE UNIQUE INDEX IF NOT EXISTS [ix_sync_operation_sync_user_operation_unique] ON [sync_operation] ([userId], [operationId]);
CREATE UNIQUE INDEX IF NOT EXISTS [ix_sync_operation_sync_user_session_idempotency_unique] ON [sync_operation] ([userId], [deviceSessionId], [idempotencyKey]);

-- TABLE target_revision (Target revision)
CREATE TABLE IF NOT EXISTS [target_revision] (
  [targetRevisionId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [effectiveDate] TEXT NOT NULL,
  [targetValuesJson] TEXT NOT NULL,
  [source] TEXT NOT NULL,
  [manualEntry] INTEGER NOT NULL,
  [eligibilityDecision] TEXT NOT NULL,
  [eligibilityReasonCodesJson] TEXT NOT NULL,
  [policyVersion] TEXT NOT NULL,
  [populationClass] TEXT NOT NULL,
  [userConfirmed] INTEGER NOT NULL,
  [revision] INTEGER NOT NULL,
  [schemaVersion] INTEGER NOT NULL,
  [createdAt] TEXT NOT NULL,
  [energyKcal] INTEGER NULL,
  [proteinG] INTEGER NULL,
  [movementTarget] INTEGER NULL,
  [actionCategory] TEXT NULL,
  [formulaVersion] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_target_revision_target_user_effective_revis_1ft8dg7] ON [target_revision] ([userId], [effectiveDate], [revision]);
CREATE INDEX IF NOT EXISTS [ix_target_revision_target_user_effectiveDate] ON [target_revision] ([userId], [effectiveDate]);
CREATE INDEX IF NOT EXISTS [ix_target_revision_target_user_eligibility_createdAt] ON [target_revision] ([userId], [eligibilityDecision], [createdAt]);

-- TABLE usage_ledger (Usage Ledger)
CREATE TABLE IF NOT EXISTS [usage_ledger] (
  [usageId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [usageType] TEXT NOT NULL,
  [quantity] REAL NOT NULL,
  [unit] TEXT NOT NULL,
  [requestId] TEXT NULL,
  [provider] TEXT NULL,
  [model] TEXT NULL,
  [periodKey] TEXT NOT NULL,
  [occurredAt] TEXT NOT NULL,
  [reversalOf] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_usage_ledger_userId_periodKey_usageType] ON [usage_ledger] ([userId], [periodKey], [usageType]);
CREATE INDEX IF NOT EXISTS [ix_usage_ledger_requestId] ON [usage_ledger] ([requestId]);

-- TABLE user_goal (User goal)
CREATE TABLE IF NOT EXISTS [user_goal] (
  [goalId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [goalType] TEXT NOT NULL,
  [startDate] TEXT NOT NULL,
  [targetDate] TEXT NULL,
  [targetWeightG] INTEGER NULL,
  [status] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [endedAt] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_user_goal_userId_status] ON [user_goal] ([userId], [status]);
CREATE INDEX IF NOT EXISTS [ix_user_goal_userId_startDate] ON [user_goal] ([userId], [startDate]);

-- TABLE user_identity (User identity)
CREATE TABLE IF NOT EXISTS [user_identity] (
  [identityId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [provider] TEXT NOT NULL,
  [providerSubjectHash] TEXT NOT NULL,
  [emailNormalized] TEXT NULL,
  [emailVerified] INTEGER NOT NULL,
  [linkedAt] TEXT NOT NULL,
  [lastUsedAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_user_identity_provider_subject_unique] ON [user_identity] ([provider], [providerSubjectHash]);
CREATE INDEX IF NOT EXISTS [ix_user_identity_userId] ON [user_identity] ([userId]);

-- TABLE user_preference (User preference)
CREATE TABLE IF NOT EXISTS [user_preference] (
  [preferenceId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [key] TEXT NOT NULL,
  [valueJson] TEXT NOT NULL,
  [revision] INTEGER NOT NULL,
  [updatedAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_user_preference_user_key_unique] ON [user_preference] ([userId], [key]);
CREATE INDEX IF NOT EXISTS [ix_user_preference_userId_updatedAt] ON [user_preference] ([userId], [updatedAt]);

-- TABLE user_profile (User profile)
CREATE TABLE IF NOT EXISTS [user_profile] (
  [userId] TEXT NOT NULL PRIMARY KEY,
  [displayName] TEXT NOT NULL,
  [dateOfBirth] TEXT NULL,
  [countryCode] TEXT NULL,
  [locale] TEXT NOT NULL,
  [timeZone] TEXT NOT NULL,
  [sexForEnergyEstimate] TEXT NULL,
  [heightMm] INTEGER NULL,
  [currentWeightG] INTEGER NULL,
  [goalWeightG] INTEGER NULL,
  [activityLevel] TEXT NULL,
  [trainingFrequency] INTEGER NULL,
  [onboardingState] TEXT NOT NULL,
  [revision] INTEGER NOT NULL,
  [createdAt] TEXT NOT NULL,
  [updatedAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_user_profile_userId_unique] ON [user_profile] ([userId]);
CREATE INDEX IF NOT EXISTS [ix_user_profile_onboardingState] ON [user_profile] ([onboardingState]);
CREATE INDEX IF NOT EXISTS [ix_user_profile_updatedAt] ON [user_profile] ([updatedAt]);

-- TABLE user_session_metadata (User session metadata)
CREATE TABLE IF NOT EXISTS [user_session_metadata] (
  [sessionMetaId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [appwriteSessionIdHash] TEXT NOT NULL,
  [deviceId] TEXT NULL,
  [platform] TEXT NOT NULL,
  [appVersion] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [lastSeenAt] TEXT NOT NULL,
  [revokedAt] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_user_session_metadata_appwriteSessionIdHash_unique] ON [user_session_metadata] ([appwriteSessionIdHash]);
CREATE INDEX IF NOT EXISTS [ix_user_session_metadata_userId_appwriteSessionIdHash] ON [user_session_metadata] ([userId], [appwriteSessionIdHash]);
CREATE INDEX IF NOT EXISTS [ix_user_session_metadata_userId_lastSeenAt] ON [user_session_metadata] ([userId], [lastSeenAt]);

-- TABLE watch_delivery (Watch deliveries)
CREATE TABLE IF NOT EXISTS [watch_delivery] (
  [deliveryId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [summaryId] TEXT NOT NULL,
  [revision] INTEGER NOT NULL,
  [phoneDeviceId] TEXT NOT NULL,
  [watchDeviceId] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [attemptCount] INTEGER NOT NULL,
  [lastAttemptAt] TEXT NULL,
  [payloadJson] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [updatedAt] TEXT NOT NULL,
  [deviceId] TEXT NULL,
  [sentAt] TEXT NULL,
  [acceptedAt] TEXT NULL,
  [payloadType] TEXT NULL,
  [payloadId] TEXT NULL,
  [payloadRevision] INTEGER NULL,
  [payloadSchemaVersion] INTEGER NULL,
  [payloadHash] TEXT NULL,
  [expiresAt] TEXT NULL,
  [entityType] TEXT NULL,
  [entityId] TEXT NULL,
  [entityRevision] INTEGER NULL,
  [supersededAt] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_watch_delivery_userId_summaryId_revision_w_1vq8xh9] ON [watch_delivery] ([userId], [summaryId], [revision], [watchDeviceId]);
CREATE INDEX IF NOT EXISTS [ix_watch_delivery_userId_state] ON [watch_delivery] ([userId], [state]);

-- TABLE watch_receipt (Watch receipts)
CREATE TABLE IF NOT EXISTS [watch_receipt] (
  [receiptId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [deliveryId] TEXT NOT NULL,
  [summaryId] TEXT NOT NULL,
  [revision] INTEGER NOT NULL,
  [result] TEXT NOT NULL,
  [outcome] TEXT NOT NULL,
  [watchDeviceId] TEXT NOT NULL,
  [persistedAt] TEXT NULL,
  [receivedAt] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [deviceId] TEXT NULL,
  [updatedAt] TEXT NULL,
  [payloadType] TEXT NULL,
  [payloadId] TEXT NULL,
  [payloadRevision] INTEGER NULL,
  [payloadHash] TEXT NULL,
  [entityType] TEXT NULL,
  [entityId] TEXT NULL,
  [entityRevision] INTEGER NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_watch_receipt_watchDeviceId_summaryId_rev_1mpy6rw] ON [watch_receipt] ([watchDeviceId], [summaryId], [revision], [result]);
CREATE INDEX IF NOT EXISTS [ix_watch_receipt_deliveryId] ON [watch_receipt] ([deliveryId]);
CREATE INDEX IF NOT EXISTS [ix_watch_receipt_userId_receivedAt] ON [watch_receipt] ([userId], [receivedAt]);

-- TABLE webhook_event (Webhook Event)
CREATE TABLE IF NOT EXISTS [webhook_event] (
  [webhookEventId] TEXT NOT NULL PRIMARY KEY,
  [provider] TEXT NOT NULL,
  [externalEventIdHash] TEXT NOT NULL,
  [headersHash] TEXT NOT NULL,
  [payloadObjectId] TEXT NULL,
  [receivedAt] TEXT NOT NULL,
  [verifiedAt] TEXT NULL,
  [state] TEXT NOT NULL,
  [attemptCount] INTEGER NOT NULL,
  [errorCode] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_webhook_event_provider_event_uq] ON [webhook_event] ([provider], [externalEventIdHash]);
CREATE INDEX IF NOT EXISTS [ix_webhook_event_state_received_at] ON [webhook_event] ([state], [receivedAt]);

-- TABLE wellness_checkin (Wellness check-in)
CREATE TABLE IF NOT EXISTS [wellness_checkin] (
  [checkinId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [localDate] TEXT NOT NULL,
  [energyLevel] INTEGER NOT NULL,
  [sorenessAreasJson] TEXT NOT NULL,
  [sleepPerception] TEXT NOT NULL,
  [note] TEXT NULL,
  [revision] INTEGER NOT NULL,
  [createdAt] TEXT NOT NULL,
  [updatedAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_wellness_checkin_userId_localDate_unique] ON [wellness_checkin] ([userId], [localDate]);
CREATE INDEX IF NOT EXISTS [ix_wellness_checkin_userId_localDate] ON [wellness_checkin] ([userId], [localDate]);

-- TABLE workout_event (Workout event)
CREATE TABLE IF NOT EXISTS [workout_event] (
  [eventId] TEXT NOT NULL PRIMARY KEY,
  [sessionId] TEXT NOT NULL,
  [userId] TEXT NOT NULL,
  [eventType] TEXT NOT NULL,
  [eventSequence] INTEGER NOT NULL,
  [payloadJson] TEXT NOT NULL,
  [sourceDevice] TEXT NOT NULL,
  [occurredAt] TEXT NOT NULL,
  [idempotencyKey] TEXT NOT NULL,
  [sourceDeviceSessionId] TEXT NULL,
  [clientSequence] INTEGER NULL,
  [semanticStepId] TEXT NULL,
  [correctionOfEventId] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_workout_event_sessionId_eventSequence_unique] ON [workout_event] ([sessionId], [eventSequence]);
CREATE UNIQUE INDEX IF NOT EXISTS [ix_workout_event_userId_idempotencyKey_unique] ON [workout_event] ([userId], [idempotencyKey]);
CREATE INDEX IF NOT EXISTS [ix_workout_event_sessionId_occurredAt] ON [workout_event] ([sessionId], [occurredAt]);

-- TABLE workout_plan (Workout plan)
CREATE TABLE IF NOT EXISTS [workout_plan] (
  [planId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [ownerType] TEXT NOT NULL,
  [name] TEXT NOT NULL,
  [goalCategory] TEXT NOT NULL,
  [currentRevision] INTEGER NOT NULL,
  [status] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [updatedAt] TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_workout_plan_userId_status] ON [workout_plan] ([userId], [status]);
CREATE INDEX IF NOT EXISTS [ix_workout_plan_ownerType_status] ON [workout_plan] ([ownerType], [status]);

-- TABLE workout_plan_revision (Workout plan revision)
CREATE TABLE IF NOT EXISTS [workout_plan_revision] (
  [planRevisionId] TEXT NOT NULL PRIMARY KEY,
  [planId] TEXT NOT NULL,
  [revision] INTEGER NOT NULL,
  [name] TEXT NOT NULL,
  [notes] TEXT NULL,
  [source] TEXT NOT NULL,
  [createdAt] TEXT NOT NULL,
  [envelopeJson] TEXT NULL,
  [envelopeHash] TEXT NULL,
  [algorithmBundleVersion] TEXT NULL,
  [profileRevision] INTEGER NULL,
  [historySnapshotHash] TEXT NULL,
  [idempotencyKey] TEXT NULL,
  [requestHash] TEXT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_workout_plan_revision_planId_revision_unique] ON [workout_plan_revision] ([planId], [revision]);
CREATE INDEX IF NOT EXISTS [ix_workout_plan_revision_createdAt] ON [workout_plan_revision] ([createdAt]);
CREATE INDEX IF NOT EXISTS [ix_workout_plan_revision_envelopeHash] ON [workout_plan_revision] ([envelopeHash]);
CREATE INDEX IF NOT EXISTS [ix_workout_plan_revision_planId_idempotency] ON [workout_plan_revision] ([planId], [idempotencyKey]);

-- TABLE workout_plan_step (Workout plan step)
CREATE TABLE IF NOT EXISTS [workout_plan_step] (
  [stepId] TEXT NOT NULL PRIMARY KEY,
  [planRevisionId] TEXT NOT NULL,
  [sortOrder] INTEGER NOT NULL,
  [exerciseId] TEXT NOT NULL,
  [sets] INTEGER NULL,
  [repsMin] INTEGER NULL,
  [repsMax] INTEGER NULL,
  [durationSeconds] INTEGER NULL,
  [restSeconds] INTEGER NULL,
  [loadGuidance] TEXT NULL,
  [optional] INTEGER NOT NULL,
  [semanticSessionId] TEXT NULL,
  [sessionLocalDate] TEXT NULL,
  [sessionPurpose] TEXT NULL,
  [substitutionIdsJson] TEXT NULL,
  [progressionContextJson] TEXT NULL,
  [reasonCodesJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_workout_plan_step_planRevisionId_sortOrder] ON [workout_plan_step] ([planRevisionId], [sortOrder]);
CREATE INDEX IF NOT EXISTS [ix_workout_plan_step_semanticSessionId_sortOrder] ON [workout_plan_step] ([semanticSessionId], [sortOrder]);

-- TABLE workout_session (Workout session)
CREATE TABLE IF NOT EXISTS [workout_session] (
  [sessionId] TEXT NOT NULL PRIMARY KEY,
  [userId] TEXT NOT NULL,
  [planRevisionId] TEXT NULL,
  [authorityDeviceId] TEXT NOT NULL,
  [workoutType] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [currentRevision] INTEGER NOT NULL,
  [startedAt] TEXT NULL,
  [endedAt] TEXT NULL,
  [discardedAt] TEXT NULL,
  [createdAt] TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS [ix_workout_session_userId_state] ON [workout_session] ([userId], [state]);
CREATE INDEX IF NOT EXISTS [ix_workout_session_userId_startedAt] ON [workout_session] ([userId], [startedAt]);

-- TABLE workout_session_revision (Workout session revision)
CREATE TABLE IF NOT EXISTS [workout_session_revision] (
  [sessionRevisionId] TEXT NOT NULL PRIMARY KEY,
  [sessionId] TEXT NOT NULL,
  [revision] INTEGER NOT NULL,
  [baseRevision] INTEGER NOT NULL,
  [state] TEXT NOT NULL,
  [authorityDeviceId] TEXT NOT NULL,
  [sourceDeviceId] TEXT NOT NULL,
  [sourceOperationId] TEXT NOT NULL,
  [idempotencyKey] TEXT NOT NULL,
  [payloadHash] TEXT NOT NULL,
  [reasonCodesJson] TEXT NOT NULL,
  [schemaVersion] INTEGER NOT NULL,
  [occurredAt] TEXT NOT NULL,
  [acceptedAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_workout_session_revision_workout_session_revision_unique] ON [workout_session_revision] ([sessionId], [revision]);
CREATE UNIQUE INDEX IF NOT EXISTS [ix_workout_session_revision_workout_session_operation_unique] ON [workout_session_revision] ([sessionId], [sourceOperationId]);
CREATE UNIQUE INDEX IF NOT EXISTS [ix_workout_session_revision_workout_session_idempotency_unique] ON [workout_session_revision] ([sessionId], [idempotencyKey]);
CREATE INDEX IF NOT EXISTS [ix_workout_session_revision_workout_session_acceptedAt] ON [workout_session_revision] ([sessionId], [acceptedAt]);

-- TABLE workout_summary (Workout summary)
CREATE TABLE IF NOT EXISTS [workout_summary] (
  [summaryId] TEXT NOT NULL PRIMARY KEY,
  [sessionId] TEXT NOT NULL,
  [userId] TEXT NOT NULL,
  [durationSeconds] INTEGER NOT NULL,
  [activeEnergyKcal] INTEGER NULL,
  [steps] INTEGER NULL,
  [sourcePlatform] TEXT NOT NULL,
  [distanceM] REAL NULL,
  [healthWriteState] TEXT NOT NULL,
  [averageHeartRate] REAL NULL,
  [revision] INTEGER NOT NULL,
  [createdAt] TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS [ix_workout_summary_sessionId_unique] ON [workout_summary] ([sessionId]);
CREATE INDEX IF NOT EXISTS [ix_workout_summary_userId_createdAt] ON [workout_summary] ([userId], [createdAt]);
