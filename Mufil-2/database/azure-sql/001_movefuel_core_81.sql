-- MoveFuel canonical online schema
-- Dialect: Azure SQL / SQL Server
-- Source: reviewed 77-table snapshot + 4 approved additions = 81 tables
-- NOTE: old Appwrite snapshot did not encode SQL types; legacy types below are conservative inferred mappings.
-- Validate lengths/nullability/index selectivity in staging before production.


-- ============================================================
-- AI_PROVIDER
-- ============================================================

IF OBJECT_ID(N'dbo.analysis_attempt',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[analysis_attempt] (
    [attemptId] BIGINT NOT NULL CONSTRAINT [PK_analysis_attempt] PRIMARY KEY,
    [requestId] NVARCHAR(128) NOT NULL,
    [attemptNo] BIGINT NOT NULL,
    [promptVersionId] BIGINT NOT NULL,
    [modelConfigId] NVARCHAR(128) NOT NULL,
    [provider] NVARCHAR(512) NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [inputHash] NVARCHAR(256) NOT NULL,
    [outputHash] NVARCHAR(256) NOT NULL,
    [costMicrounits] NVARCHAR(512) NOT NULL,
    [latencyMs] NVARCHAR(512) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.analysis_event',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[analysis_event] (
    [eventId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_analysis_event] PRIMARY KEY,
    [requestId] NVARCHAR(128) NOT NULL,
    [attemptId] BIGINT NOT NULL,
    [stage] NVARCHAR(512) NOT NULL,
    [userSafeCode] NVARCHAR(512) NOT NULL,
    [occurredAt] DATETIME2(3) NOT NULL,
    [sequence] BIGINT NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.model_configuration',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[model_configuration] (
    [modelConfigId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_model_configuration] PRIMARY KEY,
    [taskType] NVARCHAR(512) NOT NULL,
    [provider] NVARCHAR(512) NOT NULL,
    [modelName] NVARCHAR(256) NOT NULL,
    [temperature] NVARCHAR(512) NOT NULL,
    [maxOutputTokens] NVARCHAR(256) NOT NULL,
    [timeoutMs] NVARCHAR(512) NOT NULL,
    [retryPolicyJson] NVARCHAR(MAX) NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.prompt_template',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[prompt_template] (
    [promptId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_prompt_template] PRIMARY KEY,
    [taskType] NVARCHAR(512) NOT NULL,
    [name] NVARCHAR(256) NOT NULL,
    [description] NVARCHAR(MAX) NOT NULL,
    [activeVersionId] BIGINT NOT NULL,
    [status] NVARCHAR(512) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.prompt_version',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[prompt_version] (
    [promptVersionId] BIGINT NOT NULL CONSTRAINT [PK_prompt_version] PRIMARY KEY,
    [promptId] NVARCHAR(128) NOT NULL,
    [version] BIGINT NOT NULL,
    [systemInstructionEncrypted] NVARCHAR(512) NOT NULL,
    [jsonSchemaJson] NVARCHAR(MAX) NOT NULL,
    [safetyRulesJson] NVARCHAR(MAX) NOT NULL,
    [testSuiteVersion] BIGINT NOT NULL,
    [checksum] NVARCHAR(256) NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [activatedAt] DATETIME2(3) NOT NULL,
    [retiredAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.provider_call',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[provider_call] (
    [providerCallId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_provider_call] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [taskType] NVARCHAR(512) NOT NULL,
    [requestId] NVARCHAR(128) NOT NULL,
    [provider] NVARCHAR(512) NOT NULL,
    [model] NVARCHAR(512) NOT NULL,
    [promptVersionId] BIGINT NOT NULL,
    [inputHash] NVARCHAR(256) NOT NULL,
    [outputHash] NVARCHAR(256) NOT NULL,
    [status] NVARCHAR(512) NOT NULL,
    [latencyMs] NVARCHAR(512) NOT NULL,
    [tokenIn] NVARCHAR(256) NOT NULL,
    [tokenOut] NVARCHAR(256) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_provider_call_userId' AND object_id=OBJECT_ID(N'dbo.provider_call')) CREATE INDEX [IX_provider_call_userId] ON dbo.[provider_call] ([userId]);
GO

-- ============================================================
-- BILLING_USAGE
-- ============================================================

IF OBJECT_ID(N'dbo.entitlement',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[entitlement] (
    [entitlementId] NVARCHAR(256) NOT NULL CONSTRAINT [PK_entitlement] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [entitlementKey] NVARCHAR(256) NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [sourceSubscriptionId] NVARCHAR(128) NOT NULL,
    [effectiveAt] DATETIME2(3) NOT NULL,
    [expiresAt] DATETIME2(3) NULL,
    [revision] BIGINT NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_entitlement_userId' AND object_id=OBJECT_ID(N'dbo.entitlement')) CREATE INDEX [IX_entitlement_userId] ON dbo.[entitlement] ([userId]);
GO

IF OBJECT_ID(N'dbo.purchase_event',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[purchase_event] (
    [purchaseEventId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_purchase_event] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [provider] NVARCHAR(512) NOT NULL,
    [externalEventIdHash] NVARCHAR(256) NOT NULL,
    [eventType] NVARCHAR(512) NOT NULL,
    [productId] NVARCHAR(128) NOT NULL,
    [subscriptionId] NVARCHAR(128) NOT NULL,
    [signedPayloadHash] NVARCHAR(MAX) NOT NULL,
    [occurredAt] DATETIME2(3) NOT NULL,
    [receivedAt] DATETIME2(3) NOT NULL,
    [verificationState] NVARCHAR(512) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_purchase_event_userId' AND object_id=OBJECT_ID(N'dbo.purchase_event')) CREATE INDEX [IX_purchase_event_userId] ON dbo.[purchase_event] ([userId]);
GO

IF OBJECT_ID(N'dbo.subscription',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[subscription] (
    [subscriptionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_subscription] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [provider] NVARCHAR(512) NOT NULL,
    [productId] NVARCHAR(128) NOT NULL,
    [originalTransactionIdHash] NVARCHAR(256) NOT NULL,
    [purchaseTokenHash] NVARCHAR(256) NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [startAt] DATETIME2(3) NOT NULL,
    [expiresAt] DATETIME2(3) NULL,
    [autoRenew] BIT NOT NULL,
    [environment] NVARCHAR(512) NOT NULL,
    [revision] BIGINT NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_subscription_userId' AND object_id=OBJECT_ID(N'dbo.subscription')) CREATE INDEX [IX_subscription_userId] ON dbo.[subscription] ([userId]);
GO

IF OBJECT_ID(N'dbo.usage_ledger',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[usage_ledger] (
    [usageId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_usage_ledger] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [usageType] NVARCHAR(512) NOT NULL,
    [quantity] FLOAT NOT NULL,
    [unit] NVARCHAR(512) NOT NULL,
    [requestId] NVARCHAR(128) NOT NULL,
    [provider] NVARCHAR(512) NOT NULL,
    [model] NVARCHAR(512) NOT NULL,
    [periodKey] NVARCHAR(512) NOT NULL,
    [occurredAt] DATETIME2(3) NOT NULL,
    [reversalOf] NVARCHAR(512) NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_usage_ledger_userId' AND object_id=OBJECT_ID(N'dbo.usage_ledger')) CREATE INDEX [IX_usage_ledger_userId] ON dbo.[usage_ledger] ([userId]);
GO

IF OBJECT_ID(N'dbo.webhook_event',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[webhook_event] (
    [webhookEventId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_webhook_event] PRIMARY KEY,
    [provider] NVARCHAR(512) NOT NULL,
    [externalEventIdHash] NVARCHAR(256) NOT NULL,
    [headersHash] NVARCHAR(256) NOT NULL,
    [payloadObjectId] NVARCHAR(MAX) NOT NULL,
    [receivedAt] DATETIME2(3) NOT NULL,
    [verifiedAt] DATETIME2(3) NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [attemptCount] BIGINT NOT NULL,
    [errorCode] NVARCHAR(512) NULL
  );
END;
GO

-- ============================================================
-- DEVICE_HEALTH_SYNC
-- ============================================================

IF OBJECT_ID(N'dbo.device',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[device] (
    [deviceId] NVARCHAR(128) NULL CONSTRAINT [PK_device] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [platform] NVARCHAR(512) NOT NULL,
    [deviceClass] NVARCHAR(512) NOT NULL,
    [installationIdHash] NVARCHAR(256) NOT NULL,
    [appVersion] BIGINT NOT NULL,
    [capabilityJson] NVARCHAR(MAX) NOT NULL,
    [lastSeenAt] DATETIME2(3) NOT NULL,
    [revokedAt] DATETIME2(3) NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_device_userId' AND object_id=OBJECT_ID(N'dbo.device')) CREATE INDEX [IX_device_userId] ON dbo.[device] ([userId]);
GO

IF OBJECT_ID(N'dbo.device_command',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[device_command] (
    [commandId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_device_command] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [targetDeviceId] NVARCHAR(128) NOT NULL,
    [commandType] NVARCHAR(512) NOT NULL,
    [objectId] NVARCHAR(128) NOT NULL,
    [objectRevision] BIGINT NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [requestedAt] DATETIME2(3) NOT NULL,
    [acknowledgedAt] DATETIME2(3) NULL,
    [errorCode] NVARCHAR(512) NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_device_command_userId' AND object_id=OBJECT_ID(N'dbo.device_command')) CREATE INDEX [IX_device_command_userId] ON dbo.[device_command] ([userId]);
GO

IF OBJECT_ID(N'dbo.device_session',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[device_session] (
    [deviceSessionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_device_session] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [phoneDeviceId] NVARCHAR(128) NOT NULL,
    [watchDeviceId] NVARCHAR(128) NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [issuedAt] BIT NOT NULL,
    [expiresAt] DATETIME2(3) NULL,
    [revokedAt] DATETIME2(3) NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_device_session_userId' AND object_id=OBJECT_ID(N'dbo.device_session')) CREATE INDEX [IX_device_session_userId] ON dbo.[device_session] ([userId]);
GO

IF OBJECT_ID(N'dbo.health_connection',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[health_connection] (
    [connectionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_health_connection] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [platform] NVARCHAR(512) NOT NULL,
    [sourceName] NVARCHAR(256) NOT NULL,
    [permissionStateJson] NVARCHAR(MAX) NOT NULL,
    [lastSuccessAt] DATETIME2(3) NOT NULL,
    [lastErrorCode] NVARCHAR(512) NULL,
    [revision] BIGINT NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_health_connection_userId' AND object_id=OBJECT_ID(N'dbo.health_connection')) CREATE INDEX [IX_health_connection_userId] ON dbo.[health_connection] ([userId]);
GO

IF OBJECT_ID(N'dbo.health_import_cursor',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[health_import_cursor] (
    [cursorId] NVARCHAR(256) NOT NULL CONSTRAINT [PK_health_import_cursor] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [connectionId] NVARCHAR(128) NOT NULL,
    [dataType] NVARCHAR(512) NOT NULL,
    [opaqueCursorEncrypted] NVARCHAR(256) NOT NULL,
    [lastWindowEnd] NVARCHAR(512) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_health_import_cursor_userId' AND object_id=OBJECT_ID(N'dbo.health_import_cursor')) CREATE INDEX [IX_health_import_cursor_userId] ON dbo.[health_import_cursor] ([userId]);
GO

IF OBJECT_ID(N'dbo.health_sample_summary',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[health_sample_summary] (
    [summaryId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_health_sample_summary] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [localDate] NVARCHAR(32) NOT NULL,
    [dataType] NVARCHAR(512) NOT NULL,
    [value] FLOAT NOT NULL,
    [unit] NVARCHAR(512) NOT NULL,
    [sourcePlatform] NVARCHAR(512) NOT NULL,
    [sourceDevice] NVARCHAR(512) NOT NULL,
    [provenanceHash] NVARCHAR(256) NOT NULL,
    [revision] BIGINT NOT NULL,
    [measuredStart] NVARCHAR(512) NOT NULL,
    [measuredEnd] NVARCHAR(512) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_health_sample_summary_userId' AND object_id=OBJECT_ID(N'dbo.health_sample_summary')) CREATE INDEX [IX_health_sample_summary_userId] ON dbo.[health_sample_summary] ([userId]);
GO

IF OBJECT_ID(N'dbo.idempotency_key',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[idempotency_key] (
    [keyId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_idempotency_key] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [scope] NVARCHAR(512) NOT NULL,
    [keyHash] NVARCHAR(256) NOT NULL,
    [requestHash] NVARCHAR(256) NOT NULL,
    [responseRef] NVARCHAR(512) NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [expiresAt] DATETIME2(3) NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_idempotency_key_userId' AND object_id=OBJECT_ID(N'dbo.idempotency_key')) CREATE INDEX [IX_idempotency_key_userId] ON dbo.[idempotency_key] ([userId]);
GO

IF OBJECT_ID(N'dbo.sync_cursor',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sync_cursor] (
    [cursorId] NVARCHAR(256) NOT NULL CONSTRAINT [PK_sync_cursor] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [deviceId] NVARCHAR(128) NULL,
    [domain] NVARCHAR(512) NOT NULL,
    [opaqueCursor] NVARCHAR(256) NOT NULL,
    [lastSyncAt] DATETIME2(3) NOT NULL,
    [schemaVersion] BIGINT NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sync_cursor_userId' AND object_id=OBJECT_ID(N'dbo.sync_cursor')) CREATE INDEX [IX_sync_cursor_userId] ON dbo.[sync_cursor] ([userId]);
GO

IF OBJECT_ID(N'dbo.sync_operation',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[sync_operation] (
    [operationId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_sync_operation] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [deviceId] NVARCHAR(128) NULL,
    [entityType] NVARCHAR(512) NOT NULL,
    [entityId] NVARCHAR(128) NOT NULL,
    [entityRevision] BIGINT NOT NULL,
    [operationType] NVARCHAR(512) NOT NULL,
    [idempotencyKey] NVARCHAR(512) NOT NULL,
    [requestHash] NVARCHAR(256) NOT NULL,
    [payloadHash] NVARCHAR(MAX) NOT NULL,
    [outcome] NVARCHAR(512) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_sync_operation_userId' AND object_id=OBJECT_ID(N'dbo.sync_operation')) CREATE INDEX [IX_sync_operation_userId] ON dbo.[sync_operation] ([userId]);
GO

IF OBJECT_ID(N'dbo.watch_delivery',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[watch_delivery] (
    [deliveryId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_watch_delivery] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [deviceId] NVARCHAR(128) NULL,
    [summaryId] NVARCHAR(128) NOT NULL,
    [revision] BIGINT NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [sentAt] DATETIME2(3) NOT NULL,
    [acceptedAt] DATETIME2(3) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_watch_delivery_userId' AND object_id=OBJECT_ID(N'dbo.watch_delivery')) CREATE INDEX [IX_watch_delivery_userId] ON dbo.[watch_delivery] ([userId]);
GO

IF OBJECT_ID(N'dbo.watch_receipt',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[watch_receipt] (
    [receiptId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_watch_receipt] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [deviceId] NVARCHAR(128) NULL,
    [summaryId] NVARCHAR(128) NOT NULL,
    [revision] BIGINT NOT NULL,
    [outcome] NVARCHAR(512) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_watch_receipt_userId' AND object_id=OBJECT_ID(N'dbo.watch_receipt')) CREATE INDEX [IX_watch_receipt_userId] ON dbo.[watch_receipt] ([userId]);
GO

-- ============================================================
-- FOUNDATION_OPS
-- ============================================================

IF OBJECT_ID(N'dbo.audit_event',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[audit_event] (
    [auditId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_audit_event] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [actorType] NVARCHAR(512) NOT NULL,
    [actorIdHash] NVARCHAR(256) NOT NULL,
    [action] NVARCHAR(512) NOT NULL,
    [objectType] NVARCHAR(512) NOT NULL,
    [objectId] NVARCHAR(128) NOT NULL,
    [result] NVARCHAR(512) NOT NULL,
    [correlationId] NVARCHAR(128) NOT NULL,
    [occurredAt] DATETIME2(3) NOT NULL,
    [metadataJson] NVARCHAR(MAX) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_audit_event_userId' AND object_id=OBJECT_ID(N'dbo.audit_event')) CREATE INDEX [IX_audit_event_userId] ON dbo.[audit_event] ([userId]);
GO

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
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_calendar_entry_userId' AND object_id=OBJECT_ID(N'dbo.calendar_entry')) CREATE INDEX [IX_calendar_entry_userId] ON dbo.[calendar_entry] ([userId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UQ_calendar_entry_calendar_entry_revision_identity_unique' AND object_id=OBJECT_ID(N'dbo.calendar_entry')) CREATE UNIQUE INDEX [UQ_calendar_entry_calendar_entry_revision_identity_unique] ON dbo.[calendar_entry] ([calendarRevisionId], [entryId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_calendar_entry_calendar_entry_user_revision' AND object_id=OBJECT_ID(N'dbo.calendar_entry')) CREATE INDEX [IX_calendar_entry_calendar_entry_user_revision] ON dbo.[calendar_entry] ([userId], [calendarRevision]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_calendar_entry_calendar_entry_user_date_start' AND object_id=OBJECT_ID(N'dbo.calendar_entry')) CREATE INDEX [IX_calendar_entry_calendar_entry_user_date_start] ON dbo.[calendar_entry] ([userId], [localDate], [startAt]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_calendar_entry_calendar_entry_user_semantic_revision' AND object_id=OBJECT_ID(N'dbo.calendar_entry')) CREATE INDEX [IX_calendar_entry_calendar_entry_user_semantic_revision] ON dbo.[calendar_entry] ([userId], [semanticObjectType], [semanticObjectId], [calendarRevision]);
GO

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
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_calendar_revision_userId' AND object_id=OBJECT_ID(N'dbo.calendar_revision')) CREATE INDEX [IX_calendar_revision_userId] ON dbo.[calendar_revision] ([userId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UQ_calendar_revision_calendar_user_revision_unique' AND object_id=OBJECT_ID(N'dbo.calendar_revision')) CREATE UNIQUE INDEX [UQ_calendar_revision_calendar_user_revision_unique] ON dbo.[calendar_revision] ([userId], [revision]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UQ_calendar_revision_calendar_user_operation_unique' AND object_id=OBJECT_ID(N'dbo.calendar_revision')) CREATE UNIQUE INDEX [UQ_calendar_revision_calendar_user_operation_unique] ON dbo.[calendar_revision] ([userId], [operationId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UQ_calendar_revision_calendar_user_idempotency_unique' AND object_id=OBJECT_ID(N'dbo.calendar_revision')) CREATE UNIQUE INDEX [UQ_calendar_revision_calendar_user_idempotency_unique] ON dbo.[calendar_revision] ([userId], [idempotencyKey]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_calendar_revision_calendar_user_publishedAt' AND object_id=OBJECT_ID(N'dbo.calendar_revision')) CREATE INDEX [IX_calendar_revision_calendar_user_publishedAt] ON dbo.[calendar_revision] ([userId], [publishedAt]);
GO

IF OBJECT_ID(N'dbo.content_report',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[content_report] (
    [reportId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_content_report] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [contentType] NVARCHAR(MAX) NOT NULL,
    [contentId] NVARCHAR(MAX) NOT NULL,
    [reason] NVARCHAR(MAX) NOT NULL,
    [note] NVARCHAR(MAX) NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_content_report_userId' AND object_id=OBJECT_ID(N'dbo.content_report')) CREATE INDEX [IX_content_report_userId] ON dbo.[content_report] ([userId]);
GO

IF OBJECT_ID(N'dbo.data_retention_job',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[data_retention_job] (
    [retentionJobId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_data_retention_job] PRIMARY KEY,
    [policyKey] NVARCHAR(512) NOT NULL,
    [objectType] NVARCHAR(512) NOT NULL,
    [cutoffAt] DATETIME2(3) NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [candidateCount] BIGINT NOT NULL,
    [deletedCount] BIGINT NOT NULL,
    [startedAt] DATETIME2(3) NOT NULL,
    [completedAt] DATETIME2(3) NULL,
    [errorCode] NVARCHAR(512) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.deletion_job',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[deletion_job] (
    [deletionJobId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_deletion_job] PRIMARY KEY,
    [deletionRequestId] NVARCHAR(128) NOT NULL,
    [domain] NVARCHAR(512) NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [attemptCount] BIGINT NOT NULL,
    [lastAttemptAt] DATETIME2(3) NULL,
    [completedAt] DATETIME2(3) NULL,
    [errorCode] NVARCHAR(512) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.deletion_request',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[deletion_request] (
    [deletionRequestId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_deletion_request] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [scope] NVARCHAR(512) NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [requestedAt] DATETIME2(3) NOT NULL,
    [executeAfter] NVARCHAR(512) NOT NULL,
    [canceledAt] DATETIME2(3) NOT NULL,
    [recentAuthAt] DATETIME2(3) NOT NULL,
    [reason] NVARCHAR(MAX) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_deletion_request_userId' AND object_id=OBJECT_ID(N'dbo.deletion_request')) CREATE INDEX [IX_deletion_request_userId] ON dbo.[deletion_request] ([userId]);
GO

IF OBJECT_ID(N'dbo.export_artifact',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[export_artifact] (
    [artifactId] NVARCHAR(MAX) NOT NULL CONSTRAINT [PK_export_artifact] PRIMARY KEY,
    [exportJobId] NVARCHAR(128) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL,
    [bucketId] NVARCHAR(128) NOT NULL,
    [objectId] NVARCHAR(128) NOT NULL,
    [checksum] NVARCHAR(256) NOT NULL,
    [sizeBytes] NVARCHAR(512) NOT NULL,
    [expiresAt] DATETIME2(3) NULL,
    [downloadedAt] DATETIME2(3) NOT NULL,
    [revokedAt] DATETIME2(3) NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_export_artifact_userId' AND object_id=OBJECT_ID(N'dbo.export_artifact')) CREATE INDEX [IX_export_artifact_userId] ON dbo.[export_artifact] ([userId]);
GO

IF OBJECT_ID(N'dbo.export_job',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[export_job] (
    [exportJobId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_export_job] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [exportType] NVARCHAR(512) NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [requestedAt] DATETIME2(3) NOT NULL,
    [startedAt] DATETIME2(3) NOT NULL,
    [completedAt] DATETIME2(3) NULL,
    [expiresAt] DATETIME2(3) NULL,
    [errorCode] NVARCHAR(512) NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_export_job_userId' AND object_id=OBJECT_ID(N'dbo.export_job')) CREATE INDEX [IX_export_job_userId] ON dbo.[export_job] ([userId]);
GO

IF OBJECT_ID(N'dbo.feature_flag',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[feature_flag] (
    [flagId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_feature_flag] PRIMARY KEY,
    [key] NVARCHAR(512) NOT NULL,
    [environment] NVARCHAR(512) NOT NULL,
    [enabled] BIT NOT NULL,
    [valueJson] FLOAT NOT NULL,
    [rolloutPercent] NVARCHAR(512) NOT NULL,
    [minimumAppVersion] BIGINT NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.schema_migrations',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[schema_migrations] (
    [migrationId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_schema_migrations] PRIMARY KEY,
    [schemaVersion] BIGINT NOT NULL,
    [checksum] NVARCHAR(256) NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [resourceSummaryJson] NVARCHAR(MAX) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

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
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UQ_serving_prior_observation_serving_prior_owner_observation_unique' AND object_id=OBJECT_ID(N'dbo.serving_prior_observation')) CREATE UNIQUE INDEX [UQ_serving_prior_observation_serving_prior_owner_observation_unique] ON dbo.[serving_prior_observation] ([ownerUserId], [observationId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UQ_serving_prior_observation_serving_prior_source_revision_unique' AND object_id=OBJECT_ID(N'dbo.serving_prior_observation')) CREATE UNIQUE INDEX [UQ_serving_prior_observation_serving_prior_source_revision_unique] ON dbo.[serving_prior_observation] ([ownerUserId], [sourceMealId], [sourceMealRevision], [identityKey]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_serving_prior_observation_serving_prior_owner_identity_confirmedAt' AND object_id=OBJECT_ID(N'dbo.serving_prior_observation')) CREATE INDEX [IX_serving_prior_observation_serving_prior_owner_identity_confirmedAt] ON dbo.[serving_prior_observation] ([ownerUserId], [identityKey], [confirmedAt]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_serving_prior_observation_serving_prior_owner_confirmedAt' AND object_id=OBJECT_ID(N'dbo.serving_prior_observation')) CREATE INDEX [IX_serving_prior_observation_serving_prior_owner_confirmedAt] ON dbo.[serving_prior_observation] ([ownerUserId], [confirmedAt]);
GO

IF OBJECT_ID(N'dbo.support_ticket',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[support_ticket] (
    [ticketId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_support_ticket] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [category] NVARCHAR(512) NOT NULL,
    [subject] NVARCHAR(512) NOT NULL,
    [bodyRedacted] NVARCHAR(MAX) NOT NULL,
    [safeContextJson] NVARCHAR(MAX) NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_support_ticket_userId' AND object_id=OBJECT_ID(N'dbo.support_ticket')) CREATE INDEX [IX_support_ticket_userId] ON dbo.[support_ticket] ([userId]);
GO

-- ============================================================
-- IDENTITY_PROFILE
-- ============================================================

IF OBJECT_ID(N'dbo.consent_record',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[consent_record] (
    [consentId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_consent_record] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [consentType] NVARCHAR(512) NOT NULL,
    [documentVersion] BIGINT NOT NULL,
    [choice] NVARCHAR(512) NOT NULL,
    [jurisdiction] NVARCHAR(512) NOT NULL,
    [sourcePlatform] NVARCHAR(512) NOT NULL,
    [recordedAt] DATETIME2(3) NOT NULL,
    [revokedAt] DATETIME2(3) NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_consent_record_userId' AND object_id=OBJECT_ID(N'dbo.consent_record')) CREATE INDEX [IX_consent_record_userId] ON dbo.[consent_record] ([userId]);
GO

IF OBJECT_ID(N'dbo.onboarding_progress',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[onboarding_progress] (
    [userId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_onboarding_progress] PRIMARY KEY,
    [currentStep] NVARCHAR(512) NOT NULL,
    [completedStepsJson] NVARCHAR(MAX) NOT NULL,
    [draftValuesJson] FLOAT NOT NULL,
    [schemaVersion] BIGINT NOT NULL,
    [revision] BIGINT NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_onboarding_progress_userId' AND object_id=OBJECT_ID(N'dbo.onboarding_progress')) CREATE INDEX [IX_onboarding_progress_userId] ON dbo.[onboarding_progress] ([userId]);
GO

IF OBJECT_ID(N'dbo.privacy_preference',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[privacy_preference] (
    [userId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_privacy_preference] PRIMARY KEY,
    [retainMealImages] BIT NOT NULL,
    [imageRetentionDays] BIGINT NOT NULL,
    [analyticsAllowed] BIT NOT NULL,
    [modelImprovementAllowed] BIT NOT NULL,
    [exportLocale] NVARCHAR(512) NOT NULL,
    [revision] BIGINT NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_privacy_preference_userId' AND object_id=OBJECT_ID(N'dbo.privacy_preference')) CREATE INDEX [IX_privacy_preference_userId] ON dbo.[privacy_preference] ([userId]);
GO

IF OBJECT_ID(N'dbo.target_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[target_revision] (
    [targetRevisionId] BIGINT NOT NULL CONSTRAINT [PK_target_revision] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [effectiveDate] NVARCHAR(32) NOT NULL,
    [energyKcal] BIGINT NOT NULL,
    [proteinG] NVARCHAR(512) NOT NULL,
    [movementTarget] BIGINT NOT NULL,
    [actionCategory] NVARCHAR(512) NOT NULL,
    [source] NVARCHAR(512) NOT NULL,
    [formulaVersion] BIGINT NOT NULL,
    [userConfirmed] BIT NOT NULL,
    [revision] BIGINT NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_target_revision_userId' AND object_id=OBJECT_ID(N'dbo.target_revision')) CREATE INDEX [IX_target_revision_userId] ON dbo.[target_revision] ([userId]);
GO

IF OBJECT_ID(N'dbo.user_goal',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[user_goal] (
    [goalId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_user_goal] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [goalType] NVARCHAR(512) NOT NULL,
    [startDate] NVARCHAR(32) NOT NULL,
    [targetDate] NVARCHAR(32) NOT NULL,
    [targetWeightG] NVARCHAR(512) NOT NULL,
    [status] NVARCHAR(512) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [endedAt] DATETIME2(3) NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_user_goal_userId' AND object_id=OBJECT_ID(N'dbo.user_goal')) CREATE INDEX [IX_user_goal_userId] ON dbo.[user_goal] ([userId]);
GO

IF OBJECT_ID(N'dbo.user_identity',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[user_identity] (
    [identityId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_user_identity] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [provider] NVARCHAR(512) NOT NULL,
    [providerSubjectHash] NVARCHAR(256) NOT NULL,
    [emailNormalized] NVARCHAR(512) NOT NULL,
    [emailVerified] BIT NOT NULL,
    [linkedAt] DATETIME2(3) NOT NULL,
    [lastUsedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_user_identity_userId' AND object_id=OBJECT_ID(N'dbo.user_identity')) CREATE INDEX [IX_user_identity_userId] ON dbo.[user_identity] ([userId]);
GO

IF OBJECT_ID(N'dbo.user_preference',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[user_preference] (
    [preferenceId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_user_preference] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [key] NVARCHAR(512) NOT NULL,
    [valueJson] FLOAT NOT NULL,
    [revision] BIGINT NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_user_preference_userId' AND object_id=OBJECT_ID(N'dbo.user_preference')) CREATE INDEX [IX_user_preference_userId] ON dbo.[user_preference] ([userId]);
GO

IF OBJECT_ID(N'dbo.user_profile',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[user_profile] (
    [userId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_user_profile] PRIMARY KEY,
    [displayName] NVARCHAR(256) NOT NULL,
    [dateOfBirth] NVARCHAR(512) NOT NULL,
    [countryCode] BIGINT NOT NULL,
    [locale] NVARCHAR(512) NOT NULL,
    [timeZone] NVARCHAR(512) NOT NULL,
    [sexForEnergyEstimate] NVARCHAR(512) NOT NULL,
    [heightMm] BIGINT NOT NULL,
    [currentWeightG] NVARCHAR(512) NOT NULL,
    [goalWeightG] NVARCHAR(512) NOT NULL,
    [activityLevel] NVARCHAR(512) NOT NULL,
    [trainingFrequency] NVARCHAR(512) NOT NULL,
    [onboardingState] NVARCHAR(512) NOT NULL,
    [revision] BIGINT NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_user_profile_userId' AND object_id=OBJECT_ID(N'dbo.user_profile')) CREATE INDEX [IX_user_profile_userId] ON dbo.[user_profile] ([userId]);
GO

IF OBJECT_ID(N'dbo.user_session_metadata',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[user_session_metadata] (
    [sessionMetaId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_user_session_metadata] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [appwriteSessionIdHash] NVARCHAR(256) NOT NULL,
    [deviceId] NVARCHAR(128) NULL,
    [platform] NVARCHAR(512) NOT NULL,
    [appVersion] BIGINT NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [lastSeenAt] DATETIME2(3) NOT NULL,
    [revokedAt] DATETIME2(3) NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_user_session_metadata_userId' AND object_id=OBJECT_ID(N'dbo.user_session_metadata')) CREATE INDEX [IX_user_session_metadata_userId] ON dbo.[user_session_metadata] ([userId]);
GO

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

IF OBJECT_ID(N'dbo.notification',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[notification] (
    [notificationId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_notification] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [type] NVARCHAR(512) NOT NULL,
    [title] NVARCHAR(256) NOT NULL,
    [body] NVARCHAR(MAX) NOT NULL,
    [deepLink] NVARCHAR(512) NOT NULL,
    [objectId] NVARCHAR(128) NOT NULL,
    [priority] NVARCHAR(512) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [readAt] DATETIME2(3) NOT NULL,
    [expiresAt] DATETIME2(3) NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_notification_userId' AND object_id=OBJECT_ID(N'dbo.notification')) CREATE INDEX [IX_notification_userId] ON dbo.[notification] ([userId]);
GO

IF OBJECT_ID(N'dbo.notification_delivery',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[notification_delivery] (
    [deliveryId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_notification_delivery] PRIMARY KEY,
    [notificationId] NVARCHAR(128) NOT NULL,
    [deviceId] NVARCHAR(128) NULL,
    [provider] NVARCHAR(512) NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [attemptCount] BIGINT NOT NULL,
    [lastAttemptAt] DATETIME2(3) NULL,
    [providerMessageIdHash] NVARCHAR(256) NOT NULL,
    [errorCode] NVARCHAR(512) NULL
  );
END;
GO

-- ============================================================
-- NUTRITION
-- ============================================================

IF OBJECT_ID(N'dbo.action_completion',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[action_completion] (
    [completionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_action_completion] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [recommendationId] NVARCHAR(128) NOT NULL,
    [action] NVARCHAR(512) NOT NULL,
    [sourceDevice] NVARCHAR(512) NOT NULL,
    [idempotencyKey] NVARCHAR(512) NOT NULL,
    [occurredAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_action_completion_userId' AND object_id=OBJECT_ID(N'dbo.action_completion')) CREATE INDEX [IX_action_completion_userId] ON dbo.[action_completion] ([userId]);
GO

IF OBJECT_ID(N'dbo.daily_aggregate',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[daily_aggregate] (
    [aggregateId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_daily_aggregate] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [localDate] NVARCHAR(32) NOT NULL,
    [energyKcal] BIGINT NOT NULL,
    [proteinG] NVARCHAR(512) NOT NULL,
    [carbG] NVARCHAR(512) NOT NULL,
    [fatG] NVARCHAR(512) NOT NULL,
    [fiberG] NVARCHAR(512) NOT NULL,
    [movementValue] FLOAT NOT NULL,
    [movementUnit] NVARCHAR(512) NOT NULL,
    [mealCount] BIGINT NOT NULL,
    [workoutCount] BIGINT NOT NULL,
    [targetRevisionId] BIGINT NOT NULL,
    [revision] BIGINT NOT NULL,
    [sourceUpdatedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_daily_aggregate_userId' AND object_id=OBJECT_ID(N'dbo.daily_aggregate')) CREATE INDEX [IX_daily_aggregate_userId] ON dbo.[daily_aggregate] ([userId]);
GO

IF OBJECT_ID(N'dbo.daily_recommendation',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[daily_recommendation] (
    [recommendationId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_daily_recommendation] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [localDate] NVARCHAR(32) NOT NULL,
    [category] NVARCHAR(512) NOT NULL,
    [title] NVARCHAR(256) NOT NULL,
    [body] NVARCHAR(MAX) NOT NULL,
    [ruleId] NVARCHAR(128) NOT NULL,
    [ruleVersion] BIGINT NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [inputRevisionHash] BIGINT NOT NULL,
    [confidenceLabel] FLOAT NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_daily_recommendation_userId' AND object_id=OBJECT_ID(N'dbo.daily_recommendation')) CREATE INDEX [IX_daily_recommendation_userId] ON dbo.[daily_recommendation] ([userId]);
GO

IF OBJECT_ID(N'dbo.daily_summary',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[daily_summary] (
    [summaryId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_daily_summary] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [deviceId] NVARCHAR(128) NULL,
    [revision] BIGINT NOT NULL,
    [payloadJson] NVARCHAR(MAX) NOT NULL,
    [source] NVARCHAR(512) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_daily_summary_userId' AND object_id=OBJECT_ID(N'dbo.daily_summary')) CREATE INDEX [IX_daily_summary_userId] ON dbo.[daily_summary] ([userId]);
GO

IF OBJECT_ID(N'dbo.day_summary',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[day_summary] (
    [daySummaryId] BIGINT NOT NULL CONSTRAINT [PK_day_summary] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [localDate] NVARCHAR(32) NOT NULL,
    [hasMeals] BIT NOT NULL,
    [hasWorkout] BIT NOT NULL,
    [energyStatus] NVARCHAR(512) NOT NULL,
    [proteinStatus] NVARCHAR(512) NOT NULL,
    [syncState] NVARCHAR(512) NOT NULL,
    [revision] BIGINT NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_day_summary_userId' AND object_id=OBJECT_ID(N'dbo.day_summary')) CREATE INDEX [IX_day_summary_userId] ON dbo.[day_summary] ([userId]);
GO

IF OBJECT_ID(N'dbo.food_catalog_alias',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[food_catalog_alias] (
    [aliasId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_food_catalog_alias] PRIMARY KEY,
    [nutritionSourceId] NVARCHAR(128) NOT NULL,
    [locale] NVARCHAR(512) NOT NULL,
    [aliasNormalized] NVARCHAR(512) NOT NULL,
    [rank] NVARCHAR(512) NOT NULL,
    [source] NVARCHAR(512) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.meal',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal] (
    [mealId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_meal] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [sourceDraftId] NVARCHAR(128) NULL,
    [confirmedAt] DATETIME2(3) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_userId' AND object_id=OBJECT_ID(N'dbo.meal')) CREATE INDEX [IX_meal_userId] ON dbo.[meal] ([userId]);
GO

IF OBJECT_ID(N'dbo.meal_analysis_request',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_analysis_request] (
    [requestId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_meal_analysis_request] PRIMARY KEY,
    [draftId] NVARCHAR(128) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL,
    [provider] NVARCHAR(512) NOT NULL,
    [status] NVARCHAR(512) NOT NULL,
    [attempts] BIGINT NOT NULL,
    [requestedAt] DATETIME2(3) NOT NULL,
    [completedAt] DATETIME2(3) NULL,
    [errorCode] NVARCHAR(512) NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_analysis_request_userId' AND object_id=OBJECT_ID(N'dbo.meal_analysis_request')) CREATE INDEX [IX_meal_analysis_request_userId] ON dbo.[meal_analysis_request] ([userId]);
GO

IF OBJECT_ID(N'dbo.meal_draft',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_draft] (
    [draftId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_meal_draft] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [deviceId] NVARCHAR(128) NULL,
    [mediaId] NVARCHAR(128) NULL,
    [status] NVARCHAR(512) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_draft_userId' AND object_id=OBJECT_ID(N'dbo.meal_draft')) CREATE INDEX [IX_meal_draft_userId] ON dbo.[meal_draft] ([userId]);
GO

IF OBJECT_ID(N'dbo.meal_draft_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_draft_revision] (
    [draftRevisionId] BIGINT NOT NULL CONSTRAINT [PK_meal_draft_revision] PRIMARY KEY,
    [draftId] NVARCHAR(128) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL,
    [revision] BIGINT NOT NULL,
    [payloadJson] NVARCHAR(MAX) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_draft_revision_userId' AND object_id=OBJECT_ID(N'dbo.meal_draft_revision')) CREATE INDEX [IX_meal_draft_revision_userId] ON dbo.[meal_draft_revision] ([userId]);
GO

IF OBJECT_ID(N'dbo.meal_item',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_item] (
    [mealItemId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_meal_item] PRIMARY KEY,
    [mealId] NVARCHAR(128) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL,
    [name] NVARCHAR(256) NOT NULL,
    [quantity] FLOAT NOT NULL,
    [quantityUnit] FLOAT NOT NULL,
    [nutritionJson] NVARCHAR(MAX) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_item_userId' AND object_id=OBJECT_ID(N'dbo.meal_item')) CREATE INDEX [IX_meal_item_userId] ON dbo.[meal_item] ([userId]);
GO

IF OBJECT_ID(N'dbo.meal_item_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_item_revision] (
    [itemRevisionId] BIGINT NOT NULL CONSTRAINT [PK_meal_item_revision] PRIMARY KEY,
    [mealRevisionId] BIGINT NOT NULL,
    [logicalItemId] NVARCHAR(128) NOT NULL,
    [operation] NVARCHAR(512) NOT NULL,
    [dataJson] NVARCHAR(MAX) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.meal_media',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_media] (
    [mediaId] NVARCHAR(128) NULL CONSTRAINT [PK_meal_media] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [draftId] NVARCHAR(128) NOT NULL,
    [mealId] NVARCHAR(128) NOT NULL,
    [bucketId] NVARCHAR(128) NOT NULL,
    [objectId] NVARCHAR(128) NOT NULL,
    [variant] NVARCHAR(512) NOT NULL,
    [checksum] NVARCHAR(256) NOT NULL,
    [width] BIGINT NOT NULL,
    [height] BIGINT NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [deleteAfter] NVARCHAR(512) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [deletedAt] DATETIME2(3) NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_media_userId' AND object_id=OBJECT_ID(N'dbo.meal_media')) CREATE INDEX [IX_meal_media_userId] ON dbo.[meal_media] ([userId]);
GO

IF OBJECT_ID(N'dbo.meal_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_revision] (
    [mealRevisionId] BIGINT NOT NULL CONSTRAINT [PK_meal_revision] PRIMARY KEY,
    [mealId] NVARCHAR(128) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL,
    [revision] BIGINT NOT NULL,
    [payloadJson] NVARCHAR(MAX) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_revision_userId' AND object_id=OBJECT_ID(N'dbo.meal_revision')) CREATE INDEX [IX_meal_revision_userId] ON dbo.[meal_revision] ([userId]);
GO

IF OBJECT_ID(N'dbo.meal_tombstone',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_tombstone] (
    [tombstoneId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_meal_tombstone] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [mealId] NVARCHAR(128) NOT NULL,
    [deletedRevision] BIGINT NOT NULL,
    [reason] NVARCHAR(MAX) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [purgeAfter] NVARCHAR(512) NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_meal_tombstone_userId' AND object_id=OBJECT_ID(N'dbo.meal_tombstone')) CREATE INDEX [IX_meal_tombstone_userId] ON dbo.[meal_tombstone] ([userId]);
GO

IF OBJECT_ID(N'dbo.nutrition_source_cache',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[nutrition_source_cache] (
    [nutritionSourceId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_nutrition_source_cache] PRIMARY KEY,
    [provider] NVARCHAR(512) NOT NULL,
    [providerRecordId] NVARCHAR(128) NOT NULL,
    [locale] NVARCHAR(512) NOT NULL,
    [description] NVARCHAR(MAX) NOT NULL,
    [basis100gJson] NVARCHAR(MAX) NOT NULL,
    [rawVersion] BIGINT NOT NULL,
    [fetchedAt] DATETIME2(3) NOT NULL,
    [expiresAt] DATETIME2(3) NULL,
    [checksum] NVARCHAR(256) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.personal_food',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[personal_food] (
    [personalFoodId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_personal_food] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [name] NVARCHAR(256) NOT NULL,
    [basisAmount] FLOAT NOT NULL,
    [basisUnit] NVARCHAR(512) NOT NULL,
    [energyKcal] BIGINT NOT NULL,
    [proteinG] NVARCHAR(512) NOT NULL,
    [carbG] NVARCHAR(512) NOT NULL,
    [fatG] NVARCHAR(512) NOT NULL,
    [fiberG] NVARCHAR(512) NOT NULL,
    [provenanceNote] NVARCHAR(MAX) NOT NULL,
    [revision] BIGINT NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL,
    [deletedAt] DATETIME2(3) NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_personal_food_userId' AND object_id=OBJECT_ID(N'dbo.personal_food')) CREATE INDEX [IX_personal_food_userId] ON dbo.[personal_food] ([userId]);
GO

IF OBJECT_ID(N'dbo.recommendation_evidence',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[recommendation_evidence] (
    [evidenceId] NVARCHAR(MAX) NOT NULL CONSTRAINT [PK_recommendation_evidence] PRIMARY KEY,
    [recommendationId] NVARCHAR(128) NOT NULL,
    [evidenceType] NVARCHAR(MAX) NOT NULL,
    [objectId] NVARCHAR(128) NOT NULL,
    [summaryJson] NVARCHAR(MAX) NOT NULL,
    [sourceUpdatedAt] DATETIME2(3) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.saved_meal',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[saved_meal] (
    [savedMealId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_saved_meal] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [name] NVARCHAR(256) NOT NULL,
    [currentRevision] BIGINT NOT NULL,
    [totalEnergyKcal] BIGINT NOT NULL,
    [totalProteinG] NVARCHAR(512) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL,
    [deletedAt] DATETIME2(3) NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_saved_meal_userId' AND object_id=OBJECT_ID(N'dbo.saved_meal')) CREATE INDEX [IX_saved_meal_userId] ON dbo.[saved_meal] ([userId]);
GO

IF OBJECT_ID(N'dbo.saved_meal_item',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[saved_meal_item] (
    [savedMealItemId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_saved_meal_item] PRIMARY KEY,
    [savedMealId] NVARCHAR(128) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL,
    [sortOrder] NVARCHAR(512) NOT NULL,
    [foodRef] NVARCHAR(512) NOT NULL,
    [displayName] NVARCHAR(256) NOT NULL,
    [grams] BIGINT NOT NULL,
    [portionJson] NVARCHAR(MAX) NOT NULL,
    [nutrientsJson] NVARCHAR(MAX) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_saved_meal_item_userId' AND object_id=OBJECT_ID(N'dbo.saved_meal_item')) CREATE INDEX [IX_saved_meal_item_userId] ON dbo.[saved_meal_item] ([userId]);
GO

IF OBJECT_ID(N'dbo.wellness_checkin',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[wellness_checkin] (
    [checkinId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_wellness_checkin] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [localDate] NVARCHAR(32) NOT NULL,
    [energyLevel] NVARCHAR(512) NOT NULL,
    [sorenessAreasJson] NVARCHAR(MAX) NOT NULL,
    [sleepPerception] NVARCHAR(512) NOT NULL,
    [note] NVARCHAR(MAX) NOT NULL,
    [revision] BIGINT NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_wellness_checkin_userId' AND object_id=OBJECT_ID(N'dbo.wellness_checkin')) CREATE INDEX [IX_wellness_checkin_userId] ON dbo.[wellness_checkin] ([userId]);
GO

-- ============================================================
-- PROGRESS_REPORTING
-- ============================================================

IF OBJECT_ID(N'dbo.progress_insight',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[progress_insight] (
    [insightId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_progress_insight] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [periodStart] NVARCHAR(512) NOT NULL,
    [periodEnd] NVARCHAR(512) NOT NULL,
    [category] NVARCHAR(512) NOT NULL,
    [resultText] NVARCHAR(512) NOT NULL,
    [evidenceHash] NVARCHAR(MAX) NOT NULL,
    [ruleVersion] BIGINT NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_progress_insight_userId' AND object_id=OBJECT_ID(N'dbo.progress_insight')) CREATE INDEX [IX_progress_insight_userId] ON dbo.[progress_insight] ([userId]);
GO

IF OBJECT_ID(N'dbo.report',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[report] (
    [reportId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_report] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [reportType] NVARCHAR(512) NOT NULL,
    [periodStart] NVARCHAR(512) NOT NULL,
    [periodEnd] NVARCHAR(512) NOT NULL,
    [status] NVARCHAR(512) NOT NULL,
    [sourceRevisionHash] BIGINT NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [completedAt] DATETIME2(3) NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_report_userId' AND object_id=OBJECT_ID(N'dbo.report')) CREATE INDEX [IX_report_userId] ON dbo.[report] ([userId]);
GO

IF OBJECT_ID(N'dbo.report_evidence',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[report_evidence] (
    [reportEvidenceId] NVARCHAR(MAX) NOT NULL CONSTRAINT [PK_report_evidence] PRIMARY KEY,
    [reportId] NVARCHAR(128) NOT NULL,
    [sectionId] NVARCHAR(128) NOT NULL,
    [sourceType] NVARCHAR(512) NOT NULL,
    [sourceObjectId] NVARCHAR(128) NOT NULL,
    [sourceRevision] BIGINT NOT NULL,
    [summaryJson] NVARCHAR(MAX) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.report_section',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[report_section] (
    [sectionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_report_section] PRIMARY KEY,
    [reportId] NVARCHAR(128) NOT NULL,
    [sortOrder] NVARCHAR(512) NOT NULL,
    [sectionType] NVARCHAR(512) NOT NULL,
    [title] NVARCHAR(256) NOT NULL,
    [narrative] NVARCHAR(512) NOT NULL,
    [chartSpecJson] NVARCHAR(MAX) NOT NULL,
    [provenanceJson] NVARCHAR(MAX) NOT NULL
  );
END;
GO

-- ============================================================
-- TRAINING
-- ============================================================

IF OBJECT_ID(N'dbo.exercise_catalog',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[exercise_catalog] (
    [exerciseId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_exercise_catalog] PRIMARY KEY,
    [slug] NVARCHAR(512) NOT NULL,
    [name] NVARCHAR(256) NOT NULL,
    [instructionsJson] NVARCHAR(MAX) NOT NULL,
    [equipmentJson] NVARCHAR(MAX) NOT NULL,
    [mediaLicense] NVARCHAR(512) NOT NULL,
    [mediaObjectId] NVARCHAR(128) NOT NULL,
    [status] NVARCHAR(512) NOT NULL,
    [revision] BIGINT NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.exercise_muscle_map',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[exercise_muscle_map] (
    [mapId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_exercise_muscle_map] PRIMARY KEY,
    [exerciseId] NVARCHAR(128) NOT NULL,
    [muscleGroup] NVARCHAR(512) NOT NULL,
    [role] NVARCHAR(512) NOT NULL,
    [contributionWeight] NVARCHAR(512) NOT NULL,
    [sourceVersion] BIGINT NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.muscle_load',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[muscle_load] (
    [muscleLoadId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_muscle_load] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [sessionId] NVARCHAR(128) NOT NULL,
    [localDate] NVARCHAR(32) NOT NULL,
    [muscleGroup] NVARCHAR(512) NOT NULL,
    [contribution] NVARCHAR(512) NOT NULL,
    [algorithmVersion] BIGINT NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_muscle_load_userId' AND object_id=OBJECT_ID(N'dbo.muscle_load')) CREATE INDEX [IX_muscle_load_userId] ON dbo.[muscle_load] ([userId]);
GO

IF OBJECT_ID(N'dbo.workout_event',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_event] (
    [eventId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_workout_event] PRIMARY KEY,
    [sessionId] NVARCHAR(128) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL,
    [eventType] NVARCHAR(512) NOT NULL,
    [eventSequence] BIGINT NOT NULL,
    [payloadJson] NVARCHAR(MAX) NOT NULL,
    [sourceDevice] NVARCHAR(512) NOT NULL,
    [occurredAt] DATETIME2(3) NOT NULL,
    [idempotencyKey] NVARCHAR(512) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_event_userId' AND object_id=OBJECT_ID(N'dbo.workout_event')) CREATE INDEX [IX_workout_event_userId] ON dbo.[workout_event] ([userId]);
GO

IF OBJECT_ID(N'dbo.workout_plan',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_plan] (
    [planId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_workout_plan] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [ownerType] NVARCHAR(512) NOT NULL,
    [name] NVARCHAR(256) NOT NULL,
    [goalCategory] NVARCHAR(512) NOT NULL,
    [currentRevision] BIGINT NOT NULL,
    [status] NVARCHAR(512) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL,
    [updatedAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_plan_userId' AND object_id=OBJECT_ID(N'dbo.workout_plan')) CREATE INDEX [IX_workout_plan_userId] ON dbo.[workout_plan] ([userId]);
GO

IF OBJECT_ID(N'dbo.workout_plan_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_plan_revision] (
    [planRevisionId] BIGINT NOT NULL CONSTRAINT [PK_workout_plan_revision] PRIMARY KEY,
    [planId] NVARCHAR(128) NOT NULL,
    [revision] BIGINT NOT NULL,
    [name] NVARCHAR(256) NOT NULL,
    [notes] NVARCHAR(MAX) NOT NULL,
    [source] NVARCHAR(512) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.workout_plan_step',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_plan_step] (
    [stepId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_workout_plan_step] PRIMARY KEY,
    [planRevisionId] BIGINT NOT NULL,
    [sortOrder] NVARCHAR(512) NOT NULL,
    [exerciseId] NVARCHAR(128) NOT NULL,
    [sets] NVARCHAR(512) NOT NULL,
    [repsMin] NVARCHAR(512) NOT NULL,
    [repsMax] NVARCHAR(512) NOT NULL,
    [durationSeconds] BIGINT NOT NULL,
    [restSeconds] BIGINT NOT NULL,
    [loadGuidance] NVARCHAR(512) NOT NULL,
    [optional] NVARCHAR(512) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.workout_session',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_session] (
    [sessionId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_workout_session] PRIMARY KEY,
    [userId] NVARCHAR(128) NOT NULL,
    [planRevisionId] BIGINT NOT NULL,
    [authorityDeviceId] NVARCHAR(128) NOT NULL,
    [workoutType] NVARCHAR(512) NOT NULL,
    [state] NVARCHAR(512) NOT NULL,
    [currentRevision] BIGINT NOT NULL,
    [startedAt] DATETIME2(3) NOT NULL,
    [endedAt] DATETIME2(3) NULL,
    [discardedAt] DATETIME2(3) NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_session_userId' AND object_id=OBJECT_ID(N'dbo.workout_session')) CREATE INDEX [IX_workout_session_userId] ON dbo.[workout_session] ([userId]);
GO

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
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UQ_workout_session_revision_workout_session_revision_unique' AND object_id=OBJECT_ID(N'dbo.workout_session_revision')) CREATE UNIQUE INDEX [UQ_workout_session_revision_workout_session_revision_unique] ON dbo.[workout_session_revision] ([sessionId], [revision]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UQ_workout_session_revision_workout_session_operation_unique' AND object_id=OBJECT_ID(N'dbo.workout_session_revision')) CREATE UNIQUE INDEX [UQ_workout_session_revision_workout_session_operation_unique] ON dbo.[workout_session_revision] ([sessionId], [sourceOperationId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UQ_workout_session_revision_workout_session_idempotency_unique' AND object_id=OBJECT_ID(N'dbo.workout_session_revision')) CREATE UNIQUE INDEX [UQ_workout_session_revision_workout_session_idempotency_unique] ON dbo.[workout_session_revision] ([sessionId], [idempotencyKey]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_session_revision_workout_session_acceptedAt' AND object_id=OBJECT_ID(N'dbo.workout_session_revision')) CREATE INDEX [IX_workout_session_revision_workout_session_acceptedAt] ON dbo.[workout_session_revision] ([sessionId], [acceptedAt]);
GO

IF OBJECT_ID(N'dbo.workout_summary',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[workout_summary] (
    [summaryId] NVARCHAR(128) NOT NULL CONSTRAINT [PK_workout_summary] PRIMARY KEY,
    [sessionId] NVARCHAR(128) NOT NULL,
    [userId] NVARCHAR(128) NOT NULL,
    [durationSeconds] BIGINT NOT NULL,
    [activeEnergyKcal] BIGINT NOT NULL,
    [distanceM] FLOAT NOT NULL,
    [steps] NVARCHAR(512) NOT NULL,
    [averageHeartRate] FLOAT NOT NULL,
    [sourcePlatform] NVARCHAR(512) NOT NULL,
    [healthWriteState] NVARCHAR(512) NOT NULL,
    [revision] BIGINT NOT NULL,
    [createdAt] DATETIME2(3) NOT NULL
  );
END;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_workout_summary_userId' AND object_id=OBJECT_ID(N'dbo.workout_summary')) CREATE INDEX [IX_workout_summary_userId] ON dbo.[workout_summary] ([userId]);
GO

-- SAFE FOREIGN KEYS. userId ownership remains session/backend enforced.
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_analysis_attempt_requestId_meal_analysis_request') ALTER TABLE dbo.[analysis_attempt] WITH CHECK ADD CONSTRAINT [FK_analysis_attempt_requestId_meal_analysis_request] FOREIGN KEY ([requestId]) REFERENCES dbo.[meal_analysis_request] ([requestId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_analysis_attempt_promptVersionId_prompt_version') ALTER TABLE dbo.[analysis_attempt] WITH CHECK ADD CONSTRAINT [FK_analysis_attempt_promptVersionId_prompt_version] FOREIGN KEY ([promptVersionId]) REFERENCES dbo.[prompt_version] ([promptVersionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_analysis_attempt_modelConfigId_model_configuration') ALTER TABLE dbo.[analysis_attempt] WITH CHECK ADD CONSTRAINT [FK_analysis_attempt_modelConfigId_model_configuration] FOREIGN KEY ([modelConfigId]) REFERENCES dbo.[model_configuration] ([modelConfigId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_analysis_event_requestId_meal_analysis_request') ALTER TABLE dbo.[analysis_event] WITH CHECK ADD CONSTRAINT [FK_analysis_event_requestId_meal_analysis_request] FOREIGN KEY ([requestId]) REFERENCES dbo.[meal_analysis_request] ([requestId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_analysis_event_attemptId_analysis_attempt') ALTER TABLE dbo.[analysis_event] WITH CHECK ADD CONSTRAINT [FK_analysis_event_attemptId_analysis_attempt] FOREIGN KEY ([attemptId]) REFERENCES dbo.[analysis_attempt] ([attemptId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_prompt_version_promptId_prompt_template') ALTER TABLE dbo.[prompt_version] WITH CHECK ADD CONSTRAINT [FK_prompt_version_promptId_prompt_template] FOREIGN KEY ([promptId]) REFERENCES dbo.[prompt_template] ([promptId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_provider_call_requestId_meal_analysis_request') ALTER TABLE dbo.[provider_call] WITH CHECK ADD CONSTRAINT [FK_provider_call_requestId_meal_analysis_request] FOREIGN KEY ([requestId]) REFERENCES dbo.[meal_analysis_request] ([requestId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_provider_call_promptVersionId_prompt_version') ALTER TABLE dbo.[provider_call] WITH CHECK ADD CONSTRAINT [FK_provider_call_promptVersionId_prompt_version] FOREIGN KEY ([promptVersionId]) REFERENCES dbo.[prompt_version] ([promptVersionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_purchase_event_subscriptionId_subscription') ALTER TABLE dbo.[purchase_event] WITH CHECK ADD CONSTRAINT [FK_purchase_event_subscriptionId_subscription] FOREIGN KEY ([subscriptionId]) REFERENCES dbo.[subscription] ([subscriptionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_usage_ledger_requestId_meal_analysis_request') ALTER TABLE dbo.[usage_ledger] WITH CHECK ADD CONSTRAINT [FK_usage_ledger_requestId_meal_analysis_request] FOREIGN KEY ([requestId]) REFERENCES dbo.[meal_analysis_request] ([requestId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_health_import_cursor_connectionId_health_connection') ALTER TABLE dbo.[health_import_cursor] WITH CHECK ADD CONSTRAINT [FK_health_import_cursor_connectionId_health_connection] FOREIGN KEY ([connectionId]) REFERENCES dbo.[health_connection] ([connectionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_sync_cursor_deviceId_device') ALTER TABLE dbo.[sync_cursor] WITH CHECK ADD CONSTRAINT [FK_sync_cursor_deviceId_device] FOREIGN KEY ([deviceId]) REFERENCES dbo.[device] ([deviceId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_sync_operation_deviceId_device') ALTER TABLE dbo.[sync_operation] WITH CHECK ADD CONSTRAINT [FK_sync_operation_deviceId_device] FOREIGN KEY ([deviceId]) REFERENCES dbo.[device] ([deviceId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_watch_delivery_deviceId_device') ALTER TABLE dbo.[watch_delivery] WITH CHECK ADD CONSTRAINT [FK_watch_delivery_deviceId_device] FOREIGN KEY ([deviceId]) REFERENCES dbo.[device] ([deviceId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_watch_receipt_deviceId_device') ALTER TABLE dbo.[watch_receipt] WITH CHECK ADD CONSTRAINT [FK_watch_receipt_deviceId_device] FOREIGN KEY ([deviceId]) REFERENCES dbo.[device] ([deviceId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_calendar_entry_calendarRevisionId_calendar_revision') ALTER TABLE dbo.[calendar_entry] WITH CHECK ADD CONSTRAINT [FK_calendar_entry_calendarRevisionId_calendar_revision] FOREIGN KEY ([calendarRevisionId]) REFERENCES dbo.[calendar_revision] ([calendarRevisionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_calendar_revision_operationId_sync_operation') ALTER TABLE dbo.[calendar_revision] WITH CHECK ADD CONSTRAINT [FK_calendar_revision_operationId_sync_operation] FOREIGN KEY ([operationId]) REFERENCES dbo.[sync_operation] ([operationId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_deletion_job_deletionRequestId_deletion_request') ALTER TABLE dbo.[deletion_job] WITH CHECK ADD CONSTRAINT [FK_deletion_job_deletionRequestId_deletion_request] FOREIGN KEY ([deletionRequestId]) REFERENCES dbo.[deletion_request] ([deletionRequestId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_export_artifact_exportJobId_export_job') ALTER TABLE dbo.[export_artifact] WITH CHECK ADD CONSTRAINT [FK_export_artifact_exportJobId_export_job] FOREIGN KEY ([exportJobId]) REFERENCES dbo.[export_job] ([exportJobId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_user_session_metadata_deviceId_device') ALTER TABLE dbo.[user_session_metadata] WITH CHECK ADD CONSTRAINT [FK_user_session_metadata_deviceId_device] FOREIGN KEY ([deviceId]) REFERENCES dbo.[device] ([deviceId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_notification_delivery_notificationId_notification') ALTER TABLE dbo.[notification_delivery] WITH CHECK ADD CONSTRAINT [FK_notification_delivery_notificationId_notification] FOREIGN KEY ([notificationId]) REFERENCES dbo.[notification] ([notificationId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_notification_delivery_deviceId_device') ALTER TABLE dbo.[notification_delivery] WITH CHECK ADD CONSTRAINT [FK_notification_delivery_deviceId_device] FOREIGN KEY ([deviceId]) REFERENCES dbo.[device] ([deviceId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_action_completion_recommendationId_daily_recommendation') ALTER TABLE dbo.[action_completion] WITH CHECK ADD CONSTRAINT [FK_action_completion_recommendationId_daily_recommendation] FOREIGN KEY ([recommendationId]) REFERENCES dbo.[daily_recommendation] ([recommendationId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_daily_aggregate_targetRevisionId_target_revision') ALTER TABLE dbo.[daily_aggregate] WITH CHECK ADD CONSTRAINT [FK_daily_aggregate_targetRevisionId_target_revision] FOREIGN KEY ([targetRevisionId]) REFERENCES dbo.[target_revision] ([targetRevisionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_daily_summary_deviceId_device') ALTER TABLE dbo.[daily_summary] WITH CHECK ADD CONSTRAINT [FK_daily_summary_deviceId_device] FOREIGN KEY ([deviceId]) REFERENCES dbo.[device] ([deviceId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_food_catalog_alias_nutritionSourceId_nutrition_source_cache') ALTER TABLE dbo.[food_catalog_alias] WITH CHECK ADD CONSTRAINT [FK_food_catalog_alias_nutritionSourceId_nutrition_source_cache] FOREIGN KEY ([nutritionSourceId]) REFERENCES dbo.[nutrition_source_cache] ([nutritionSourceId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_meal_analysis_request_draftId_meal_draft') ALTER TABLE dbo.[meal_analysis_request] WITH CHECK ADD CONSTRAINT [FK_meal_analysis_request_draftId_meal_draft] FOREIGN KEY ([draftId]) REFERENCES dbo.[meal_draft] ([draftId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_meal_draft_deviceId_device') ALTER TABLE dbo.[meal_draft] WITH CHECK ADD CONSTRAINT [FK_meal_draft_deviceId_device] FOREIGN KEY ([deviceId]) REFERENCES dbo.[device] ([deviceId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_meal_draft_mediaId_meal_media') ALTER TABLE dbo.[meal_draft] WITH CHECK ADD CONSTRAINT [FK_meal_draft_mediaId_meal_media] FOREIGN KEY ([mediaId]) REFERENCES dbo.[meal_media] ([mediaId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_meal_draft_revision_draftId_meal_draft') ALTER TABLE dbo.[meal_draft_revision] WITH CHECK ADD CONSTRAINT [FK_meal_draft_revision_draftId_meal_draft] FOREIGN KEY ([draftId]) REFERENCES dbo.[meal_draft] ([draftId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_meal_item_mealId_meal') ALTER TABLE dbo.[meal_item] WITH CHECK ADD CONSTRAINT [FK_meal_item_mealId_meal] FOREIGN KEY ([mealId]) REFERENCES dbo.[meal] ([mealId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_meal_item_revision_mealRevisionId_meal_revision') ALTER TABLE dbo.[meal_item_revision] WITH CHECK ADD CONSTRAINT [FK_meal_item_revision_mealRevisionId_meal_revision] FOREIGN KEY ([mealRevisionId]) REFERENCES dbo.[meal_revision] ([mealRevisionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_meal_media_draftId_meal_draft') ALTER TABLE dbo.[meal_media] WITH CHECK ADD CONSTRAINT [FK_meal_media_draftId_meal_draft] FOREIGN KEY ([draftId]) REFERENCES dbo.[meal_draft] ([draftId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_meal_media_mealId_meal') ALTER TABLE dbo.[meal_media] WITH CHECK ADD CONSTRAINT [FK_meal_media_mealId_meal] FOREIGN KEY ([mealId]) REFERENCES dbo.[meal] ([mealId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_meal_revision_mealId_meal') ALTER TABLE dbo.[meal_revision] WITH CHECK ADD CONSTRAINT [FK_meal_revision_mealId_meal] FOREIGN KEY ([mealId]) REFERENCES dbo.[meal] ([mealId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_meal_tombstone_mealId_meal') ALTER TABLE dbo.[meal_tombstone] WITH CHECK ADD CONSTRAINT [FK_meal_tombstone_mealId_meal] FOREIGN KEY ([mealId]) REFERENCES dbo.[meal] ([mealId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_recommendation_evidence_recommendationId_daily_recommendation') ALTER TABLE dbo.[recommendation_evidence] WITH CHECK ADD CONSTRAINT [FK_recommendation_evidence_recommendationId_daily_recommendation] FOREIGN KEY ([recommendationId]) REFERENCES dbo.[daily_recommendation] ([recommendationId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_saved_meal_item_savedMealId_saved_meal') ALTER TABLE dbo.[saved_meal_item] WITH CHECK ADD CONSTRAINT [FK_saved_meal_item_savedMealId_saved_meal] FOREIGN KEY ([savedMealId]) REFERENCES dbo.[saved_meal] ([savedMealId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_report_evidence_sectionId_report_section') ALTER TABLE dbo.[report_evidence] WITH CHECK ADD CONSTRAINT [FK_report_evidence_sectionId_report_section] FOREIGN KEY ([sectionId]) REFERENCES dbo.[report_section] ([sectionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_exercise_muscle_map_exerciseId_exercise_catalog') ALTER TABLE dbo.[exercise_muscle_map] WITH CHECK ADD CONSTRAINT [FK_exercise_muscle_map_exerciseId_exercise_catalog] FOREIGN KEY ([exerciseId]) REFERENCES dbo.[exercise_catalog] ([exerciseId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_muscle_load_sessionId_workout_session') ALTER TABLE dbo.[muscle_load] WITH CHECK ADD CONSTRAINT [FK_muscle_load_sessionId_workout_session] FOREIGN KEY ([sessionId]) REFERENCES dbo.[workout_session] ([sessionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_workout_event_sessionId_workout_session') ALTER TABLE dbo.[workout_event] WITH CHECK ADD CONSTRAINT [FK_workout_event_sessionId_workout_session] FOREIGN KEY ([sessionId]) REFERENCES dbo.[workout_session] ([sessionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_workout_plan_revision_planId_workout_plan') ALTER TABLE dbo.[workout_plan_revision] WITH CHECK ADD CONSTRAINT [FK_workout_plan_revision_planId_workout_plan] FOREIGN KEY ([planId]) REFERENCES dbo.[workout_plan] ([planId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_workout_plan_step_planRevisionId_workout_plan_revision') ALTER TABLE dbo.[workout_plan_step] WITH CHECK ADD CONSTRAINT [FK_workout_plan_step_planRevisionId_workout_plan_revision] FOREIGN KEY ([planRevisionId]) REFERENCES dbo.[workout_plan_revision] ([planRevisionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_workout_plan_step_exerciseId_exercise_catalog') ALTER TABLE dbo.[workout_plan_step] WITH CHECK ADD CONSTRAINT [FK_workout_plan_step_exerciseId_exercise_catalog] FOREIGN KEY ([exerciseId]) REFERENCES dbo.[exercise_catalog] ([exerciseId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_workout_session_planRevisionId_workout_plan_revision') ALTER TABLE dbo.[workout_session] WITH CHECK ADD CONSTRAINT [FK_workout_session_planRevisionId_workout_plan_revision] FOREIGN KEY ([planRevisionId]) REFERENCES dbo.[workout_plan_revision] ([planRevisionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_workout_session_revision_sessionId_workout_session') ALTER TABLE dbo.[workout_session_revision] WITH CHECK ADD CONSTRAINT [FK_workout_session_revision_sessionId_workout_session] FOREIGN KEY ([sessionId]) REFERENCES dbo.[workout_session] ([sessionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_workout_summary_sessionId_workout_session') ALTER TABLE dbo.[workout_summary] WITH CHECK ADD CONSTRAINT [FK_workout_summary_sessionId_workout_session] FOREIGN KEY ([sessionId]) REFERENCES dbo.[workout_session] ([sessionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_meal_sourceDraftId_meal_draft') ALTER TABLE dbo.[meal] WITH CHECK ADD CONSTRAINT [FK_meal_sourceDraftId_meal_draft] FOREIGN KEY ([sourceDraftId]) REFERENCES dbo.[meal_draft] ([draftId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_serving_prior_observation_sourceMealId_meal') ALTER TABLE dbo.[serving_prior_observation] WITH CHECK ADD CONSTRAINT [FK_serving_prior_observation_sourceMealId_meal] FOREIGN KEY ([sourceMealId]) REFERENCES dbo.[meal] ([mealId]);
GO
