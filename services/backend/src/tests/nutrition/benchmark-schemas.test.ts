import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BENCHMARK_DIR = fileURLToPath(new URL("../../../../../research/nutrition-research/benchmark/", import.meta.url));

type Schema = { [key: string]: unknown };

function loadSchemas(): Map<string, Schema> {
  const map = new Map<string, Schema>();
  for (const file of readdirSync(BENCHMARK_DIR).filter((name) => name.endsWith(".schema.json"))) {
    map.set(file, JSON.parse(readFileSync(join(BENCHMARK_DIR, file), "utf8")) as Schema);
  }
  return map;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Minimal draft-07 validator supporting the subset used by the benchmark schemas. */
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

test("benchmark schema files load", () => {
  for (const file of ["benchmark-sample.schema.json", "benchmark-manifest.schema.json", "benchmark-result.schema.json"]) {
    assert.ok(registry.has(file), `missing schema ${file}`);
  }
});

test("every planned sample validates against the sample schema", () => {
  const manifest = JSON.parse(readFileSync(join(BENCHMARK_DIR, "benchmark-plan.json"), "utf8")) as {
    samples: unknown[];
    totalPlannedSamples: number;
  };
  assert.equal(manifest.samples.length, 30);
  assert.equal(manifest.samples.length, manifest.totalPlannedSamples);
  for (const [index, sample] of manifest.samples.entries()) {
    const errors = validator.validate("benchmark-sample.schema.json", sample);
    assert.deepEqual(errors, [], `plan sample ${index} invalid: ${errors.join(", ")}`);
  }
});

test("the plan manifest validates and reports the planned category balance", () => {
  const manifest = JSON.parse(readFileSync(join(BENCHMARK_DIR, "benchmark-plan.json"), "utf8")) as {
    categories: { category: string; count: number; sampleIds: string[] }[];
  };
  assert.deepEqual(validator.validate("benchmark-manifest.schema.json", manifest), []);
  const byCategory = new Map(manifest.categories.map((category) => [category.category, category.count]));
  assert.equal(byCategory.get("BASIC"), 6);
  assert.equal(byCategory.get("PIECE_BASED"), 3);
  assert.equal(byCategory.get("MIXED"), 7);
  assert.equal(byCategory.get("LIQUID"), 5);
  assert.equal(byCategory.get("PACKAGED"), 3);
  assert.equal(byCategory.get("HARD_CASE"), 6);
});

test("a not-measurable benchmark result validates against the result schema", () => {
  const notMeasurable = { measurable: false, reason: "missing ground truth" };
  const result = {
    schemaVersion: 1,
    runId: "run-1",
    generatedAt: "2026-08-06T00:00:00Z",
    sampleIds: ["bs-001"],
    excludedSampleIds: [],
    providerMetrics: [
      {
        providerId: "mock-a",
        providerName: "Mock A",
        providerVersion: "1.0.0",
        adapterType: "COMBINED",
        quality: { acceptRejectCorrectness: notMeasurable, retakeRequiredCorrectness: notMeasurable },
        segmentation: {
          regionPrecision: notMeasurable,
          regionRecall: notMeasurable,
          meanIoU: notMeasurable,
          missedFoodRate: notMeasurable,
          duplicateRegionRate: notMeasurable,
        },
        identity: { top1: notMeasurable, top3: notMeasurable, unknownFoodHandling: notMeasurable, foodTypeAccuracy: notMeasurable },
        sourceResolution: { correctSourceRate: notMeasurable, unresolvedSourceRate: notMeasurable, incorrectSourceRate: notMeasurable },
        portion: {
          gramMae: notMeasurable,
          gramMedianAbsoluteError: notMeasurable,
          gramMape: notMeasurable,
          intervalCoverage: notMeasurable,
          centralBias: notMeasurable,
          pieceCountError: notMeasurable,
        },
        nutrition: {},
        interaction: {
          clarificationQuestionCount: notMeasurable,
          unnecessaryQuestionRate: notMeasurable,
          correctionRate: notMeasurable,
          manualEntryFallbackRate: notMeasurable,
        },
        operational: {
          schemaValidOutputRate: notMeasurable,
          malformedResponseRate: notMeasurable,
          providerFailureRate: notMeasurable,
          latencyMedianMs: notMeasurable,
          latencyP95Ms: notMeasurable,
          costPerImageUsd: notMeasurable,
          costPerConfirmedMealUsd: notMeasurable,
        },
        categoryScores: [{ category: "identity", score: notMeasurable, measurableSamples: 0 }],
        decisionMatrix: [{ criterion: "licence_status", value: "UNKNOWN", evidence: "registry" }],
      },
    ],
    comparison: { sameSampleSetForAllProviders: true, noCrossProviderLeakage: true, replayKey: "k", metricsVersion: 1 },
  };
  assert.deepEqual(validator.validate("benchmark-result.schema.json", result), []);
});
