import assert from "node:assert/strict";
import test from "node:test";
import { SupportTicketStore } from "../../support/support-store.ts";

test("support ticket sanitizes obvious pasted secret patterns", async () => {
  const store = new SupportTicketStore();
  const fakeGoogleKey = "AI" + "za" + "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
  const ticket = await store.create("u1", { category: "sync", subject: "Watch", body: `key ${fakeGoogleKey}`, safeContext: { screen: "watch" } });
  assert.match(ticket.bodyRedacted, /\[redacted\]/);
  assert.ok(!ticket.bodyRedacted.includes(fakeGoogleKey));
});

test("support ticket safe context uses an allowlist and redacts token-shaped values", async () => {
  const store = new SupportTicketStore();
  const ticket = await store.create("u1", {
    category: "sync",
    subject: "Context",
    body: "Bearer eyJabcdefghij.abcdefghij.abcdefghij should not leave the boundary",
    safeContext: {
      screen: "today",
      errorCode: "sync_timeout",
      email: "private@example.com",
      sessionCookie: "very-secret-cookie",
      arbitraryDump: { meal: "private" },
    },
  });
  assert.match(ticket.bodyRedacted, /\[redacted\]/);
  const context = JSON.parse(ticket.safeContextJson);
  assert.deepEqual(context, { screen: "today", errorCode: "sync_timeout" });
});
