-- Live Appwrite schema dump (exact types, no inference)
-- Project: sfo / New project (6a7f08d9001d096779c8)
-- Database: movefuel_mvp_dev (MoveFuel MVP Development)
-- Tables: 82
-- Dialect: Azure SQL / SQL Server
-- Generated: 2026-09-22 from live Appwrite TablesDB API
-- Mapping: string(n)->NVARCHAR(n)/MAX, text/longtext->NVARCHAR(MAX), integer->BIGINT, double->FLOAT, boolean->BIT, datetime->DATETIME2(3)
-- Note: Appwrite system fields ($id,$createdAt,$updatedAt,$permissions) are implicit; first required *Id column used as PK to match repo convention.

-- Totals: 82 tables, 888 columns, 179 indexes

-- ============================================================
-- TABLE action_completion (Action completion)
-- Appwrite name: Action completion | enabled=True rowSecurity=True bytesUsed=3896.0
-- ============================================================

IF OBJECT_ID(N'dbo.action_completion',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[action_completion] (
    [completionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_action_completion] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [recommendationId] NVARCHAR(128) NOT NULL,
    [action] NVARCHAR(64) NOT NULL,
    [sourceDevice] NVARCHAR(128) NOT NULL,
    [idempotencyKey] NVARCHAR(128) NOT NULL,
    [occurredAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_action_completion_userId_idempotencyKey_unique' AND object_id=OBJECT_ID(N'dbo.action_completion')) CREATE UNIQUE INDEX [IX_action_completion_userId_idempotencyKey_unique] ON dbo.[action_completion] ([userId], [idempotencyKey]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_action_completion_recommendationId' AND object_id=OBJECT_ID(N'dbo.action_completion')) CREATE INDEX [IX_action_completion_recommendationId] ON dbo.[action_completion] ([recommendationId]);
GO

-- ============================================================
-- TABLE analysis_attempt (Analysis attempt)
-- Appwrite name: Analysis attempt | enabled=True rowSecurity=True bytesUsed=4562.0
-- ============================================================

IF OBJECT_ID(N'dbo.analysis_attempt',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[analysis_attempt] (
    [attemptId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_analysis_attempt] PRIMARY KEY,
    [requestId] NVARCHAR(128) NOT NULL,
    [attemptNo] BIGINT NOT NULL,
    [promptVersionId] NVARCHAR(128) NULL,
    [modelConfigId] NVARCHAR(128) NULL,
    [provider] NVARCHAR(64) NOT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [inputHash] NVARCHAR(128) NOT NULL,
    [outputHash] NVARCHAR(128) NULL,
    [costMicrounits] BIGINT NULL,
    [latencyMs] BIGINT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_analysis_attempt_requestId_attemptNo_unique' AND object_id=OBJECT_ID(N'dbo.analysis_attempt')) CREATE UNIQUE INDEX [IX_analysis_attempt_requestId_attemptNo_unique] ON dbo.[analysis_attempt] ([requestId], [attemptNo]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_analysis_attempt_state_createdAt' AND object_id=OBJECT_ID(N'dbo.analysis_attempt')) CREATE INDEX [IX_analysis_attempt_state_createdAt] ON dbo.[analysis_attempt] ([state], [createdAt]);
GO

-- ============================================================
-- TABLE analysis_event (Analysis event)
-- Appwrite name: Analysis event | enabled=True rowSecurity=True bytesUsed=3391.0
-- ============================================================

IF OBJECT_ID(N'dbo.analysis_event',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[analysis_event] (
    [eventId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_analysis_event] PRIMARY KEY,
    [requestId] NVARCHAR(128) NOT NULL,
    [attemptId] NVARCHAR(128) NOT NULL,
    [stage] NVARCHAR(64) NOT NULL,
    [userSafeCode] NVARCHAR(128) NOT NULL,
    [occurredAt] DATETIME2(3) NOT NULL,
    [sequence] BIGINT NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_analysis_event_requestId_sequence_unique' AND object_id=OBJECT_ID(N'dbo.analysis_event')) CREATE UNIQUE INDEX [IX_analysis_event_requestId_sequence_unique] ON dbo.[analysis_event] ([requestId], [sequence]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_analysis_event_requestId_occurredAt' AND object_id=OBJECT_ID(N'dbo.analysis_event')) CREATE INDEX [IX_analysis_event_requestId_occurredAt] ON dbo.[analysis_event] ([requestId], [occurredAt]);
GO

-- ============================================================
-- TABLE audit_event (Audit event)
-- Appwrite name: Audit event | enabled=True rowSecurity=True bytesUsed=37437.0
-- ============================================================

IF OBJECT_ID(N'dbo.audit_event',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[audit_event] (
    [auditId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_audit_event] PRIMARY KEY,
    [userId] NVARCHAR(128) NULL,
    [actorType] NVARCHAR(32) NOT NULL,
    [actorIdHash] NVARCHAR(128) NULL,
    [action] NVARCHAR(128) NOT NULL,
    [objectType] NVARCHAR(64) NULL,
    [objectId] NVARCHAR(128) NULL,
    [result] NVARCHAR(32) NOT NULL,
    [correlationId] NVARCHAR(128) NOT NULL,
    [occurredAt] DATETIME2(3) NOT NULL,
    [metadataJson] NVARCHAR(MAX) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_audit_event_userId_occurredAt' AND object_id=OBJECT_ID(N'dbo.audit_event')) CREATE INDEX [IX_audit_event_userId_occurredAt] ON dbo.[audit_event] ([userId], [occurredAt]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_audit_event_correlationId' AND object_id=OBJECT_ID(N'dbo.audit_event')) CREATE INDEX [IX_audit_event_correlationId] ON dbo.[audit_event] ([correlationId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_audit_event_action_occurredAt' AND object_id=OBJECT_ID(N'dbo.audit_event')) CREATE INDEX [IX_audit_event_action_occurredAt] ON dbo.[audit_event] ([action], [occurredAt]);
GO

-- ============================================================
-- TABLE calendar_entry (Calendar entry)
-- Appwrite name: Calendar entry | enabled=True rowSecurity=True bytesUsed=20733.0
-- ============================================================

IF OBJECT_ID(N'dbo.calendar_entry',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[calendar_entry] (
    [entryRowId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_calendar_entry] PRIMARY KEY,
    [entryId] NVARCHAR(128) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL,
    [calendarRevisionId] NVARCHAR(128) NOT NULL,
    [calendarRevision] BIGINT NOT NULL,
    [semanticObjectType] NVARCHAR(64) NOT NULL,
    [semanticObjectId] NVARCHAR(128) NOT NULL,
    [startAt] DATETIME2(3) NOT NULL,
    [endAt] DATETIME2(3) NOT NULL,
    [timezone] NVARCHAR(64) NOT NULL,
    [localDate] NVARCHAR(10) NOT NULL,
    [status] NVARCHAR(32) NOT NULL,
    [locked] BIT NOT NULL,
    [reasonCodesJson] NVARCHAR(MAX) NOT NULL,
    [schemaVersion] BIGINT NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_calendar_entry_calendar_entry_user_revision' AND object_id=OBJECT_ID(N'dbo.calendar_entry')) CREATE INDEX [IX_calendar_entry_calendar_entry_user_revision] ON dbo.[calendar_entry] ([userId], [calendarRevision]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_calendar_entry_calendar_entry_user_date_start' AND object_id=OBJECT_ID(N'dbo.calendar_entry')) CREATE INDEX [IX_calendar_entry_calendar_entry_user_date_start] ON dbo.[calendar_entry] ([userId], [localDate], [startAt]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_calendar_entry_calendar_entry_revision_ide_3yjqe4' AND object_id=OBJECT_ID(N'dbo.calendar_entry')) CREATE UNIQUE INDEX [IX_calendar_entry_calendar_entry_revision_ide_3yjqe4] ON dbo.[calendar_entry] ([calendarRevisionId], [entryId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_calendar_entry_calendar_entry_user_semanti_142e3da' AND object_id=OBJECT_ID(N'dbo.calendar_entry')) CREATE INDEX [IX_calendar_entry_calendar_entry_user_semanti_142e3da] ON dbo.[calendar_entry] ([userId], [semanticObjectType], [semanticObjectId], [calendarRevision]);
GO

-- ============================================================
-- TABLE calendar_revision (Calendar revision)
-- Appwrite name: Calendar revision | enabled=True rowSecurity=True bytesUsed=20049.0
-- ============================================================

IF OBJECT_ID(N'dbo.calendar_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[calendar_revision] (
    [calendarRevisionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_calendar_revision] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [revision] BIGINT NOT NULL,
    [baseRevision] BIGINT NOT NULL,
    [entryHash] NVARCHAR(128) NOT NULL,
    [operationId] NVARCHAR(128) NOT NULL,
    [idempotencyKey] NVARCHAR(128) NOT NULL,
    [reasonCodesJson] NVARCHAR(MAX) NOT NULL,
    [schemaVersion] BIGINT NOT NULL,
    [publishedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_calendar_revision_calendar_user_revision_unique' AND object_id=OBJECT_ID(N'dbo.calendar_revision')) CREATE UNIQUE INDEX [IX_calendar_revision_calendar_user_revision_unique] ON dbo.[calendar_revision] ([userId], [revision]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_calendar_revision_calendar_user_operation_unique' AND object_id=OBJECT_ID(N'dbo.calendar_revision')) CREATE UNIQUE INDEX [IX_calendar_revision_calendar_user_operation_unique] ON dbo.[calendar_revision] ([userId], [operationId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_calendar_revision_calendar_user_idempotency_unique' AND object_id=OBJECT_ID(N'dbo.calendar_revision')) CREATE UNIQUE INDEX [IX_calendar_revision_calendar_user_idempotency_unique] ON dbo.[calendar_revision] ([userId], [idempotencyKey]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_calendar_revision_calendar_user_publishedAt' AND object_id=OBJECT_ID(N'dbo.calendar_revision')) CREATE INDEX [IX_calendar_revision_calendar_user_publishedAt] ON dbo.[calendar_revision] ([userId], [publishedAt]);
GO

-- ============================================================
-- TABLE consent_record (Consent record)
-- Appwrite name: Consent record | enabled=True rowSecurity=True bytesUsed=3136.0
-- ============================================================

IF OBJECT_ID(N'dbo.consent_record',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[consent_record] (
    [consentId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_consent_record] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [consentType] NVARCHAR(64) NOT NULL,
    [documentVersion] NVARCHAR(64) NOT NULL,
    [choice] NVARCHAR(32) NOT NULL,
    [jurisdiction] NVARCHAR(64) NULL,
    [sourcePlatform] NVARCHAR(32) NOT NULL,
    [recordedAt] DATETIME2(3) NOT NULL,
    [revokedAt] DATETIME2(3) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_consent_record_user_consent_version_unique' AND object_id=OBJECT_ID(N'dbo.consent_record')) CREATE UNIQUE INDEX [IX_consent_record_user_consent_version_unique] ON dbo.[consent_record] ([userId], [consentType], [documentVersion]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_consent_record_userId_recordedAt' AND object_id=OBJECT_ID(N'dbo.consent_record')) CREATE INDEX [IX_consent_record_userId_recordedAt] ON dbo.[consent_record] ([userId], [recordedAt]);
GO

-- ============================================================
-- TABLE content_report (Content report)
-- Appwrite name: Content report | enabled=True rowSecurity=True bytesUsed=12219.0
-- ============================================================

IF OBJECT_ID(N'dbo.content_report',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[content_report] (
    [reportId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_content_report] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [contentType] NVARCHAR(64) NOT NULL,
    [contentId] NVARCHAR(128) NOT NULL,
    [reason] NVARCHAR(256) NOT NULL,
    [note] NVARCHAR(2048) NULL,
    [state] NVARCHAR(32) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_content_report_state_createdAt' AND object_id=OBJECT_ID(N'dbo.content_report')) CREATE INDEX [IX_content_report_state_createdAt] ON dbo.[content_report] ([state], [createdAt]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_content_report_contentId' AND object_id=OBJECT_ID(N'dbo.content_report')) CREATE INDEX [IX_content_report_contentId] ON dbo.[content_report] ([contentId]);
GO

-- ============================================================
-- TABLE daily_aggregate (Daily aggregate)
-- Appwrite name: Daily aggregate | enabled=True rowSecurity=True bytesUsed=2943.0
-- ============================================================

IF OBJECT_ID(N'dbo.daily_aggregate',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[daily_aggregate] (
    [aggregateId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_daily_aggregate] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [localDate] NVARCHAR(32) NOT NULL,
    [energyKcal] BIGINT NOT NULL,
    [proteinG] BIGINT NOT NULL,
    [carbG] BIGINT NOT NULL,
    [fatG] BIGINT NOT NULL,
    [fiberG] BIGINT NOT NULL,
    [movementUnit] NVARCHAR(32) NULL,
    [mealCount] BIGINT NOT NULL,
    [workoutCount] BIGINT NOT NULL,
    [targetRevisionId] NVARCHAR(128) NULL,
    [revision] BIGINT NOT NULL,
    [sourceUpdatedAt] DATETIME2(3) NOT NULL,
    [movementValue] FLOAT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_daily_aggregate_userId_localDate_unique' AND object_id=OBJECT_ID(N'dbo.daily_aggregate')) CREATE UNIQUE INDEX [IX_daily_aggregate_userId_localDate_unique] ON dbo.[daily_aggregate] ([userId], [localDate]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_daily_aggregate_userId_localDate' AND object_id=OBJECT_ID(N'dbo.daily_aggregate')) CREATE INDEX [IX_daily_aggregate_userId_localDate] ON dbo.[daily_aggregate] ([userId], [localDate]);
GO

-- ============================================================
-- TABLE daily_recommendation (Daily recommendation)
-- Appwrite name: Daily recommendation | enabled=True rowSecurity=True bytesUsed=21507.0
-- ============================================================

IF OBJECT_ID(N'dbo.daily_recommendation',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[daily_recommendation] (
    [recommendationId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_daily_recommendation] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [localDate] NVARCHAR(32) NOT NULL,
    [category] NVARCHAR(64) NOT NULL,
    [title] NVARCHAR(256) NOT NULL,
    [body] NVARCHAR(MAX) NOT NULL,
    [ruleId] NVARCHAR(128) NOT NULL,
    [ruleVersion] BIGINT NOT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [inputRevisionHash] NVARCHAR(128) NOT NULL,
    [confidenceLabel] NVARCHAR(32) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NULL,
    [revision] BIGINT NULL,
    [targetRevision] BIGINT NULL,
    [profileRevision] BIGINT NULL,
    [nutritionStateRevision] BIGINT NULL,
    [policyVersion] NVARCHAR(64) NULL,
    [validFrom] DATETIME2(3) NULL,
    [validUntil] DATETIME2(3) NULL,
    [supersededAt] DATETIME2(3) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_daily_recommendation_userId_localDate_state' AND object_id=OBJECT_ID(N'dbo.daily_recommendation')) CREATE INDEX [IX_daily_recommendation_userId_localDate_state] ON dbo.[daily_recommendation] ([userId], [localDate], [state]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_daily_recommendation_userId_localDate_state_input_uq' AND object_id=OBJECT_ID(N'dbo.daily_recommendation')) CREATE UNIQUE INDEX [IX_daily_recommendation_userId_localDate_state_input_uq] ON dbo.[daily_recommendation] ([userId], [localDate], [state], [inputRevisionHash]);
GO

-- ============================================================
-- TABLE daily_summary (Daily summary)
-- Appwrite name: Daily summary | enabled=True rowSecurity=True bytesUsed=2777.0
-- ============================================================

IF OBJECT_ID(N'dbo.daily_summary',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[daily_summary] (
    [summaryId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_daily_summary] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [deviceId] NVARCHAR(128) NOT NULL,
    [revision] BIGINT NOT NULL,
    [payloadJson] NVARCHAR(MAX) NOT NULL,
    [source] NVARCHAR(32) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_daily_summary_userId_updatedAt' AND object_id=OBJECT_ID(N'dbo.daily_summary')) CREATE INDEX [IX_daily_summary_userId_updatedAt] ON dbo.[daily_summary] ([userId], [updatedAt]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_daily_summary_userId_summaryId_revision_unique' AND object_id=OBJECT_ID(N'dbo.daily_summary')) CREATE UNIQUE INDEX [IX_daily_summary_userId_summaryId_revision_unique] ON dbo.[daily_summary] ([userId], [summaryId], [revision]);
GO

-- ============================================================
-- TABLE data_retention_job (Data retention job)
-- Appwrite name: Data retention job | enabled=True rowSecurity=True bytesUsed=3029.0
-- ============================================================

IF OBJECT_ID(N'dbo.data_retention_job',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[data_retention_job] (
    [retentionJobId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_data_retention_job] PRIMARY KEY,
    [policyKey] NVARCHAR(128) NOT NULL,
    [objectType] NVARCHAR(64) NOT NULL,
    [cutoffAt] DATETIME2(3) NOT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [candidateCount] BIGINT NOT NULL,
    [deletedCount] BIGINT NOT NULL,
    [startedAt] DATETIME2(3) NULL,
    [completedAt] DATETIME2(3) NULL,
    [errorCode] NVARCHAR(128) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_data_retention_job_state_cutoffAt' AND object_id=OBJECT_ID(N'dbo.data_retention_job')) CREATE INDEX [IX_data_retention_job_state_cutoffAt] ON dbo.[data_retention_job] ([state], [cutoffAt]);
GO

-- ============================================================
-- TABLE day_summary (Day summary)
-- Appwrite name: Day summary | enabled=True rowSecurity=True bytesUsed=2626.0
-- ============================================================

IF OBJECT_ID(N'dbo.day_summary',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[day_summary] (
    [daySummaryId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_day_summary] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [localDate] NVARCHAR(32) NOT NULL,
    [hasMeals] BIT NOT NULL,
    [hasWorkout] BIT NOT NULL,
    [energyStatus] NVARCHAR(32) NOT NULL,
    [proteinStatus] NVARCHAR(32) NOT NULL,
    [syncState] NVARCHAR(32) NOT NULL,
    [revision] BIGINT NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_day_summary_userId_localDate_unique' AND object_id=OBJECT_ID(N'dbo.day_summary')) CREATE UNIQUE INDEX [IX_day_summary_userId_localDate_unique] ON dbo.[day_summary] ([userId], [localDate]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_day_summary_userId_localDate' AND object_id=OBJECT_ID(N'dbo.day_summary')) CREATE INDEX [IX_day_summary_userId_localDate] ON dbo.[day_summary] ([userId], [localDate]);
GO

-- ============================================================
-- TABLE deletion_job (Deletion job)
-- Appwrite name: Deletion job | enabled=True rowSecurity=True bytesUsed=3014.0
-- ============================================================

IF OBJECT_ID(N'dbo.deletion_job',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[deletion_job] (
    [deletionJobId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_deletion_job] PRIMARY KEY,
    [deletionRequestId] NVARCHAR(128) NOT NULL,
    [domain] NVARCHAR(64) NOT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [attemptCount] BIGINT NOT NULL,
    [lastAttemptAt] DATETIME2(3) NULL,
    [completedAt] DATETIME2(3) NULL,
    [errorCode] NVARCHAR(128) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_deletion_job_deletionRequestId_domain_unique' AND object_id=OBJECT_ID(N'dbo.deletion_job')) CREATE UNIQUE INDEX [IX_deletion_job_deletionRequestId_domain_unique] ON dbo.[deletion_job] ([deletionRequestId], [domain]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_deletion_job_state_lastAttemptAt' AND object_id=OBJECT_ID(N'dbo.deletion_job')) CREATE INDEX [IX_deletion_job_state_lastAttemptAt] ON dbo.[deletion_job] ([state], [lastAttemptAt]);
GO

-- ============================================================
-- TABLE deletion_request (Deletion request)
-- Appwrite name: Deletion request | enabled=True rowSecurity=True bytesUsed=6605.0
-- ============================================================

IF OBJECT_ID(N'dbo.deletion_request',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[deletion_request] (
    [deletionRequestId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_deletion_request] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [scope] NVARCHAR(64) NOT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [requestedAt] DATETIME2(3) NOT NULL,
    [executeAfter] DATETIME2(3) NOT NULL,
    [canceledAt] DATETIME2(3) NULL,
    [recentAuthAt] DATETIME2(3) NOT NULL,
    [reason] NVARCHAR(1024) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_deletion_request_userId_state' AND object_id=OBJECT_ID(N'dbo.deletion_request')) CREATE INDEX [IX_deletion_request_userId_state] ON dbo.[deletion_request] ([userId], [state]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_deletion_request_executeAfter' AND object_id=OBJECT_ID(N'dbo.deletion_request')) CREATE INDEX [IX_deletion_request_executeAfter] ON dbo.[deletion_request] ([executeAfter]);
GO

-- ============================================================
-- TABLE device (Device)
-- Appwrite name: Device | enabled=True rowSecurity=True bytesUsed=35905.0
-- ============================================================

IF OBJECT_ID(N'dbo.device',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[device] (
    [deviceId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_device] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [platform] NVARCHAR(32) NOT NULL,
    [deviceClass] NVARCHAR(32) NOT NULL,
    [installationIdHash] NVARCHAR(128) NOT NULL,
    [appVersion] NVARCHAR(64) NOT NULL,
    [capabilityJson] NVARCHAR(MAX) NOT NULL,
    [lastSeenAt] DATETIME2(3) NOT NULL,
    [revokedAt] DATETIME2(3) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_device_user_installation_unique' AND object_id=OBJECT_ID(N'dbo.device')) CREATE UNIQUE INDEX [IX_device_user_installation_unique] ON dbo.[device] ([userId], [installationIdHash]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_device_userId_deviceClass' AND object_id=OBJECT_ID(N'dbo.device')) CREATE INDEX [IX_device_userId_deviceClass] ON dbo.[device] ([userId], [deviceClass]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_device_userId_deviceId_unique' AND object_id=OBJECT_ID(N'dbo.device')) CREATE UNIQUE INDEX [IX_device_userId_deviceId_unique] ON dbo.[device] ([userId], [deviceId]);
GO

-- ============================================================
-- TABLE device_command (Device command)
-- Appwrite name: Device command | enabled=True rowSecurity=True bytesUsed=5843.0
-- ============================================================

IF OBJECT_ID(N'dbo.device_command',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[device_command] (
    [commandId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_device_command] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [targetDeviceId] NVARCHAR(128) NOT NULL,
    [commandType] NVARCHAR(64) NOT NULL,
    [objectId] NVARCHAR(128) NULL,
    [objectRevision] BIGINT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [requestedAt] DATETIME2(3) NOT NULL,
    [acknowledgedAt] DATETIME2(3) NULL,
    [errorCode] NVARCHAR(64) NULL,
    [operationId] NVARCHAR(128) NULL,
    [idempotencyKey] NVARCHAR(128) NULL,
    [requestHash] NVARCHAR(128) NULL,
    [payloadHash] NVARCHAR(128) NULL,
    [expiresAt] DATETIME2(3) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_device_command_targetDevice_command_object_rev_uq' AND object_id=OBJECT_ID(N'dbo.device_command')) CREATE UNIQUE INDEX [IX_device_command_targetDevice_command_object_rev_uq] ON dbo.[device_command] ([targetDeviceId], [commandType], [objectId], [objectRevision]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_device_command_userId_state' AND object_id=OBJECT_ID(N'dbo.device_command')) CREATE INDEX [IX_device_command_userId_state] ON dbo.[device_command] ([userId], [state]);
GO

-- ============================================================
-- TABLE device_session (Device session)
-- Appwrite name: Device session | enabled=True rowSecurity=True bytesUsed=3269.0
-- ============================================================

IF OBJECT_ID(N'dbo.device_session',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[device_session] (
    [deviceSessionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_device_session] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [phoneDeviceId] NVARCHAR(128) NOT NULL,
    [watchDeviceId] NVARCHAR(128) NOT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [issuedAt] DATETIME2(3) NOT NULL,
    [expiresAt] DATETIME2(3) NULL,
    [revokedAt] DATETIME2(3) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_device_session_phone_watch_state_unique' AND object_id=OBJECT_ID(N'dbo.device_session')) CREATE UNIQUE INDEX [IX_device_session_phone_watch_state_unique] ON dbo.[device_session] ([phoneDeviceId], [watchDeviceId], [state]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_device_session_userId_state' AND object_id=OBJECT_ID(N'dbo.device_session')) CREATE INDEX [IX_device_session_userId_state] ON dbo.[device_session] ([userId], [state]);
GO

-- ============================================================
-- TABLE entitlement (Entitlement)
-- Appwrite name: Entitlement | enabled=True rowSecurity=True bytesUsed=3277.0
-- ============================================================

IF OBJECT_ID(N'dbo.entitlement',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[entitlement] (
    [entitlementId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_entitlement] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [entitlementKey] NVARCHAR(128) NOT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [sourceSubscriptionId] NVARCHAR(128) NULL,
    [effectiveAt] DATETIME2(3) NOT NULL,
    [expiresAt] DATETIME2(3) NULL,
    [revision] BIGINT NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_entitlement_user_ent_key_uq' AND object_id=OBJECT_ID(N'dbo.entitlement')) CREATE UNIQUE INDEX [IX_entitlement_user_ent_key_uq] ON dbo.[entitlement] ([userId], [entitlementKey]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_entitlement_user_state' AND object_id=OBJECT_ID(N'dbo.entitlement')) CREATE INDEX [IX_entitlement_user_state] ON dbo.[entitlement] ([userId], [state]);
GO

-- ============================================================
-- TABLE exercise_catalog (Exercise catalog)
-- Appwrite name: Exercise catalog | enabled=True rowSecurity=True bytesUsed=65245.0
-- ============================================================

IF OBJECT_ID(N'dbo.exercise_catalog',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[exercise_catalog] (
    [exerciseId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_exercise_catalog] PRIMARY KEY,
    [slug] NVARCHAR(128) NOT NULL,
    [name] NVARCHAR(256) NOT NULL,
    [instructionsJson] NVARCHAR(MAX) NOT NULL,
    [equipmentJson] NVARCHAR(MAX) NOT NULL,
    [mediaLicense] NVARCHAR(256) NULL,
    [mediaObjectId] NVARCHAR(256) NULL,
    [status] NVARCHAR(32) NOT NULL,
    [revision] BIGINT NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL,
    [movementPattern] NVARCHAR(32) NULL,
    [environmentJson] NVARCHAR(2048) NULL,
    [minimumExperience] NVARCHAR(32) NULL,
    [skillLevel] NVARCHAR(32) NULL,
    [substitutionGroup] NVARCHAR(128) NULL,
    [force] NVARCHAR(32) NULL,
    [mechanic] NVARCHAR(32) NULL,
    [category] NVARCHAR(64) NULL,
    [auditStatus] NVARCHAR(32) NULL,
    [mediaAuditStatus] NVARCHAR(64) NULL,
    [sourceRecordHash] NVARCHAR(64) NULL,
    [releaseId] NVARCHAR(128) NULL,
    [sourceLicenseVerified] BIT NULL,
    [fatigueCost] FLOAT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_exercise_catalog_slug_unique' AND object_id=OBJECT_ID(N'dbo.exercise_catalog')) CREATE UNIQUE INDEX [IX_exercise_catalog_slug_unique] ON dbo.[exercise_catalog] ([slug]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_exercise_catalog_status_name' AND object_id=OBJECT_ID(N'dbo.exercise_catalog')) CREATE INDEX [IX_exercise_catalog_status_name] ON dbo.[exercise_catalog] ([status], [name]);
GO

-- ============================================================
-- TABLE exercise_muscle_map (Exercise muscle map)
-- Appwrite name: Exercise muscle map | enabled=True rowSecurity=True bytesUsed=2744.0
-- ============================================================

IF OBJECT_ID(N'dbo.exercise_muscle_map',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[exercise_muscle_map] (
    [mapId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_exercise_muscle_map] PRIMARY KEY,
    [exerciseId] NVARCHAR(128) NOT NULL,
    [muscleGroup] NVARCHAR(64) NOT NULL,
    [role] NVARCHAR(32) NOT NULL,
    [sourceVersion] NVARCHAR(64) NOT NULL,
    [contributionWeight] FLOAT NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_exercise_muscle_map_exerciseId_muscleGroup_role_unique' AND object_id=OBJECT_ID(N'dbo.exercise_muscle_map')) CREATE UNIQUE INDEX [IX_exercise_muscle_map_exerciseId_muscleGroup_role_unique] ON dbo.[exercise_muscle_map] ([exerciseId], [muscleGroup], [role]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_exercise_muscle_map_muscleGroup' AND object_id=OBJECT_ID(N'dbo.exercise_muscle_map')) CREATE INDEX [IX_exercise_muscle_map_muscleGroup] ON dbo.[exercise_muscle_map] ([muscleGroup]);
GO

-- ============================================================
-- TABLE export_artifact (Export artifact)
-- Appwrite name: Export artifact | enabled=True rowSecurity=True bytesUsed=4431.0
-- ============================================================

IF OBJECT_ID(N'dbo.export_artifact',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[export_artifact] (
    [artifactId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_export_artifact] PRIMARY KEY,
    [exportJobId] NVARCHAR(128) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL,
    [bucketId] NVARCHAR(64) NOT NULL,
    [objectId] NVARCHAR(256) NOT NULL,
    [checksum] NVARCHAR(128) NOT NULL,
    [sizeBytes] BIGINT NOT NULL,
    [expiresAt] DATETIME2(3) NOT NULL,
    [downloadedAt] DATETIME2(3) NULL,
    [revokedAt] DATETIME2(3) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_export_artifact_bucketId_objectId_unique' AND object_id=OBJECT_ID(N'dbo.export_artifact')) CREATE UNIQUE INDEX [IX_export_artifact_bucketId_objectId_unique] ON dbo.[export_artifact] ([bucketId], [objectId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_export_artifact_userId_expiresAt' AND object_id=OBJECT_ID(N'dbo.export_artifact')) CREATE INDEX [IX_export_artifact_userId_expiresAt] ON dbo.[export_artifact] ([userId], [expiresAt]);
GO

-- ============================================================
-- TABLE export_job (Export job)
-- Appwrite name: Export job | enabled=True rowSecurity=True bytesUsed=3020.0
-- ============================================================

IF OBJECT_ID(N'dbo.export_job',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[export_job] (
    [exportJobId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_export_job] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [exportType] NVARCHAR(64) NOT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [requestedAt] DATETIME2(3) NOT NULL,
    [startedAt] DATETIME2(3) NULL,
    [completedAt] DATETIME2(3) NULL,
    [expiresAt] DATETIME2(3) NULL,
    [errorCode] NVARCHAR(128) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_export_job_userId_state_requestedAt' AND object_id=OBJECT_ID(N'dbo.export_job')) CREATE INDEX [IX_export_job_userId_state_requestedAt] ON dbo.[export_job] ([userId], [state], [requestedAt]);
GO

-- ============================================================
-- TABLE feature_flag (Feature flag)
-- Appwrite name: Feature flag | enabled=True rowSecurity=True bytesUsed=18881.0
-- ============================================================

IF OBJECT_ID(N'dbo.feature_flag',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[feature_flag] (
    [flagId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_feature_flag] PRIMARY KEY,
    [key] NVARCHAR(128) NOT NULL,
    [environment] NVARCHAR(32) NOT NULL,
    [enabled] BIT NOT NULL,
    [valueJson] NVARCHAR(MAX) NOT NULL,
    [minimumAppVersion] NVARCHAR(64) NULL,
    [updatedAt] DATETIME2(3) NOT NULL,
    [rolloutPercent] FLOAT NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_feature_flag_key_environment_unique' AND object_id=OBJECT_ID(N'dbo.feature_flag')) CREATE UNIQUE INDEX [IX_feature_flag_key_environment_unique] ON dbo.[feature_flag] ([key], [environment]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_feature_flag_environment_enabled' AND object_id=OBJECT_ID(N'dbo.feature_flag')) CREATE INDEX [IX_feature_flag_environment_enabled] ON dbo.[feature_flag] ([environment], [enabled]);
GO

-- ============================================================
-- TABLE food_catalog_alias (Food catalog alias)
-- Appwrite name: Food catalog alias | enabled=True rowSecurity=True bytesUsed=3513.0
-- ============================================================

IF OBJECT_ID(N'dbo.food_catalog_alias',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[food_catalog_alias] (
    [aliasId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_food_catalog_alias] PRIMARY KEY,
    [nutritionSourceId] NVARCHAR(128) NOT NULL,
    [locale] NVARCHAR(32) NOT NULL,
    [aliasNormalized] NVARCHAR(256) NOT NULL,
    [rank] BIGINT NOT NULL,
    [source] NVARCHAR(64) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_food_catalog_alias_locale_aliasNormalized' AND object_id=OBJECT_ID(N'dbo.food_catalog_alias')) CREATE INDEX [IX_food_catalog_alias_locale_aliasNormalized] ON dbo.[food_catalog_alias] ([locale], [aliasNormalized]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_food_catalog_alias_nutritionSourceId' AND object_id=OBJECT_ID(N'dbo.food_catalog_alias')) CREATE INDEX [IX_food_catalog_alias_nutritionSourceId] ON dbo.[food_catalog_alias] ([nutritionSourceId]);
GO

-- ============================================================
-- TABLE health_connection (Health connection)
-- Appwrite name: Health connection | enabled=True rowSecurity=True bytesUsed=35528.0
-- ============================================================

IF OBJECT_ID(N'dbo.health_connection',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[health_connection] (
    [connectionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_health_connection] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [platform] NVARCHAR(32) NOT NULL,
    [sourceName] NVARCHAR(64) NOT NULL,
    [permissionStateJson] NVARCHAR(MAX) NOT NULL,
    [lastSuccessAt] DATETIME2(3) NULL,
    [lastErrorCode] NVARCHAR(64) NULL,
    [revision] BIGINT NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_health_connection_userId_platform_sourceName_unique' AND object_id=OBJECT_ID(N'dbo.health_connection')) CREATE UNIQUE INDEX [IX_health_connection_userId_platform_sourceName_unique] ON dbo.[health_connection] ([userId], [platform], [sourceName]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_health_connection_userId_updatedAt' AND object_id=OBJECT_ID(N'dbo.health_connection')) CREATE INDEX [IX_health_connection_userId_updatedAt] ON dbo.[health_connection] ([userId], [updatedAt]);
GO

-- ============================================================
-- TABLE health_import_cursor (Health import cursor)
-- Appwrite name: Health import cursor | enabled=True rowSecurity=True bytesUsed=35647.0
-- ============================================================

IF OBJECT_ID(N'dbo.health_import_cursor',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[health_import_cursor] (
    [cursorId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_health_import_cursor] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [connectionId] NVARCHAR(128) NOT NULL,
    [dataType] NVARCHAR(64) NOT NULL,
    [opaqueCursorEncrypted] NVARCHAR(MAX) NULL,
    [lastWindowEnd] DATETIME2(3) NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_health_import_cursor_connectionId_dataType_unique' AND object_id=OBJECT_ID(N'dbo.health_import_cursor')) CREATE UNIQUE INDEX [IX_health_import_cursor_connectionId_dataType_unique] ON dbo.[health_import_cursor] ([connectionId], [dataType]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_health_import_cursor_userId' AND object_id=OBJECT_ID(N'dbo.health_import_cursor')) CREATE INDEX [IX_health_import_cursor_userId] ON dbo.[health_import_cursor] ([userId]);
GO

-- ============================================================
-- TABLE health_sample_summary (Health sample summary)
-- Appwrite name: Health sample summary | enabled=True rowSecurity=True bytesUsed=3793.0
-- ============================================================

IF OBJECT_ID(N'dbo.health_sample_summary',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[health_sample_summary] (
    [summaryId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_health_sample_summary] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [localDate] NVARCHAR(32) NOT NULL,
    [dataType] NVARCHAR(64) NOT NULL,
    [unit] NVARCHAR(32) NOT NULL,
    [sourcePlatform] NVARCHAR(32) NOT NULL,
    [sourceDevice] NVARCHAR(128) NULL,
    [provenanceHash] NVARCHAR(128) NOT NULL,
    [revision] BIGINT NOT NULL,
    [measuredStart] DATETIME2(3) NOT NULL,
    [measuredEnd] DATETIME2(3) NOT NULL,
    [value] FLOAT NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_health_sample_summary_userId_dataType_provenanceHash_uq' AND object_id=OBJECT_ID(N'dbo.health_sample_summary')) CREATE UNIQUE INDEX [IX_health_sample_summary_userId_dataType_provenanceHash_uq] ON dbo.[health_sample_summary] ([userId], [dataType], [provenanceHash]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_health_sample_summary_userId_localDate_dataType' AND object_id=OBJECT_ID(N'dbo.health_sample_summary')) CREATE INDEX [IX_health_sample_summary_userId_localDate_dataType] ON dbo.[health_sample_summary] ([userId], [localDate], [dataType]);
GO

-- ============================================================
-- TABLE idempotency_key (Idempotency key)
-- Appwrite name: Idempotency key | enabled=True rowSecurity=True bytesUsed=4801.0
-- ============================================================

IF OBJECT_ID(N'dbo.idempotency_key',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[idempotency_key] (
    [keyId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_idempotency_key] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [scope] NVARCHAR(128) NOT NULL,
    [keyHash] NVARCHAR(128) NOT NULL,
    [requestHash] NVARCHAR(128) NOT NULL,
    [responseRef] NVARCHAR(256) NULL,
    [state] NVARCHAR(32) NOT NULL,
    [expiresAt] DATETIME2(3) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_idempotency_key_idempotency_user_scope_key_unique' AND object_id=OBJECT_ID(N'dbo.idempotency_key')) CREATE UNIQUE INDEX [IX_idempotency_key_idempotency_user_scope_key_unique] ON dbo.[idempotency_key] ([userId], [scope], [keyHash]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_idempotency_key_idempotency_expiresAt' AND object_id=OBJECT_ID(N'dbo.idempotency_key')) CREATE INDEX [IX_idempotency_key_idempotency_expiresAt] ON dbo.[idempotency_key] ([expiresAt]);
GO

-- ============================================================
-- TABLE meal (Meal)
-- Appwrite name: Meal | enabled=True rowSecurity=True bytesUsed=2627.0
-- ============================================================

IF OBJECT_ID(N'dbo.meal',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal] (
    [mealId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_meal] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [sourceDraftId] NVARCHAR(128) NOT NULL,
    [confirmedAt] DATETIME2(3) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_userId_confirmedAt' AND object_id=OBJECT_ID(N'dbo.meal')) CREATE INDEX [IX_meal_userId_confirmedAt] ON dbo.[meal] ([userId], [confirmedAt]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_userId_mealId_unique' AND object_id=OBJECT_ID(N'dbo.meal')) CREATE UNIQUE INDEX [IX_meal_userId_mealId_unique] ON dbo.[meal] ([userId], [mealId]);
GO

-- ============================================================
-- TABLE meal_analysis_request (Meal analysis request)
-- Appwrite name: Meal analysis request | enabled=True rowSecurity=True bytesUsed=3527.0
-- ============================================================

IF OBJECT_ID(N'dbo.meal_analysis_request',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_analysis_request] (
    [requestId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_meal_analysis_request] PRIMARY KEY,
    [draftId] NVARCHAR(128) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL,
    [provider] NVARCHAR(64) NOT NULL,
    [status] NVARCHAR(32) NOT NULL,
    [attempts] BIGINT NOT NULL,
    [requestedAt] DATETIME2(3) NOT NULL,
    [completedAt] DATETIME2(3) NULL,
    [errorCode] NVARCHAR(128) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_analysis_request_userId_requestedAt' AND object_id=OBJECT_ID(N'dbo.meal_analysis_request')) CREATE INDEX [IX_meal_analysis_request_userId_requestedAt] ON dbo.[meal_analysis_request] ([userId], [requestedAt]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_analysis_request_userId_requestId_unique' AND object_id=OBJECT_ID(N'dbo.meal_analysis_request')) CREATE UNIQUE INDEX [IX_meal_analysis_request_userId_requestId_unique] ON dbo.[meal_analysis_request] ([userId], [requestId]);
GO

-- ============================================================
-- TABLE meal_draft (Meal draft)
-- Appwrite name: Meal draft | enabled=True rowSecurity=True bytesUsed=3775.0
-- ============================================================

IF OBJECT_ID(N'dbo.meal_draft',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_draft] (
    [draftId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_meal_draft] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [deviceId] NVARCHAR(128) NOT NULL,
    [mediaId] NVARCHAR(256) NULL,
    [status] NVARCHAR(32) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_draft_userId_updatedAt' AND object_id=OBJECT_ID(N'dbo.meal_draft')) CREATE INDEX [IX_meal_draft_userId_updatedAt] ON dbo.[meal_draft] ([userId], [updatedAt]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_draft_userId_draftId_unique' AND object_id=OBJECT_ID(N'dbo.meal_draft')) CREATE UNIQUE INDEX [IX_meal_draft_userId_draftId_unique] ON dbo.[meal_draft] ([userId], [draftId]);
GO

-- ============================================================
-- TABLE meal_draft_revision (Meal draft revision)
-- Appwrite name: Meal draft revision | enabled=True rowSecurity=True bytesUsed=2641.0
-- ============================================================

IF OBJECT_ID(N'dbo.meal_draft_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_draft_revision] (
    [draftRevisionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_meal_draft_revision] PRIMARY KEY,
    [draftId] NVARCHAR(128) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL,
    [revision] BIGINT NOT NULL,
    [payloadJson] NVARCHAR(MAX) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_draft_revision_userId_draftId_revision_unique' AND object_id=OBJECT_ID(N'dbo.meal_draft_revision')) CREATE UNIQUE INDEX [IX_meal_draft_revision_userId_draftId_revision_unique] ON dbo.[meal_draft_revision] ([userId], [draftId], [revision]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_draft_revision_userId_createdAt' AND object_id=OBJECT_ID(N'dbo.meal_draft_revision')) CREATE INDEX [IX_meal_draft_revision_userId_createdAt] ON dbo.[meal_draft_revision] ([userId], [createdAt]);
GO

-- ============================================================
-- TABLE meal_item (Meal item)
-- Appwrite name: Meal item | enabled=True rowSecurity=True bytesUsed=20162.0
-- ============================================================

IF OBJECT_ID(N'dbo.meal_item',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_item] (
    [mealItemId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_meal_item] PRIMARY KEY,
    [mealId] NVARCHAR(128) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL,
    [name] NVARCHAR(256) NOT NULL,
    [quantityUnit] NVARCHAR(32) NOT NULL,
    [nutritionJson] NVARCHAR(MAX) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [quantity] FLOAT NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_item_userId_mealId' AND object_id=OBJECT_ID(N'dbo.meal_item')) CREATE INDEX [IX_meal_item_userId_mealId] ON dbo.[meal_item] ([userId], [mealId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_item_userId_mealItemId_unique' AND object_id=OBJECT_ID(N'dbo.meal_item')) CREATE UNIQUE INDEX [IX_meal_item_userId_mealItemId_unique] ON dbo.[meal_item] ([userId], [mealItemId]);
GO

-- ============================================================
-- TABLE meal_item_revision (Meal item revision)
-- Appwrite name: Meal item revision | enabled=True rowSecurity=True bytesUsed=35512.0
-- ============================================================

IF OBJECT_ID(N'dbo.meal_item_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_item_revision] (
    [itemRevisionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_meal_item_revision] PRIMARY KEY,
    [mealRevisionId] NVARCHAR(128) NOT NULL,
    [logicalItemId] NVARCHAR(128) NOT NULL,
    [operation] NVARCHAR(32) NOT NULL,
    [dataJson] NVARCHAR(MAX) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_item_revision_mealRevisionId_logicalItemId' AND object_id=OBJECT_ID(N'dbo.meal_item_revision')) CREATE INDEX [IX_meal_item_revision_mealRevisionId_logicalItemId] ON dbo.[meal_item_revision] ([mealRevisionId], [logicalItemId]);
GO

-- ============================================================
-- TABLE meal_media (Meal media)
-- Appwrite name: Meal media | enabled=True rowSecurity=True bytesUsed=5210.0
-- ============================================================

IF OBJECT_ID(N'dbo.meal_media',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_media] (
    [mediaId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_meal_media] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [draftId] NVARCHAR(128) NULL,
    [mealId] NVARCHAR(128) NULL,
    [bucketId] NVARCHAR(64) NOT NULL,
    [objectId] NVARCHAR(256) NOT NULL,
    [variant] NVARCHAR(32) NOT NULL,
    [checksum] NVARCHAR(128) NOT NULL,
    [width] BIGINT NULL,
    [height] BIGINT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [deleteAfter] DATETIME2(3) NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [deletedAt] DATETIME2(3) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_media_bucketId_objectId_unique' AND object_id=OBJECT_ID(N'dbo.meal_media')) CREATE UNIQUE INDEX [IX_meal_media_bucketId_objectId_unique] ON dbo.[meal_media] ([bucketId], [objectId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_media_userId_state_deleteAfter' AND object_id=OBJECT_ID(N'dbo.meal_media')) CREATE INDEX [IX_meal_media_userId_state_deleteAfter] ON dbo.[meal_media] ([userId], [state], [deleteAfter]);
GO

-- ============================================================
-- TABLE meal_revision (Meal revision)
-- Appwrite name: Meal revision | enabled=True rowSecurity=True bytesUsed=3667.0
-- ============================================================

IF OBJECT_ID(N'dbo.meal_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_revision] (
    [mealRevisionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_meal_revision] PRIMARY KEY,
    [mealId] NVARCHAR(128) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL,
    [revision] BIGINT NOT NULL,
    [payloadJson] NVARCHAR(MAX) NOT NULL,
    [payloadHash] NVARCHAR(128) NOT NULL,
    [idempotencyKey] NVARCHAR(128) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_revision_meal_revision_user_meal_rev_1vfyvgl' AND object_id=OBJECT_ID(N'dbo.meal_revision')) CREATE UNIQUE INDEX [IX_meal_revision_meal_revision_user_meal_rev_1vfyvgl] ON dbo.[meal_revision] ([userId], [mealId], [revision]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_revision_meal_revision_user_idempote_84jj0r' AND object_id=OBJECT_ID(N'dbo.meal_revision')) CREATE UNIQUE INDEX [IX_meal_revision_meal_revision_user_idempote_84jj0r] ON dbo.[meal_revision] ([userId], [idempotencyKey]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_revision_meal_revision_user_createdAt' AND object_id=OBJECT_ID(N'dbo.meal_revision')) CREATE INDEX [IX_meal_revision_meal_revision_user_createdAt] ON dbo.[meal_revision] ([userId], [createdAt]);
GO

-- ============================================================
-- TABLE meal_tombstone (Meal tombstone)
-- Appwrite name: Meal tombstone | enabled=True rowSecurity=True bytesUsed=3141.0
-- ============================================================

IF OBJECT_ID(N'dbo.meal_tombstone',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_tombstone] (
    [tombstoneId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_meal_tombstone] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [mealId] NVARCHAR(128) NOT NULL,
    [deletedRevision] BIGINT NOT NULL,
    [reason] NVARCHAR(128) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [purgeAfter] DATETIME2(3) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_tombstone_userId_mealId_deletedRevision_unique' AND object_id=OBJECT_ID(N'dbo.meal_tombstone')) CREATE UNIQUE INDEX [IX_meal_tombstone_userId_mealId_deletedRevision_unique] ON dbo.[meal_tombstone] ([userId], [mealId], [deletedRevision]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_tombstone_userId_createdAt' AND object_id=OBJECT_ID(N'dbo.meal_tombstone')) CREATE INDEX [IX_meal_tombstone_userId_createdAt] ON dbo.[meal_tombstone] ([userId], [createdAt]);
GO

-- ============================================================
-- TABLE model_configuration (Model configuration)
-- Appwrite name: Model configuration | enabled=True rowSecurity=True bytesUsed=19170.0
-- ============================================================

IF OBJECT_ID(N'dbo.model_configuration',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[model_configuration] (
    [priority] BIGINT NULL,
    [providerOptionsJson] NVARCHAR(2048) NULL,
    [modelConfigId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_model_configuration] PRIMARY KEY,
    [taskType] NVARCHAR(64) NOT NULL,
    [provider] NVARCHAR(64) NOT NULL,
    [modelName] NVARCHAR(128) NOT NULL,
    [temperature] FLOAT NOT NULL,
    [maxOutputTokens] BIGINT NOT NULL,
    [timeoutMs] BIGINT NOT NULL,
    [retryPolicyJson] NVARCHAR(2048) NOT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_model_configuration_taskType_state' AND object_id=OBJECT_ID(N'dbo.model_configuration')) CREATE INDEX [IX_model_configuration_taskType_state] ON dbo.[model_configuration] ([taskType], [state]);
GO

-- ============================================================
-- TABLE muscle_load (Muscle load)
-- Appwrite name: Muscle load | enabled=True rowSecurity=True bytesUsed=3257.0
-- ============================================================

IF OBJECT_ID(N'dbo.muscle_load',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[muscle_load] (
    [muscleLoadId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_muscle_load] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [sessionId] NVARCHAR(128) NOT NULL,
    [localDate] NVARCHAR(32) NOT NULL,
    [muscleGroup] NVARCHAR(64) NOT NULL,
    [algorithmVersion] NVARCHAR(64) NOT NULL,
    [contribution] FLOAT NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_muscle_load_session_muscle_algo_uq' AND object_id=OBJECT_ID(N'dbo.muscle_load')) CREATE UNIQUE INDEX [IX_muscle_load_session_muscle_algo_uq] ON dbo.[muscle_load] ([sessionId], [muscleGroup], [algorithmVersion]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_muscle_load_userId_localDate_muscleGroup' AND object_id=OBJECT_ID(N'dbo.muscle_load')) CREATE INDEX [IX_muscle_load_userId_localDate_muscleGroup] ON dbo.[muscle_load] ([userId], [localDate], [muscleGroup]);
GO

-- ============================================================
-- TABLE notification (Notification)
-- Appwrite name: Notification | enabled=True rowSecurity=True bytesUsed=22354.0
-- ============================================================

IF OBJECT_ID(N'dbo.notification',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[notification] (
    [notificationId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_notification] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [type] NVARCHAR(64) NOT NULL,
    [title] NVARCHAR(256) NOT NULL,
    [body] NVARCHAR(MAX) NOT NULL,
    [deepLink] NVARCHAR(512) NULL,
    [objectId] NVARCHAR(128) NULL,
    [priority] BIGINT NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [readAt] DATETIME2(3) NULL,
    [expiresAt] DATETIME2(3) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_notification_userId_readAt_createdAt' AND object_id=OBJECT_ID(N'dbo.notification')) CREATE INDEX [IX_notification_userId_readAt_createdAt] ON dbo.[notification] ([userId], [readAt], [createdAt]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_notification_expiresAt' AND object_id=OBJECT_ID(N'dbo.notification')) CREATE INDEX [IX_notification_expiresAt] ON dbo.[notification] ([expiresAt]);
GO

-- ============================================================
-- TABLE notification_delivery (Notification delivery)
-- Appwrite name: Notification delivery | enabled=True rowSecurity=True bytesUsed=4033.0
-- ============================================================

IF OBJECT_ID(N'dbo.notification_delivery',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[notification_delivery] (
    [deliveryId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_notification_delivery] PRIMARY KEY,
    [notificationId] NVARCHAR(128) NOT NULL,
    [deviceId] NVARCHAR(128) NOT NULL,
    [provider] NVARCHAR(64) NOT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [attemptCount] BIGINT NOT NULL,
    [lastAttemptAt] DATETIME2(3) NULL,
    [providerMessageIdHash] NVARCHAR(128) NULL,
    [errorCode] NVARCHAR(128) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_notification_delivery_notificationId_deviceId_unique' AND object_id=OBJECT_ID(N'dbo.notification_delivery')) CREATE UNIQUE INDEX [IX_notification_delivery_notificationId_deviceId_unique] ON dbo.[notification_delivery] ([notificationId], [deviceId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_notification_delivery_state_lastAttemptAt' AND object_id=OBJECT_ID(N'dbo.notification_delivery')) CREATE INDEX [IX_notification_delivery_state_lastAttemptAt] ON dbo.[notification_delivery] ([state], [lastAttemptAt]);
GO

-- ============================================================
-- TABLE nutrition_source_cache (Nutrition source cache)
-- Appwrite name: Nutrition source cache | enabled=True rowSecurity=True bytesUsed=38852.0
-- ============================================================

IF OBJECT_ID(N'dbo.nutrition_source_cache',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[nutrition_source_cache] (
    [nutritionSourceId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_nutrition_source_cache] PRIMARY KEY,
    [provider] NVARCHAR(64) NOT NULL,
    [providerRecordId] NVARCHAR(256) NOT NULL,
    [locale] NVARCHAR(32) NOT NULL,
    [description] NVARCHAR(512) NOT NULL,
    [basis100gJson] NVARCHAR(MAX) NOT NULL,
    [rawVersion] NVARCHAR(128) NOT NULL,
    [fetchedAt] DATETIME2(3) NOT NULL,
    [expiresAt] DATETIME2(3) NOT NULL,
    [checksum] NVARCHAR(128) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_nutrition_source_cache_provider_record_version_uq' AND object_id=OBJECT_ID(N'dbo.nutrition_source_cache')) CREATE UNIQUE INDEX [IX_nutrition_source_cache_provider_record_version_uq] ON dbo.[nutrition_source_cache] ([provider], [providerRecordId], [rawVersion]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_nutrition_source_cache_description' AND object_id=OBJECT_ID(N'dbo.nutrition_source_cache')) CREATE INDEX [IX_nutrition_source_cache_description] ON dbo.[nutrition_source_cache] ([description]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_nutrition_source_cache_expiresAt' AND object_id=OBJECT_ID(N'dbo.nutrition_source_cache')) CREATE INDEX [IX_nutrition_source_cache_expiresAt] ON dbo.[nutrition_source_cache] ([expiresAt]);
GO

-- ============================================================
-- TABLE onboarding_progress (Onboarding progress)
-- Appwrite name: Onboarding progress | enabled=True rowSecurity=True bytesUsed=50767.0
-- ============================================================

IF OBJECT_ID(N'dbo.onboarding_progress',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[onboarding_progress] (
    [userId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_onboarding_progress] PRIMARY KEY,
    [currentStep] BIGINT NOT NULL,
    [completedStepsJson] NVARCHAR(MAX) NOT NULL,
    [draftValuesJson] NVARCHAR(MAX) NOT NULL,
    [schemaVersion] BIGINT NOT NULL,
    [revision] BIGINT NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_onboarding_progress_userId_unique' AND object_id=OBJECT_ID(N'dbo.onboarding_progress')) CREATE UNIQUE INDEX [IX_onboarding_progress_userId_unique] ON dbo.[onboarding_progress] ([userId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_onboarding_progress_updatedAt' AND object_id=OBJECT_ID(N'dbo.onboarding_progress')) CREATE INDEX [IX_onboarding_progress_updatedAt] ON dbo.[onboarding_progress] ([updatedAt]);
GO

-- ============================================================
-- TABLE personal_food (Personal food)
-- Appwrite name: Personal food | enabled=True rowSecurity=True bytesUsed=7423.0
-- ============================================================

IF OBJECT_ID(N'dbo.personal_food',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[personal_food] (
    [personalFoodId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_personal_food] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [name] NVARCHAR(256) NOT NULL,
    [basisUnit] NVARCHAR(32) NOT NULL,
    [energyKcal] BIGINT NOT NULL,
    [provenanceNote] NVARCHAR(1024) NULL,
    [revision] BIGINT NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL,
    [deletedAt] DATETIME2(3) NULL,
    [basisAmount] FLOAT NOT NULL,
    [proteinG] FLOAT NOT NULL,
    [carbG] FLOAT NOT NULL,
    [fatG] FLOAT NOT NULL,
    [fiberG] FLOAT NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_personal_food_userId_name' AND object_id=OBJECT_ID(N'dbo.personal_food')) CREATE INDEX [IX_personal_food_userId_name] ON dbo.[personal_food] ([userId], [name]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_personal_food_userId_updatedAt' AND object_id=OBJECT_ID(N'dbo.personal_food')) CREATE INDEX [IX_personal_food_userId_updatedAt] ON dbo.[personal_food] ([userId], [updatedAt]);
GO

-- ============================================================
-- TABLE privacy_preference (Privacy preference)
-- Appwrite name: Privacy preference | enabled=True rowSecurity=True bytesUsed=1735.0
-- ============================================================

IF OBJECT_ID(N'dbo.privacy_preference',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[privacy_preference] (
    [userId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_privacy_preference] PRIMARY KEY,
    [retainMealImages] BIT NOT NULL,
    [imageRetentionDays] BIGINT NULL,
    [analyticsAllowed] BIT NOT NULL,
    [modelImprovementAllowed] BIT NOT NULL,
    [exportLocale] NVARCHAR(32) NOT NULL,
    [revision] BIGINT NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_privacy_preference_userId_unique' AND object_id=OBJECT_ID(N'dbo.privacy_preference')) CREATE UNIQUE INDEX [IX_privacy_preference_userId_unique] ON dbo.[privacy_preference] ([userId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_privacy_preference_updatedAt' AND object_id=OBJECT_ID(N'dbo.privacy_preference')) CREATE INDEX [IX_privacy_preference_updatedAt] ON dbo.[privacy_preference] ([updatedAt]);
GO

-- ============================================================
-- TABLE progress_insight (Progress insight)
-- Appwrite name: Progress insight | enabled=True rowSecurity=True bytesUsed=19658.0
-- ============================================================

IF OBJECT_ID(N'dbo.progress_insight',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[progress_insight] (
    [insightId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_progress_insight] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [periodStart] NVARCHAR(32) NOT NULL,
    [periodEnd] NVARCHAR(32) NOT NULL,
    [category] NVARCHAR(64) NOT NULL,
    [resultText] NVARCHAR(MAX) NOT NULL,
    [evidenceHash] NVARCHAR(128) NOT NULL,
    [ruleVersion] BIGINT NOT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_progress_insight_userId_periodStart_periodEnd' AND object_id=OBJECT_ID(N'dbo.progress_insight')) CREATE INDEX [IX_progress_insight_userId_periodStart_periodEnd] ON dbo.[progress_insight] ([userId], [periodStart], [periodEnd]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_progress_insight_state' AND object_id=OBJECT_ID(N'dbo.progress_insight')) CREATE INDEX [IX_progress_insight_state] ON dbo.[progress_insight] ([state]);
GO

-- ============================================================
-- TABLE prompt_template (Prompt template)
-- Appwrite name: Prompt template | enabled=True rowSecurity=True bytesUsed=11713.0
-- ============================================================

IF OBJECT_ID(N'dbo.prompt_template',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[prompt_template] (
    [promptId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_prompt_template] PRIMARY KEY,
    [taskType] NVARCHAR(64) NOT NULL,
    [name] NVARCHAR(256) NOT NULL,
    [description] NVARCHAR(2048) NOT NULL,
    [activeVersionId] NVARCHAR(128) NULL,
    [status] NVARCHAR(32) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_prompt_template_taskType_unique' AND object_id=OBJECT_ID(N'dbo.prompt_template')) CREATE UNIQUE INDEX [IX_prompt_template_taskType_unique] ON dbo.[prompt_template] ([taskType]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_prompt_template_status' AND object_id=OBJECT_ID(N'dbo.prompt_template')) CREATE INDEX [IX_prompt_template_status] ON dbo.[prompt_template] ([status]);
GO

-- ============================================================
-- TABLE prompt_version (Prompt version)
-- Appwrite name: Prompt version | enabled=True rowSecurity=True bytesUsed=27603.0
-- ============================================================

IF OBJECT_ID(N'dbo.prompt_version',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[prompt_version] (
    [promptVersionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_prompt_version] PRIMARY KEY,
    [promptId] NVARCHAR(128) NOT NULL,
    [version] BIGINT NOT NULL,
    [systemInstructionEncrypted] NVARCHAR(2048) NOT NULL,
    [jsonSchemaJson] NVARCHAR(2048) NOT NULL,
    [safetyRulesJson] NVARCHAR(2048) NOT NULL,
    [testSuiteVersion] NVARCHAR(64) NOT NULL,
    [checksum] NVARCHAR(128) NOT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [activatedAt] DATETIME2(3) NULL,
    [retiredAt] DATETIME2(3) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_prompt_version_promptId_version_unique' AND object_id=OBJECT_ID(N'dbo.prompt_version')) CREATE UNIQUE INDEX [IX_prompt_version_promptId_version_unique] ON dbo.[prompt_version] ([promptId], [version]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_prompt_version_state' AND object_id=OBJECT_ID(N'dbo.prompt_version')) CREATE INDEX [IX_prompt_version_state] ON dbo.[prompt_version] ([state]);
GO

-- ============================================================
-- TABLE provider_call (Provider call)
-- Appwrite name: Provider call | enabled=True rowSecurity=True bytesUsed=5332.0
-- ============================================================

IF OBJECT_ID(N'dbo.provider_call',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[provider_call] (
    [providerCallId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_provider_call] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [taskType] NVARCHAR(64) NOT NULL,
    [requestId] NVARCHAR(128) NOT NULL,
    [provider] NVARCHAR(64) NOT NULL,
    [model] NVARCHAR(128) NOT NULL,
    [promptVersionId] NVARCHAR(128) NULL,
    [inputHash] NVARCHAR(128) NOT NULL,
    [outputHash] NVARCHAR(128) NULL,
    [status] NVARCHAR(32) NOT NULL,
    [latencyMs] BIGINT NULL,
    [tokenIn] BIGINT NULL,
    [tokenOut] BIGINT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_provider_call_requestId' AND object_id=OBJECT_ID(N'dbo.provider_call')) CREATE INDEX [IX_provider_call_requestId] ON dbo.[provider_call] ([requestId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_provider_call_status_createdAt' AND object_id=OBJECT_ID(N'dbo.provider_call')) CREATE INDEX [IX_provider_call_status_createdAt] ON dbo.[provider_call] ([status], [createdAt]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_provider_call_userId_createdAt' AND object_id=OBJECT_ID(N'dbo.provider_call')) CREATE INDEX [IX_provider_call_userId_createdAt] ON dbo.[provider_call] ([userId], [createdAt]);
GO

-- ============================================================
-- TABLE purchase_event (Purchase Event)
-- Appwrite name: Purchase Event | enabled=True rowSecurity=True bytesUsed=4802.0
-- ============================================================

IF OBJECT_ID(N'dbo.purchase_event',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[purchase_event] (
    [purchaseEventId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_purchase_event] PRIMARY KEY,
    [userId] NVARCHAR(128) NULL,
    [provider] NVARCHAR(64) NOT NULL,
    [externalEventIdHash] NVARCHAR(128) NOT NULL,
    [eventType] NVARCHAR(64) NOT NULL,
    [productId] NVARCHAR(128) NULL,
    [subscriptionId] NVARCHAR(128) NULL,
    [signedPayloadHash] NVARCHAR(128) NOT NULL,
    [occurredAt] DATETIME2(3) NOT NULL,
    [receivedAt] DATETIME2(3) NOT NULL,
    [verificationState] NVARCHAR(32) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_purchase_event_provider_event_uq' AND object_id=OBJECT_ID(N'dbo.purchase_event')) CREATE UNIQUE INDEX [IX_purchase_event_provider_event_uq] ON dbo.[purchase_event] ([provider], [externalEventIdHash]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_purchase_event_subscription_time' AND object_id=OBJECT_ID(N'dbo.purchase_event')) CREATE INDEX [IX_purchase_event_subscription_time] ON dbo.[purchase_event] ([subscriptionId], [occurredAt]);
GO

-- ============================================================
-- TABLE recommendation_evidence (Recommendation evidence)
-- Appwrite name: Recommendation evidence | enabled=True rowSecurity=True bytesUsed=19263.0
-- ============================================================

IF OBJECT_ID(N'dbo.recommendation_evidence',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[recommendation_evidence] (
    [evidenceId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_recommendation_evidence] PRIMARY KEY,
    [recommendationId] NVARCHAR(128) NOT NULL,
    [evidenceType] NVARCHAR(64) NOT NULL,
    [objectId] NVARCHAR(128) NOT NULL,
    [summaryJson] NVARCHAR(MAX) NOT NULL,
    [sourceUpdatedAt] DATETIME2(3) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_recommendation_evidence_recommendationId' AND object_id=OBJECT_ID(N'dbo.recommendation_evidence')) CREATE INDEX [IX_recommendation_evidence_recommendationId] ON dbo.[recommendation_evidence] ([recommendationId]);
GO

-- ============================================================
-- TABLE report (Report)
-- Appwrite name: Report | enabled=True rowSecurity=True bytesUsed=3264.0
-- ============================================================

IF OBJECT_ID(N'dbo.report',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[report] (
    [reportId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_report] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [reportType] NVARCHAR(64) NOT NULL,
    [periodStart] NVARCHAR(32) NOT NULL,
    [periodEnd] NVARCHAR(32) NOT NULL,
    [status] NVARCHAR(32) NOT NULL,
    [sourceRevisionHash] NVARCHAR(128) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [completedAt] DATETIME2(3) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_report_report_scope_source_uq' AND object_id=OBJECT_ID(N'dbo.report')) CREATE UNIQUE INDEX [IX_report_report_scope_source_uq] ON dbo.[report] ([userId], [reportType], [periodStart], [periodEnd], [sourceRevisionHash]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_report_userId_status' AND object_id=OBJECT_ID(N'dbo.report')) CREATE INDEX [IX_report_userId_status] ON dbo.[report] ([userId], [status]);
GO

-- ============================================================
-- TABLE report_evidence (Report evidence)
-- Appwrite name: Report evidence | enabled=True rowSecurity=True bytesUsed=36154.0
-- ============================================================

IF OBJECT_ID(N'dbo.report_evidence',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[report_evidence] (
    [reportEvidenceId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_report_evidence] PRIMARY KEY,
    [reportId] NVARCHAR(128) NOT NULL,
    [sectionId] NVARCHAR(128) NOT NULL,
    [sourceType] NVARCHAR(64) NOT NULL,
    [sourceObjectId] NVARCHAR(128) NOT NULL,
    [sourceRevision] BIGINT NOT NULL,
    [summaryJson] NVARCHAR(MAX) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_report_evidence_reportId' AND object_id=OBJECT_ID(N'dbo.report_evidence')) CREATE INDEX [IX_report_evidence_reportId] ON dbo.[report_evidence] ([reportId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_report_evidence_sectionId' AND object_id=OBJECT_ID(N'dbo.report_evidence')) CREATE INDEX [IX_report_evidence_sectionId] ON dbo.[report_evidence] ([sectionId]);
GO

-- ============================================================
-- TABLE report_section (Report section)
-- Appwrite name: Report section | enabled=True rowSecurity=True bytesUsed=60734.0
-- ============================================================

IF OBJECT_ID(N'dbo.report_section',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[report_section] (
    [sectionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_report_section] PRIMARY KEY,
    [reportId] NVARCHAR(128) NOT NULL,
    [sortOrder] BIGINT NOT NULL,
    [sectionType] NVARCHAR(64) NOT NULL,
    [title] NVARCHAR(256) NOT NULL,
    [narrative] NVARCHAR(MAX) NOT NULL,
    [chartSpecJson] NVARCHAR(MAX) NULL,
    [provenanceJson] NVARCHAR(2048) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_report_section_reportId_sortOrder' AND object_id=OBJECT_ID(N'dbo.report_section')) CREATE INDEX [IX_report_section_reportId_sortOrder] ON dbo.[report_section] ([reportId], [sortOrder]);
GO

-- ============================================================
-- TABLE saved_meal (Saved meals)
-- Appwrite name: Saved meals | enabled=True rowSecurity=True bytesUsed=2539.0
-- ============================================================

IF OBJECT_ID(N'dbo.saved_meal',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[saved_meal] (
    [savedMealId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_saved_meal] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [currentRevision] BIGINT NOT NULL,
    [totalEnergyKcal] FLOAT NOT NULL,
    [totalProteinG] FLOAT NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL,
    [deletedAt] DATETIME2(3) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_saved_meal_userId_updatedAt' AND object_id=OBJECT_ID(N'dbo.saved_meal')) CREATE INDEX [IX_saved_meal_userId_updatedAt] ON dbo.[saved_meal] ([userId], [updatedAt]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_saved_meal_userId_name' AND object_id=OBJECT_ID(N'dbo.saved_meal')) CREATE INDEX [IX_saved_meal_userId_name] ON dbo.[saved_meal] ([userId], [name]);
GO

-- ============================================================
-- TABLE saved_meal_item (Saved meal items)
-- Appwrite name: Saved meal items | enabled=True rowSecurity=True bytesUsed=3976.0
-- ============================================================

IF OBJECT_ID(N'dbo.saved_meal_item',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[saved_meal_item] (
    [savedMealItemId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_saved_meal_item] PRIMARY KEY,
    [savedMealId] NVARCHAR(128) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL,
    [sortOrder] BIGINT NOT NULL,
    [foodRef] NVARCHAR(128) NULL,
    [displayName] NVARCHAR(200) NOT NULL,
    [grams] FLOAT NULL,
    [portionJson] NVARCHAR(MAX) NOT NULL,
    [nutrientsJson] NVARCHAR(MAX) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_saved_meal_item_savedMealId_sortOrder' AND object_id=OBJECT_ID(N'dbo.saved_meal_item')) CREATE INDEX [IX_saved_meal_item_savedMealId_sortOrder] ON dbo.[saved_meal_item] ([savedMealId], [sortOrder]);
GO

-- ============================================================
-- TABLE schema_migrations (Schema migrations)
-- Appwrite name: Schema migrations | enabled=True rowSecurity=True bytesUsed=18630.0
-- ============================================================

IF OBJECT_ID(N'dbo.schema_migrations',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[schema_migrations] (
    [migrationId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_schema_migrations] PRIMARY KEY,
    [schemaVersion] BIGINT NOT NULL,
    [checksum] NVARCHAR(128) NOT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [resourceSummaryJson] NVARCHAR(MAX) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_schema_migrations_migrationId_schemaVersion_unique' AND object_id=OBJECT_ID(N'dbo.schema_migrations')) CREATE UNIQUE INDEX [IX_schema_migrations_migrationId_schemaVersion_unique] ON dbo.[schema_migrations] ([migrationId], [schemaVersion]);
GO

-- ============================================================
-- TABLE serving_prior_observation (Serving prior observation)
-- Appwrite name: Serving prior observation | enabled=True rowSecurity=True bytesUsed=8672.0
-- ============================================================

IF OBJECT_ID(N'dbo.serving_prior_observation',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[serving_prior_observation] (
    [observationId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_serving_prior_observation] PRIMARY KEY,
    [ownerUserId] NVARCHAR(128) NOT NULL,
    [identityKey] NVARCHAR(512) NOT NULL,
    [sourceType] NVARCHAR(32) NOT NULL,
    [sourceReference] NVARCHAR(256) NOT NULL,
    [sourceMealId] NVARCHAR(128) NOT NULL,
    [sourceMealRevision] BIGINT NOT NULL,
    [confirmationKind] NVARCHAR(32) NOT NULL,
    [evidenceQuality] NVARCHAR(32) NOT NULL,
    [candidateName] NVARCHAR(256) NOT NULL,
    [preparationLabel] NVARCHAR(256) NULL,
    [grams] FLOAT NOT NULL,
    [acceptedPolicyVersion] NVARCHAR(64) NOT NULL,
    [confirmedAt] DATETIME2(3) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [excludedAt] DATETIME2(3) NULL,
    [exclusionReasonCode] NVARCHAR(64) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_serving_prior_observation_serving_prior_owner_observa_1qxjveg' AND object_id=OBJECT_ID(N'dbo.serving_prior_observation')) CREATE UNIQUE INDEX [IX_serving_prior_observation_serving_prior_owner_observa_1qxjveg] ON dbo.[serving_prior_observation] ([ownerUserId], [observationId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_serving_prior_observation_serving_prior_owner_identit_17k52lh' AND object_id=OBJECT_ID(N'dbo.serving_prior_observation')) CREATE INDEX [IX_serving_prior_observation_serving_prior_owner_identit_17k52lh] ON dbo.[serving_prior_observation] ([ownerUserId], [identityKey], [confirmedAt]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_serving_prior_observation_serving_prior_owner_confirmedAt' AND object_id=OBJECT_ID(N'dbo.serving_prior_observation')) CREATE INDEX [IX_serving_prior_observation_serving_prior_owner_confirmedAt] ON dbo.[serving_prior_observation] ([ownerUserId], [confirmedAt]);
GO

-- ============================================================
-- TABLE soreness_report (Soreness report)
-- Appwrite name: Soreness report | enabled=True rowSecurity=True bytesUsed=2609.0
-- ============================================================

IF OBJECT_ID(N'dbo.soreness_report',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[soreness_report] (
    [reportId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_soreness_report] PRIMARY KEY,
    [muscleGroupId] NVARCHAR(64) NOT NULL,
    [side] NVARCHAR(8) NOT NULL,
    [score] BIGINT NOT NULL,
    [reportedAt] DATETIME2(3) NOT NULL,
    [expiresAt] DATETIME2(3) NOT NULL,
    [state] NVARCHAR(16) NOT NULL,
    [source] NVARCHAR(32) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_soreness_report_soreness_owner_report_unique' AND object_id=OBJECT_ID(N'dbo.soreness_report')) CREATE UNIQUE INDEX [IX_soreness_report_soreness_owner_report_unique] ON dbo.[soreness_report] ([userId], [reportId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_soreness_report_soreness_owner_muscle_state' AND object_id=OBJECT_ID(N'dbo.soreness_report')) CREATE INDEX [IX_soreness_report_soreness_owner_muscle_state] ON dbo.[soreness_report] ([userId], [muscleGroupId], [side], [state]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_soreness_report_soreness_owner_expiry_state' AND object_id=OBJECT_ID(N'dbo.soreness_report')) CREATE INDEX [IX_soreness_report_soreness_owner_expiry_state] ON dbo.[soreness_report] ([userId], [expiresAt], [state]);
GO

-- ============================================================
-- TABLE subscription (Subscription)
-- Appwrite name: Subscription | enabled=True rowSecurity=True bytesUsed=4177.0
-- ============================================================

IF OBJECT_ID(N'dbo.subscription',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[subscription] (
    [subscriptionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_subscription] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [provider] NVARCHAR(64) NOT NULL,
    [productId] NVARCHAR(128) NOT NULL,
    [originalTransactionIdHash] NVARCHAR(128) NULL,
    [purchaseTokenHash] NVARCHAR(128) NULL,
    [state] NVARCHAR(32) NOT NULL,
    [startAt] DATETIME2(3) NULL,
    [expiresAt] DATETIME2(3) NULL,
    [autoRenew] BIT NULL,
    [environment] NVARCHAR(32) NOT NULL,
    [revision] BIGINT NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_subscription_provider_orig_tx_uq' AND object_id=OBJECT_ID(N'dbo.subscription')) CREATE UNIQUE INDEX [IX_subscription_provider_orig_tx_uq] ON dbo.[subscription] ([provider], [originalTransactionIdHash]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_subscription_provider_token_uq' AND object_id=OBJECT_ID(N'dbo.subscription')) CREATE UNIQUE INDEX [IX_subscription_provider_token_uq] ON dbo.[subscription] ([provider], [purchaseTokenHash]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_subscription_user_state' AND object_id=OBJECT_ID(N'dbo.subscription')) CREATE INDEX [IX_subscription_user_state] ON dbo.[subscription] ([userId], [state]);
GO

-- ============================================================
-- TABLE support_ticket (Support ticket)
-- Appwrite name: Support ticket | enabled=True rowSecurity=True bytesUsed=52675.0
-- ============================================================

IF OBJECT_ID(N'dbo.support_ticket',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[support_ticket] (
    [ticketId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_support_ticket] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [category] NVARCHAR(64) NOT NULL,
    [subject] NVARCHAR(256) NOT NULL,
    [bodyRedacted] NVARCHAR(MAX) NOT NULL,
    [safeContextJson] NVARCHAR(MAX) NOT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_support_ticket_userId_state' AND object_id=OBJECT_ID(N'dbo.support_ticket')) CREATE INDEX [IX_support_ticket_userId_state] ON dbo.[support_ticket] ([userId], [state]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_support_ticket_state_updatedAt' AND object_id=OBJECT_ID(N'dbo.support_ticket')) CREATE INDEX [IX_support_ticket_state_updatedAt] ON dbo.[support_ticket] ([state], [updatedAt]);
GO

-- ============================================================
-- TABLE sync_cursor (sync_cursor)
-- Appwrite name: sync_cursor | enabled=True rowSecurity=True bytesUsed=7244.0
-- ============================================================

IF OBJECT_ID(N'dbo.sync_cursor',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sync_cursor] (
    [deviceSessionId] NVARCHAR(128) NULL,
    [stream] NVARCHAR(64) NULL,
    [lastAckedOperationId] NVARCHAR(128) NULL,
    [updatedAt] DATETIME2(3) NULL,
    [domain] NVARCHAR(64) NOT NULL,
    [opaqueCursor] NVARCHAR(512) NOT NULL,
    [lastSyncAt] DATETIME2(3) NOT NULL,
    [cursorId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_sync_cursor] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [deviceId] NVARCHAR(128) NOT NULL,
    [schemaVersion] BIGINT NOT NULL,
    [cursorToken] NVARCHAR(256) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sync_cursor_userId_deviceId_domain_unique' AND object_id=OBJECT_ID(N'dbo.sync_cursor')) CREATE UNIQUE INDEX [IX_sync_cursor_userId_deviceId_domain_unique] ON dbo.[sync_cursor] ([userId], [deviceId], [domain]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sync_cursor_userId_lastSyncAt' AND object_id=OBJECT_ID(N'dbo.sync_cursor')) CREATE INDEX [IX_sync_cursor_userId_lastSyncAt] ON dbo.[sync_cursor] ([userId], [lastSyncAt]);
GO

-- ============================================================
-- TABLE sync_operation (sync_operation)
-- Appwrite name: sync_operation | enabled=True rowSecurity=True bytesUsed=11816.0
-- ============================================================

IF OBJECT_ID(N'dbo.sync_operation',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sync_operation] (
    [deviceSessionId] NVARCHAR(128) NULL,
    [sourcePlatform] NVARCHAR(32) NULL,
    [expectedEntityRevision] BIGINT NULL,
    [clientSequence] BIGINT NULL,
    [conflictCode] NVARCHAR(64) NULL,
    [errorCode] NVARCHAR(128) NULL,
    [canonicalRevision] BIGINT NULL,
    [canonicalEventId] NVARCHAR(128) NULL,
    [canonicalCursor] NVARCHAR(512) NULL,
    [retryClass] NVARCHAR(32) NULL,
    [occurredAtUtc] DATETIME2(3) NULL,
    [occurredLocalDate] NVARCHAR(10) NULL,
    [timezone] NVARCHAR(128) NULL,
    [receivedAt] DATETIME2(3) NULL,
    [schemaVersion] BIGINT NULL,
    [operationId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_sync_operation] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [deviceId] NVARCHAR(128) NOT NULL,
    [entityType] NVARCHAR(64) NOT NULL,
    [entityId] NVARCHAR(128) NOT NULL,
    [entityRevision] BIGINT NOT NULL,
    [operationType] NVARCHAR(64) NOT NULL,
    [idempotencyKey] NVARCHAR(256) NOT NULL,
    [requestHash] NVARCHAR(128) NOT NULL,
    [payloadHash] NVARCHAR(128) NOT NULL,
    [outcome] NVARCHAR(32) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [operation] NVARCHAR(64) NULL,
    [cursorToken] NVARCHAR(256) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sync_operation_userId_deviceId_idempotency_unique' AND object_id=OBJECT_ID(N'dbo.sync_operation')) CREATE UNIQUE INDEX [IX_sync_operation_userId_deviceId_idempotency_unique] ON dbo.[sync_operation] ([userId], [deviceId], [idempotencyKey]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sync_operation_userId_createdAt' AND object_id=OBJECT_ID(N'dbo.sync_operation')) CREATE INDEX [IX_sync_operation_userId_createdAt] ON dbo.[sync_operation] ([userId], [createdAt]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sync_operation_sync_user_operation_unique' AND object_id=OBJECT_ID(N'dbo.sync_operation')) CREATE UNIQUE INDEX [IX_sync_operation_sync_user_operation_unique] ON dbo.[sync_operation] ([userId], [operationId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sync_operation_sync_user_session_idempotency_unique' AND object_id=OBJECT_ID(N'dbo.sync_operation')) CREATE UNIQUE INDEX [IX_sync_operation_sync_user_session_idempotency_unique] ON dbo.[sync_operation] ([userId], [deviceSessionId], [idempotencyKey]);
GO

-- ============================================================
-- TABLE target_revision (Target revision)
-- Appwrite name: Target revision | enabled=True rowSecurity=True bytesUsed=20131.0
-- ============================================================

IF OBJECT_ID(N'dbo.target_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[target_revision] (
    [targetRevisionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_target_revision] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [effectiveDate] NVARCHAR(10) NOT NULL,
    [targetValuesJson] NVARCHAR(MAX) NOT NULL,
    [source] NVARCHAR(32) NOT NULL,
    [manualEntry] BIT NOT NULL,
    [eligibilityDecision] NVARCHAR(32) NOT NULL,
    [eligibilityReasonCodesJson] NVARCHAR(MAX) NOT NULL,
    [policyVersion] NVARCHAR(64) NOT NULL,
    [populationClass] NVARCHAR(64) NOT NULL,
    [userConfirmed] BIT NOT NULL,
    [revision] BIGINT NOT NULL,
    [schemaVersion] BIGINT NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [energyKcal] BIGINT NULL,
    [proteinG] BIGINT NULL,
    [movementTarget] BIGINT NULL,
    [actionCategory] NVARCHAR(64) NULL,
    [formulaVersion] NVARCHAR(128) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_target_revision_target_user_effective_revis_1ft8dg7' AND object_id=OBJECT_ID(N'dbo.target_revision')) CREATE UNIQUE INDEX [IX_target_revision_target_user_effective_revis_1ft8dg7] ON dbo.[target_revision] ([userId], [effectiveDate], [revision]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_target_revision_target_user_effectiveDate' AND object_id=OBJECT_ID(N'dbo.target_revision')) CREATE INDEX [IX_target_revision_target_user_effectiveDate] ON dbo.[target_revision] ([userId], [effectiveDate]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_target_revision_target_user_eligibility_createdAt' AND object_id=OBJECT_ID(N'dbo.target_revision')) CREATE INDEX [IX_target_revision_target_user_eligibility_createdAt] ON dbo.[target_revision] ([userId], [eligibilityDecision], [createdAt]);
GO

-- ============================================================
-- TABLE usage_ledger (Usage Ledger)
-- Appwrite name: Usage Ledger | enabled=True rowSecurity=True bytesUsed=4419.0
-- ============================================================

IF OBJECT_ID(N'dbo.usage_ledger',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[usage_ledger] (
    [usageId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_usage_ledger] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [usageType] NVARCHAR(64) NOT NULL,
    [quantity] FLOAT NOT NULL,
    [unit] NVARCHAR(32) NOT NULL,
    [requestId] NVARCHAR(128) NULL,
    [provider] NVARCHAR(64) NULL,
    [model] NVARCHAR(128) NULL,
    [periodKey] NVARCHAR(32) NOT NULL,
    [occurredAt] DATETIME2(3) NOT NULL,
    [reversalOf] NVARCHAR(128) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_usage_ledger_userId_periodKey_usageType' AND object_id=OBJECT_ID(N'dbo.usage_ledger')) CREATE INDEX [IX_usage_ledger_userId_periodKey_usageType] ON dbo.[usage_ledger] ([userId], [periodKey], [usageType]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_usage_ledger_requestId' AND object_id=OBJECT_ID(N'dbo.usage_ledger')) CREATE INDEX [IX_usage_ledger_requestId] ON dbo.[usage_ledger] ([requestId]);
GO

-- ============================================================
-- TABLE user_goal (User goal)
-- Appwrite name: User goal | enabled=True rowSecurity=True bytesUsed=2759.0
-- ============================================================

IF OBJECT_ID(N'dbo.user_goal',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[user_goal] (
    [goalId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_user_goal] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [goalType] NVARCHAR(64) NOT NULL,
    [startDate] NVARCHAR(32) NOT NULL,
    [targetDate] NVARCHAR(32) NULL,
    [targetWeightG] BIGINT NULL,
    [status] NVARCHAR(32) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [endedAt] DATETIME2(3) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_user_goal_userId_status' AND object_id=OBJECT_ID(N'dbo.user_goal')) CREATE INDEX [IX_user_goal_userId_status] ON dbo.[user_goal] ([userId], [status]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_user_goal_userId_startDate' AND object_id=OBJECT_ID(N'dbo.user_goal')) CREATE INDEX [IX_user_goal_userId_startDate] ON dbo.[user_goal] ([userId], [startDate]);
GO

-- ============================================================
-- TABLE user_identity (User identity)
-- Appwrite name: User identity | enabled=True rowSecurity=True bytesUsed=4032.0
-- ============================================================

IF OBJECT_ID(N'dbo.user_identity',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[user_identity] (
    [identityId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_user_identity] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [provider] NVARCHAR(32) NOT NULL,
    [providerSubjectHash] NVARCHAR(128) NOT NULL,
    [emailNormalized] NVARCHAR(320) NULL,
    [emailVerified] BIT NOT NULL,
    [linkedAt] DATETIME2(3) NOT NULL,
    [lastUsedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_user_identity_provider_subject_unique' AND object_id=OBJECT_ID(N'dbo.user_identity')) CREATE UNIQUE INDEX [IX_user_identity_provider_subject_unique] ON dbo.[user_identity] ([provider], [providerSubjectHash]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_user_identity_userId' AND object_id=OBJECT_ID(N'dbo.user_identity')) CREATE INDEX [IX_user_identity_userId] ON dbo.[user_identity] ([userId]);
GO

-- ============================================================
-- TABLE user_preference (User preference)
-- Appwrite name: User preference | enabled=True rowSecurity=True bytesUsed=35391.0
-- ============================================================

IF OBJECT_ID(N'dbo.user_preference',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[user_preference] (
    [preferenceId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_user_preference] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [key] NVARCHAR(128) NOT NULL,
    [valueJson] NVARCHAR(MAX) NOT NULL,
    [revision] BIGINT NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_user_preference_user_key_unique' AND object_id=OBJECT_ID(N'dbo.user_preference')) CREATE UNIQUE INDEX [IX_user_preference_user_key_unique] ON dbo.[user_preference] ([userId], [key]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_user_preference_userId_updatedAt' AND object_id=OBJECT_ID(N'dbo.user_preference')) CREATE INDEX [IX_user_preference_userId_updatedAt] ON dbo.[user_preference] ([userId], [updatedAt]);
GO

-- ============================================================
-- TABLE user_profile (User profile)
-- Appwrite name: User profile | enabled=True rowSecurity=True bytesUsed=3050.0
-- ============================================================

IF OBJECT_ID(N'dbo.user_profile',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[user_profile] (
    [userId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_user_profile] PRIMARY KEY,
    [displayName] NVARCHAR(120) NOT NULL,
    [dateOfBirth] NVARCHAR(32) NULL,
    [countryCode] NVARCHAR(8) NULL,
    [locale] NVARCHAR(32) NOT NULL,
    [timeZone] NVARCHAR(64) NOT NULL,
    [sexForEnergyEstimate] NVARCHAR(32) NULL,
    [heightMm] BIGINT NULL,
    [currentWeightG] BIGINT NULL,
    [goalWeightG] BIGINT NULL,
    [activityLevel] NVARCHAR(32) NULL,
    [trainingFrequency] BIGINT NULL,
    [onboardingState] NVARCHAR(32) NOT NULL,
    [revision] BIGINT NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_user_profile_userId_unique' AND object_id=OBJECT_ID(N'dbo.user_profile')) CREATE UNIQUE INDEX [IX_user_profile_userId_unique] ON dbo.[user_profile] ([userId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_user_profile_onboardingState' AND object_id=OBJECT_ID(N'dbo.user_profile')) CREATE INDEX [IX_user_profile_onboardingState] ON dbo.[user_profile] ([onboardingState]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_user_profile_updatedAt' AND object_id=OBJECT_ID(N'dbo.user_profile')) CREATE INDEX [IX_user_profile_updatedAt] ON dbo.[user_profile] ([updatedAt]);
GO

-- ============================================================
-- TABLE user_session_metadata (User session metadata)
-- Appwrite name: User session metadata | enabled=True rowSecurity=True bytesUsed=3526.0
-- ============================================================

IF OBJECT_ID(N'dbo.user_session_metadata',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[user_session_metadata] (
    [sessionMetaId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_user_session_metadata] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [appwriteSessionIdHash] NVARCHAR(128) NOT NULL,
    [deviceId] NVARCHAR(128) NULL,
    [platform] NVARCHAR(32) NOT NULL,
    [appVersion] NVARCHAR(64) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [lastSeenAt] DATETIME2(3) NOT NULL,
    [revokedAt] DATETIME2(3) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_user_session_metadata_appwriteSessionIdHash_unique' AND object_id=OBJECT_ID(N'dbo.user_session_metadata')) CREATE UNIQUE INDEX [IX_user_session_metadata_appwriteSessionIdHash_unique] ON dbo.[user_session_metadata] ([appwriteSessionIdHash]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_user_session_metadata_userId_appwriteSessionIdHash' AND object_id=OBJECT_ID(N'dbo.user_session_metadata')) CREATE INDEX [IX_user_session_metadata_userId_appwriteSessionIdHash] ON dbo.[user_session_metadata] ([userId], [appwriteSessionIdHash]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_user_session_metadata_userId_lastSeenAt' AND object_id=OBJECT_ID(N'dbo.user_session_metadata')) CREATE INDEX [IX_user_session_metadata_userId_lastSeenAt] ON dbo.[user_session_metadata] ([userId], [lastSeenAt]);
GO

-- ============================================================
-- TABLE watch_delivery (Watch deliveries)
-- Appwrite name: Watch deliveries | enabled=True rowSecurity=True bytesUsed=6436.0
-- ============================================================

IF OBJECT_ID(N'dbo.watch_delivery',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[watch_delivery] (
    [deliveryId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_watch_delivery] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [summaryId] NVARCHAR(128) NOT NULL,
    [revision] BIGINT NOT NULL,
    [phoneDeviceId] NVARCHAR(128) NOT NULL,
    [watchDeviceId] NVARCHAR(128) NOT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [attemptCount] BIGINT NOT NULL,
    [lastAttemptAt] DATETIME2(3) NULL,
    [payloadJson] NVARCHAR(MAX) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL,
    [deviceId] NVARCHAR(128) NULL,
    [sentAt] DATETIME2(3) NULL,
    [acceptedAt] DATETIME2(3) NULL,
    [payloadType] NVARCHAR(64) NULL,
    [payloadId] NVARCHAR(128) NULL,
    [payloadRevision] BIGINT NULL,
    [payloadSchemaVersion] BIGINT NULL,
    [payloadHash] NVARCHAR(128) NULL,
    [expiresAt] DATETIME2(3) NULL,
    [entityType] NVARCHAR(64) NULL,
    [entityId] NVARCHAR(128) NULL,
    [entityRevision] BIGINT NULL,
    [supersededAt] DATETIME2(3) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_watch_delivery_userId_summaryId_revision_w_1vq8xh9' AND object_id=OBJECT_ID(N'dbo.watch_delivery')) CREATE UNIQUE INDEX [IX_watch_delivery_userId_summaryId_revision_w_1vq8xh9] ON dbo.[watch_delivery] ([userId], [summaryId], [revision], [watchDeviceId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_watch_delivery_userId_state' AND object_id=OBJECT_ID(N'dbo.watch_delivery')) CREATE INDEX [IX_watch_delivery_userId_state] ON dbo.[watch_delivery] ([userId], [state]);
GO

-- ============================================================
-- TABLE watch_receipt (Watch receipts)
-- Appwrite name: Watch receipts | enabled=True rowSecurity=True bytesUsed=6508.0
-- ============================================================

IF OBJECT_ID(N'dbo.watch_receipt',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[watch_receipt] (
    [receiptId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_watch_receipt] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [deliveryId] NVARCHAR(128) NOT NULL,
    [summaryId] NVARCHAR(128) NOT NULL,
    [revision] BIGINT NOT NULL,
    [result] NVARCHAR(32) NOT NULL,
    [outcome] NVARCHAR(32) NOT NULL,
    [watchDeviceId] NVARCHAR(128) NOT NULL,
    [persistedAt] DATETIME2(3) NULL,
    [receivedAt] DATETIME2(3) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [deviceId] NVARCHAR(128) NULL,
    [updatedAt] DATETIME2(3) NULL,
    [payloadType] NVARCHAR(64) NULL,
    [payloadId] NVARCHAR(128) NULL,
    [payloadRevision] BIGINT NULL,
    [payloadHash] NVARCHAR(128) NULL,
    [entityType] NVARCHAR(64) NULL,
    [entityId] NVARCHAR(128) NULL,
    [entityRevision] BIGINT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_watch_receipt_watchDeviceId_summaryId_rev_1mpy6rw' AND object_id=OBJECT_ID(N'dbo.watch_receipt')) CREATE UNIQUE INDEX [IX_watch_receipt_watchDeviceId_summaryId_rev_1mpy6rw] ON dbo.[watch_receipt] ([watchDeviceId], [summaryId], [revision], [result]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_watch_receipt_deliveryId' AND object_id=OBJECT_ID(N'dbo.watch_receipt')) CREATE INDEX [IX_watch_receipt_deliveryId] ON dbo.[watch_receipt] ([deliveryId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_watch_receipt_userId_receivedAt' AND object_id=OBJECT_ID(N'dbo.watch_receipt')) CREATE INDEX [IX_watch_receipt_userId_receivedAt] ON dbo.[watch_receipt] ([userId], [receivedAt]);
GO

-- ============================================================
-- TABLE webhook_event (Webhook Event)
-- Appwrite name: Webhook Event | enabled=True rowSecurity=True bytesUsed=4040.0
-- ============================================================

IF OBJECT_ID(N'dbo.webhook_event',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[webhook_event] (
    [webhookEventId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_webhook_event] PRIMARY KEY,
    [provider] NVARCHAR(64) NOT NULL,
    [externalEventIdHash] NVARCHAR(128) NOT NULL,
    [headersHash] NVARCHAR(128) NOT NULL,
    [payloadObjectId] NVARCHAR(128) NULL,
    [receivedAt] DATETIME2(3) NOT NULL,
    [verifiedAt] DATETIME2(3) NULL,
    [state] NVARCHAR(32) NOT NULL,
    [attemptCount] BIGINT NOT NULL,
    [errorCode] NVARCHAR(128) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_webhook_event_provider_event_uq' AND object_id=OBJECT_ID(N'dbo.webhook_event')) CREATE UNIQUE INDEX [IX_webhook_event_provider_event_uq] ON dbo.[webhook_event] ([provider], [externalEventIdHash]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_webhook_event_state_received_at' AND object_id=OBJECT_ID(N'dbo.webhook_event')) CREATE INDEX [IX_webhook_event_state_received_at] ON dbo.[webhook_event] ([state], [receivedAt]);
GO

-- ============================================================
-- TABLE wellness_checkin (Wellness check-in)
-- Appwrite name: Wellness check-in | enabled=True rowSecurity=True bytesUsed=26961.0
-- ============================================================

IF OBJECT_ID(N'dbo.wellness_checkin',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[wellness_checkin] (
    [checkinId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_wellness_checkin] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [localDate] NVARCHAR(32) NOT NULL,
    [energyLevel] BIGINT NOT NULL,
    [sorenessAreasJson] NVARCHAR(MAX) NOT NULL,
    [sleepPerception] NVARCHAR(32) NOT NULL,
    [note] NVARCHAR(2048) NULL,
    [revision] BIGINT NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_wellness_checkin_userId_localDate_unique' AND object_id=OBJECT_ID(N'dbo.wellness_checkin')) CREATE UNIQUE INDEX [IX_wellness_checkin_userId_localDate_unique] ON dbo.[wellness_checkin] ([userId], [localDate]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_wellness_checkin_userId_localDate' AND object_id=OBJECT_ID(N'dbo.wellness_checkin')) CREATE INDEX [IX_wellness_checkin_userId_localDate] ON dbo.[wellness_checkin] ([userId], [localDate]);
GO

-- ============================================================
-- TABLE workout_event (Workout event)
-- Appwrite name: Workout event | enabled=True rowSecurity=True bytesUsed=38221.0
-- ============================================================

IF OBJECT_ID(N'dbo.workout_event',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_event] (
    [eventId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_workout_event] PRIMARY KEY,
    [sessionId] NVARCHAR(128) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL,
    [eventType] NVARCHAR(64) NOT NULL,
    [eventSequence] BIGINT NOT NULL,
    [payloadJson] NVARCHAR(MAX) NOT NULL,
    [sourceDevice] NVARCHAR(128) NOT NULL,
    [occurredAt] DATETIME2(3) NOT NULL,
    [idempotencyKey] NVARCHAR(128) NOT NULL,
    [sourceDeviceSessionId] NVARCHAR(128) NULL,
    [clientSequence] BIGINT NULL,
    [semanticStepId] NVARCHAR(128) NULL,
    [correctionOfEventId] NVARCHAR(128) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_event_sessionId_eventSequence_unique' AND object_id=OBJECT_ID(N'dbo.workout_event')) CREATE UNIQUE INDEX [IX_workout_event_sessionId_eventSequence_unique] ON dbo.[workout_event] ([sessionId], [eventSequence]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_event_userId_idempotencyKey_unique' AND object_id=OBJECT_ID(N'dbo.workout_event')) CREATE UNIQUE INDEX [IX_workout_event_userId_idempotencyKey_unique] ON dbo.[workout_event] ([userId], [idempotencyKey]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_event_sessionId_occurredAt' AND object_id=OBJECT_ID(N'dbo.workout_event')) CREATE INDEX [IX_workout_event_sessionId_occurredAt] ON dbo.[workout_event] ([sessionId], [occurredAt]);
GO

-- ============================================================
-- TABLE workout_plan (Workout plan)
-- Appwrite name: Workout plan | enabled=True rowSecurity=True bytesUsed=3143.0
-- ============================================================

IF OBJECT_ID(N'dbo.workout_plan',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_plan] (
    [planId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_workout_plan] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [ownerType] NVARCHAR(32) NOT NULL,
    [name] NVARCHAR(128) NOT NULL,
    [goalCategory] NVARCHAR(64) NOT NULL,
    [currentRevision] BIGINT NOT NULL,
    [status] NVARCHAR(32) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_plan_userId_status' AND object_id=OBJECT_ID(N'dbo.workout_plan')) CREATE INDEX [IX_workout_plan_userId_status] ON dbo.[workout_plan] ([userId], [status]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_plan_ownerType_status' AND object_id=OBJECT_ID(N'dbo.workout_plan')) CREATE INDEX [IX_workout_plan_ownerType_status] ON dbo.[workout_plan] ([ownerType], [status]);
GO

-- ============================================================
-- TABLE workout_plan_revision (Workout plan revision)
-- Appwrite name: Workout plan revision | enabled=True rowSecurity=True bytesUsed=37601.0
-- ============================================================

IF OBJECT_ID(N'dbo.workout_plan_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_plan_revision] (
    [planRevisionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_workout_plan_revision] PRIMARY KEY,
    [planId] NVARCHAR(128) NOT NULL,
    [revision] BIGINT NOT NULL,
    [name] NVARCHAR(128) NOT NULL,
    [notes] NVARCHAR(MAX) NULL,
    [source] NVARCHAR(32) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [envelopeJson] NVARCHAR(MAX) NULL,
    [envelopeHash] NVARCHAR(64) NULL,
    [algorithmBundleVersion] NVARCHAR(128) NULL,
    [profileRevision] BIGINT NULL,
    [historySnapshotHash] NVARCHAR(128) NULL,
    [idempotencyKey] NVARCHAR(128) NULL,
    [requestHash] NVARCHAR(64) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_plan_revision_planId_revision_unique' AND object_id=OBJECT_ID(N'dbo.workout_plan_revision')) CREATE UNIQUE INDEX [IX_workout_plan_revision_planId_revision_unique] ON dbo.[workout_plan_revision] ([planId], [revision]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_plan_revision_createdAt' AND object_id=OBJECT_ID(N'dbo.workout_plan_revision')) CREATE INDEX [IX_workout_plan_revision_createdAt] ON dbo.[workout_plan_revision] ([createdAt]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_plan_revision_envelopeHash' AND object_id=OBJECT_ID(N'dbo.workout_plan_revision')) CREATE INDEX [IX_workout_plan_revision_envelopeHash] ON dbo.[workout_plan_revision] ([envelopeHash]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_plan_revision_planId_idempotency' AND object_id=OBJECT_ID(N'dbo.workout_plan_revision')) CREATE INDEX [IX_workout_plan_revision_planId_idempotency] ON dbo.[workout_plan_revision] ([planId], [idempotencyKey]);
GO

-- ============================================================
-- TABLE workout_plan_step (Workout plan step)
-- Appwrite name: Workout plan step | enabled=True rowSecurity=True bytesUsed=45482.0
-- ============================================================

IF OBJECT_ID(N'dbo.workout_plan_step',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_plan_step] (
    [stepId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_workout_plan_step] PRIMARY KEY,
    [planRevisionId] NVARCHAR(128) NOT NULL,
    [sortOrder] BIGINT NOT NULL,
    [exerciseId] NVARCHAR(128) NOT NULL,
    [sets] BIGINT NULL,
    [repsMin] BIGINT NULL,
    [repsMax] BIGINT NULL,
    [durationSeconds] BIGINT NULL,
    [restSeconds] BIGINT NULL,
    [loadGuidance] NVARCHAR(256) NULL,
    [optional] BIT NOT NULL,
    [semanticSessionId] NVARCHAR(128) NULL,
    [sessionLocalDate] NVARCHAR(16) NULL,
    [sessionPurpose] NVARCHAR(64) NULL,
    [substitutionIdsJson] NVARCHAR(MAX) NULL,
    [progressionContextJson] NVARCHAR(2048) NULL,
    [reasonCodesJson] NVARCHAR(MAX) NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_plan_step_planRevisionId_sortOrder' AND object_id=OBJECT_ID(N'dbo.workout_plan_step')) CREATE INDEX [IX_workout_plan_step_planRevisionId_sortOrder] ON dbo.[workout_plan_step] ([planRevisionId], [sortOrder]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_plan_step_semanticSessionId_sortOrder' AND object_id=OBJECT_ID(N'dbo.workout_plan_step')) CREATE INDEX [IX_workout_plan_step_semanticSessionId_sortOrder] ON dbo.[workout_plan_step] ([semanticSessionId], [sortOrder]);
GO

-- ============================================================
-- TABLE workout_session (Workout session)
-- Appwrite name: Workout session | enabled=True rowSecurity=True bytesUsed=3541.0
-- ============================================================

IF OBJECT_ID(N'dbo.workout_session',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_session] (
    [sessionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_workout_session] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [planRevisionId] NVARCHAR(128) NULL,
    [authorityDeviceId] NVARCHAR(128) NOT NULL,
    [workoutType] NVARCHAR(64) NOT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [currentRevision] BIGINT NOT NULL,
    [startedAt] DATETIME2(3) NULL,
    [endedAt] DATETIME2(3) NULL,
    [discardedAt] DATETIME2(3) NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_session_userId_state' AND object_id=OBJECT_ID(N'dbo.workout_session')) CREATE INDEX [IX_workout_session_userId_state] ON dbo.[workout_session] ([userId], [state]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_session_userId_startedAt' AND object_id=OBJECT_ID(N'dbo.workout_session')) CREATE INDEX [IX_workout_session_userId_startedAt] ON dbo.[workout_session] ([userId], [startedAt]);
GO

-- ============================================================
-- TABLE workout_session_revision (Workout session revision)
-- Appwrite name: Workout session revision | enabled=True rowSecurity=True bytesUsed=21211.0
-- ============================================================

IF OBJECT_ID(N'dbo.workout_session_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_session_revision] (
    [sessionRevisionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_workout_session_revision] PRIMARY KEY,
    [sessionId] NVARCHAR(128) NOT NULL,
    [revision] BIGINT NOT NULL,
    [baseRevision] BIGINT NOT NULL,
    [state] NVARCHAR(32) NOT NULL,
    [authorityDeviceId] NVARCHAR(128) NOT NULL,
    [sourceDeviceId] NVARCHAR(128) NOT NULL,
    [sourceOperationId] NVARCHAR(128) NOT NULL,
    [idempotencyKey] NVARCHAR(128) NOT NULL,
    [payloadHash] NVARCHAR(128) NOT NULL,
    [reasonCodesJson] NVARCHAR(MAX) NOT NULL,
    [schemaVersion] BIGINT NOT NULL,
    [occurredAt] DATETIME2(3) NOT NULL,
    [acceptedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_session_revision_workout_session_revision_unique' AND object_id=OBJECT_ID(N'dbo.workout_session_revision')) CREATE UNIQUE INDEX [IX_workout_session_revision_workout_session_revision_unique] ON dbo.[workout_session_revision] ([sessionId], [revision]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_session_revision_workout_session_operation_unique' AND object_id=OBJECT_ID(N'dbo.workout_session_revision')) CREATE UNIQUE INDEX [IX_workout_session_revision_workout_session_operation_unique] ON dbo.[workout_session_revision] ([sessionId], [sourceOperationId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_session_revision_workout_session_idempotency_unique' AND object_id=OBJECT_ID(N'dbo.workout_session_revision')) CREATE UNIQUE INDEX [IX_workout_session_revision_workout_session_idempotency_unique] ON dbo.[workout_session_revision] ([sessionId], [idempotencyKey]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_session_revision_workout_session_acceptedAt' AND object_id=OBJECT_ID(N'dbo.workout_session_revision')) CREATE INDEX [IX_workout_session_revision_workout_session_acceptedAt] ON dbo.[workout_session_revision] ([sessionId], [acceptedAt]);
GO

-- ============================================================
-- TABLE workout_summary (Workout summary)
-- Appwrite name: Workout summary | enabled=True rowSecurity=True bytesUsed=2919.0
-- ============================================================

IF OBJECT_ID(N'dbo.workout_summary',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_summary] (
    [summaryId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_workout_summary] PRIMARY KEY,
    [sessionId] NVARCHAR(128) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL,
    [durationSeconds] BIGINT NOT NULL,
    [activeEnergyKcal] BIGINT NULL,
    [steps] BIGINT NULL,
    [sourcePlatform] NVARCHAR(32) NOT NULL,
    [distanceM] FLOAT NULL,
    [healthWriteState] NVARCHAR(32) NOT NULL,
    [averageHeartRate] FLOAT NULL,
    [revision] BIGINT NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_summary_sessionId_unique' AND object_id=OBJECT_ID(N'dbo.workout_summary')) CREATE UNIQUE INDEX [IX_workout_summary_sessionId_unique] ON dbo.[workout_summary] ([sessionId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_summary_userId_createdAt' AND object_id=OBJECT_ID(N'dbo.workout_summary')) CREATE INDEX [IX_workout_summary_userId_createdAt] ON dbo.[workout_summary] ([userId], [createdAt]);
GO
