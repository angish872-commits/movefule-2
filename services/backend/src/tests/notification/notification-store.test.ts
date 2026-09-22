import assert from "node:assert/strict";
import test from "node:test";
import { LocalNotificationStore } from "../../notification/notification-store.ts";

test("notification list/read is owner scoped and idempotent", () => {
  const store = new LocalNotificationStore();
  const created = store.create("u1", { type: "MEAL", title: "Protein", body: "Review Fuel", deepLink: "movefuel://fuel", objectId: "", priority: "NORMAL", expiresAt: null });
  assert.equal(store.list("u2").length, 0);
  assert.equal(store.list("u1", true).length, 1);
  const first = store.markRead("u1", created.notificationId);
  const second = store.markRead("u1", created.notificationId);
  assert.equal(first.readAt, second.readAt);
  assert.equal(store.list("u1", true).length, 0);
});
