import assert from "node:assert/strict";
import test from "node:test";
import { DeviceCommandStore } from "../../device/device-commands.ts";
import { DeviceTrustStore } from "../../device/device-trust.ts";

test("device commands require trusted watches and remain replay-safe across acknowledgement", () => {
  const trust = new DeviceTrustStore({ idFactory: () => "trust-1" });
  const commands = new DeviceCommandStore({ trust, idFactory: () => "command-1", now: () => 1_754_000_000_000 });
  assert.throws(() => commands.enqueue("user-a", { idempotencyKey: "cmd-1", targetDeviceId: "watch-a", commandType: "RECONCILE" }), /trust session/);
  trust.trust("user-a", { phoneDeviceId: "phone-a", watchDeviceId: "watch-a", idempotencyKey: "trust-1" });
  const first = commands.enqueue("user-a", { idempotencyKey: "cmd-1", targetDeviceId: "watch-a", commandType: "RECONCILE", objectId: "summary-1", objectRevision: 2 });
  assert.equal(first.created, true);
  assert.equal(commands.enqueue("user-a", { idempotencyKey: "cmd-1", targetDeviceId: "watch-a", commandType: "RECONCILE", objectId: "summary-1", objectRevision: 2 }).created, false);
  assert.equal(commands.acknowledge("user-a", first.command.commandId, "ACKNOWLEDGED").state, "ACKNOWLEDGED");
  assert.equal(commands.acknowledge("user-a", first.command.commandId, "FAILED").state, "ACKNOWLEDGED");
  assert.equal(commands.list("user-b").length, 0);
});
