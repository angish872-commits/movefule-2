import assert from "node:assert/strict";
import test from "node:test";
import { Readable, Writable } from "node:stream";
import { createDeviceRouteHandler } from "../../http/device-routes.ts";
import { DeviceTrustStore } from "../../device/device-trust.ts";

class TestResponse extends Writable {
  public statusCode = 200;
  public body = "";
  setHeader(): this { return this; }
  _write(chunk: Buffer | string, _encoding: string, callback: (error?: Error | null) => void): void { this.body += chunk.toString(); callback(); }
}

function request(method: string, url: string, body?: unknown): Readable & { method: string; url: string; headers: Record<string, string> } {
  const stream = Readable.from(body === undefined ? [] : [JSON.stringify(body)]) as Readable & { method: string; url: string; headers: Record<string, string> };
  stream.method = method; stream.url = url; stream.headers = {};
  return stream;
}

function parse(response: TestResponse): any { return JSON.parse(response.body); }

test("device trust routes register and revoke only the authenticated owner's session", async () => {
  const handler = createDeviceRouteHandler({ store: new DeviceTrustStore({ idFactory: () => "session-a" }) });
  const context = { userId: "user-a", correlationId: "device-1" };
  const register = new TestResponse();
  await handler(request("POST", "/v1/devices/trust", { phoneDeviceId: "phone-a", watchDeviceId: "watch-a", idempotencyKey: "trust-a" }), register, context);
  assert.equal(register.statusCode, 201);
  const sessionId = parse(register).data.session.deviceSessionId;
  const list = new TestResponse();
  await handler(request("GET", "/v1/devices/trust"), list, context);
  assert.equal(parse(list).data.sessions.length, 1);
  const other = new TestResponse();
  await handler(request("GET", "/v1/devices/trust"), other, { userId: "user-b", correlationId: "device-2" });
  assert.equal(parse(other).data.sessions.length, 0);
  const revoke = new TestResponse();
  await handler(request("POST", `/v1/devices/trust/${sessionId}/revoke`), revoke, context);
  assert.equal(parse(revoke).data.session.state, "REVOKED");
});
