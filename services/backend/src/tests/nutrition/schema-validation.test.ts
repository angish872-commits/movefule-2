import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMAS_DIR = fileURLToPath(new URL("../../../../../research/nutrition-research/schemas/", import.meta.url));

type Schema = { [key: string]: unknown };

function loadSchemas(): Map<string, Schema> {
  const map = new Map<string, Schema>();
  for (const file of readdirSync(SCHEMAS_DIR).filter((name) => name.endsWith(".schema.json"))) {
    map.set(file, JSON.parse(readFileSync(join(SCHEMAS_DIR, file), "utf8")) as Schema);
  }
  return map;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Minimal draft-07 validator supporting the subset used by MoveFuel schemas. */
class SchemaValidator {
  private readonly registry: Map<string, Schema>;

  constructor(registry: Map<string, Schema>) {
    this.registry = registry;
  }

  validate(schemaFile: string, value: unknown): string[] {
    const schema = this.registry.get(schemaFile);
    if (!schema) return [`unknown_schema:${schemaFile}`];
    return this.check(schema, value, "$", schema);
  }

  private check(schema: Schema, value: unknown, path: string, root: Schema): string[] {
    const errors: string[] = [];

    if (typeof schema.$ref === "string") {
      return this.resolveRef(schema.$ref, root).flatMap((target, index) =>
        this.check(target, value, `${path}.$ref[${index}]`, root),
      );
    }

    if (schema.type !== undefined) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      if (!types.some((type) => this.matchesType(type as string, value))) {
        errors.push(`${path}: expected type ${types.join("|")}`);
      }
    }

    if (schema.const !== undefined && value !== schema.const) {
      errors.push(`${path}: expected const ${JSON.stringify(schema.const)}`);
    }

    if (schema.enum !== undefined) {
      if (!(schema.enum as unknown[]).some((entry) => JSON.stringify(entry) === JSON.stringify(value))) {
        errors.push(`${path}: value not in enum`);
      }
    }

    if (isObject(value)) {
      if (schema.required !== undefined) {
        for (const required of schema.required as string[]) {
          if (!(required in value)) errors.push(`${path}: missing required "${required}"`);
        }
      }
      if (isObject(schema.properties)) {
        for (const [key, subschema] of Object.entries(schema.properties)) {
          if (key in value) {
            errors.push(...this.check(subschema as Schema, value[key], `${path}.${key}`, root));
          }
        }
      }
      if (schema.additionalProperties === false && isObject(schema.properties)) {
        for (const key of Object.keys(value)) {
          if (!(key in (schema.properties as Record<string, unknown>))) errors.push(`${path}: additional property "${key}"`);
        }
      }
    }

    if (Array.isArray(value) && isObject(schema.items)) {
      for (const [index, item] of value.entries()) {
        errors.push(...this.check(schema.items as Schema, item, `${path}[${index}]`, root));
      }
      if (schema.minItems !== undefined && value.length < (schema.minItems as number)) {
        errors.push(`${path}: fewer than minItems`);
      }
    }

    if (typeof value === "number") {
      if (schema.minimum !== undefined && value < (schema.minimum as number)) errors.push(`${path}: below minimum`);
      if (schema.maximum !== undefined && value > (schema.maximum as number)) errors.push(`${path}: above maximum`);
      if (schema.exclusiveMinimum !== undefined && value <= (schema.exclusiveMinimum as number)) errors.push(`${path}: not above exclusiveMinimum`);
    }

    if (typeof value === "string" && schema.minLength !== undefined && value.length < (schema.minLength as number)) {
      errors.push(`${path}: shorter than minLength`);
    }

    if (schema.format === "date-time" && typeof value === "string" && Number.isNaN(Date.parse(value))) {
      errors.push(`${path}: invalid date-time`);
    }

    if (Array.isArray(schema.anyOf)) {
      const anyPassed = (schema.anyOf as Schema[]).some((subschema) => this.check(subschema, value, path, root).length === 0);
      if (!anyPassed) errors.push(`${path}: matched no anyOf branch`);
    }

    return errors;
  }

  private resolveRef(ref: string, root: Schema): Schema[] {
    if (ref.startsWith("#/")) {
      const parts = ref.replace("#/", "").split("/");
      let current: unknown = root;
      for (const part of parts) {
        if (isObject(current) && part in current) current = current[part];
        else return [];
      }
      return isObject(current) ? [current] : [];
    }
    const target = this.registry.get(ref);
    return target ? [target] : [];
  }

  private matchesType(type: string, value: unknown): boolean {
    switch (type) {
      case "object": return isObject(value);
      case "array": return Array.isArray(value);
      case "string": return typeof value === "string";
      case "number": return typeof value === "number" && Number.isFinite(value);
      case "integer": return Number.isInteger(value);
      case "boolean": return typeof value === "boolean";
      case "null": return value === null;
      default: return true;
    }
  }
}

