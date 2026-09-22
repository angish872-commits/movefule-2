import { createServer as createHttpServer } from "node:http";
import { createMoveFuelRequestHandler } from "./request-handler.ts";

/** Local TCP wrapper. Appwrite Functions use the request handler directly. */
export function createMoveFuelServer(options: Parameters<typeof createMoveFuelRequestHandler>[0] = {}) {
  return createHttpServer(createMoveFuelRequestHandler(options));
}
