import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { buildReconciledManifest } from "../../../migrations/reconciled-preflight.ts";
import {
  FOUNDATION_PERMISSION_DECLARATIONS,
  permissionFor,
} from "../../foundation/permissions.ts";

const backendRoot = resolve(import.meta.dirname, "../../..");
const repositoryRoot = resolve(backendRoot, "../..");
const forbiddenTables = new Set([
  "sync_outbox",
  "device_sync_cursors",
  "calendar_heads",
  "calendar_events",
  "nutrition_state",
  "training_program_state",
  "readiness_state",
  "today_state",
]);

test("canonical Appwrite inventory is exactly 81 with no forbidden or candidate duplicate table", async () => {
  const manifest = await buildReconciledManifest();
  const ids = manifest.resources.map((resource) => resource.id);
  assert.equal(manifest.database.id, "movefuel_mvp");
  assert.equal(ids.length, 81);
  assert.equal(new Set(ids).size, 81);
  assert.deepEqual(ids.filter((id) => forbiddenTables.has(id)), []);
  assert.deepEqual(ids.filter((id) => /recommendation.*candidate|candidate.*recommendation/i.test(id)), []);

  const config = JSON.parse(await readFile(resolve(backendRoot, "appwrite.config.json.template"), "utf8"));
  assert.deepEqual(config.functions.map((fn: { $id: string }) => fn.$id), ["movefuel_api"]);
  assert.deepEqual(config.functions[0].scopes, [
    "files.read",
    "files.write",
    "rows.read",
    "rows.write",
    "users.write",
  ]);
});

test("all 81 tables have one explicit default-deny authority and valid index columns", async () => {
  const manifest = await buildReconciledManifest();
  const manifestIds = manifest.resources.map((resource) => resource.id).sort();
  const permissionIds = Object.keys(FOUNDATION_PERMISSION_DECLARATIONS).sort();
  assert.deepEqual(permissionIds, manifestIds);

  for (const resource of manifest.resources) {
    const permission = permissionFor(resource.id as keyof typeof FOUNDATION_PERMISSION_DECLARATIONS);
    assert.equal(resource.rowSecurity, true, resource.id);
    assert.equal(permission.defaultDeny, true, resource.id);
    assert.equal(permission.rowSecurity, true, resource.id);
    if (permission.ownerField === "userId") {
      assert.ok(resource.columns.includes("userId"), `${resource.id} lacks its ownership column`);
    }
    for (const index of resource.indexDefinitions ?? []) {
      for (const column of index.columns as string[]) {
        assert.ok(resource.columns.includes(column), `${resource.id}.${index.key} references missing ${column}`);
      }
    }
  }
});

test("reconciled extensions preserve base sync columns and canonical unique constraints", async () => {
  const manifest = await buildReconciledManifest();
  const resource = (id: string) => {
    const found = manifest.resources.find((row) => row.id === id);
    assert.ok(found, `missing ${id}`);
    return found;
  };
  const index = (id: string, key: string) => {
    const found = resource(id).indexDefinitions?.find((row) => row.key === key);
    assert.ok(found, `missing ${id}.${key}`);
    return found;
  };

  for (const column of ["operationId", "userId", "deviceId", "deviceSessionId", "idempotencyKey", "clientSequence"]) {
    assert.ok(resource("sync_operation").columns.includes(column));
  }
  for (const column of ["cursorId", "userId", "deviceId", "deviceSessionId", "stream", "updatedAt"]) {
    assert.ok(resource("sync_cursor").columns.includes(column));
  }

  assert.deepEqual(index("sync_cursor", "sync_cursor_scope_unique").columns, ["userId", "deviceId", "deviceSessionId", "stream"]);
  assert.deepEqual(index("device", "userId_deviceId_unique").columns, ["userId", "deviceId"]);
  assert.deepEqual(index("user_session_metadata", "userId_appwriteSessionIdHash").columns, ["userId", "appwriteSessionIdHash"]);
  assert.deepEqual(index("idempotency_key", "idempotency_user_scope_key_unique").columns, ["userId", "scope", "keyHash"]);
  assert.deepEqual(index("workout_session_revision", "workout_session_revision_unique").columns, ["sessionId", "revision"]);
  assert.deepEqual(index("calendar_revision", "calendar_user_revision_unique").columns, ["userId", "revision"]);
  assert.deepEqual(index("calendar_entry", "calendar_entry_user_date_start").columns, ["userId", "localDate", "startAt"]);
  assert.deepEqual(index("daily_recommendation", "recommendation_user_state_validUntil").columns, ["userId", "state", "validUntil"]);
  assert.deepEqual(index("meal_revision", "meal_revision_user_meal_revision_unique").columns, ["userId", "mealId", "revision"]);
});

test("revision journals and sync control resources remain server-only but user-associated", async () => {
  const manifest = await buildReconciledManifest();
  for (const id of [
    "target_revision",
    "meal_revision",
    "workout_session_revision",
    "calendar_revision",
    "calendar_entry",
    "sync_operation",
    "sync_cursor",
    "watch_delivery",
    "watch_receipt",
    "daily_recommendation",
    "serving_prior_observation",
  ]) {
    const resource = manifest.resources.find((row) => row.id === id);
    assert.ok(resource, id);
    assert.deepEqual(resource.permissions, [], id);
    assert.equal(permissionFor(id as keyof typeof FOUNDATION_PERMISSION_DECLARATIONS).ownerField, null, id);
    if (id !== "workout_session_revision" && id !== "serving_prior_observation") {
      assert.ok(resource.columns.includes("userId"), `${id} must carry userId for server-side isolation`);
    }
  }
});

test("deployment templates freeze canonical cloud ids", async () => {
  const privateTemplate = await readFile(resolve(repositoryRoot, "infra/deployment/MoveFuel-Private-Configuration-TEMPLATE.env"), "utf8");
  const functionTemplate = await readFile(resolve(repositoryRoot, "infra/deployment/MoveFuel-Appwrite-Function-Variables-TEMPLATE.env"), "utf8");
  for (const content of [privateTemplate, functionTemplate]) {
    assert.match(content, /^APPWRITE_DATABASE_ID=movefuel_mvp$/m);
    assert.match(content, /^FUNCTION_API_ID=movefuel_api$/m);
    assert.match(content, /^BUCKET_MEAL_MEDIA_ID=meal-history-private$/m);
  }
});
