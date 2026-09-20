-- DRAFT ONLY: MoveFuel full-product additive core tables
-- 29 proposed tables. Applying all would move the private core from 81 to ~110 tables.
-- Requires authority/deduplication review before migration.

IF OBJECT_ID(N'dbo.recipe',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[recipe] (
    recipeId NVARCHAR(128) PRIMARY KEY,
    userId NVARCHAR(128) NOT NULL,
    name NVARCHAR(256) NOT NULL,
    status NVARCHAR(32) NOT NULL,
    currentRevision BIGINT NOT NULL,
    createdAt DATETIME2(3) NOT NULL,
    updatedAt DATETIME2(3) NOT NULL,
    deletedAt DATETIME2(3) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.recipe_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[recipe_revision] (
    recipeRevisionId NVARCHAR(128) PRIMARY KEY,
    recipeId NVARCHAR(128) NOT NULL,
    userId NVARCHAR(128) NOT NULL,
    revision BIGINT NOT NULL,
    servings FLOAT NULL,
    sourceId NVARCHAR(128) NULL,
    nutritionSnapshotId NVARCHAR(128) NULL,
    payloadHash NVARCHAR(128) NOT NULL,
    createdAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.recipe_ingredient',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[recipe_ingredient] (
    ingredientId NVARCHAR(128) PRIMARY KEY,
    recipeRevisionId NVARCHAR(128) NOT NULL,
    sortOrder BIGINT NOT NULL,
    rawText NVARCHAR(2048) NOT NULL,
    foodId NVARCHAR(128) NULL,
    quantity FLOAT NULL,
    unit NVARCHAR(64) NULL,
    grams FLOAT NULL,
    matchConfidence FLOAT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.recipe_step',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[recipe_step] (
    stepId NVARCHAR(128) PRIMARY KEY,
    recipeRevisionId NVARCHAR(128) NOT NULL,
    stepNumber BIGINT NOT NULL,
    instruction NVARCHAR(MAX) NOT NULL,
    durationSeconds BIGINT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.recipe_source',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[recipe_source] (
    sourceId NVARCHAR(128) PRIMARY KEY,
    userId NVARCHAR(128) NOT NULL,
    sourceType NVARCHAR(32) NOT NULL,
    sourceUrl NVARCHAR(2048) NULL,
    externalId NVARCHAR(256) NULL,
    title NVARCHAR(512) NULL,
    sourceHash NVARCHAR(128) NOT NULL,
    createdAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.recipe_import_job',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[recipe_import_job] (
    jobId NVARCHAR(128) PRIMARY KEY,
    userId NVARCHAR(128) NOT NULL,
    sourceId NVARCHAR(128) NOT NULL,
    state NVARCHAR(32) NOT NULL,
    stage NVARCHAR(64) NOT NULL,
    idempotencyKey NVARCHAR(128) NOT NULL,
    schemaVersion BIGINT NOT NULL,
    createdAt DATETIME2(3) NOT NULL,
    updatedAt DATETIME2(3) NOT NULL,
    completedAt DATETIME2(3) NULL,
    errorCode NVARCHAR(128) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.recipe_import_event',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[recipe_import_event] (
    eventId NVARCHAR(128) PRIMARY KEY,
    jobId NVARCHAR(128) NOT NULL,
    sequence BIGINT NOT NULL,
    stage NVARCHAR(64) NOT NULL,
    status NVARCHAR(32) NOT NULL,
    userSafeCode NVARCHAR(128) NULL,
    occurredAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.recipe_import_candidate',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[recipe_import_candidate] (
    candidateId NVARCHAR(128) PRIMARY KEY,
    jobId NVARCHAR(128) NOT NULL,
    candidateType NVARCHAR(64) NOT NULL,
    payloadJson NVARCHAR(MAX) NOT NULL,
    confidence FLOAT NULL,
    providerRef NVARCHAR(128) NULL,
    createdAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.recipe_import_issue',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[recipe_import_issue] (
    issueId NVARCHAR(128) PRIMARY KEY,
    jobId NVARCHAR(128) NOT NULL,
    candidateId NVARCHAR(128) NULL,
    issueType NVARCHAR(64) NOT NULL,
    state NVARCHAR(32) NOT NULL,
    detailsJson NVARCHAR(MAX) NOT NULL,
    resolvedAt DATETIME2(3) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.recipe_food_match',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[recipe_food_match] (
    matchId NVARCHAR(128) PRIMARY KEY,
    jobId NVARCHAR(128) NOT NULL,
    candidateId NVARCHAR(128) NOT NULL,
    foodId NVARCHAR(128) NULL,
    sourceRevision NVARCHAR(128) NULL,
    confidence FLOAT NULL,
    confirmedByUser BIT NOT NULL DEFAULT(0),
    createdAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.recipe_nutrition_snapshot',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[recipe_nutrition_snapshot] (
    nutritionSnapshotId NVARCHAR(128) PRIMARY KEY,
    recipeRevisionId NVARCHAR(128) NOT NULL,
    energyKcal FLOAT NULL,
    proteinG FLOAT NULL,
    carbG FLOAT NULL,
    fatG FLOAT NULL,
    fiberG FLOAT NULL,
    micronutrientsJson NVARCHAR(MAX) NULL,
    completeness FLOAT NULL,
    sourceRevisionHash NVARCHAR(128) NOT NULL,
    createdAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.recipe_media_ref',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[recipe_media_ref] (
    mediaRefId NVARCHAR(128) PRIMARY KEY,
    recipeId NVARCHAR(128) NOT NULL,
    sourceId NVARCHAR(128) NULL,
    mediaType NVARCHAR(32) NOT NULL,
    objectId NVARCHAR(256) NULL,
    externalUrl NVARCHAR(2048) NULL,
    rightsState NVARCHAR(32) NOT NULL,
    createdAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.meal_plan',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_plan] (
    planId NVARCHAR(128) PRIMARY KEY,
    userId NVARCHAR(128) NOT NULL,
    name NVARCHAR(256) NOT NULL,
    status NVARCHAR(32) NOT NULL,
    currentRevision BIGINT NOT NULL,
    createdAt DATETIME2(3) NOT NULL,
    updatedAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.meal_plan_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_plan_revision] (
    planRevisionId NVARCHAR(128) PRIMARY KEY,
    planId NVARCHAR(128) NOT NULL,
    userId NVARCHAR(128) NOT NULL,
    revision BIGINT NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    constraintHash NVARCHAR(128) NOT NULL,
    algorithmVersion NVARCHAR(64) NOT NULL,
    createdAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.planned_meal',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[planned_meal] (
    plannedMealId NVARCHAR(128) PRIMARY KEY,
    planRevisionId NVARCHAR(128) NOT NULL,
    userId NVARCHAR(128) NOT NULL,
    localDate DATE NOT NULL,
    mealTime TIME NULL,
    recipeId NVARCHAR(128) NULL,
    status NVARCHAR(32) NOT NULL,
    payloadJson NVARCHAR(MAX) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.planned_meal_item',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[planned_meal_item] (
    plannedMealItemId NVARCHAR(128) PRIMARY KEY,
    plannedMealId NVARCHAR(128) NOT NULL,
    foodId NVARCHAR(128) NULL,
    quantity FLOAT NULL,
    unit NVARCHAR(64) NULL,
    grams FLOAT NULL,
    payloadJson NVARCHAR(MAX) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.meal_plan_constraint',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_plan_constraint] (
    constraintId NVARCHAR(128) PRIMARY KEY,
    planId NVARCHAR(128) NOT NULL,
    userId NVARCHAR(128) NOT NULL,
    constraintType NVARCHAR(64) NOT NULL,
    valueJson NVARCHAR(MAX) NOT NULL,
    active BIT NOT NULL DEFAULT(1),
    updatedAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.meal_plan_conflict',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_plan_conflict] (
    conflictId NVARCHAR(128) PRIMARY KEY,
    planRevisionId NVARCHAR(128) NOT NULL,
    userId NVARCHAR(128) NOT NULL,
    conflictType NVARCHAR(64) NOT NULL,
    detailsJson NVARCHAR(MAX) NOT NULL,
    state NVARCHAR(32) NOT NULL,
    createdAt DATETIME2(3) NOT NULL,
    resolvedAt DATETIME2(3) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.meal_plan_swap',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[meal_plan_swap] (
    swapId NVARCHAR(128) PRIMARY KEY,
    plannedMealId NVARCHAR(128) NOT NULL,
    userId NVARCHAR(128) NOT NULL,
    fromRecipeId NVARCHAR(128) NULL,
    toRecipeId NVARCHAR(128) NULL,
    reasonCode NVARCHAR(64) NOT NULL,
    createdAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.shopping_list',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[shopping_list] (
    shoppingListId NVARCHAR(128) PRIMARY KEY,
    userId NVARCHAR(128) NOT NULL,
    name NVARCHAR(256) NOT NULL,
    state NVARCHAR(32) NOT NULL,
    revision BIGINT NOT NULL,
    updatedAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.shopping_item',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[shopping_item] (
    shoppingItemId NVARCHAR(128) PRIMARY KEY,
    shoppingListId NVARCHAR(128) NOT NULL,
    userId NVARCHAR(128) NOT NULL,
    displayName NVARCHAR(256) NOT NULL,
    quantity FLOAT NULL,
    unit NVARCHAR(64) NULL,
    foodId NVARCHAR(128) NULL,
    purchased BIT NOT NULL DEFAULT(0),
    updatedAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.pantry_item',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[pantry_item] (
    pantryItemId NVARCHAR(128) PRIMARY KEY,
    userId NVARCHAR(128) NOT NULL,
    foodId NVARCHAR(128) NULL,
    displayName NVARCHAR(256) NOT NULL,
    quantity FLOAT NULL,
    unit NVARCHAR(64) NULL,
    expiresOn DATE NULL,
    revision BIGINT NOT NULL,
    updatedAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.pantry_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[pantry_revision] (
    pantryRevisionId NVARCHAR(128) PRIMARY KEY,
    userId NVARCHAR(128) NOT NULL,
    revision BIGINT NOT NULL,
    changeHash NVARCHAR(128) NOT NULL,
    createdAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.shopping_source_link',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[shopping_source_link] (
    sourceLinkId NVARCHAR(128) PRIMARY KEY,
    shoppingItemId NVARCHAR(128) NOT NULL,
    sourceType NVARCHAR(64) NOT NULL,
    sourceId NVARCHAR(128) NOT NULL,
    createdAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.soreness_observation',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[soreness_observation] (
    sorenessObservationId NVARCHAR(128) PRIMARY KEY,
    userId NVARCHAR(128) NOT NULL,
    observedAt DATETIME2(3) NOT NULL,
    overallSeverity FLOAT NULL,
    source NVARCHAR(32) NOT NULL,
    schemaVersion BIGINT NOT NULL,
    createdAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.soreness_region',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[soreness_region] (
    sorenessRegionId NVARCHAR(128) PRIMARY KEY,
    sorenessObservationId NVARCHAR(128) NOT NULL,
    regionCode NVARCHAR(64) NOT NULL,
    severity FLOAT NOT NULL,
    painFlag BIT NOT NULL DEFAULT(0),
    note NVARCHAR(2048) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.readiness_decision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[readiness_decision] (
    readinessDecisionId NVARCHAR(128) PRIMARY KEY,
    userId NVARCHAR(128) NOT NULL,
    localDate DATE NOT NULL,
    state NVARCHAR(32) NOT NULL,
    inputRevisionHash NVARCHAR(128) NOT NULL,
    reasonCodesJson NVARCHAR(MAX) NOT NULL,
    confidence FLOAT NULL,
    algorithmVersion NVARCHAR(64) NOT NULL,
    policyVersion NVARCHAR(64) NOT NULL,
    createdAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.progress_media',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[progress_media] (
    progressMediaId NVARCHAR(128) PRIMARY KEY,
    userId NVARCHAR(128) NOT NULL,
    objectId NVARCHAR(256) NOT NULL,
    localDate DATE NOT NULL,
    mediaType NVARCHAR(32) NOT NULL,
    state NVARCHAR(32) NOT NULL,
    createdAt DATETIME2(3) NOT NULL,
    deletedAt DATETIME2(3) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.body_observation',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[body_observation] (
    bodyObservationId NVARCHAR(128) PRIMARY KEY,
    userId NVARCHAR(128) NOT NULL,
    localDate DATE NOT NULL,
    weightG BIGINT NULL,
    bodyFatPct FLOAT NULL,
    waistMm BIGINT NULL,
    hipMm BIGINT NULL,
    source NVARCHAR(64) NOT NULL,
    provenanceHash NVARCHAR(128) NULL,
    createdAt DATETIME2(3) NOT NULL
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_recipe_revision_recipeId_recipe') ALTER TABLE dbo.[recipe_revision] ADD CONSTRAINT [FK_recipe_revision_recipeId_recipe] FOREIGN KEY ([recipeId]) REFERENCES dbo.[recipe] ([recipeId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_recipe_ingredient_recipeRevisionId_recipe_revision') ALTER TABLE dbo.[recipe_ingredient] ADD CONSTRAINT [FK_recipe_ingredient_recipeRevisionId_recipe_revision] FOREIGN KEY ([recipeRevisionId]) REFERENCES dbo.[recipe_revision] ([recipeRevisionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_recipe_step_recipeRevisionId_recipe_revision') ALTER TABLE dbo.[recipe_step] ADD CONSTRAINT [FK_recipe_step_recipeRevisionId_recipe_revision] FOREIGN KEY ([recipeRevisionId]) REFERENCES dbo.[recipe_revision] ([recipeRevisionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_recipe_import_job_sourceId_recipe_source') ALTER TABLE dbo.[recipe_import_job] ADD CONSTRAINT [FK_recipe_import_job_sourceId_recipe_source] FOREIGN KEY ([sourceId]) REFERENCES dbo.[recipe_source] ([sourceId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_recipe_import_event_jobId_recipe_import_job') ALTER TABLE dbo.[recipe_import_event] ADD CONSTRAINT [FK_recipe_import_event_jobId_recipe_import_job] FOREIGN KEY ([jobId]) REFERENCES dbo.[recipe_import_job] ([jobId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_recipe_import_candidate_jobId_recipe_import_job') ALTER TABLE dbo.[recipe_import_candidate] ADD CONSTRAINT [FK_recipe_import_candidate_jobId_recipe_import_job] FOREIGN KEY ([jobId]) REFERENCES dbo.[recipe_import_job] ([jobId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_recipe_import_issue_jobId_recipe_import_job') ALTER TABLE dbo.[recipe_import_issue] ADD CONSTRAINT [FK_recipe_import_issue_jobId_recipe_import_job] FOREIGN KEY ([jobId]) REFERENCES dbo.[recipe_import_job] ([jobId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_recipe_food_match_jobId_recipe_import_job') ALTER TABLE dbo.[recipe_food_match] ADD CONSTRAINT [FK_recipe_food_match_jobId_recipe_import_job] FOREIGN KEY ([jobId]) REFERENCES dbo.[recipe_import_job] ([jobId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_recipe_food_match_candidateId_recipe_import_candidate') ALTER TABLE dbo.[recipe_food_match] ADD CONSTRAINT [FK_recipe_food_match_candidateId_recipe_import_candidate] FOREIGN KEY ([candidateId]) REFERENCES dbo.[recipe_import_candidate] ([candidateId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_recipe_nutrition_snapshot_recipeRevisionId_recipe_revision') ALTER TABLE dbo.[recipe_nutrition_snapshot] ADD CONSTRAINT [FK_recipe_nutrition_snapshot_recipeRevisionId_recipe_revision] FOREIGN KEY ([recipeRevisionId]) REFERENCES dbo.[recipe_revision] ([recipeRevisionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_recipe_media_ref_recipeId_recipe') ALTER TABLE dbo.[recipe_media_ref] ADD CONSTRAINT [FK_recipe_media_ref_recipeId_recipe] FOREIGN KEY ([recipeId]) REFERENCES dbo.[recipe] ([recipeId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_meal_plan_revision_planId_meal_plan') ALTER TABLE dbo.[meal_plan_revision] ADD CONSTRAINT [FK_meal_plan_revision_planId_meal_plan] FOREIGN KEY ([planId]) REFERENCES dbo.[meal_plan] ([planId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_planned_meal_planRevisionId_meal_plan_revision') ALTER TABLE dbo.[planned_meal] ADD CONSTRAINT [FK_planned_meal_planRevisionId_meal_plan_revision] FOREIGN KEY ([planRevisionId]) REFERENCES dbo.[meal_plan_revision] ([planRevisionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_planned_meal_item_plannedMealId_planned_meal') ALTER TABLE dbo.[planned_meal_item] ADD CONSTRAINT [FK_planned_meal_item_plannedMealId_planned_meal] FOREIGN KEY ([plannedMealId]) REFERENCES dbo.[planned_meal] ([plannedMealId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_meal_plan_constraint_planId_meal_plan') ALTER TABLE dbo.[meal_plan_constraint] ADD CONSTRAINT [FK_meal_plan_constraint_planId_meal_plan] FOREIGN KEY ([planId]) REFERENCES dbo.[meal_plan] ([planId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_meal_plan_conflict_planRevisionId_meal_plan_revision') ALTER TABLE dbo.[meal_plan_conflict] ADD CONSTRAINT [FK_meal_plan_conflict_planRevisionId_meal_plan_revision] FOREIGN KEY ([planRevisionId]) REFERENCES dbo.[meal_plan_revision] ([planRevisionId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_meal_plan_swap_plannedMealId_planned_meal') ALTER TABLE dbo.[meal_plan_swap] ADD CONSTRAINT [FK_meal_plan_swap_plannedMealId_planned_meal] FOREIGN KEY ([plannedMealId]) REFERENCES dbo.[planned_meal] ([plannedMealId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_shopping_item_shoppingListId_shopping_list') ALTER TABLE dbo.[shopping_item] ADD CONSTRAINT [FK_shopping_item_shoppingListId_shopping_list] FOREIGN KEY ([shoppingListId]) REFERENCES dbo.[shopping_list] ([shoppingListId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_shopping_source_link_shoppingItemId_shopping_item') ALTER TABLE dbo.[shopping_source_link] ADD CONSTRAINT [FK_shopping_source_link_shoppingItemId_shopping_item] FOREIGN KEY ([shoppingItemId]) REFERENCES dbo.[shopping_item] ([shoppingItemId]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_soreness_region_sorenessObservationId_soreness_observation') ALTER TABLE dbo.[soreness_region] ADD CONSTRAINT [FK_soreness_region_sorenessObservationId_soreness_observation] FOREIGN KEY ([sorenessObservationId]) REFERENCES dbo.[soreness_observation] ([sorenessObservationId]);
GO