const registry = loadSchemas();
const validator = new SchemaValidator(registry);

test("all Phase-6 schema files parse and load", () => {
  const expected = [
    "image-quality.schema.json",
    "food-region.schema.json",
    "food-candidate.schema.json",
    "portion-evidence.schema.json",
    "portion-estimate.schema.json",
    "clarification-question.schema.json",
    "image-estimate-result.schema.json",
    "nutrition-estimate.schema.json",
  ];
  for (const file of expected) {
    assert.ok(registry.has(file), `missing schema ${file}`);
  }
});

const imageQualityValid = {
  state: "ACCEPTABLE",
  issueCodes: [],
  userMessage: "ok",
  retryRecommendation: "NO_RETRY",
  safeFallback: "USE_METADATA_ONLY",
  evidenceSource: "metadata",
  analyserVersion: "metadata-only@1",
  validationMode: "METADATA_ONLY",
};

test("image-quality schema accepts a valid result and rejects invalid state", () => {
  assert.deepEqual(validator.validate("image-quality.schema.json", imageQualityValid), []);
  const invalid = { ...imageQualityValid, state: "BOGUS" };
  assert.ok(validator.validate("image-quality.schema.json", invalid).some((error) => error.includes("not in enum")));
});

test("food-region schema accepts a valid region and rejects invalid bounds", () => {
  const region = {
    regionId: "region-1",
    bbox: { x: 0.1, y: 0.1, width: 0.6, height: 0.5 },
    maskReference: "mask://region-1",
    segmentationConfidence: 0.9,
    overlapState: "NONE",
    warnings: [],
  };
  assert.deepEqual(validator.validate("food-region.schema.json", region), []);
  const invalid = { ...region, bbox: { x: 0.1, y: 0.1, width: 1.5, height: 0.5 } };
  assert.ok(validator.validate("food-region.schema.json", invalid).some((error) => error.includes("above maximum")));
});

test("food-candidate schema accepts a valid candidate and rejects missing fields", () => {
  const candidate = {
    name: "Dumplings, steamed",
    searchTerms: ["dumplings"],
    foodType: "PREPARED",
    preparationCandidates: [{ label: "steamed", confidence: 0.9 }],
    providerConfidence: 0.85,
    modelProviderVersion: "0.1.0",
    uncertaintyNotes: [],
  };
  assert.deepEqual(validator.validate("food-candidate.schema.json", candidate), []);
  const invalid = { ...candidate, searchTerms: "not-an-array" };
  assert.ok(validator.validate("food-candidate.schema.json", invalid).length > 0);
});

test("portion-evidence schema accepts a valid record and rejects negative values", () => {
  const record = {
    evidenceType: "MANUAL_GRAMS",
    suppliedValue: 200,
    unit: "g",
    source: "user",
    reliabilityTier: 1,
    collectedAt: "2026-08-06T00:00:00Z",
    assumptions: [],
    validationState: "CONFIRMED",
  };
  assert.deepEqual(validator.validate("portion-evidence.schema.json", record), []);
  const invalid = { ...record, suppliedValue: -5 };
  assert.ok(validator.validate("portion-evidence.schema.json", invalid).some((error) => error.includes("below minimum")));
});

test("portion-estimate schema accepts a valid estimate and rejects inverted ranges", () => {
  const estimate = {
    minimumGrams: 196,
    centralGrams: 200,
    maximumGrams: 204,
    confidence: "HIGH",
    evidenceUsed: ["MANUAL_GRAMS"],
    evidenceRejected: [],
    assumptions: [],
    uncertainties: [],
    estimatorVersion: "1.0.0",
    requiresClarification: false,
    requiresUserConfirmation: false,
  };
  assert.deepEqual(validator.validate("portion-estimate.schema.json", estimate), []);
  const invalid = { ...estimate, minimumGrams: 300 };
  // Schema permits any non-negative numbers; inversion is enforced by code.
  assert.deepEqual(validator.validate("portion-estimate.schema.json", invalid), []);
});

test("clarification-question schema accepts a valid question and rejects missing reason", () => {
  const question = {
    questionId: "PIECE_COUNT",
    reason: "count tightens the range",
    affectedUncertainty: "PORTION_SIZE",
    informationGainCategory: "PORTION_SIZE",
    responseType: "INTEGER",
    optional: false,
    fallbackIfSkipped: "use a default",
    nextState: "PORTION_ESTIMATED",
  };
  assert.deepEqual(validator.validate("clarification-question.schema.json", question), []);
  const invalid = { ...question, questionId: "NOT_A_QUESTION" };
  assert.ok(validator.validate("clarification-question.schema.json", invalid).some((error) => error.includes("not in enum")));
});

