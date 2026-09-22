import assert from "node:assert/strict";
import test from "node:test";
import {
  assertApiEnvelope,
  failure,
  isApiEnvelope,
  success,
} from "../../shared/api-contracts.ts";

test("success and failure use the versioned structured envelope", () => {
  const ok = success({ ready: true }, "corr-success");
  const bad = failure("invalid_request", "The request is invalid.", false, "corr-failure", { field: "name" });

  assert.equal(ok.schemaVersion, 1);
  assert.equal(ok.correlationId, "corr-success");
  assert.equal(ok.error, null);
  assert.equal(isApiEnvelope(ok), true);
  assert.equal(bad.data, null);
  assert.equal(bad.error?.code, "invalid_request");
  assert.deepEqual(bad.error?.details, { field: "name" });
  assert.equal(isApiEnvelope(bad), true);
});

test("envelope validator rejects data and error being present together", () => {
  const invalid = {
    schemaVersion: 1,
    correlationId: "corr-invalid",
    data: { ready: true },
    error: { code: "bad", message: "bad", retryable: false },
  };
  assert.equal(isApiEnvelope(invalid), false);
  assert.throws(() => assertApiEnvelope(invalid), /invalid_api_envelope/);
});
