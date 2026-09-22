import assert from "node:assert/strict";
import test from "node:test";
import { createMoveFuelRequestHandler } from "../http/request-handler.ts";
import { invokeNodeHttpHandler, type AppwriteFunctionContext } from "../appwrite/function-http.ts";

test("Appwrite Function adapter preserves the HTTP health contract without opening a port", async () => {
  let captured: { body: string; status: number; headers: Record<string, string> } | undefined;
  const context: AppwriteFunctionContext = {
    req: { method: "GET", url: "/health", headers: {} },
    res: {
      text(body, status = 200, headers = {}) {
        captured = { body, status, headers };
        return captured;
      },
      binary() { throw new Error("health endpoint must be JSON"); },
    },
    log() {},
    error(message) { throw new Error(message); },
  };
  await invokeNodeHttpHandler(createMoveFuelRequestHandler({ environment: "local" }), context);
  assert.ok(captured);
  assert.equal(captured.status, 200);
  assert.equal(captured.headers["content-type"], "application/json; charset=utf-8");
  const payload = JSON.parse(captured.body) as { data: { status: string; environment: string } };
  assert.equal(payload.data.status, "ok");
  assert.equal(payload.data.environment, "local");
});

test("Appwrite Function adapter maps the Appwrite JWT header to bearer authentication", async () => {
  let captured = "";
  const context: AppwriteFunctionContext = {
    req: {
      method: "GET",
      url: "/v1/bootstrap",
      headers: { "x-appwrite-user-jwt": "local-user:function-user", "x-device-id": "function-phone" },
    },
    res: {
      text(body) { captured = body; return body; },
      binary() { throw new Error("bootstrap endpoint must be JSON"); },
    },
    log() {},
    error(message) { throw new Error(message); },
  };
  await invokeNodeHttpHandler(createMoveFuelRequestHandler({ environment: "local" }), context);
  const payload = JSON.parse(captured) as { data: { userId: string } };
  assert.equal(payload.data.userId, "function-user");
});

test("Appwrite Function adapter also accepts the SDK JWT header variant", async () => {
  let captured = "";
  const context: AppwriteFunctionContext = {
    req: { method: "GET", url: "/v1/bootstrap", headers: { "x-appwrite-jwt": "local-user:sdk-user", "x-device-id": "sdk-phone" } },
    res: {
      text(body) { captured = body; return body; },
      binary() { throw new Error("bootstrap endpoint must be JSON"); },
    },
    log() {},
    error(message) { throw new Error(message); },
  };
  await invokeNodeHttpHandler(createMoveFuelRequestHandler({ environment: "local" }), context);
  const payload = JSON.parse(captured) as { data: { userId: string } };
  assert.equal(payload.data.userId, "sdk-user");
});


test("production request handler auto-wires Appwrite JWT authentication from backend configuration", async () => {
  let captured: { body: string; status: number } | undefined;
  const context: AppwriteFunctionContext = {
    req: {
      method: "GET",
      url: "/v1/config",
      headers: { "x-appwrite-user-jwt": "production-user-jwt" },
    },
    res: {
      text(body, status = 200) { captured = { body, status }; return captured; },
      binary() { throw new Error("config endpoint must be JSON"); },
    },
    log() {},
    error(message) { throw new Error(message); },
  };

  const handler = createMoveFuelRequestHandler({
    environment: "production",
    appwriteEndpoint: "https://appwrite.example/v1",
    appwriteProjectId: "movefuel",
    appwriteServerApiKey: "server-secret-for-test",
    mealMediaBucketId: "meal-media",
    appwriteSessionFetcher: async (_input, init) => {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("X-Appwrite-JWT"), "production-user-jwt");
      return new Response(JSON.stringify({ $id: "production-user" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  await invokeNodeHttpHandler(handler, context);
  assert.ok(captured);
  assert.equal(captured.status, 200);
  const payload = JSON.parse(captured.body) as { data: { userId: string; environment: string } };
  assert.equal(payload.data.userId, "production-user");
  assert.equal(payload.data.environment, "production");
});

test("Appwrite Function adapter round-trips encoded binary request and response bodies", async () => {
  const input = Buffer.from([0, 1, 2, 127, 128, 255]);
  let captured: { body: string; status: number; headers: Record<string, string> } | undefined;
  const context: AppwriteFunctionContext = {
    req: {
      method: "PUT",
      url: "/v1/binary",
      headers: {
        "x-movefuel-body-encoding": "base64",
        "x-movefuel-response-encoding": "base64",
      },
      bodyText: input.toString("base64"),
    },
    res: {
      text(body, status = 200, headers = {}) {
        captured = { body, status, headers };
        return captured;
      },
      binary(body, status = 200, headers = {}) {
        captured = { body: Buffer.from(body).toString("base64"), status, headers };
        return captured;
      },
    },
    log() {},
    error(message) { throw new Error(message); },
  };
  const handler = async (_request: any, response: any) => {
    const chunks: Buffer[] = [];
    for await (const chunk of _request) chunks.push(Buffer.from(chunk));
    response.setHeader("content-type", "application/octet-stream");
    response.end(Buffer.concat(chunks));
  };
  await invokeNodeHttpHandler(handler, context);
  assert.ok(captured);
  assert.equal(captured.status, 200);
  assert.equal(captured.headers["x-movefuel-body-encoding"], "base64");
  assert.deepEqual(Buffer.from(captured.body, "base64"), input);
});