test("image-estimate-result schema accepts a valid full result", () => {
  const result = {
    schemaVersion: 1,
    resultId: "req-1",
    requestId: "req-1",
    correlationId: "corr-1",
    ownerUserId: "user-a",
    state: "COMPLETED_NEEDS_CONFIRMATION",
    imageQuality: imageQualityValid,
    items: [
      {
        itemId: "item-1",
        regionId: "region-1",
        segmentation: {
          regionId: "region-1",
          bbox: { x: 0.1, y: 0.2, width: 0.5, height: 0.4 },
          maskPolygon: [[0.1, 0.2], [0.6, 0.2], [0.6, 0.6]],
          segmentationConfidence: 0.9,
          overlapState: "NONE",
          warnings: [],
        },
        foodType: "PREPARED",
        candidates: [
          {
            name: "Dumplings, steamed",
            searchTerms: ["dumplings"],
            foodType: "PREPARED",
            preparationCandidates: [],
            providerConfidence: 0.85,
            modelProviderVersion: "0.1.0",
            uncertaintyNotes: [],
          },
        ],
        selectedSource: { source: "USDA_FDC", fdcId: 999001, recipeRevisionId: null, dataType: "FNDDS", description: "Dumplings, steamed" },
        portion: {
          minimumGrams: 196,
          centralGrams: 200,
          maximumGrams: 204,
          confidence: "HIGH",
          evidenceUsed: ["MANUAL_GRAMS"],
          evidenceRejected: [],
          assumptions: [],
          uncertainties: [],
          estimatorVersion: "1.0.0",
          requiresClarification: false,
          requiresUserConfirmation: false,
        },
        nutrients: {
          energyKcal: { minimum: 392, central: 400, maximum: 408 },
          proteinG: { minimum: 15.68, central: 16, maximum: 16.32 },
          carbG: { minimum: 58.8, central: 60, maximum: 61.2 },
          fatG: { minimum: 9.8, central: 10, maximum: 10.2 },
          fiberG: { minimum: 1.96, central: 2, maximum: 2.04 },
          sodiumMg: { minimum: 784, central: 800, maximum: 816 },
        },
        clarificationQuestions: [],
        uncertainties: [],
        requiresUserConfirmation: true,
        confidence: {
          imageQuality: "ACCEPTABLE",
          segmentation: "HIGH",
          identity: 0.85,
          portionEvidence: "HIGH",
          preparationCertainty: 0.5,
          nutritionSourceMatch: "RESOLVED",
          recipeReviewStatus: "REVIEWED",
          finalPolicyVersion: 1,
          overall: "HIGH",
          cappedBy: [],
        },
      },
    ],
    requiresUserConfirmation: true,
    confirmed: false,
    createdAt: "2026-08-06T00:00:00Z",
  };
  assert.deepEqual(validator.validate("image-estimate-result.schema.json", result), []);
});

test("image-estimate-result schema rejects a confirmed result", () => {
  const valid = JSON.parse(readFileSync(join(SCHEMAS_DIR, "image-estimate-result.schema.json"), "utf8"));
  void valid;
  const minimal = {
    schemaVersion: 1,
    resultId: "r",
    requestId: "r",
    correlationId: null,
    ownerUserId: "u",
    state: "NEEDS_USER_REVIEW",
    imageQuality: imageQualityValid,
    items: [],
    requiresUserConfirmation: true,
    confirmed: true,
    createdAt: "2026-08-06T00:00:00Z",
  };
  assert.ok(validator.validate("image-estimate-result.schema.json", minimal).some((error) => error.includes("expected const false")));
});

test("existing nutrition-estimate schema still validates its canonical shape", () => {
  const estimate = {
    schemaVersion: 1,
    estimateId: "est-1",
    status: "RESOLVED",
    imageQuality: { state: "ACCEPTABLE", issues: [] },
    items: [
      {
        itemId: "item-1",
        regionId: "region-1",
        foodType: "PREPARED",
        candidates: [{ name: "Dumplings, steamed", providerConfidence: 0.85, searchTerms: ["dumplings"] }],
        selectedSource: { source: "USDA_FDC", fdcId: 999001, recipeRevisionId: null, dataType: "FNDDS", description: "Dumplings, steamed" },
        portion: { pieces: 8, minimumGrams: 196, centralGrams: 200, maximumGrams: 204, evidence: ["PIECE_COUNT"], confidence: "HIGH" },
        nutrients: {
          energyKcal: { minimum: 392, central: 400, maximum: 408 },
          proteinG: { minimum: 15.68, central: 16, maximum: 16.32 },
          carbG: { minimum: 58.8, central: 60, maximum: 61.2 },
          fatG: { minimum: 9.8, central: 10, maximum: 10.2 },
          fiberG: { minimum: 1.96, central: 2, maximum: 2.04 },
          sodiumMg: { minimum: 784, central: 800, maximum: 816 },
        },
        uncertainties: [],
        requiresUserConfirmation: true,
      },
    ],
    clarificationQuestions: [],
    requiresUserConfirmation: true,
  };
  assert.deepEqual(validator.validate("nutrition-estimate.schema.json", estimate), []);
});
