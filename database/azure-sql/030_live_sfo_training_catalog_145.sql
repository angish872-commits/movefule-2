-- Live Appwrite schema dump (exact types, no inference)
-- Project: sfo / New project (6a7f08d9001d096779c8)
-- Database: 6aa928e50009011a30af (Training catalog)
-- Tables: 145
-- Dialect: Azure SQL / SQL Server
-- Generated: 2026-09-22 from live Appwrite TablesDB API
-- Mapping: string(n)->NVARCHAR(n)/MAX, text/longtext->NVARCHAR(MAX), integer->BIGINT, double->FLOAT, boolean->BIT, datetime->DATETIME2(3)
-- Note: Appwrite system fields ($id,$createdAt,$updatedAt,$permissions) are implicit; first required *Id column used as PK to match repo convention.

-- Totals: 145 tables, 465 columns, 141 indexes

-- ============================================================
-- TABLE 6aa928fd003334f93b33 (Catalog releases)
-- Appwrite name: Catalog releases | enabled=True rowSecurity=False bytesUsed=1067.0
-- ============================================================

IF OBJECT_ID(N'dbo.6aa928fd003334f93b33',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[6aa928fd003334f93b33] (
    [_placeholder] BIT NULL -- Appwrite table currently has zero custom columns
  );
END;
GO

-- ============================================================
-- TABLE 6aa92911000a7fc92bc4 (Exercises)
-- Appwrite name: Exercises | enabled=True rowSecurity=False bytesUsed=1107.0
-- ============================================================

IF OBJECT_ID(N'dbo.6aa92911000a7fc92bc4',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[6aa92911000a7fc92bc4] (
    [source_id] NVARCHAR(MAX) NOT NULL CONSTRAINT [PK_6aa92911000a7fc92bc4] PRIMARY KEY,
    [name] NVARCHAR(MAX) NOT NULL
  );
END;
GO

-- ============================================================
-- TABLE 6aa9291c0021f71b7947 (Exercise media)
-- Appwrite name: Exercise media | enabled=True rowSecurity=False bytesUsed=1067.0
-- ============================================================

IF OBJECT_ID(N'dbo.6aa9291c0021f71b7947',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[6aa9291c0021f71b7947] (
    [_placeholder] BIT NULL -- Appwrite table currently has zero custom columns
  );
END;
GO

-- ============================================================
-- TABLE 6aa92925001c7aa77eea (Import runs)
-- Appwrite name: Import runs | enabled=True rowSecurity=False bytesUsed=1067.0
-- ============================================================

IF OBJECT_ID(N'dbo.6aa92925001c7aa77eea',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[6aa92925001c7aa77eea] (
    [_placeholder] BIT NULL -- Appwrite table currently has zero custom columns
  );
END;
GO

-- ============================================================
-- TABLE access_grant (Access Grant)
-- Appwrite name: Access Grant | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.access_grant',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[access_grant] (
    [accessGrantId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_access_grant] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_access_grant_idx_0' AND object_id=OBJECT_ID(N'dbo.access_grant')) CREATE INDEX [IX_access_grant_idx_0] ON dbo.[access_grant] ([status]);
GO

-- ============================================================
-- TABLE algorithm_decision (Algorithm Decision)
-- Appwrite name: Algorithm Decision | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.algorithm_decision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[algorithm_decision] (
    [algorithmDecisionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_algorithm_decision] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_algorithm_decision_idx_0' AND object_id=OBJECT_ID(N'dbo.algorithm_decision')) CREATE INDEX [IX_algorithm_decision_idx_0] ON dbo.[algorithm_decision] ([status]);
GO

-- ============================================================
-- TABLE algorithm_release (Algorithm Release)
-- Appwrite name: Algorithm Release | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.algorithm_release',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[algorithm_release] (
    [algorithmReleaseId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_algorithm_release] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_algorithm_release_idx_0' AND object_id=OBJECT_ID(N'dbo.algorithm_release')) CREATE INDEX [IX_algorithm_release_idx_0] ON dbo.[algorithm_release] ([status]);
GO

-- ============================================================
-- TABLE algorithm_rule_set (Algorithm Rule Set)
-- Appwrite name: Algorithm Rule Set | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.algorithm_rule_set',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[algorithm_rule_set] (
    [algorithmRuleSetId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_algorithm_rule_set] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_algorithm_rule_set_idx_0' AND object_id=OBJECT_ID(N'dbo.algorithm_rule_set')) CREATE INDEX [IX_algorithm_rule_set_idx_0] ON dbo.[algorithm_rule_set] ([status]);
GO

-- ============================================================
-- TABLE algorithm_run (Algorithm Run)
-- Appwrite name: Algorithm Run | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.algorithm_run',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[algorithm_run] (
    [algorithmRunId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_algorithm_run] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_algorithm_run_idx_0' AND object_id=OBJECT_ID(N'dbo.algorithm_run')) CREATE INDEX [IX_algorithm_run_idx_0] ON dbo.[algorithm_run] ([status]);
GO

-- ============================================================
-- TABLE anatomy_region (Anatomy Region)
-- Appwrite name: Anatomy Region | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.anatomy_region',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[anatomy_region] (
    [anatomyRegionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_anatomy_region] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_anatomy_region_idx_0' AND object_id=OBJECT_ID(N'dbo.anatomy_region')) CREATE INDEX [IX_anatomy_region_idx_0] ON dbo.[anatomy_region] ([status]);
GO

-- ============================================================
-- TABLE athlete_availability (Athlete Availability)
-- Appwrite name: Athlete Availability | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.athlete_availability',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[athlete_availability] (
    [athleteAvailabilityId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_athlete_availability] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_athlete_availability_idx_0' AND object_id=OBJECT_ID(N'dbo.athlete_availability')) CREATE INDEX [IX_athlete_availability_idx_0] ON dbo.[athlete_availability] ([status]);
GO

-- ============================================================
-- TABLE athlete_equipment (Athlete Equipment)
-- Appwrite name: Athlete Equipment | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.athlete_equipment',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[athlete_equipment] (
    [athleteEquipmentId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_athlete_equipment] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_athlete_equipment_idx_0' AND object_id=OBJECT_ID(N'dbo.athlete_equipment')) CREATE INDEX [IX_athlete_equipment_idx_0] ON dbo.[athlete_equipment] ([status]);
GO

-- ============================================================
-- TABLE athlete_goal (Athlete Goal)
-- Appwrite name: Athlete Goal | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.athlete_goal',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[athlete_goal] (
    [athleteGoalId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_athlete_goal] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_athlete_goal_idx_0' AND object_id=OBJECT_ID(N'dbo.athlete_goal')) CREATE INDEX [IX_athlete_goal_idx_0] ON dbo.[athlete_goal] ([status]);
GO

-- ============================================================
-- TABLE athlete_limitation (Athlete Limitation)
-- Appwrite name: Athlete Limitation | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.athlete_limitation',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[athlete_limitation] (
    [athleteLimitationId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_athlete_limitation] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_athlete_limitation_idx_0' AND object_id=OBJECT_ID(N'dbo.athlete_limitation')) CREATE INDEX [IX_athlete_limitation_idx_0] ON dbo.[athlete_limitation] ([status]);
GO

-- ============================================================
-- TABLE athlete_profile (Athlete Profile)
-- Appwrite name: Athlete Profile | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.athlete_profile',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[athlete_profile] (
    [athleteProfileId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_athlete_profile] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_athlete_profile_idx_0' AND object_id=OBJECT_ID(N'dbo.athlete_profile')) CREATE INDEX [IX_athlete_profile_idx_0] ON dbo.[athlete_profile] ([status]);
GO

-- ============================================================
-- TABLE athlete_sport_profile (Athlete Sport Profile)
-- Appwrite name: Athlete Sport Profile | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.athlete_sport_profile',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[athlete_sport_profile] (
    [athleteSportProfileId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_athlete_sport_profile] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_athlete_sport_profile_idx_0' AND object_id=OBJECT_ID(N'dbo.athlete_sport_profile')) CREATE INDEX [IX_athlete_sport_profile_idx_0] ON dbo.[athlete_sport_profile] ([status]);
GO

-- ============================================================
-- TABLE audit_event (Audit Event)
-- Appwrite name: Audit Event | enabled=True rowSecurity=True bytesUsed=5171.0
-- ============================================================

IF OBJECT_ID(N'dbo.audit_event',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[audit_event] (
    [auditEventId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_audit_event] PRIMARY KEY,
    [eventType] NVARCHAR(255) NOT NULL,
    [occurredAt] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_audit_event_idx_0' AND object_id=OBJECT_ID(N'dbo.audit_event')) CREATE INDEX [IX_audit_event_idx_0] ON dbo.[audit_event] ([auditEventId], [eventType]);
GO

-- ============================================================
-- TABLE body_measurement (Body Measurement)
-- Appwrite name: Body Measurement | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.body_measurement',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[body_measurement] (
    [bodyMeasurementId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_body_measurement] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_body_measurement_idx_0' AND object_id=OBJECT_ID(N'dbo.body_measurement')) CREATE INDEX [IX_body_measurement_idx_0] ON dbo.[body_measurement] ([status]);
GO

-- ============================================================
-- TABLE catalog_release (Catalog Release)
-- Appwrite name: Catalog Release | enabled=True rowSecurity=True bytesUsed=5171.0
-- ============================================================

IF OBJECT_ID(N'dbo.catalog_release',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[catalog_release] (
    [releaseId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_catalog_release] PRIMARY KEY,
    [releaseHash] NVARCHAR(255) NOT NULL,
    [state] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_catalog_release_idx_0' AND object_id=OBJECT_ID(N'dbo.catalog_release')) CREATE INDEX [IX_catalog_release_idx_0] ON dbo.[catalog_release] ([releaseId], [releaseHash]);
GO

-- ============================================================
-- TABLE catalog_review_state (Catalog Review State)
-- Appwrite name: Catalog Review State | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.catalog_review_state',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[catalog_review_state] (
    [catalogReviewStateId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_catalog_review_state] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_catalog_review_state_idx_0' AND object_id=OBJECT_ID(N'dbo.catalog_review_state')) CREATE INDEX [IX_catalog_review_state_idx_0] ON dbo.[catalog_review_state] ([status]);
GO

-- ============================================================
-- TABLE checkin_request (Checkin Request)
-- Appwrite name: Checkin Request | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.checkin_request',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[checkin_request] (
    [checkinRequestId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_checkin_request] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_checkin_request_idx_0' AND object_id=OBJECT_ID(N'dbo.checkin_request')) CREATE INDEX [IX_checkin_request_idx_0] ON dbo.[checkin_request] ([status]);
GO

-- ============================================================
-- TABLE coach_client_relationship (Coach Client Relationship)
-- Appwrite name: Coach Client Relationship | enabled=True rowSecurity=True bytesUsed=5171.0
-- ============================================================

IF OBJECT_ID(N'dbo.coach_client_relationship',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[coach_client_relationship] (
    [relationshipId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_coach_client_relationship] PRIMARY KEY,
    [coachAccountId] NVARCHAR(255) NOT NULL,
    [athleteAccountId] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_coach_client_relationship_idx_0' AND object_id=OBJECT_ID(N'dbo.coach_client_relationship')) CREATE INDEX [IX_coach_client_relationship_idx_0] ON dbo.[coach_client_relationship] ([relationshipId], [coachAccountId]);
GO

-- ============================================================
-- TABLE coach_note (Coach Note)
-- Appwrite name: Coach Note | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.coach_note',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[coach_note] (
    [coachNoteId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_coach_note] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_coach_note_idx_0' AND object_id=OBJECT_ID(N'dbo.coach_note')) CREATE INDEX [IX_coach_note_idx_0] ON dbo.[coach_note] ([status]);
GO

-- ============================================================
-- TABLE coach_note_revision (Coach Note Revision)
-- Appwrite name: Coach Note Revision | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.coach_note_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[coach_note_revision] (
    [coachNoteRevisionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_coach_note_revision] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_coach_note_revision_idx_0' AND object_id=OBJECT_ID(N'dbo.coach_note_revision')) CREATE INDEX [IX_coach_note_revision_idx_0] ON dbo.[coach_note_revision] ([status]);
GO

-- ============================================================
-- TABLE coach_profile (Coach Profile)
-- Appwrite name: Coach Profile | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.coach_profile',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[coach_profile] (
    [coachProfileId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_coach_profile] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_coach_profile_idx_0' AND object_id=OBJECT_ID(N'dbo.coach_profile')) CREATE INDEX [IX_coach_profile_idx_0] ON dbo.[coach_profile] ([status]);
GO

-- ============================================================
-- TABLE coaching_invitation (Coaching Invitation)
-- Appwrite name: Coaching Invitation | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.coaching_invitation',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[coaching_invitation] (
    [coachingInvitationId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_coaching_invitation] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_coaching_invitation_idx_0' AND object_id=OBJECT_ID(N'dbo.coaching_invitation')) CREATE INDEX [IX_coaching_invitation_idx_0] ON dbo.[coaching_invitation] ([status]);
GO

-- ============================================================
-- TABLE coaching_task (Coaching Task)
-- Appwrite name: Coaching Task | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.coaching_task',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[coaching_task] (
    [coachingTaskId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_coaching_task] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_coaching_task_idx_0' AND object_id=OBJECT_ID(N'dbo.coaching_task')) CREATE INDEX [IX_coaching_task_idx_0] ON dbo.[coaching_task] ([status]);
GO

-- ============================================================
-- TABLE coaching_task_update (Coaching Task Update)
-- Appwrite name: Coaching Task Update | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.coaching_task_update',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[coaching_task_update] (
    [coachingTaskUpdateId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_coaching_task_update] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_coaching_task_update_idx_0' AND object_id=OBJECT_ID(N'dbo.coaching_task_update')) CREATE INDEX [IX_coaching_task_update_idx_0] ON dbo.[coaching_task_update] ([status]);
GO

-- ============================================================
-- TABLE comment (Comment)
-- Appwrite name: Comment | enabled=True rowSecurity=True bytesUsed=5171.0
-- ============================================================

IF OBJECT_ID(N'dbo.comment',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[comment] (
    [commentId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_comment] PRIMARY KEY,
    [threadId] NVARCHAR(255) NOT NULL,
    [authorAccountId] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_comment_idx_0' AND object_id=OBJECT_ID(N'dbo.comment')) CREATE INDEX [IX_comment_idx_0] ON dbo.[comment] ([commentId], [threadId]);
GO

-- ============================================================
-- TABLE comment_attachment (Comment Attachment)
-- Appwrite name: Comment Attachment | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.comment_attachment',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[comment_attachment] (
    [commentAttachmentId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_comment_attachment] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_comment_attachment_idx_0' AND object_id=OBJECT_ID(N'dbo.comment_attachment')) CREATE INDEX [IX_comment_attachment_idx_0] ON dbo.[comment_attachment] ([status]);
GO

-- ============================================================
-- TABLE comment_thread (Comment Thread)
-- Appwrite name: Comment Thread | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.comment_thread',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[comment_thread] (
    [commentThreadId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_comment_thread] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_comment_thread_idx_0' AND object_id=OBJECT_ID(N'dbo.comment_thread')) CREATE INDEX [IX_comment_thread_idx_0] ON dbo.[comment_thread] ([status]);
GO

-- ============================================================
-- TABLE condition (Condition)
-- Appwrite name: Condition | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.condition',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[condition] (
    [conditionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_condition] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_condition_idx_0' AND object_id=OBJECT_ID(N'dbo.condition')) CREATE INDEX [IX_condition_idx_0] ON dbo.[condition] ([status]);
GO

-- ============================================================
-- TABLE condition_exercise_rule (Condition Exercise Rule)
-- Appwrite name: Condition Exercise Rule | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.condition_exercise_rule',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[condition_exercise_rule] (
    [conditionExerciseRuleId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_condition_exercise_rule] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_condition_exercise_rule_idx_0' AND object_id=OBJECT_ID(N'dbo.condition_exercise_rule')) CREATE INDEX [IX_condition_exercise_rule_idx_0] ON dbo.[condition_exercise_rule] ([status]);
GO

-- ============================================================
-- TABLE consent_record (Consent Record)
-- Appwrite name: Consent Record | enabled=True rowSecurity=True bytesUsed=6192.0
-- ============================================================

IF OBJECT_ID(N'dbo.consent_record',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[consent_record] (
    [consentId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_consent_record] PRIMARY KEY,
    [externalUserId] NVARCHAR(255) NOT NULL,
    [consentType] NVARCHAR(255) NOT NULL,
    [state] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_consent_record_idx_0' AND object_id=OBJECT_ID(N'dbo.consent_record')) CREATE INDEX [IX_consent_record_idx_0] ON dbo.[consent_record] ([consentId], [externalUserId]);
GO

-- ============================================================
-- TABLE contraindication (Contraindication)
-- Appwrite name: Contraindication | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.contraindication',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[contraindication] (
    [contraindicationId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_contraindication] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_contraindication_idx_0' AND object_id=OBJECT_ID(N'dbo.contraindication')) CREATE INDEX [IX_contraindication_idx_0] ON dbo.[contraindication] ([status]);
GO

-- ============================================================
-- TABLE deletion_request (Deletion Request)
-- Appwrite name: Deletion Request | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.deletion_request',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[deletion_request] (
    [deletionRequestId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_deletion_request] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_deletion_request_idx_0' AND object_id=OBJECT_ID(N'dbo.deletion_request')) CREATE INDEX [IX_deletion_request_idx_0] ON dbo.[deletion_request] ([status]);
GO

-- ============================================================
-- TABLE deload_policy (Deload Policy)
-- Appwrite name: Deload Policy | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.deload_policy',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[deload_policy] (
    [deloadPolicyId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_deload_policy] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_deload_policy_idx_0' AND object_id=OBJECT_ID(N'dbo.deload_policy')) CREATE INDEX [IX_deload_policy_idx_0] ON dbo.[deload_policy] ([status]);
GO

-- ============================================================
-- TABLE device (Device)
-- Appwrite name: Device | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.device',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[device] (
    [deviceId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_device] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_device_idx_0' AND object_id=OBJECT_ID(N'dbo.device')) CREATE INDEX [IX_device_idx_0] ON dbo.[device] ([status]);
GO

-- ============================================================
-- TABLE device_authorization (Device Authorization)
-- Appwrite name: Device Authorization | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.device_authorization',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[device_authorization] (
    [deviceAuthorizationId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_device_authorization] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_device_authorization_idx_0' AND object_id=OBJECT_ID(N'dbo.device_authorization')) CREATE INDEX [IX_device_authorization_idx_0] ON dbo.[device_authorization] ([status]);
GO

-- ============================================================
-- TABLE device_sync_cursor (Device Sync Cursor)
-- Appwrite name: Device Sync Cursor | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.device_sync_cursor',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[device_sync_cursor] (
    [deviceSyncCursorId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_device_sync_cursor] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_device_sync_cursor_idx_0' AND object_id=OBJECT_ID(N'dbo.device_sync_cursor')) CREATE INDEX [IX_device_sync_cursor_idx_0] ON dbo.[device_sync_cursor] ([status]);
GO

-- ============================================================
-- TABLE exercise (Exercise)
-- Appwrite name: Exercise | enabled=True rowSecurity=True bytesUsed=5171.0
-- ============================================================

IF OBJECT_ID(N'dbo.exercise',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[exercise] (
    [exerciseId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_exercise] PRIMARY KEY,
    [canonicalName] NVARCHAR(255) NOT NULL,
    [catalogStatus] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_exercise_idx_0' AND object_id=OBJECT_ID(N'dbo.exercise')) CREATE INDEX [IX_exercise_idx_0] ON dbo.[exercise] ([exerciseId], [canonicalName]);
GO

-- ============================================================
-- TABLE exercise_alias (Exercise Alias)
-- Appwrite name: Exercise Alias | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.exercise_alias',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[exercise_alias] (
    [exerciseAliasId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_exercise_alias] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_exercise_alias_idx_0' AND object_id=OBJECT_ID(N'dbo.exercise_alias')) CREATE INDEX [IX_exercise_alias_idx_0] ON dbo.[exercise_alias] ([status]);
GO

-- ============================================================
-- TABLE exercise_environment_map (Exercise Environment Map)
-- Appwrite name: Exercise Environment Map | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.exercise_environment_map',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[exercise_environment_map] (
    [exerciseEnvironmentMapId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_exercise_environment_map] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_exercise_environment_map_idx_0' AND object_id=OBJECT_ID(N'dbo.exercise_environment_map')) CREATE INDEX [IX_exercise_environment_map_idx_0] ON dbo.[exercise_environment_map] ([status]);
GO

-- ============================================================
-- TABLE exercise_equipment_map (Exercise Equipment Map)
-- Appwrite name: Exercise Equipment Map | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.exercise_equipment_map',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[exercise_equipment_map] (
    [exerciseEquipmentMapId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_exercise_equipment_map] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_exercise_equipment_map_idx_0' AND object_id=OBJECT_ID(N'dbo.exercise_equipment_map')) CREATE INDEX [IX_exercise_equipment_map_idx_0] ON dbo.[exercise_equipment_map] ([status]);
GO

-- ============================================================
-- TABLE exercise_instruction (Exercise Instruction)
-- Appwrite name: Exercise Instruction | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.exercise_instruction',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[exercise_instruction] (
    [exerciseInstructionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_exercise_instruction] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_exercise_instruction_idx_0' AND object_id=OBJECT_ID(N'dbo.exercise_instruction')) CREATE INDEX [IX_exercise_instruction_idx_0] ON dbo.[exercise_instruction] ([status]);
GO

-- ============================================================
-- TABLE exercise_instruction_step (Exercise Instruction Step)
-- Appwrite name: Exercise Instruction Step | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.exercise_instruction_step',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[exercise_instruction_step] (
    [exerciseInstructionStepId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_exercise_instruction_step] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_exercise_instruction_step_idx_0' AND object_id=OBJECT_ID(N'dbo.exercise_instruction_step')) CREATE INDEX [IX_exercise_instruction_step_idx_0] ON dbo.[exercise_instruction_step] ([status]);
GO

-- ============================================================
-- TABLE exercise_movement_map (Exercise Movement Map)
-- Appwrite name: Exercise Movement Map | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.exercise_movement_map',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[exercise_movement_map] (
    [exerciseMovementMapId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_exercise_movement_map] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_exercise_movement_map_idx_0' AND object_id=OBJECT_ID(N'dbo.exercise_movement_map')) CREATE INDEX [IX_exercise_movement_map_idx_0] ON dbo.[exercise_movement_map] ([status]);
GO

-- ============================================================
-- TABLE exercise_muscle_map (Exercise Muscle Map)
-- Appwrite name: Exercise Muscle Map | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.exercise_muscle_map',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[exercise_muscle_map] (
    [exerciseMuscleMapId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_exercise_muscle_map] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_exercise_muscle_map_idx_0' AND object_id=OBJECT_ID(N'dbo.exercise_muscle_map')) CREATE INDEX [IX_exercise_muscle_map_idx_0] ON dbo.[exercise_muscle_map] ([status]);
GO

-- ============================================================
-- TABLE exercise_relation (Exercise Relation)
-- Appwrite name: Exercise Relation | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.exercise_relation',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[exercise_relation] (
    [exerciseRelationId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_exercise_relation] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_exercise_relation_idx_0' AND object_id=OBJECT_ID(N'dbo.exercise_relation')) CREATE INDEX [IX_exercise_relation_idx_0] ON dbo.[exercise_relation] ([status]);
GO

-- ============================================================
-- TABLE exercise_revision (Exercise Revision)
-- Appwrite name: Exercise Revision | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.exercise_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[exercise_revision] (
    [exerciseRevisionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_exercise_revision] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_exercise_revision_idx_0' AND object_id=OBJECT_ID(N'dbo.exercise_revision')) CREATE INDEX [IX_exercise_revision_idx_0] ON dbo.[exercise_revision] ([status]);
GO

-- ============================================================
-- TABLE exercise_safety_rule (Exercise Safety Rule)
-- Appwrite name: Exercise Safety Rule | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.exercise_safety_rule',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[exercise_safety_rule] (
    [exerciseSafetyRuleId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_exercise_safety_rule] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_exercise_safety_rule_idx_0' AND object_id=OBJECT_ID(N'dbo.exercise_safety_rule')) CREATE INDEX [IX_exercise_safety_rule_idx_0] ON dbo.[exercise_safety_rule] ([status]);
GO

-- ============================================================
-- TABLE exercise_sport_map (Exercise Sport Map)
-- Appwrite name: Exercise Sport Map | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.exercise_sport_map',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[exercise_sport_map] (
    [exerciseSportMapId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_exercise_sport_map] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_exercise_sport_map_idx_0' AND object_id=OBJECT_ID(N'dbo.exercise_sport_map')) CREATE INDEX [IX_exercise_sport_map_idx_0] ON dbo.[exercise_sport_map] ([status]);
GO

-- ============================================================
-- TABLE exercise_taxonomy_map (Exercise Taxonomy Map)
-- Appwrite name: Exercise Taxonomy Map | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.exercise_taxonomy_map',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[exercise_taxonomy_map] (
    [exerciseTaxonomyMapId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_exercise_taxonomy_map] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_exercise_taxonomy_map_idx_0' AND object_id=OBJECT_ID(N'dbo.exercise_taxonomy_map')) CREATE INDEX [IX_exercise_taxonomy_map_idx_0] ON dbo.[exercise_taxonomy_map] ([status]);
GO

-- ============================================================
-- TABLE export_item (Export Item)
-- Appwrite name: Export Item | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.export_item',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[export_item] (
    [exportItemId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_export_item] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_export_item_idx_0' AND object_id=OBJECT_ID(N'dbo.export_item')) CREATE INDEX [IX_export_item_idx_0] ON dbo.[export_item] ([status]);
GO

-- ============================================================
-- TABLE export_run (Export Run)
-- Appwrite name: Export Run | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.export_run',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[export_run] (
    [exportRunId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_export_run] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_export_run_idx_0' AND object_id=OBJECT_ID(N'dbo.export_run')) CREATE INDEX [IX_export_run_idx_0] ON dbo.[export_run] ([status]);
GO

-- ============================================================
-- TABLE fitness_baseline (Fitness Baseline)
-- Appwrite name: Fitness Baseline | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.fitness_baseline',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[fitness_baseline] (
    [fitnessBaselineId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_fitness_baseline] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_fitness_baseline_idx_0' AND object_id=OBJECT_ID(N'dbo.fitness_baseline')) CREATE INDEX [IX_fitness_baseline_idx_0] ON dbo.[fitness_baseline] ([status]);
GO

-- ============================================================
-- TABLE health_observation (Health Observation)
-- Appwrite name: Health Observation | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.health_observation',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[health_observation] (
    [healthObservationId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_health_observation] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_health_observation_idx_0' AND object_id=OBJECT_ID(N'dbo.health_observation')) CREATE INDEX [IX_health_observation_idx_0] ON dbo.[health_observation] ([status]);
GO

-- ============================================================
-- TABLE health_observation_source (Health Observation Source)
-- Appwrite name: Health Observation Source | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.health_observation_source',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[health_observation_source] (
    [healthObservationSourceId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_health_observation_source] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_health_observation_source_idx_0' AND object_id=OBJECT_ID(N'dbo.health_observation_source')) CREATE INDEX [IX_health_observation_source_idx_0] ON dbo.[health_observation_source] ([status]);
GO

-- ============================================================
-- TABLE import_error (Import Error)
-- Appwrite name: Import Error | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.import_error',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[import_error] (
    [importErrorId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_import_error] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_import_error_idx_0' AND object_id=OBJECT_ID(N'dbo.import_error')) CREATE INDEX [IX_import_error_idx_0] ON dbo.[import_error] ([status]);
GO

-- ============================================================
-- TABLE import_item (Import Item)
-- Appwrite name: Import Item | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.import_item',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[import_item] (
    [importItemId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_import_item] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_import_item_idx_0' AND object_id=OBJECT_ID(N'dbo.import_item')) CREATE INDEX [IX_import_item_idx_0] ON dbo.[import_item] ([status]);
GO

-- ============================================================
-- TABLE import_run (Import Run)
-- Appwrite name: Import Run | enabled=True rowSecurity=True bytesUsed=5171.0
-- ============================================================

IF OBJECT_ID(N'dbo.import_run',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[import_run] (
    [importRunId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_import_run] PRIMARY KEY,
    [releaseId] NVARCHAR(255) NOT NULL,
    [state] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_import_run_idx_0' AND object_id=OBJECT_ID(N'dbo.import_run')) CREATE INDEX [IX_import_run_idx_0] ON dbo.[import_run] ([importRunId], [releaseId]);
GO

-- ============================================================
-- TABLE joint (Joint)
-- Appwrite name: Joint | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.joint',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[joint] (
    [jointId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_joint] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_joint_idx_0' AND object_id=OBJECT_ID(N'dbo.joint')) CREATE INDEX [IX_joint_idx_0] ON dbo.[joint] ([status]);
GO

-- ============================================================
-- TABLE load_model (Load Model)
-- Appwrite name: Load Model | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.load_model',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[load_model] (
    [loadModelId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_load_model] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_load_model_idx_0' AND object_id=OBJECT_ID(N'dbo.load_model')) CREATE INDEX [IX_load_model_idx_0] ON dbo.[load_model] ([status]);
GO

-- ============================================================
-- TABLE media_access_policy (Media Access Policy)
-- Appwrite name: Media Access Policy | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.media_access_policy',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[media_access_policy] (
    [mediaAccessPolicyId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_media_access_policy] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_media_access_policy_idx_0' AND object_id=OBJECT_ID(N'dbo.media_access_policy')) CREATE INDEX [IX_media_access_policy_idx_0] ON dbo.[media_access_policy] ([status]);
GO

-- ============================================================
-- TABLE media_asset (Media Asset)
-- Appwrite name: Media Asset | enabled=True rowSecurity=True bytesUsed=5171.0
-- ============================================================

IF OBJECT_ID(N'dbo.media_asset',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[media_asset] (
    [mediaAssetId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_media_asset] PRIMARY KEY,
    [mediaType] NVARCHAR(255) NOT NULL,
    [rightsStatus] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_media_asset_idx_0' AND object_id=OBJECT_ID(N'dbo.media_asset')) CREATE INDEX [IX_media_asset_idx_0] ON dbo.[media_asset] ([mediaAssetId], [mediaType]);
GO

-- ============================================================
-- TABLE media_asset_revision (Media Asset Revision)
-- Appwrite name: Media Asset Revision | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.media_asset_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[media_asset_revision] (
    [mediaAssetRevisionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_media_asset_revision] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_media_asset_revision_idx_0' AND object_id=OBJECT_ID(N'dbo.media_asset_revision')) CREATE INDEX [IX_media_asset_revision_idx_0] ON dbo.[media_asset_revision] ([status]);
GO

-- ============================================================
-- TABLE media_attribution (Media Attribution)
-- Appwrite name: Media Attribution | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.media_attribution',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[media_attribution] (
    [mediaAttributionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_media_attribution] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_media_attribution_idx_0' AND object_id=OBJECT_ID(N'dbo.media_attribution')) CREATE INDEX [IX_media_attribution_idx_0] ON dbo.[media_attribution] ([status]);
GO

-- ============================================================
-- TABLE media_deletion_request (Media Deletion Request)
-- Appwrite name: Media Deletion Request | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.media_deletion_request',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[media_deletion_request] (
    [mediaDeletionRequestId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_media_deletion_request] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_media_deletion_request_idx_0' AND object_id=OBJECT_ID(N'dbo.media_deletion_request')) CREATE INDEX [IX_media_deletion_request_idx_0] ON dbo.[media_deletion_request] ([status]);
GO

-- ============================================================
-- TABLE media_delivery_audit (Media Delivery Audit)
-- Appwrite name: Media Delivery Audit | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.media_delivery_audit',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[media_delivery_audit] (
    [mediaDeliveryAuditId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_media_delivery_audit] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_media_delivery_audit_idx_0' AND object_id=OBJECT_ID(N'dbo.media_delivery_audit')) CREATE INDEX [IX_media_delivery_audit_idx_0] ON dbo.[media_delivery_audit] ([status]);
GO

-- ============================================================
-- TABLE media_ingestion_job (Media Ingestion Job)
-- Appwrite name: Media Ingestion Job | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.media_ingestion_job',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[media_ingestion_job] (
    [mediaIngestionJobId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_media_ingestion_job] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_media_ingestion_job_idx_0' AND object_id=OBJECT_ID(N'dbo.media_ingestion_job')) CREATE INDEX [IX_media_ingestion_job_idx_0] ON dbo.[media_ingestion_job] ([status]);
GO

-- ============================================================
-- TABLE media_license (Media License)
-- Appwrite name: Media License | enabled=True rowSecurity=True bytesUsed=4150.0
-- ============================================================

IF OBJECT_ID(N'dbo.media_license',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[media_license] (
    [mediaLicenseId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_media_license] PRIMARY KEY,
    [licenseCode] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_media_license_idx_0' AND object_id=OBJECT_ID(N'dbo.media_license')) CREATE INDEX [IX_media_license_idx_0] ON dbo.[media_license] ([mediaLicenseId], [licenseCode]);
GO

-- ============================================================
-- TABLE media_quality_review (Media Quality Review)
-- Appwrite name: Media Quality Review | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.media_quality_review',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[media_quality_review] (
    [mediaQualityReviewId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_media_quality_review] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_media_quality_review_idx_0' AND object_id=OBJECT_ID(N'dbo.media_quality_review')) CREATE INDEX [IX_media_quality_review_idx_0] ON dbo.[media_quality_review] ([status]);
GO

-- ============================================================
-- TABLE media_rights_evidence (Media Rights Evidence)
-- Appwrite name: Media Rights Evidence | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.media_rights_evidence',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[media_rights_evidence] (
    [mediaRightsEvidenceId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_media_rights_evidence] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_media_rights_evidence_idx_0' AND object_id=OBJECT_ID(N'dbo.media_rights_evidence')) CREATE INDEX [IX_media_rights_evidence_idx_0] ON dbo.[media_rights_evidence] ([status]);
GO

-- ============================================================
-- TABLE media_source_link (Media Source Link)
-- Appwrite name: Media Source Link | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.media_source_link',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[media_source_link] (
    [mediaSourceLinkId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_media_source_link] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_media_source_link_idx_0' AND object_id=OBJECT_ID(N'dbo.media_source_link')) CREATE INDEX [IX_media_source_link_idx_0] ON dbo.[media_source_link] ([status]);
GO

-- ============================================================
-- TABLE media_transcode_job (Media Transcode Job)
-- Appwrite name: Media Transcode Job | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.media_transcode_job',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[media_transcode_job] (
    [mediaTranscodeJobId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_media_transcode_job] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_media_transcode_job_idx_0' AND object_id=OBJECT_ID(N'dbo.media_transcode_job')) CREATE INDEX [IX_media_transcode_job_idx_0] ON dbo.[media_transcode_job] ([status]);
GO

-- ============================================================
-- TABLE media_variant (Media Variant)
-- Appwrite name: Media Variant | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.media_variant',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[media_variant] (
    [mediaVariantId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_media_variant] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_media_variant_idx_0' AND object_id=OBJECT_ID(N'dbo.media_variant')) CREATE INDEX [IX_media_variant_idx_0] ON dbo.[media_variant] ([status]);
GO

-- ============================================================
-- TABLE message (Message)
-- Appwrite name: Message | enabled=True rowSecurity=True bytesUsed=5171.0
-- ============================================================

IF OBJECT_ID(N'dbo.message',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[message] (
    [messageId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_message] PRIMARY KEY,
    [threadId] NVARCHAR(255) NOT NULL,
    [authorAccountId] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_message_idx_0' AND object_id=OBJECT_ID(N'dbo.message')) CREATE INDEX [IX_message_idx_0] ON dbo.[message] ([messageId], [threadId]);
GO

-- ============================================================
-- TABLE message_attachment (Message Attachment)
-- Appwrite name: Message Attachment | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.message_attachment',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[message_attachment] (
    [messageAttachmentId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_message_attachment] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_message_attachment_idx_0' AND object_id=OBJECT_ID(N'dbo.message_attachment')) CREATE INDEX [IX_message_attachment_idx_0] ON dbo.[message_attachment] ([status]);
GO

-- ============================================================
-- TABLE message_thread (Message Thread)
-- Appwrite name: Message Thread | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.message_thread',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[message_thread] (
    [messageThreadId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_message_thread] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_message_thread_idx_0' AND object_id=OBJECT_ID(N'dbo.message_thread')) CREATE INDEX [IX_message_thread_idx_0] ON dbo.[message_thread] ([status]);
GO

-- ============================================================
-- TABLE movement_constraint (Movement Constraint)
-- Appwrite name: Movement Constraint | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.movement_constraint',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[movement_constraint] (
    [movementConstraintId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_movement_constraint] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_movement_constraint_idx_0' AND object_id=OBJECT_ID(N'dbo.movement_constraint')) CREATE INDEX [IX_movement_constraint_idx_0] ON dbo.[movement_constraint] ([status]);
GO

-- ============================================================
-- TABLE movement_pattern (Movement Pattern)
-- Appwrite name: Movement Pattern | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.movement_pattern',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[movement_pattern] (
    [movementPatternId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_movement_pattern] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_movement_pattern_idx_0' AND object_id=OBJECT_ID(N'dbo.movement_pattern')) CREATE INDEX [IX_movement_pattern_idx_0] ON dbo.[movement_pattern] ([status]);
GO

-- ============================================================
-- TABLE movement_plane (Movement Plane)
-- Appwrite name: Movement Plane | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.movement_plane',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[movement_plane] (
    [movementPlaneId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_movement_plane] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_movement_plane_idx_0' AND object_id=OBJECT_ID(N'dbo.movement_plane')) CREATE INDEX [IX_movement_plane_idx_0] ON dbo.[movement_plane] ([status]);
GO

-- ============================================================
-- TABLE muscle (Muscle)
-- Appwrite name: Muscle | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.muscle',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[muscle] (
    [muscleId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_muscle] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_muscle_idx_0' AND object_id=OBJECT_ID(N'dbo.muscle')) CREATE INDEX [IX_muscle_idx_0] ON dbo.[muscle] ([status]);
GO

-- ============================================================
-- TABLE muscle_group (Muscle Group)
-- Appwrite name: Muscle Group | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.muscle_group',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[muscle_group] (
    [muscleGroupId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_muscle_group] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_muscle_group_idx_0' AND object_id=OBJECT_ID(N'dbo.muscle_group')) CREATE INDEX [IX_muscle_group_idx_0] ON dbo.[muscle_group] ([status]);
GO

-- ============================================================
-- TABLE notification (Notification)
-- Appwrite name: Notification | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.notification',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[notification] (
    [notificationId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_notification] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_notification_idx_0' AND object_id=OBJECT_ID(N'dbo.notification')) CREATE INDEX [IX_notification_idx_0] ON dbo.[notification] ([status]);
GO

-- ============================================================
-- TABLE notification_delivery (Notification Delivery)
-- Appwrite name: Notification Delivery | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.notification_delivery',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[notification_delivery] (
    [notificationDeliveryId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_notification_delivery] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_notification_delivery_idx_0' AND object_id=OBJECT_ID(N'dbo.notification_delivery')) CREATE INDEX [IX_notification_delivery_idx_0] ON dbo.[notification_delivery] ([status]);
GO

-- ============================================================
-- TABLE performed_exercise (Performed Exercise)
-- Appwrite name: Performed Exercise | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.performed_exercise',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[performed_exercise] (
    [performedExerciseId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_performed_exercise] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_performed_exercise_idx_0' AND object_id=OBJECT_ID(N'dbo.performed_exercise')) CREATE INDEX [IX_performed_exercise_idx_0] ON dbo.[performed_exercise] ([status]);
GO

-- ============================================================
-- TABLE performed_set (Performed Set)
-- Appwrite name: Performed Set | enabled=True rowSecurity=True bytesUsed=5171.0
-- ============================================================

IF OBJECT_ID(N'dbo.performed_set',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[performed_set] (
    [performedSetId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_performed_set] PRIMARY KEY,
    [performedExerciseId] NVARCHAR(255) NOT NULL,
    [sequence] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_performed_set_idx_0' AND object_id=OBJECT_ID(N'dbo.performed_set')) CREATE INDEX [IX_performed_set_idx_0] ON dbo.[performed_set] ([performedSetId], [performedExerciseId]);
GO

-- ============================================================
-- TABLE personal_record (Personal Record)
-- Appwrite name: Personal Record | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.personal_record',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[personal_record] (
    [personalRecordId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_personal_record] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_personal_record_idx_0' AND object_id=OBJECT_ID(N'dbo.personal_record')) CREATE INDEX [IX_personal_record_idx_0] ON dbo.[personal_record] ([status]);
GO

-- ============================================================
-- TABLE plan_revision (Plan Revision)
-- Appwrite name: Plan Revision | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.plan_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[plan_revision] (
    [planRevisionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_plan_revision] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_plan_revision_idx_0' AND object_id=OBJECT_ID(N'dbo.plan_revision')) CREATE INDEX [IX_plan_revision_idx_0] ON dbo.[plan_revision] ([status]);
GO

-- ============================================================
-- TABLE planned_session (Planned Session)
-- Appwrite name: Planned Session | enabled=True rowSecurity=True bytesUsed=5171.0
-- ============================================================

IF OBJECT_ID(N'dbo.planned_session',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[planned_session] (
    [plannedSessionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_planned_session] PRIMARY KEY,
    [planId] NVARCHAR(255) NOT NULL,
    [localDate] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_planned_session_idx_0' AND object_id=OBJECT_ID(N'dbo.planned_session')) CREATE INDEX [IX_planned_session_idx_0] ON dbo.[planned_session] ([plannedSessionId], [planId]);
GO

-- ============================================================
-- TABLE planned_session_item (Planned Session Item)
-- Appwrite name: Planned Session Item | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.planned_session_item',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[planned_session_item] (
    [plannedSessionItemId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_planned_session_item] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_planned_session_item_idx_0' AND object_id=OBJECT_ID(N'dbo.planned_session_item')) CREATE INDEX [IX_planned_session_item_idx_0] ON dbo.[planned_session_item] ([status]);
GO

-- ============================================================
-- TABLE program_phase (Program Phase)
-- Appwrite name: Program Phase | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.program_phase',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[program_phase] (
    [programPhaseId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_program_phase] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_program_phase_idx_0' AND object_id=OBJECT_ID(N'dbo.program_phase')) CREATE INDEX [IX_program_phase_idx_0] ON dbo.[program_phase] ([status]);
GO

-- ============================================================
-- TABLE program_template (Program Template)
-- Appwrite name: Program Template | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.program_template',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[program_template] (
    [programTemplateId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_program_template] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_program_template_idx_0' AND object_id=OBJECT_ID(N'dbo.program_template')) CREATE INDEX [IX_program_template_idx_0] ON dbo.[program_template] ([status]);
GO

-- ============================================================
-- TABLE progress_review (Progress Review)
-- Appwrite name: Progress Review | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.progress_review',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[progress_review] (
    [progressReviewId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_progress_review] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_progress_review_idx_0' AND object_id=OBJECT_ID(N'dbo.progress_review')) CREATE INDEX [IX_progress_review_idx_0] ON dbo.[progress_review] ([status]);
GO

-- ============================================================
-- TABLE progression_policy (Progression Policy)
-- Appwrite name: Progression Policy | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.progression_policy',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[progression_policy] (
    [progressionPolicyId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_progression_policy] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_progression_policy_idx_0' AND object_id=OBJECT_ID(N'dbo.progression_policy')) CREATE INDEX [IX_progression_policy_idx_0] ON dbo.[progression_policy] ([status]);
GO

-- ============================================================
-- TABLE progression_rule (Progression Rule)
-- Appwrite name: Progression Rule | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.progression_rule',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[progression_rule] (
    [progressionRuleId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_progression_rule] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_progression_rule_idx_0' AND object_id=OBJECT_ID(N'dbo.progression_rule')) CREATE INDEX [IX_progression_rule_idx_0] ON dbo.[progression_rule] ([status]);
GO

-- ============================================================
-- TABLE readiness_checkin (Readiness Checkin)
-- Appwrite name: Readiness Checkin | enabled=True rowSecurity=True bytesUsed=5171.0
-- ============================================================

IF OBJECT_ID(N'dbo.readiness_checkin',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[readiness_checkin] (
    [checkinId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_readiness_checkin] PRIMARY KEY,
    [externalUserId] NVARCHAR(255) NOT NULL,
    [occurredAt] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_readiness_checkin_idx_0' AND object_id=OBJECT_ID(N'dbo.readiness_checkin')) CREATE INDEX [IX_readiness_checkin_idx_0] ON dbo.[readiness_checkin] ([checkinId], [externalUserId]);
GO

-- ============================================================
-- TABLE regression_rule (Regression Rule)
-- Appwrite name: Regression Rule | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.regression_rule',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[regression_rule] (
    [regressionRuleId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_regression_rule] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_regression_rule_idx_0' AND object_id=OBJECT_ID(N'dbo.regression_rule')) CREATE INDEX [IX_regression_rule_idx_0] ON dbo.[regression_rule] ([status]);
GO

-- ============================================================
-- TABLE rest_interval (Rest Interval)
-- Appwrite name: Rest Interval | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.rest_interval',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[rest_interval] (
    [restIntervalId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_rest_interval] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_rest_interval_idx_0' AND object_id=OBJECT_ID(N'dbo.rest_interval')) CREATE INDEX [IX_rest_interval_idx_0] ON dbo.[rest_interval] ([status]);
GO

-- ============================================================
-- TABLE retention_policy (Retention Policy)
-- Appwrite name: Retention Policy | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.retention_policy',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[retention_policy] (
    [retentionPolicyId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_retention_policy] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_retention_policy_idx_0' AND object_id=OBJECT_ID(N'dbo.retention_policy')) CREATE INDEX [IX_retention_policy_idx_0] ON dbo.[retention_policy] ([status]);
GO

-- ============================================================
-- TABLE review_decision (Review Decision)
-- Appwrite name: Review Decision | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.review_decision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[review_decision] (
    [reviewDecisionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_review_decision] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_review_decision_idx_0' AND object_id=OBJECT_ID(N'dbo.review_decision')) CREATE INDEX [IX_review_decision_idx_0] ON dbo.[review_decision] ([status]);
GO

-- ============================================================
-- TABLE review_queue (Review Queue)
-- Appwrite name: Review Queue | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.review_queue',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[review_queue] (
    [reviewQueueId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_review_queue] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_review_queue_idx_0' AND object_id=OBJECT_ID(N'dbo.review_queue')) CREATE INDEX [IX_review_queue_idx_0] ON dbo.[review_queue] ([status]);
GO

-- ============================================================
-- TABLE safety_screen_definition (Safety Screen Definition)
-- Appwrite name: Safety Screen Definition | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.safety_screen_definition',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[safety_screen_definition] (
    [safetyScreenDefinitionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_safety_screen_definition] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_safety_screen_definition_idx_0' AND object_id=OBJECT_ID(N'dbo.safety_screen_definition')) CREATE INDEX [IX_safety_screen_definition_idx_0] ON dbo.[safety_screen_definition] ([status]);
GO

-- ============================================================
-- TABLE safety_screen_rule (Safety Screen Rule)
-- Appwrite name: Safety Screen Rule | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.safety_screen_rule',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[safety_screen_rule] (
    [safetyScreenRuleId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_safety_screen_rule] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_safety_screen_rule_idx_0' AND object_id=OBJECT_ID(N'dbo.safety_screen_rule')) CREATE INDEX [IX_safety_screen_rule_idx_0] ON dbo.[safety_screen_rule] ([status]);
GO

-- ============================================================
-- TABLE session_metric (Session Metric)
-- Appwrite name: Session Metric | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.session_metric',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[session_metric] (
    [sessionMetricId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_session_metric] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_session_metric_idx_0' AND object_id=OBJECT_ID(N'dbo.session_metric')) CREATE INDEX [IX_session_metric_idx_0] ON dbo.[session_metric] ([status]);
GO

-- ============================================================
-- TABLE session_requirement (Session Requirement)
-- Appwrite name: Session Requirement | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.session_requirement',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[session_requirement] (
    [sessionRequirementId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_session_requirement] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_session_requirement_idx_0' AND object_id=OBJECT_ID(N'dbo.session_requirement')) CREATE INDEX [IX_session_requirement_idx_0] ON dbo.[session_requirement] ([status]);
GO

-- ============================================================
-- TABLE set_metric (Set Metric)
-- Appwrite name: Set Metric | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.set_metric',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[set_metric] (
    [setMetricId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_set_metric] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_set_metric_idx_0' AND object_id=OBJECT_ID(N'dbo.set_metric')) CREATE INDEX [IX_set_metric_idx_0] ON dbo.[set_metric] ([status]);
GO

-- ============================================================
-- TABLE source_dataset (Source Dataset)
-- Appwrite name: Source Dataset | enabled=True rowSecurity=True bytesUsed=5171.0
-- ============================================================

IF OBJECT_ID(N'dbo.source_dataset',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[source_dataset] (
    [datasetId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_source_dataset] PRIMARY KEY,
    [providerId] NVARCHAR(255) NOT NULL,
    [version] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_source_dataset_idx_0' AND object_id=OBJECT_ID(N'dbo.source_dataset')) CREATE INDEX [IX_source_dataset_idx_0] ON dbo.[source_dataset] ([datasetId], [providerId]);
GO

-- ============================================================
-- TABLE source_license (Source License)
-- Appwrite name: Source License | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.source_license',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[source_license] (
    [sourceLicenseId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_source_license] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_source_license_idx_0' AND object_id=OBJECT_ID(N'dbo.source_license')) CREATE INDEX [IX_source_license_idx_0] ON dbo.[source_license] ([status]);
GO

-- ============================================================
-- TABLE source_license_evidence (Source License Evidence)
-- Appwrite name: Source License Evidence | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.source_license_evidence',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[source_license_evidence] (
    [sourceLicenseEvidenceId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_source_license_evidence] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_source_license_evidence_idx_0' AND object_id=OBJECT_ID(N'dbo.source_license_evidence')) CREATE INDEX [IX_source_license_evidence_idx_0] ON dbo.[source_license_evidence] ([status]);
GO

-- ============================================================
-- TABLE source_provider (Source Provider)
-- Appwrite name: Source Provider | enabled=True rowSecurity=True bytesUsed=4150.0
-- ============================================================

IF OBJECT_ID(N'dbo.source_provider',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[source_provider] (
    [providerId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_source_provider] PRIMARY KEY,
    [name] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_source_provider_idx_0' AND object_id=OBJECT_ID(N'dbo.source_provider')) CREATE INDEX [IX_source_provider_idx_0] ON dbo.[source_provider] ([providerId], [name]);
GO

-- ============================================================
-- TABLE source_record (Source Record)
-- Appwrite name: Source Record | enabled=True rowSecurity=True bytesUsed=5171.0
-- ============================================================

IF OBJECT_ID(N'dbo.source_record',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[source_record] (
    [sourceRecordId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_source_record] PRIMARY KEY,
    [datasetId] NVARCHAR(255) NOT NULL,
    [rawHash] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_source_record_idx_0' AND object_id=OBJECT_ID(N'dbo.source_record')) CREATE INDEX [IX_source_record_idx_0] ON dbo.[source_record] ([sourceRecordId], [datasetId]);
GO

-- ============================================================
-- TABLE source_record_version (Source Record Version)
-- Appwrite name: Source Record Version | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.source_record_version',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[source_record_version] (
    [sourceRecordVersionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_source_record_version] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_source_record_version_idx_0' AND object_id=OBJECT_ID(N'dbo.source_record_version')) CREATE INDEX [IX_source_record_version_idx_0] ON dbo.[source_record_version] ([status]);
GO

-- ============================================================
-- TABLE sport (Sport)
-- Appwrite name: Sport | enabled=True rowSecurity=True bytesUsed=5171.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport] (
    [sportId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport] PRIMARY KEY,
    [code] NVARCHAR(255) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_idx_0' AND object_id=OBJECT_ID(N'dbo.sport')) CREATE INDEX [IX_sport_idx_0] ON dbo.[sport] ([sportId], [code]);
GO

-- ============================================================
-- TABLE sport_activity (Sport Activity)
-- Appwrite name: Sport Activity | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport_activity',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport_activity] (
    [sportActivityId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport_activity] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_activity_idx_0' AND object_id=OBJECT_ID(N'dbo.sport_activity')) CREATE INDEX [IX_sport_activity_idx_0] ON dbo.[sport_activity] ([status]);
GO

-- ============================================================
-- TABLE sport_discipline (Sport Discipline)
-- Appwrite name: Sport Discipline | enabled=True rowSecurity=True bytesUsed=5171.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport_discipline',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport_discipline] (
    [disciplineId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport_discipline] PRIMARY KEY,
    [sportId] NVARCHAR(255) NOT NULL,
    [code] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_discipline_idx_0' AND object_id=OBJECT_ID(N'dbo.sport_discipline')) CREATE INDEX [IX_sport_discipline_idx_0] ON dbo.[sport_discipline] ([disciplineId], [sportId]);
GO

-- ============================================================
-- TABLE sport_drill (Sport Drill)
-- Appwrite name: Sport Drill | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport_drill',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport_drill] (
    [sportDrillId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport_drill] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_drill_idx_0' AND object_id=OBJECT_ID(N'dbo.sport_drill')) CREATE INDEX [IX_sport_drill_idx_0] ON dbo.[sport_drill] ([status]);
GO

-- ============================================================
-- TABLE sport_drill_revision (Sport Drill Revision)
-- Appwrite name: Sport Drill Revision | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport_drill_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport_drill_revision] (
    [sportDrillRevisionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport_drill_revision] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_drill_revision_idx_0' AND object_id=OBJECT_ID(N'dbo.sport_drill_revision')) CREATE INDEX [IX_sport_drill_revision_idx_0] ON dbo.[sport_drill_revision] ([status]);
GO

-- ============================================================
-- TABLE sport_drill_step (Sport Drill Step)
-- Appwrite name: Sport Drill Step | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport_drill_step',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport_drill_step] (
    [sportDrillStepId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport_drill_step] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_drill_step_idx_0' AND object_id=OBJECT_ID(N'dbo.sport_drill_step')) CREATE INDEX [IX_sport_drill_step_idx_0] ON dbo.[sport_drill_step] ([status]);
GO

-- ============================================================
-- TABLE sport_environment_rule (Sport Environment Rule)
-- Appwrite name: Sport Environment Rule | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport_environment_rule',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport_environment_rule] (
    [sportEnvironmentRuleId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport_environment_rule] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_environment_rule_idx_0' AND object_id=OBJECT_ID(N'dbo.sport_environment_rule')) CREATE INDEX [IX_sport_environment_rule_idx_0] ON dbo.[sport_environment_rule] ([status]);
GO

-- ============================================================
-- TABLE sport_equipment_rule (Sport Equipment Rule)
-- Appwrite name: Sport Equipment Rule | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport_equipment_rule',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport_equipment_rule] (
    [sportEquipmentRuleId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport_equipment_rule] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_equipment_rule_idx_0' AND object_id=OBJECT_ID(N'dbo.sport_equipment_rule')) CREATE INDEX [IX_sport_equipment_rule_idx_0] ON dbo.[sport_equipment_rule] ([status]);
GO

-- ============================================================
-- TABLE sport_event (Sport Event)
-- Appwrite name: Sport Event | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport_event',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport_event] (
    [sportEventId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport_event] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_event_idx_0' AND object_id=OBJECT_ID(N'dbo.sport_event')) CREATE INDEX [IX_sport_event_idx_0] ON dbo.[sport_event] ([status]);
GO

-- ============================================================
-- TABLE sport_lap_split (Sport Lap Split)
-- Appwrite name: Sport Lap Split | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport_lap_split',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport_lap_split] (
    [sportLapSplitId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport_lap_split] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_lap_split_idx_0' AND object_id=OBJECT_ID(N'dbo.sport_lap_split')) CREATE INDEX [IX_sport_lap_split_idx_0] ON dbo.[sport_lap_split] ([status]);
GO

-- ============================================================
-- TABLE sport_metric_definition (Sport Metric Definition)
-- Appwrite name: Sport Metric Definition | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport_metric_definition',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport_metric_definition] (
    [sportMetricDefinitionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport_metric_definition] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_metric_definition_idx_0' AND object_id=OBJECT_ID(N'dbo.sport_metric_definition')) CREATE INDEX [IX_sport_metric_definition_idx_0] ON dbo.[sport_metric_definition] ([status]);
GO

-- ============================================================
-- TABLE sport_metric_unit (Sport Metric Unit)
-- Appwrite name: Sport Metric Unit | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport_metric_unit',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport_metric_unit] (
    [sportMetricUnitId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport_metric_unit] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_metric_unit_idx_0' AND object_id=OBJECT_ID(N'dbo.sport_metric_unit')) CREATE INDEX [IX_sport_metric_unit_idx_0] ON dbo.[sport_metric_unit] ([status]);
GO

-- ============================================================
-- TABLE sport_position (Sport Position)
-- Appwrite name: Sport Position | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport_position',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport_position] (
    [sportPositionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport_position] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_position_idx_0' AND object_id=OBJECT_ID(N'dbo.sport_position')) CREATE INDEX [IX_sport_position_idx_0] ON dbo.[sport_position] ([status]);
GO

-- ============================================================
-- TABLE sport_season_rule (Sport Season Rule)
-- Appwrite name: Sport Season Rule | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport_season_rule',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport_season_rule] (
    [sportSeasonRuleId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport_season_rule] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_season_rule_idx_0' AND object_id=OBJECT_ID(N'dbo.sport_season_rule')) CREATE INDEX [IX_sport_season_rule_idx_0] ON dbo.[sport_season_rule] ([status]);
GO

-- ============================================================
-- TABLE sport_skill (Sport Skill)
-- Appwrite name: Sport Skill | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport_skill',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport_skill] (
    [sportSkillId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport_skill] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_skill_idx_0' AND object_id=OBJECT_ID(N'dbo.sport_skill')) CREATE INDEX [IX_sport_skill_idx_0] ON dbo.[sport_skill] ([status]);
GO

-- ============================================================
-- TABLE sport_taxonomy_map (Sport Taxonomy Map)
-- Appwrite name: Sport Taxonomy Map | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport_taxonomy_map',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport_taxonomy_map] (
    [sportTaxonomyMapId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport_taxonomy_map] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_taxonomy_map_idx_0' AND object_id=OBJECT_ID(N'dbo.sport_taxonomy_map')) CREATE INDEX [IX_sport_taxonomy_map_idx_0] ON dbo.[sport_taxonomy_map] ([status]);
GO

-- ============================================================
-- TABLE sport_test_protocol (Sport Test Protocol)
-- Appwrite name: Sport Test Protocol | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport_test_protocol',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport_test_protocol] (
    [sportTestProtocolId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport_test_protocol] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_test_protocol_idx_0' AND object_id=OBJECT_ID(N'dbo.sport_test_protocol')) CREATE INDEX [IX_sport_test_protocol_idx_0] ON dbo.[sport_test_protocol] ([status]);
GO

-- ============================================================
-- TABLE sport_test_step (Sport Test Step)
-- Appwrite name: Sport Test Step | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.sport_test_step',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sport_test_step] (
    [sportTestStepId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_sport_test_step] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sport_test_step_idx_0' AND object_id=OBJECT_ID(N'dbo.sport_test_step')) CREATE INDEX [IX_sport_test_step_idx_0] ON dbo.[sport_test_step] ([status]);
GO

-- ============================================================
-- TABLE substitution_group (Substitution Group)
-- Appwrite name: Substitution Group | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.substitution_group',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[substitution_group] (
    [substitutionGroupId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_substitution_group] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_substitution_group_idx_0' AND object_id=OBJECT_ID(N'dbo.substitution_group')) CREATE INDEX [IX_substitution_group_idx_0] ON dbo.[substitution_group] ([status]);
GO

-- ============================================================
-- TABLE substitution_rule (Substitution Rule)
-- Appwrite name: Substitution Rule | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.substitution_rule',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[substitution_rule] (
    [substitutionRuleId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_substitution_rule] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_substitution_rule_idx_0' AND object_id=OBJECT_ID(N'dbo.substitution_rule')) CREATE INDEX [IX_substitution_rule_idx_0] ON dbo.[substitution_rule] ([status]);
GO

-- ============================================================
-- TABLE template_block (Template Block)
-- Appwrite name: Template Block | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.template_block',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[template_block] (
    [templateBlockId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_template_block] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_template_block_idx_0' AND object_id=OBJECT_ID(N'dbo.template_block')) CREATE INDEX [IX_template_block_idx_0] ON dbo.[template_block] ([status]);
GO

-- ============================================================
-- TABLE template_revision (Template Revision)
-- Appwrite name: Template Revision | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.template_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[template_revision] (
    [templateRevisionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_template_revision] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_template_revision_idx_0' AND object_id=OBJECT_ID(N'dbo.template_revision')) CREATE INDEX [IX_template_revision_idx_0] ON dbo.[template_revision] ([status]);
GO

-- ============================================================
-- TABLE template_session (Template Session)
-- Appwrite name: Template Session | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.template_session',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[template_session] (
    [templateSessionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_template_session] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_template_session_idx_0' AND object_id=OBJECT_ID(N'dbo.template_session')) CREATE INDEX [IX_template_session_idx_0] ON dbo.[template_session] ([status]);
GO

-- ============================================================
-- TABLE template_session_item (Template Session Item)
-- Appwrite name: Template Session Item | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.template_session_item',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[template_session_item] (
    [templateSessionItemId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_template_session_item] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_template_session_item_idx_0' AND object_id=OBJECT_ID(N'dbo.template_session_item')) CREATE INDEX [IX_template_session_item_idx_0] ON dbo.[template_session_item] ([status]);
GO

-- ============================================================
-- TABLE training_account (Training Account)
-- Appwrite name: Training Account | enabled=True rowSecurity=True bytesUsed=5171.0
-- ============================================================

IF OBJECT_ID(N'dbo.training_account',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[training_account] (
    [trainingAccountId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_training_account] PRIMARY KEY,
    [externalUserId] NVARCHAR(255) NOT NULL,
    [state] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_training_account_idx_0' AND object_id=OBJECT_ID(N'dbo.training_account')) CREATE INDEX [IX_training_account_idx_0] ON dbo.[training_account] ([trainingAccountId], [externalUserId]);
GO

-- ============================================================
-- TABLE training_goal (Training Goal)
-- Appwrite name: Training Goal | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.training_goal',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[training_goal] (
    [trainingGoalId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_training_goal] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_training_goal_idx_0' AND object_id=OBJECT_ID(N'dbo.training_goal')) CREATE INDEX [IX_training_goal_idx_0] ON dbo.[training_goal] ([status]);
GO

-- ============================================================
-- TABLE workout_event (Workout Event)
-- Appwrite name: Workout Event | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.workout_event',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_event] (
    [workoutEventId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_workout_event] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_event_idx_0' AND object_id=OBJECT_ID(N'dbo.workout_event')) CREATE INDEX [IX_workout_event_idx_0] ON dbo.[workout_event] ([status]);
GO

-- ============================================================
-- TABLE workout_plan (Workout Plan)
-- Appwrite name: Workout Plan | enabled=True rowSecurity=True bytesUsed=4150.0
-- ============================================================

IF OBJECT_ID(N'dbo.workout_plan',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_plan] (
    [planId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_workout_plan] PRIMARY KEY,
    [externalUserId] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_plan_idx_0' AND object_id=OBJECT_ID(N'dbo.workout_plan')) CREATE INDEX [IX_workout_plan_idx_0] ON dbo.[workout_plan] ([planId], [externalUserId]);
GO

-- ============================================================
-- TABLE workout_session (Workout Session)
-- Appwrite name: Workout Session | enabled=True rowSecurity=True bytesUsed=5171.0
-- ============================================================

IF OBJECT_ID(N'dbo.workout_session',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_session] (
    [sessionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_workout_session] PRIMARY KEY,
    [externalUserId] NVARCHAR(255) NOT NULL,
    [state] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_session_idx_0' AND object_id=OBJECT_ID(N'dbo.workout_session')) CREATE INDEX [IX_workout_session_idx_0] ON dbo.[workout_session] ([sessionId], [externalUserId]);
GO

-- ============================================================
-- TABLE workout_session_revision (Workout Session Revision)
-- Appwrite name: Workout Session Revision | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.workout_session_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_session_revision] (
    [workoutSessionRevisionId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_workout_session_revision] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_session_revision_idx_0' AND object_id=OBJECT_ID(N'dbo.workout_session_revision')) CREATE INDEX [IX_workout_session_revision_idx_0] ON dbo.[workout_session_revision] ([status]);
GO

-- ============================================================
-- TABLE workout_summary (Workout Summary)
-- Appwrite name: Workout Summary | enabled=True rowSecurity=True bytesUsed=3129.0
-- ============================================================

IF OBJECT_ID(N'dbo.workout_summary',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_summary] (
    [workoutSummaryId] NVARCHAR(255) NOT NULL CONSTRAINT [PK_workout_summary] PRIMARY KEY,
    [status] NVARCHAR(255) NOT NULL,
    [payloadJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_summary_idx_0' AND object_id=OBJECT_ID(N'dbo.workout_summary')) CREATE INDEX [IX_workout_summary_idx_0] ON dbo.[workout_summary] ([status]);
GO
