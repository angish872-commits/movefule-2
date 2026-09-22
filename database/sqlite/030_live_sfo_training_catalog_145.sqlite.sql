-- Live Appwrite schema as SQLite (for IntelliJ / local dev)
-- Project: sfo / New project
-- Database: 6aa928e50009011a30af (Training catalog)
-- Tables: 145
-- Dialect: SQLite
-- Generated: 2026-09-22 from live Appwrite TablesDB API
-- Mapping: string/text/longtext/datetime->TEXT, integer/boolean->INTEGER, double->REAL
-- Note: boolean 0/1, datetime ISO8601 TEXT, first required *Id = PRIMARY KEY

PRAGMA foreign_keys=ON;
PRAGMA journal_mode=WAL;

-- Totals: 145 tables, 465 columns, 141 indexes

-- TABLE 6aa928fd003334f93b33 (Catalog releases)
CREATE TABLE IF NOT EXISTS [6aa928fd003334f93b33] (
  [_placeholder] INTEGER -- zero-column Appwrite table
);


-- TABLE 6aa92911000a7fc92bc4 (Exercises)
CREATE TABLE IF NOT EXISTS [6aa92911000a7fc92bc4] (
  [source_id] TEXT NOT NULL PRIMARY KEY,
  [name] TEXT NOT NULL
);


-- TABLE 6aa9291c0021f71b7947 (Exercise media)
CREATE TABLE IF NOT EXISTS [6aa9291c0021f71b7947] (
  [_placeholder] INTEGER -- zero-column Appwrite table
);


-- TABLE 6aa92925001c7aa77eea (Import runs)
CREATE TABLE IF NOT EXISTS [6aa92925001c7aa77eea] (
  [_placeholder] INTEGER -- zero-column Appwrite table
);


