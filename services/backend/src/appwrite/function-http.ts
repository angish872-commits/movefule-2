import { PassThrough } from "node:stream";
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";

export type AppwriteFunctionRequest = {
  method: string;
  url: string;
  headers: Record<string, string | undefined>;
  bodyText?: string;
};

export type AppwriteFunctionResponse = {
  text(body: string, statusCode?: number, headers?: Record<string, string>): unknown;
  binary(body: Uint8Array, statusCode?: number, headers?: Record<string, string>): unknown;
};

export type AppwriteFunctionContext = {
  req: AppwriteFunctionRequest;
  res: AppwriteFunctionResponse;
  log(message: string): void;
  error(message: string): void;
};

type CapturedResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: Buffer;
};

function normalizedHeaders(headers: Record<string, string | undefined>): IncomingHttpHeaders {
  const result: IncomingHttpHeaders = {};
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase().startsWith("x-movefuel-body-") || name.toLowerCase().startsWith("x-movefuel-response-")) continue;
    if (value !== undefined) result[name.toLowerCase()] = value;
  }
  // Appwrite supplies an authenticated caller's JWT on this header. The
  // existing route/auth layer deliberately accepts the normal bearer contract.
  const appwriteUserJwt = result["x-appwrite-user-jwt"] ?? result["x-appwrite-jwt"];
  if (!result.authorization && appwriteUserJwt) {
    result.authorization = `Bearer ${appwriteUserJwt}`;
  }
  return result;
}

/** Adapt an Appwrite Function request/response to the existing Node route handler. */
export async function invokeNodeHttpHandler(
  handler: (request: IncomingMessage, response: ServerResponse) => Promise<void> | void,
  context: AppwriteFunctionContext,
): Promise<unknown> {
  const requestStream = new PassThrough();
  const request = requestStream as unknown as IncomingMessage;
  request.method = context.req.method;
  request.url = context.req.url;
  request.headers = normalizedHeaders(context.req.headers);

  let finish!: (value: CapturedResponse) => void;
  const completed = new Promise<CapturedResponse>((resolve) => { finish = resolve; });
  const headers: Record<string, string> = {};
  const responseCapture = {
    statusCode: 200,
    setHeader(name: string, value: number | string | readonly string[]): void {
      headers[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value);
    },
    end(body?: string | Uint8Array): void {
      finish({
        statusCode: responseCapture.statusCode,
        headers,
        body: body === undefined ? Buffer.alloc(0) : Buffer.from(body),
      });
    },
  };
  const response = responseCapture as unknown as ServerResponse;

  const handling = Promise.resolve(handler(request, response));
  const requestBodyEncoding = context.req.headers["x-movefuel-body-encoding"]?.toLowerCase();
  const requestBody = requestBodyEncoding === "base64"
    ? Buffer.from(context.req.bodyText ?? "", "base64")
    : context.req.bodyText ?? "";
  requestStream.end(requestBody);
  await handling;
  const captured = await completed;
  const contentType = captured.headers["content-type"] ?? "";
  const responseBodyEncoding = context.req.headers["x-movefuel-response-encoding"]?.toLowerCase();
  if (responseBodyEncoding === "base64") {
    return context.res.text(captured.body.toString("base64"), captured.statusCode, {
      ...captured.headers,
      "x-movefuel-body-encoding": "base64",
    });
  }
  if (contentType.includes("application/json")) {
    try {
      return context.res.text(captured.body.toString("utf8"), captured.statusCode, captured.headers);
    } catch (error) {
      context.error(`api_function_response_failed:${error instanceof Error ? error.message : "unknown"}`);
      return context.res.text("{\"data\":null,\"error\":{\"code\":\"internal_error\",\"message\":\"Response delivery failed.\",\"retryable\":true}}", 500, { "content-type": "application/json; charset=utf-8" });
    }
  }
  return context.res.binary(captured.body, captured.statusCode, captured.headers);
}
