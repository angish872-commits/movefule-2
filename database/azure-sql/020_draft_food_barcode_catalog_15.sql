-- DRAFT shared food/barcode catalog schema
-- Separate from private MoveFuel user meals.

IF OBJECT_ID(N'dbo.catalog_source',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[catalog_source] (
    sourceId NVARCHAR(128) PRIMARY KEY,
    name NVARCHAR(256) NOT NULL,
    providerType NVARCHAR(64) NOT NULL,
    licenseRef NVARCHAR(256) NULL,
    active BIT NOT NULL DEFAULT(1),
    createdAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.catalog_release',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[catalog_release] (
    releaseId NVARCHAR(128) PRIMARY KEY,
    sourceId NVARCHAR(128) NOT NULL,
    sourceVersion NVARCHAR(128) NOT NULL,
    checksum NVARCHAR(128) NOT NULL,
    importedAt DATETIME2(3) NOT NULL,
    state NVARCHAR(32) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.food',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[food] (
    foodId NVARCHAR(128) PRIMARY KEY,
    canonicalName NVARCHAR(512) NOT NULL,
    foodType NVARCHAR(64) NOT NULL,
    currentRevision BIGINT NOT NULL,
    state NVARCHAR(32) NOT NULL,
    updatedAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.food_revision',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[food_revision] (
    foodRevisionId NVARCHAR(128) PRIMARY KEY,
    foodId NVARCHAR(128) NOT NULL,
    revision BIGINT NOT NULL,
    releaseId NVARCHAR(128) NOT NULL,
    sourceRecordId NVARCHAR(256) NOT NULL,
    payloadHash NVARCHAR(128) NOT NULL,
    createdAt DATETIME2(3) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.food_alias',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[food_alias] (
    foodAliasId NVARCHAR(128) PRIMARY KEY,
    foodId NVARCHAR(128) NOT NULL,
    alias NVARCHAR(512) NOT NULL,
    locale NVARCHAR(32) NULL,
    sourceId NVARCHAR(128) NULL,
    confidence FLOAT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.barcode',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[barcode] (
    barcodeId NVARCHAR(128) PRIMARY KEY,
    code NVARCHAR(64) NOT NULL,
    normalizedCode NVARCHAR(64) NOT NULL,
    symbology NVARCHAR(32) NOT NULL,
    brandedProductId NVARCHAR(128) NOT NULL,
    releaseId NVARCHAR(128) NOT NULL,
    state NVARCHAR(32) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.branded_product',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[branded_product] (
    brandedProductId NVARCHAR(128) PRIMARY KEY,
    foodId NVARCHAR(128) NOT NULL,
    brand NVARCHAR(256) NULL,
    productName NVARCHAR(512) NOT NULL,
    packageSize NVARCHAR(128) NULL,
    countryCode NVARCHAR(8) NULL,
    currentRevision BIGINT NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.nutrient_definition',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[nutrient_definition] (
    nutrientId NVARCHAR(128) PRIMARY KEY,
    code NVARCHAR(64) NOT NULL,
    name NVARCHAR(256) NOT NULL,
    unit NVARCHAR(32) NOT NULL,
    nutrientClass NVARCHAR(64) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.food_nutrient',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[food_nutrient] (
    foodNutrientId NVARCHAR(128) PRIMARY KEY,
    foodRevisionId NVARCHAR(128) NOT NULL,
    nutrientId NVARCHAR(128) NOT NULL,
    amountPer100g FLOAT NULL,
    amountPerServing FLOAT NULL,
    dataQuality NVARCHAR(32) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.serving_unit',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[serving_unit] (
    servingUnitId NVARCHAR(128) PRIMARY KEY,
    code NVARCHAR(64) NOT NULL,
    displayName NVARCHAR(128) NOT NULL,
    dimension NVARCHAR(32) NOT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.food_serving',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[food_serving] (
    foodServingId NVARCHAR(128) PRIMARY KEY,
    foodRevisionId NVARCHAR(128) NOT NULL,
    servingUnitId NVARCHAR(128) NOT NULL,
    amount FLOAT NOT NULL,
    grams FLOAT NULL,
    description NVARCHAR(256) NULL,
    sourceId NVARCHAR(128) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.product_ingredient',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[product_ingredient] (
    productIngredientId NVARCHAR(128) PRIMARY KEY,
    brandedProductId NVARCHAR(128) NOT NULL,
    sortOrder BIGINT NOT NULL,
    rawText NVARCHAR(2048) NOT NULL,
    matchedFoodId NVARCHAR(128) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.product_allergen',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[product_allergen] (
    productAllergenId NVARCHAR(128) PRIMARY KEY,
    brandedProductId NVARCHAR(128) NOT NULL,
    allergenCode NVARCHAR(64) NOT NULL,
    declarationType NVARCHAR(32) NOT NULL,
    sourceText NVARCHAR(2048) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.catalog_ingestion_run',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[catalog_ingestion_run] (
    ingestionRunId NVARCHAR(128) PRIMARY KEY,
    sourceId NVARCHAR(128) NOT NULL,
    releaseId NVARCHAR(128) NULL,
    state NVARCHAR(32) NOT NULL,
    startedAt DATETIME2(3) NOT NULL,
    completedAt DATETIME2(3) NULL,
    recordCount BIGINT NOT NULL DEFAULT(0),
    errorCount BIGINT NOT NULL DEFAULT(0)
  );
END;
GO

IF OBJECT_ID(N'dbo.catalog_ingestion_error',N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[catalog_ingestion_error] (
    ingestionErrorId NVARCHAR(128) PRIMARY KEY,
    ingestionRunId NVARCHAR(128) NOT NULL,
    sourceRecordId NVARCHAR(256) NULL,
    errorCode NVARCHAR(128) NOT NULL,
    details NVARCHAR(MAX) NULL,
    occurredAt DATETIME2(3) NOT NULL
  );
END;
GO

CREATE UNIQUE INDEX UQ_barcode_normalized ON dbo.[barcode]([normalizedCode]);
GO
CREATE INDEX IX_food_alias_alias ON dbo.[food_alias]([alias]);
GO
CREATE INDEX IX_food_nutrient_food ON dbo.[food_nutrient]([foodRevisionId],[nutrientId]);
GO
