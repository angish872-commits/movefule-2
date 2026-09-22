import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type FullSpecResource = {
  kind: "table";
  id: string;
  name: string;
  rowSecurity: true;
  columns: string[];
  indexes: string[];
  permissions: "default_deny_owner_scoped" | "default_deny_server_only";
  ownerField: "userId" | null;
  ownershipSource: string;
  columnSchemaStatus: "logical_fields_only";
  requiresReview: boolean;
};

function humanize(id: string): string {
  return id
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function fieldNames(raw: string): string[] {
  return raw
    .split(";")
    .map((field) => field.trim().split(/\s+/)[0]?.replace(/\?$/, ""))
    .filter((field): field is string => Boolean(field));
}

function indexNames(raw: string): string[] {
  return raw.split(";").map((constraint) => {
    const value = constraint.trim();
    const match = value.match(/^(unique|index)\(([^)]+)\)$/);
    if (!match) return value.replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_|_$/g, "");
    const fields = match[2].split(",").map((field) => field.trim()).join("_");
    return match[1] === "unique" ? `${fields}_unique` : fields;
  });
}

function canonicalizeResource(resource: FullSpecResource): FullSpecResource {
  if (resource.id === "schema_migration") {
    return {
      ...resource,
      id: "schema_migrations",
      name: "Schema Migrations",
      columns: ["migrationId", "schemaVersion", "checksum", "state", "resourceSummaryJson", "createdAt", "updatedAt"],
      indexes: ["migrationId_schemaVersion_unique"],
      permissions: "default_deny_server_only",
      ownerField: null,
      ownershipSource: "Server-managed",
      requiresReview: false,
    };
  }
  if (resource.id === "workout_session_revision") {
    return {
      ...resource,
      indexes: ["sessionId_revision_unique", "sessionId_idempotencyKey_unique", "sessionId_occurredAt"],
      permissions: "default_deny_server_only",
      ownerField: null,
      ownershipSource: "User-owned via workout_session.sessionId; server-only mutation",
      // The logical catalogue stays preflight-only; the dedicated typed wave is the deployment authority.
      requiresReview: true,
    };
  }
  return resource;
}

function parseTables(markdown: string): FullSpecResource[] {
  const resources: FullSpecResource[] = [];
  const tablePattern = /^### T\d+\. `([^`]+)`\n([\s\S]*?)(?=^### T\d+\. |^## 3\.4)/gm;
  for (const match of markdown.matchAll(tablePattern)) {
    const id = match[1];
    const block = match[2];
    const fields = block.match(/^\*\*Fields:\*\* (.+)$/m)?.[1];
    const constraints = block.match(/^\*\*Indexes\/constraints:\*\* (.+)$/m)?.[1];
    const ownership = block.match(/^\*\*Ownership:\*\* (.+)$/m)?.[1]?.trim() ?? "Unspecified";
    if (!fields || !constraints) throw new Error(`Incomplete table definition in source: ${id}`);

    const isUserOwned = ownership === "User-owned" && fieldNames(fields).includes("userId");
    resources.push(canonicalizeResource({
      kind: "table",
      id,
      name: humanize(id),
      rowSecurity: true,
      columns: fieldNames(fields),
      indexes: indexNames(constraints),
      permissions: isUserOwned ? "default_deny_owner_scoped" : "default_deny_server_only",
      ownerField: isUserOwned ? "userId" : null,
      ownershipSource: ownership,
      columnSchemaStatus: "logical_fields_only",
      requiresReview: true,
    }));
  }
  if (resources.length !== 77) throw new Error(`Expected 77 tables, parsed ${resources.length}`);
  return resources;
}

const sourceArgument = process.argv[2] ?? process.env.MOVEFUEL_BACKEND_SPEC_PATH;
if (!sourceArgument) {
  throw new Error("backend_spec_path_required: pass the backend specification markdown path as argv[2] or MOVEFUEL_BACKEND_SPEC_PATH");
}
const sourcePath = resolve(process.cwd(), sourceArgument);
const sourceId = process.env.MOVEFUEL_BACKEND_SPEC_SOURCE_ID?.trim() || "MoveFuel Complete Backend and Logic Specification v1.0";
const outputPath = resolve(process.cwd(), process.argv[3] ?? "migrations/full-spec-manifest.v1.json");
const markdown = await readFile(sourcePath, "utf8");
const manifest = {
  migrationId: "movefuel_full_spec_v1",
  schemaVersion: 4,
  mode: "create_missing_and_verify_existing",
  status: "preflight_only_logical_catalog",
  source: sourceId,
  database: { id: "movefuel_mvp", name: "MoveFuel MVP", verification: "existing_database_only" },
  resourcePolicy: {
    defaultDeny: true,
    ownerField: "userId",
    serverOnlyTables: ["schema_migrations", "audit_event", "idempotency_key", "workout_session_revision"],
    applyAllowed: false,
    note: "Logical tables are canonicalized to live naming where required; typed columns, indexes, and permissions still require a fresh live preflight before any deployment.",
  },
  resources: parseTables(markdown),
};
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, tableCount: manifest.resources.length, status: manifest.status }, null, 2));
