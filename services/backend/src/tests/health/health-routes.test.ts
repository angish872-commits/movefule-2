import assert from "node:assert/strict";
import test from "node:test";
import { createHealthRouteHandler } from "../../http/health-routes.ts";
import { HealthStore } from "../../health/health-store.ts";
import { Readable, Writable } from "node:stream";

class TestResponse extends Writable {
  public statusCode = 200;
  public body = "";
  setHeader(): this { return this; }
  _write(chunk: Buffer | string, _encoding: string, callback: (error?: Error | null) => void): void {
    this.body += chunk.toString();
    callback();
  }
}

function request(method: string, url: string, body?: unknown): Readable & { method: string; url: string; headers: Record<string, string> } {
  const stream = Readable.from(body === undefined ? [] : [JSON.stringify(body)]) as Readable & { method: string; url: string; headers: Record<string, string> };
  stream.method = method;
  stream.url = url;
  stream.headers = {};
  return stream;
}

function body(response: TestResponse): any { return JSON.parse(response.body); }

const sample = {
  localDate: "2026-08-03",
  value: 8123,
  unit: "count",
  measuredStart: "2026-08-03T00:00:00.000Z",
  measuredEnd: "2026-08-03T23:59:59.000Z",
  sourceDevice: "watch-a",
};

test("health import stores provenance summaries, hashes cursors, and replays duplicates safely", async () => {
  const handler = createHealthRouteHandler({ store: new HealthStore({ now: () => 1_754_000_000_000 }) });
  const context = { userId: "user-a", correlationId: "health-1" };
  const first = new TestResponse();
  await handler(request("POST", "/v1/health/import", {
    connectionId: "hc-user-a",
    platform: "android_health_connect",
    sourceName: "Health Connect",
    permissionState: "GRANTED",
    dataType: "steps",
    samples: [sample],
    cursorToken: "provider-cursor-secret-shaped",
  }), first, context);
  assert.equal(first.statusCode, 200);
  assert.equal(body(first).data.imported, 1);
  assert.equal(body(first).data.cursorStored, true);
  assert.equal(body(first).data.summaries[0].sourceDevice, "watch-a");
  assert.equal("cursorToken" in body(first).data, false);

  const duplicate = new TestResponse();
  await handler(request("POST", "/v1/health/import", {
    connectionId: "hc-user-a",
    platform: "android_health_connect",
    sourceName: "Health Connect",
    permissionState: "GRANTED",
    dataType: "steps",
    samples: [sample],
  }), duplicate, context);
  assert.equal(body(duplicate).data.imported, 0);
  assert.equal(body(duplicate).data.duplicates, 1);

  const summaries = new TestResponse();
  await handler(request("GET", "/v1/health/summaries?localDate=2026-08-03&dataType=steps"), summaries, context);
  assert.equal(body(summaries).data.summaries.length, 1);

  const otherUser = new TestResponse();
  await handler(request("GET", "/v1/health/connections"), otherUser, { userId: "user-b", correlationId: "health-2" });
  assert.equal(body(otherUser).data.connections.length, 0);
});

test("health import rejects denied permission payloads that attempt to carry samples", async () => {
  const handler = createHealthRouteHandler();
  const response = new TestResponse();
  await handler(request("POST", "/v1/health/import", {
    connectionId: "hc-user-a",
    platform: "android_health_connect",
    sourceName: "Health Connect",
    permissionState: "DENIED",
    dataType: "steps",
    samples: [],
  }), response, { userId: "user-a", correlationId: "health-denied" });
  assert.equal(response.statusCode, 400);
  assert.equal(body(response).error.code, "invalid_health_samples");

  const deniedWithSample = new TestResponse();
  await handler(request("POST", "/v1/health/import", {
    connectionId: "hc-user-a",
    platform: "android_health_connect",
    sourceName: "Health Connect",
    permissionState: "DENIED",
    dataType: "steps",
    samples: [sample],
  }), deniedWithSample, { userId: "user-a", correlationId: "health-denied-sample" });
  assert.equal(deniedWithSample.statusCode, 400);
  assert.equal(body(deniedWithSample).error.code, "health_permission_denied");
});