-- TABLE access_grant (Access Grant)
CREATE TABLE IF NOT EXISTS [access_grant] (
  [accessGrantId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_access_grant_idx_0] ON [access_grant] ([status]);

-- TABLE algorithm_decision (Algorithm Decision)
CREATE TABLE IF NOT EXISTS [algorithm_decision] (
  [algorithmDecisionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_algorithm_decision_idx_0] ON [algorithm_decision] ([status]);

-- TABLE algorithm_release (Algorithm Release)
CREATE TABLE IF NOT EXISTS [algorithm_release] (
  [algorithmReleaseId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_algorithm_release_idx_0] ON [algorithm_release] ([status]);

-- TABLE algorithm_rule_set (Algorithm Rule Set)
CREATE TABLE IF NOT EXISTS [algorithm_rule_set] (
  [algorithmRuleSetId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_algorithm_rule_set_idx_0] ON [algorithm_rule_set] ([status]);

-- TABLE algorithm_run (Algorithm Run)
CREATE TABLE IF NOT EXISTS [algorithm_run] (
  [algorithmRunId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_algorithm_run_idx_0] ON [algorithm_run] ([status]);

-- TABLE anatomy_region (Anatomy Region)
CREATE TABLE IF NOT EXISTS [anatomy_region] (
  [anatomyRegionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_anatomy_region_idx_0] ON [anatomy_region] ([status]);

-- TABLE athlete_availability (Athlete Availability)
CREATE TABLE IF NOT EXISTS [athlete_availability] (
  [athleteAvailabilityId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_athlete_availability_idx_0] ON [athlete_availability] ([status]);

-- TABLE athlete_equipment (Athlete Equipment)
CREATE TABLE IF NOT EXISTS [athlete_equipment] (
  [athleteEquipmentId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_athlete_equipment_idx_0] ON [athlete_equipment] ([status]);

-- TABLE athlete_goal (Athlete Goal)
CREATE TABLE IF NOT EXISTS [athlete_goal] (
  [athleteGoalId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_athlete_goal_idx_0] ON [athlete_goal] ([status]);

-- TABLE athlete_limitation (Athlete Limitation)
CREATE TABLE IF NOT EXISTS [athlete_limitation] (
  [athleteLimitationId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_athlete_limitation_idx_0] ON [athlete_limitation] ([status]);

-- TABLE athlete_profile (Athlete Profile)
CREATE TABLE IF NOT EXISTS [athlete_profile] (
  [athleteProfileId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_athlete_profile_idx_0] ON [athlete_profile] ([status]);

-- TABLE athlete_sport_profile (Athlete Sport Profile)
CREATE TABLE IF NOT EXISTS [athlete_sport_profile] (
  [athleteSportProfileId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_athlete_sport_profile_idx_0] ON [athlete_sport_profile] ([status]);

-- TABLE audit_event (Audit Event)
CREATE TABLE IF NOT EXISTS [audit_event] (
  [auditEventId] TEXT NOT NULL PRIMARY KEY,
  [eventType] TEXT NOT NULL,
  [occurredAt] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_audit_event_idx_0] ON [audit_event] ([auditEventId], [eventType]);

-- TABLE body_measurement (Body Measurement)
CREATE TABLE IF NOT EXISTS [body_measurement] (
  [bodyMeasurementId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_body_measurement_idx_0] ON [body_measurement] ([status]);

-- TABLE catalog_release (Catalog Release)
CREATE TABLE IF NOT EXISTS [catalog_release] (
  [releaseId] TEXT NOT NULL PRIMARY KEY,
  [releaseHash] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_catalog_release_idx_0] ON [catalog_release] ([releaseId], [releaseHash]);

-- TABLE catalog_review_state (Catalog Review State)
CREATE TABLE IF NOT EXISTS [catalog_review_state] (
  [catalogReviewStateId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_catalog_review_state_idx_0] ON [catalog_review_state] ([status]);

-- TABLE checkin_request (Checkin Request)
CREATE TABLE IF NOT EXISTS [checkin_request] (
  [checkinRequestId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_checkin_request_idx_0] ON [checkin_request] ([status]);

-- TABLE coach_client_relationship (Coach Client Relationship)
CREATE TABLE IF NOT EXISTS [coach_client_relationship] (
  [relationshipId] TEXT NOT NULL PRIMARY KEY,
  [coachAccountId] TEXT NOT NULL,
  [athleteAccountId] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_coach_client_relationship_idx_0] ON [coach_client_relationship] ([relationshipId], [coachAccountId]);

-- TABLE coach_note (Coach Note)
CREATE TABLE IF NOT EXISTS [coach_note] (
  [coachNoteId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_coach_note_idx_0] ON [coach_note] ([status]);

-- TABLE coach_note_revision (Coach Note Revision)
CREATE TABLE IF NOT EXISTS [coach_note_revision] (
  [coachNoteRevisionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_coach_note_revision_idx_0] ON [coach_note_revision] ([status]);

-- TABLE coach_profile (Coach Profile)
CREATE TABLE IF NOT EXISTS [coach_profile] (
  [coachProfileId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_coach_profile_idx_0] ON [coach_profile] ([status]);

-- TABLE coaching_invitation (Coaching Invitation)
CREATE TABLE IF NOT EXISTS [coaching_invitation] (
  [coachingInvitationId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_coaching_invitation_idx_0] ON [coaching_invitation] ([status]);

-- TABLE coaching_task (Coaching Task)
CREATE TABLE IF NOT EXISTS [coaching_task] (
  [coachingTaskId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_coaching_task_idx_0] ON [coaching_task] ([status]);

-- TABLE coaching_task_update (Coaching Task Update)
CREATE TABLE IF NOT EXISTS [coaching_task_update] (
  [coachingTaskUpdateId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_coaching_task_update_idx_0] ON [coaching_task_update] ([status]);

-- TABLE comment (Comment)
CREATE TABLE IF NOT EXISTS [comment] (
  [commentId] TEXT NOT NULL PRIMARY KEY,
  [threadId] TEXT NOT NULL,
  [authorAccountId] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_comment_idx_0] ON [comment] ([commentId], [threadId]);

-- TABLE comment_attachment (Comment Attachment)
CREATE TABLE IF NOT EXISTS [comment_attachment] (
  [commentAttachmentId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_comment_attachment_idx_0] ON [comment_attachment] ([status]);

-- TABLE comment_thread (Comment Thread)
CREATE TABLE IF NOT EXISTS [comment_thread] (
  [commentThreadId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_comment_thread_idx_0] ON [comment_thread] ([status]);

-- TABLE condition (Condition)
CREATE TABLE IF NOT EXISTS [condition] (
  [conditionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_condition_idx_0] ON [condition] ([status]);

-- TABLE condition_exercise_rule (Condition Exercise Rule)
CREATE TABLE IF NOT EXISTS [condition_exercise_rule] (
  [conditionExerciseRuleId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_condition_exercise_rule_idx_0] ON [condition_exercise_rule] ([status]);

-- TABLE consent_record (Consent Record)
CREATE TABLE IF NOT EXISTS [consent_record] (
  [consentId] TEXT NOT NULL PRIMARY KEY,
  [externalUserId] TEXT NOT NULL,
  [consentType] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_consent_record_idx_0] ON [consent_record] ([consentId], [externalUserId]);

-- TABLE contraindication (Contraindication)
CREATE TABLE IF NOT EXISTS [contraindication] (
  [contraindicationId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_contraindication_idx_0] ON [contraindication] ([status]);

-- TABLE deletion_request (Deletion Request)
CREATE TABLE IF NOT EXISTS [deletion_request] (
  [deletionRequestId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_deletion_request_idx_0] ON [deletion_request] ([status]);

-- TABLE deload_policy (Deload Policy)
CREATE TABLE IF NOT EXISTS [deload_policy] (
  [deloadPolicyId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_deload_policy_idx_0] ON [deload_policy] ([status]);

-- TABLE device (Device)
CREATE TABLE IF NOT EXISTS [device] (
  [deviceId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_device_idx_0] ON [device] ([status]);

-- TABLE device_authorization (Device Authorization)
CREATE TABLE IF NOT EXISTS [device_authorization] (
  [deviceAuthorizationId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_device_authorization_idx_0] ON [device_authorization] ([status]);

-- TABLE device_sync_cursor (Device Sync Cursor)
CREATE TABLE IF NOT EXISTS [device_sync_cursor] (
  [deviceSyncCursorId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_device_sync_cursor_idx_0] ON [device_sync_cursor] ([status]);

-- TABLE exercise (Exercise)
CREATE TABLE IF NOT EXISTS [exercise] (
  [exerciseId] TEXT NOT NULL PRIMARY KEY,
  [canonicalName] TEXT NOT NULL,
  [catalogStatus] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_exercise_idx_0] ON [exercise] ([exerciseId], [canonicalName]);

-- TABLE exercise_alias (Exercise Alias)
CREATE TABLE IF NOT EXISTS [exercise_alias] (
  [exerciseAliasId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_exercise_alias_idx_0] ON [exercise_alias] ([status]);

-- TABLE exercise_environment_map (Exercise Environment Map)
CREATE TABLE IF NOT EXISTS [exercise_environment_map] (
  [exerciseEnvironmentMapId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_exercise_environment_map_idx_0] ON [exercise_environment_map] ([status]);

-- TABLE exercise_equipment_map (Exercise Equipment Map)
CREATE TABLE IF NOT EXISTS [exercise_equipment_map] (
  [exerciseEquipmentMapId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_exercise_equipment_map_idx_0] ON [exercise_equipment_map] ([status]);

-- TABLE exercise_instruction (Exercise Instruction)
CREATE TABLE IF NOT EXISTS [exercise_instruction] (
  [exerciseInstructionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_exercise_instruction_idx_0] ON [exercise_instruction] ([status]);

-- TABLE exercise_instruction_step (Exercise Instruction Step)
CREATE TABLE IF NOT EXISTS [exercise_instruction_step] (
  [exerciseInstructionStepId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_exercise_instruction_step_idx_0] ON [exercise_instruction_step] ([status]);

-- TABLE exercise_movement_map (Exercise Movement Map)
CREATE TABLE IF NOT EXISTS [exercise_movement_map] (
  [exerciseMovementMapId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_exercise_movement_map_idx_0] ON [exercise_movement_map] ([status]);

-- TABLE exercise_muscle_map (Exercise Muscle Map)
CREATE TABLE IF NOT EXISTS [exercise_muscle_map] (
  [exerciseMuscleMapId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_exercise_muscle_map_idx_0] ON [exercise_muscle_map] ([status]);

-- TABLE exercise_relation (Exercise Relation)
CREATE TABLE IF NOT EXISTS [exercise_relation] (
  [exerciseRelationId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_exercise_relation_idx_0] ON [exercise_relation] ([status]);

-- TABLE exercise_revision (Exercise Revision)
CREATE TABLE IF NOT EXISTS [exercise_revision] (
  [exerciseRevisionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_exercise_revision_idx_0] ON [exercise_revision] ([status]);

-- TABLE exercise_safety_rule (Exercise Safety Rule)
CREATE TABLE IF NOT EXISTS [exercise_safety_rule] (
  [exerciseSafetyRuleId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_exercise_safety_rule_idx_0] ON [exercise_safety_rule] ([status]);

-- TABLE exercise_sport_map (Exercise Sport Map)
CREATE TABLE IF NOT EXISTS [exercise_sport_map] (
  [exerciseSportMapId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_exercise_sport_map_idx_0] ON [exercise_sport_map] ([status]);

-- TABLE exercise_taxonomy_map (Exercise Taxonomy Map)
CREATE TABLE IF NOT EXISTS [exercise_taxonomy_map] (
  [exerciseTaxonomyMapId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_exercise_taxonomy_map_idx_0] ON [exercise_taxonomy_map] ([status]);

-- TABLE export_item (Export Item)
CREATE TABLE IF NOT EXISTS [export_item] (
  [exportItemId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_export_item_idx_0] ON [export_item] ([status]);

-- TABLE export_run (Export Run)
CREATE TABLE IF NOT EXISTS [export_run] (
  [exportRunId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_export_run_idx_0] ON [export_run] ([status]);

-- TABLE fitness_baseline (Fitness Baseline)
CREATE TABLE IF NOT EXISTS [fitness_baseline] (
  [fitnessBaselineId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_fitness_baseline_idx_0] ON [fitness_baseline] ([status]);

-- TABLE health_observation (Health Observation)
CREATE TABLE IF NOT EXISTS [health_observation] (
  [healthObservationId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_health_observation_idx_0] ON [health_observation] ([status]);

-- TABLE health_observation_source (Health Observation Source)
CREATE TABLE IF NOT EXISTS [health_observation_source] (
  [healthObservationSourceId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_health_observation_source_idx_0] ON [health_observation_source] ([status]);

-- TABLE import_error (Import Error)
CREATE TABLE IF NOT EXISTS [import_error] (
  [importErrorId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_import_error_idx_0] ON [import_error] ([status]);

-- TABLE import_item (Import Item)
CREATE TABLE IF NOT EXISTS [import_item] (
  [importItemId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_import_item_idx_0] ON [import_item] ([status]);

-- TABLE import_run (Import Run)
CREATE TABLE IF NOT EXISTS [import_run] (
  [importRunId] TEXT NOT NULL PRIMARY KEY,
  [releaseId] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_import_run_idx_0] ON [import_run] ([importRunId], [releaseId]);

-- TABLE joint (Joint)
CREATE TABLE IF NOT EXISTS [joint] (
  [jointId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_joint_idx_0] ON [joint] ([status]);

-- TABLE load_model (Load Model)
CREATE TABLE IF NOT EXISTS [load_model] (
  [loadModelId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_load_model_idx_0] ON [load_model] ([status]);

-- TABLE media_access_policy (Media Access Policy)
CREATE TABLE IF NOT EXISTS [media_access_policy] (
  [mediaAccessPolicyId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_media_access_policy_idx_0] ON [media_access_policy] ([status]);

-- TABLE media_asset (Media Asset)
CREATE TABLE IF NOT EXISTS [media_asset] (
  [mediaAssetId] TEXT NOT NULL PRIMARY KEY,
  [mediaType] TEXT NOT NULL,
  [rightsStatus] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_media_asset_idx_0] ON [media_asset] ([mediaAssetId], [mediaType]);

-- TABLE media_asset_revision (Media Asset Revision)
CREATE TABLE IF NOT EXISTS [media_asset_revision] (
  [mediaAssetRevisionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_media_asset_revision_idx_0] ON [media_asset_revision] ([status]);

-- TABLE media_attribution (Media Attribution)
CREATE TABLE IF NOT EXISTS [media_attribution] (
  [mediaAttributionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_media_attribution_idx_0] ON [media_attribution] ([status]);

-- TABLE media_deletion_request (Media Deletion Request)
CREATE TABLE IF NOT EXISTS [media_deletion_request] (
  [mediaDeletionRequestId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_media_deletion_request_idx_0] ON [media_deletion_request] ([status]);

-- TABLE media_delivery_audit (Media Delivery Audit)
CREATE TABLE IF NOT EXISTS [media_delivery_audit] (
  [mediaDeliveryAuditId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_media_delivery_audit_idx_0] ON [media_delivery_audit] ([status]);

-- TABLE media_ingestion_job (Media Ingestion Job)
CREATE TABLE IF NOT EXISTS [media_ingestion_job] (
  [mediaIngestionJobId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_media_ingestion_job_idx_0] ON [media_ingestion_job] ([status]);

-- TABLE media_license (Media License)
CREATE TABLE IF NOT EXISTS [media_license] (
  [mediaLicenseId] TEXT NOT NULL PRIMARY KEY,
  [licenseCode] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_media_license_idx_0] ON [media_license] ([mediaLicenseId], [licenseCode]);

-- TABLE media_quality_review (Media Quality Review)
CREATE TABLE IF NOT EXISTS [media_quality_review] (
  [mediaQualityReviewId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_media_quality_review_idx_0] ON [media_quality_review] ([status]);

-- TABLE media_rights_evidence (Media Rights Evidence)
CREATE TABLE IF NOT EXISTS [media_rights_evidence] (
  [mediaRightsEvidenceId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_media_rights_evidence_idx_0] ON [media_rights_evidence] ([status]);

-- TABLE media_source_link (Media Source Link)
CREATE TABLE IF NOT EXISTS [media_source_link] (
  [mediaSourceLinkId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_media_source_link_idx_0] ON [media_source_link] ([status]);

-- TABLE media_transcode_job (Media Transcode Job)
CREATE TABLE IF NOT EXISTS [media_transcode_job] (
  [mediaTranscodeJobId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_media_transcode_job_idx_0] ON [media_transcode_job] ([status]);

-- TABLE media_variant (Media Variant)
CREATE TABLE IF NOT EXISTS [media_variant] (
  [mediaVariantId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_media_variant_idx_0] ON [media_variant] ([status]);

-- TABLE message (Message)
CREATE TABLE IF NOT EXISTS [message] (
  [messageId] TEXT NOT NULL PRIMARY KEY,
  [threadId] TEXT NOT NULL,
  [authorAccountId] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_message_idx_0] ON [message] ([messageId], [threadId]);

-- TABLE message_attachment (Message Attachment)
CREATE TABLE IF NOT EXISTS [message_attachment] (
  [messageAttachmentId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_message_attachment_idx_0] ON [message_attachment] ([status]);

-- TABLE message_thread (Message Thread)
CREATE TABLE IF NOT EXISTS [message_thread] (
  [messageThreadId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_message_thread_idx_0] ON [message_thread] ([status]);

-- TABLE movement_constraint (Movement Constraint)
CREATE TABLE IF NOT EXISTS [movement_constraint] (
  [movementConstraintId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_movement_constraint_idx_0] ON [movement_constraint] ([status]);

-- TABLE movement_pattern (Movement Pattern)
CREATE TABLE IF NOT EXISTS [movement_pattern] (
  [movementPatternId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_movement_pattern_idx_0] ON [movement_pattern] ([status]);

-- TABLE movement_plane (Movement Plane)
CREATE TABLE IF NOT EXISTS [movement_plane] (
  [movementPlaneId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_movement_plane_idx_0] ON [movement_plane] ([status]);

-- TABLE muscle (Muscle)
CREATE TABLE IF NOT EXISTS [muscle] (
  [muscleId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_muscle_idx_0] ON [muscle] ([status]);

-- TABLE muscle_group (Muscle Group)
CREATE TABLE IF NOT EXISTS [muscle_group] (
  [muscleGroupId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_muscle_group_idx_0] ON [muscle_group] ([status]);

-- TABLE notification (Notification)
CREATE TABLE IF NOT EXISTS [notification] (
  [notificationId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_notification_idx_0] ON [notification] ([status]);

-- TABLE notification_delivery (Notification Delivery)
CREATE TABLE IF NOT EXISTS [notification_delivery] (
  [notificationDeliveryId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_notification_delivery_idx_0] ON [notification_delivery] ([status]);

-- TABLE performed_exercise (Performed Exercise)
CREATE TABLE IF NOT EXISTS [performed_exercise] (
  [performedExerciseId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_performed_exercise_idx_0] ON [performed_exercise] ([status]);

-- TABLE performed_set (Performed Set)
CREATE TABLE IF NOT EXISTS [performed_set] (
  [performedSetId] TEXT NOT NULL PRIMARY KEY,
  [performedExerciseId] TEXT NOT NULL,
  [sequence] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_performed_set_idx_0] ON [performed_set] ([performedSetId], [performedExerciseId]);

-- TABLE personal_record (Personal Record)
CREATE TABLE IF NOT EXISTS [personal_record] (
  [personalRecordId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_personal_record_idx_0] ON [personal_record] ([status]);

-- TABLE plan_revision (Plan Revision)
CREATE TABLE IF NOT EXISTS [plan_revision] (
  [planRevisionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_plan_revision_idx_0] ON [plan_revision] ([status]);

-- TABLE planned_session (Planned Session)
CREATE TABLE IF NOT EXISTS [planned_session] (
  [plannedSessionId] TEXT NOT NULL PRIMARY KEY,
  [planId] TEXT NOT NULL,
  [localDate] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_planned_session_idx_0] ON [planned_session] ([plannedSessionId], [planId]);

-- TABLE planned_session_item (Planned Session Item)
CREATE TABLE IF NOT EXISTS [planned_session_item] (
  [plannedSessionItemId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_planned_session_item_idx_0] ON [planned_session_item] ([status]);

-- TABLE program_phase (Program Phase)
CREATE TABLE IF NOT EXISTS [program_phase] (
  [programPhaseId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_program_phase_idx_0] ON [program_phase] ([status]);

-- TABLE program_template (Program Template)
CREATE TABLE IF NOT EXISTS [program_template] (
  [programTemplateId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_program_template_idx_0] ON [program_template] ([status]);

-- TABLE progress_review (Progress Review)
CREATE TABLE IF NOT EXISTS [progress_review] (
  [progressReviewId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_progress_review_idx_0] ON [progress_review] ([status]);

-- TABLE progression_policy (Progression Policy)
CREATE TABLE IF NOT EXISTS [progression_policy] (
  [progressionPolicyId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_progression_policy_idx_0] ON [progression_policy] ([status]);

-- TABLE progression_rule (Progression Rule)
CREATE TABLE IF NOT EXISTS [progression_rule] (
  [progressionRuleId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_progression_rule_idx_0] ON [progression_rule] ([status]);

-- TABLE readiness_checkin (Readiness Checkin)
CREATE TABLE IF NOT EXISTS [readiness_checkin] (
  [checkinId] TEXT NOT NULL PRIMARY KEY,
  [externalUserId] TEXT NOT NULL,
  [occurredAt] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_readiness_checkin_idx_0] ON [readiness_checkin] ([checkinId], [externalUserId]);

-- TABLE regression_rule (Regression Rule)
CREATE TABLE IF NOT EXISTS [regression_rule] (
  [regressionRuleId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_regression_rule_idx_0] ON [regression_rule] ([status]);

-- TABLE rest_interval (Rest Interval)
CREATE TABLE IF NOT EXISTS [rest_interval] (
  [restIntervalId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_rest_interval_idx_0] ON [rest_interval] ([status]);

-- TABLE retention_policy (Retention Policy)
CREATE TABLE IF NOT EXISTS [retention_policy] (
  [retentionPolicyId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_retention_policy_idx_0] ON [retention_policy] ([status]);

-- TABLE review_decision (Review Decision)
CREATE TABLE IF NOT EXISTS [review_decision] (
  [reviewDecisionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_review_decision_idx_0] ON [review_decision] ([status]);

-- TABLE review_queue (Review Queue)
CREATE TABLE IF NOT EXISTS [review_queue] (
  [reviewQueueId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_review_queue_idx_0] ON [review_queue] ([status]);

-- TABLE safety_screen_definition (Safety Screen Definition)
CREATE TABLE IF NOT EXISTS [safety_screen_definition] (
  [safetyScreenDefinitionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_safety_screen_definition_idx_0] ON [safety_screen_definition] ([status]);

-- TABLE safety_screen_rule (Safety Screen Rule)
CREATE TABLE IF NOT EXISTS [safety_screen_rule] (
  [safetyScreenRuleId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_safety_screen_rule_idx_0] ON [safety_screen_rule] ([status]);

-- TABLE session_metric (Session Metric)
CREATE TABLE IF NOT EXISTS [session_metric] (
  [sessionMetricId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_session_metric_idx_0] ON [session_metric] ([status]);

-- TABLE session_requirement (Session Requirement)
CREATE TABLE IF NOT EXISTS [session_requirement] (
  [sessionRequirementId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_session_requirement_idx_0] ON [session_requirement] ([status]);

-- TABLE set_metric (Set Metric)
CREATE TABLE IF NOT EXISTS [set_metric] (
  [setMetricId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_set_metric_idx_0] ON [set_metric] ([status]);

-- TABLE source_dataset (Source Dataset)
CREATE TABLE IF NOT EXISTS [source_dataset] (
  [datasetId] TEXT NOT NULL PRIMARY KEY,
  [providerId] TEXT NOT NULL,
  [version] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_source_dataset_idx_0] ON [source_dataset] ([datasetId], [providerId]);

-- TABLE source_license (Source License)
CREATE TABLE IF NOT EXISTS [source_license] (
  [sourceLicenseId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_source_license_idx_0] ON [source_license] ([status]);

-- TABLE source_license_evidence (Source License Evidence)
CREATE TABLE IF NOT EXISTS [source_license_evidence] (
  [sourceLicenseEvidenceId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_source_license_evidence_idx_0] ON [source_license_evidence] ([status]);

-- TABLE source_provider (Source Provider)
CREATE TABLE IF NOT EXISTS [source_provider] (
  [providerId] TEXT NOT NULL PRIMARY KEY,
  [name] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_source_provider_idx_0] ON [source_provider] ([providerId], [name]);

-- TABLE source_record (Source Record)
CREATE TABLE IF NOT EXISTS [source_record] (
  [sourceRecordId] TEXT NOT NULL PRIMARY KEY,
  [datasetId] TEXT NOT NULL,
  [rawHash] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_source_record_idx_0] ON [source_record] ([sourceRecordId], [datasetId]);

-- TABLE source_record_version (Source Record Version)
CREATE TABLE IF NOT EXISTS [source_record_version] (
  [sourceRecordVersionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_source_record_version_idx_0] ON [source_record_version] ([status]);

-- TABLE sport (Sport)
CREATE TABLE IF NOT EXISTS [sport] (
  [sportId] TEXT NOT NULL PRIMARY KEY,
  [code] TEXT NOT NULL,
  [name] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_idx_0] ON [sport] ([sportId], [code]);

-- TABLE sport_activity (Sport Activity)
CREATE TABLE IF NOT EXISTS [sport_activity] (
  [sportActivityId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_activity_idx_0] ON [sport_activity] ([status]);

-- TABLE sport_discipline (Sport Discipline)
CREATE TABLE IF NOT EXISTS [sport_discipline] (
  [disciplineId] TEXT NOT NULL PRIMARY KEY,
  [sportId] TEXT NOT NULL,
  [code] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_discipline_idx_0] ON [sport_discipline] ([disciplineId], [sportId]);

-- TABLE sport_drill (Sport Drill)
CREATE TABLE IF NOT EXISTS [sport_drill] (
  [sportDrillId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_drill_idx_0] ON [sport_drill] ([status]);

-- TABLE sport_drill_revision (Sport Drill Revision)
CREATE TABLE IF NOT EXISTS [sport_drill_revision] (
  [sportDrillRevisionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_drill_revision_idx_0] ON [sport_drill_revision] ([status]);

-- TABLE sport_drill_step (Sport Drill Step)
CREATE TABLE IF NOT EXISTS [sport_drill_step] (
  [sportDrillStepId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_drill_step_idx_0] ON [sport_drill_step] ([status]);

-- TABLE sport_environment_rule (Sport Environment Rule)
CREATE TABLE IF NOT EXISTS [sport_environment_rule] (
  [sportEnvironmentRuleId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_environment_rule_idx_0] ON [sport_environment_rule] ([status]);

-- TABLE sport_equipment_rule (Sport Equipment Rule)
CREATE TABLE IF NOT EXISTS [sport_equipment_rule] (
  [sportEquipmentRuleId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_equipment_rule_idx_0] ON [sport_equipment_rule] ([status]);

-- TABLE sport_event (Sport Event)
CREATE TABLE IF NOT EXISTS [sport_event] (
  [sportEventId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_event_idx_0] ON [sport_event] ([status]);

-- TABLE sport_lap_split (Sport Lap Split)
CREATE TABLE IF NOT EXISTS [sport_lap_split] (
  [sportLapSplitId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_lap_split_idx_0] ON [sport_lap_split] ([status]);

-- TABLE sport_metric_definition (Sport Metric Definition)
CREATE TABLE IF NOT EXISTS [sport_metric_definition] (
  [sportMetricDefinitionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_metric_definition_idx_0] ON [sport_metric_definition] ([status]);

-- TABLE sport_metric_unit (Sport Metric Unit)
CREATE TABLE IF NOT EXISTS [sport_metric_unit] (
  [sportMetricUnitId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_metric_unit_idx_0] ON [sport_metric_unit] ([status]);

-- TABLE sport_position (Sport Position)
CREATE TABLE IF NOT EXISTS [sport_position] (
  [sportPositionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_position_idx_0] ON [sport_position] ([status]);

-- TABLE sport_season_rule (Sport Season Rule)
CREATE TABLE IF NOT EXISTS [sport_season_rule] (
  [sportSeasonRuleId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_season_rule_idx_0] ON [sport_season_rule] ([status]);

-- TABLE sport_skill (Sport Skill)
CREATE TABLE IF NOT EXISTS [sport_skill] (
  [sportSkillId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_skill_idx_0] ON [sport_skill] ([status]);

-- TABLE sport_taxonomy_map (Sport Taxonomy Map)
CREATE TABLE IF NOT EXISTS [sport_taxonomy_map] (
  [sportTaxonomyMapId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_taxonomy_map_idx_0] ON [sport_taxonomy_map] ([status]);

-- TABLE sport_test_protocol (Sport Test Protocol)
CREATE TABLE IF NOT EXISTS [sport_test_protocol] (
  [sportTestProtocolId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_test_protocol_idx_0] ON [sport_test_protocol] ([status]);

-- TABLE sport_test_step (Sport Test Step)
CREATE TABLE IF NOT EXISTS [sport_test_step] (
  [sportTestStepId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_sport_test_step_idx_0] ON [sport_test_step] ([status]);

-- TABLE substitution_group (Substitution Group)
CREATE TABLE IF NOT EXISTS [substitution_group] (
  [substitutionGroupId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_substitution_group_idx_0] ON [substitution_group] ([status]);

-- TABLE substitution_rule (Substitution Rule)
CREATE TABLE IF NOT EXISTS [substitution_rule] (
  [substitutionRuleId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_substitution_rule_idx_0] ON [substitution_rule] ([status]);

-- TABLE template_block (Template Block)
CREATE TABLE IF NOT EXISTS [template_block] (
  [templateBlockId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_template_block_idx_0] ON [template_block] ([status]);

-- TABLE template_revision (Template Revision)
CREATE TABLE IF NOT EXISTS [template_revision] (
  [templateRevisionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_template_revision_idx_0] ON [template_revision] ([status]);

-- TABLE template_session (Template Session)
CREATE TABLE IF NOT EXISTS [template_session] (
  [templateSessionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_template_session_idx_0] ON [template_session] ([status]);

-- TABLE template_session_item (Template Session Item)
CREATE TABLE IF NOT EXISTS [template_session_item] (
  [templateSessionItemId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_template_session_item_idx_0] ON [template_session_item] ([status]);

-- TABLE training_account (Training Account)
CREATE TABLE IF NOT EXISTS [training_account] (
  [trainingAccountId] TEXT NOT NULL PRIMARY KEY,
  [externalUserId] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_training_account_idx_0] ON [training_account] ([trainingAccountId], [externalUserId]);

-- TABLE training_goal (Training Goal)
CREATE TABLE IF NOT EXISTS [training_goal] (
  [trainingGoalId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_training_goal_idx_0] ON [training_goal] ([status]);

-- TABLE workout_event (Workout Event)
CREATE TABLE IF NOT EXISTS [workout_event] (
  [workoutEventId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_workout_event_idx_0] ON [workout_event] ([status]);

-- TABLE workout_plan (Workout Plan)
CREATE TABLE IF NOT EXISTS [workout_plan] (
  [planId] TEXT NOT NULL PRIMARY KEY,
  [externalUserId] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_workout_plan_idx_0] ON [workout_plan] ([planId], [externalUserId]);

-- TABLE workout_session (Workout Session)
CREATE TABLE IF NOT EXISTS [workout_session] (
  [sessionId] TEXT NOT NULL PRIMARY KEY,
  [externalUserId] TEXT NOT NULL,
  [state] TEXT NOT NULL,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_workout_session_idx_0] ON [workout_session] ([sessionId], [externalUserId]);

-- TABLE workout_session_revision (Workout Session Revision)
CREATE TABLE IF NOT EXISTS [workout_session_revision] (
  [workoutSessionRevisionId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_workout_session_revision_idx_0] ON [workout_session_revision] ([status]);

-- TABLE workout_summary (Workout Summary)
CREATE TABLE IF NOT EXISTS [workout_summary] (
  [workoutSummaryId] TEXT NOT NULL PRIMARY KEY,
  [status] TEXT NOT NULL,
  [payloadJson] TEXT NULL
);

CREATE INDEX IF NOT EXISTS [ix_workout_summary_idx_0] ON [workout_summary] ([status]);
