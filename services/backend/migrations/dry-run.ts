import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export type ManifestResource = {
  kind: string;
  id: string;
  columns?: string[];
  indexes?: string[];
  existingResourcePolicy?: string;
  [key: string]: unknown;
};

export type Manifest = {
  migrationId: string;
  schemaVersion: number;
  mode: string;
  database: { id: string; name: string };
  resources: ManifestResource[];
};

export type ActualResource = {
  kind: string;
  id: string;
  columns?: string[];
  indexes?: string[];
  [key: string]: unknown;
};

export type ActualSnapshot = {
  database?: { id: string; name?: string };
  resources?: ActualResource[];
};

export type DryRunOperation = ManifestResource & {
  action: "create_missing" | "verify_existing" | "inspect_and_stop_for_review";
  destructive: false;
  reason?: string;
  missingColumns?: string[];
  missingIndexes?: string[];
};

export type DryRunReport = {
  dryRun: true;
  contactsAppwrite: false;
  migrationId: string;
  schemaVersion: number;
  manifestChecksum: string;
  database: Manifest["database"];
  operations: DryRunOperation[];
  destructiveOperations: [];
  reviewRequired: boolean;
  applyAllowed: false;
  note: string;
};

const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(here, "manifest.v1.json");

function missingValues(required: string[] | undefined, actual: string[] | undefined): string[] {
  const present = new Set(actual ?? []);
  return (required ?? []).filter((value) => !present.has(value));
}

function operationFor(resource: ManifestResource, actualResources: Map<string, ActualResource>): DryRunOperation {
  const key = `${resource.kind}:${resource.id}`;
  const existing = actualResources.get(key);
  const missingColumns = missingValues(resource.columns, existing?.columns);
  const missingIndexes = missingValues(resource.indexes, existing?.indexes);
  const schemaLedgerIsDivergent = resource.id === "schema_migrations" && (missingColumns.length > 0 || missingIndexes.length > 0);
  const requiresManualInspection = resource.existingResourcePolicy === "inspect_existing_empty_table_and_stop_for_review";
  const requiresManifestReview = resource.requiresReview === true;
  if (requiresManualInspection || schemaLedgerIsDivergent || requiresManifestReview) {
    return {
      ...resource,
      action: "inspect_and_stop_for_review",
      destructive: false,
      reason: schemaLedgerIsDivergent
        ? "existing_resource_is_missing_required_ledger_shape"
        : requiresManifestReview
          ? "manifest_requires_typed_column_and_permission_review"
          : "existing_resource_policy_requires_review",
      ...(missingColumns.length > 0 ? { missingColumns } : {}),
      ...(missingIndexes.length > 0 ? { missingIndexes } : {}),
    };
  }
  if (!existing) return { ...resource, action: "create_missing", destructive: false };
  return {
    ...resource,
    action: "verify_existing",
    destructive: false,
    ...(missingColumns.length > 0 ? { missingColumns } : {}),
    ...(missingIndexes.length > 0 ? { missingIndexes } : {}),
  };
}

export function buildDryRunReport(manifest: Manifest, actual: ActualSnapshot = {}): DryRunReport {
  const actualResources = new Map((actual.resources ?? []).map((resource) => [`${resource.kind}:${resource.id}`, resource]));
  const manifestChecksum = createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
  const operations = manifest.resources.map((resource) => operationFor(resource, actualResources));
  const reviewRequired = operations.some((operation) => operation.action === "inspect_and_stop_for_review");
  return {
    dryRun: true,
    contactsAppwrite: false,
    migrationId: manifest.migrationId,
    schemaVersion: manifest.schemaVersion,
    manifestChecksum,
    database: manifest.database,
    operations,
    destructiveOperations: [],
    reviewRequired,
    applyAllowed: !reviewRequired,
    note: "Report only. No Appwrite resource is created, changed, or deleted.",
  };
}

export async function runDryRun(manifestArg?: string, actualArg?: string): Promise<DryRunReport> {
  const selectedManifest = manifestArg ? resolve(process.cwd(), manifestArg) : manifestPath;
  const manifest = JSON.parse(await readFile(selectedManifest, "utf8")) as Manifest;
  const actual: ActualSnapshot = actualArg ? JSON.parse(await readFile(resolve(process.cwd(), actualArg), "utf8")) : {};
  return buildDryRunReport(manifest, actual);
}

const invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedFile === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await runDryRun(process.argv[2], process.argv[3]), null, 2));
}
