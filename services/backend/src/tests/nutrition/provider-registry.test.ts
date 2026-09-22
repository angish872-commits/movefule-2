import assert from "node:assert/strict";
import test from "node:test";
import { ProviderRegistry, ProviderRegistryError, mockDescriptor } from "../../nutrition/validation/providerRegistry.ts";
import type { ProviderDescriptor } from "../../nutrition/benchmark/benchmarkContracts.ts";

function unknownLicenceDescriptor(providerId: string): ProviderDescriptor {
  return {
    providerId,
    providerName: "Unknown Licence Provider",
    adapterType: "SEGMENTATION",
    modelVersion: "1.0.0",
    deploymentType: "CLOUD_API",
    licenceStatus: "UNKNOWN",
    commercialUseStatus: "UNKNOWN",
    dataRetentionStatus: "UNKNOWN",
    modelTrainingUseStatus: "UNKNOWN",
    regionAvailability: { regions: ["US"], status: "UNKNOWN" },
    expectedInput: { imageFormats: ["image/jpeg"], maxBytes: null, requiresSideView: false, requiresDepth: false, notes: [] },
    expectedOutput: { masks: false, boundingBoxes: true, foodIdentity: true, preparation: false, portionEstimate: false, nutrients: false, notes: [] },
    cost: null,
    latency: null,
    evidenceStatus: "UNKNOWN",
    enabled: false,
  };
}

test("registry registers and retrieves a provider", () => {
  const registry = new ProviderRegistry();
  const descriptor = mockDescriptor("mock-seg", "Mock Segmentation", "SEGMENTATION");
  registry.register(descriptor);
  assert.equal(registry.get("mock-seg").providerName, "Mock Segmentation");
  assert.equal(registry.list().length, 1);
});

test("duplicate provider ID is rejected", () => {
  const registry = new ProviderRegistry();
  registry.register(mockDescriptor("mock-seg", "Mock Segmentation", "SEGMENTATION"));
  assert.throws(
    () => registry.register(mockDescriptor("mock-seg", "Mock Segmentation v2", "SEGMENTATION")),
    (error: unknown) => error instanceof ProviderRegistryError && error.code === "duplicate_provider_id",
  );
});

test("blank provider ID is rejected", () => {
  const registry = new ProviderRegistry();
  assert.throws(
    () => registry.register(mockDescriptor("", "Blank", "SEGMENTATION")),
    (error: unknown) => error instanceof ProviderRegistryError && error.code === "blank_provider_id",
  );
});

test("unknown licence cannot be registered as enabled", () => {
  const registry = new ProviderRegistry();
  assert.throws(
    () => registry.register({ ...unknownLicenceDescriptor("cloud-x"), enabled: true }),
    (error: unknown) => error instanceof ProviderRegistryError && error.code === "unknown_licence_cannot_enable",
  );
});

test("unknown licence cannot be enabled after registration", () => {
  const registry = new ProviderRegistry();
  registry.register(unknownLicenceDescriptor("cloud-x"));
  assert.throws(
    () => registry.enable("cloud-x"),
    (error: unknown) => error instanceof ProviderRegistryError && error.code === "unknown_licence_cannot_enable",
  );
  assert.equal(registry.isEnabled("cloud-x"), false);
});

test("rejected licence cannot be enabled", () => {
  const registry = new ProviderRegistry();
  registry.register({ ...unknownLicenceDescriptor("bad"), licenceStatus: "REJECTED" });
  assert.throws(
    () => registry.enable("bad"),
    (error: unknown) => error instanceof ProviderRegistryError && error.code === "unknown_licence_cannot_enable",
  );
});

test("disabled provider is rejected for use", () => {
  const registry = new ProviderRegistry();
  registry.register({ ...mockDescriptor("mock-seg", "Mock Segmentation", "SEGMENTATION"), enabled: false });
  assert.equal(registry.isEnabled("mock-seg"), false);
  registry.enable("mock-seg");
  assert.equal(registry.isEnabled("mock-seg"), true);
  registry.disable("mock-seg");
  assert.equal(registry.isEnabled("mock-seg"), false);
});

test("fully gated provider can be enabled", () => {
  const registry = new ProviderRegistry();
  const descriptor = mockDescriptor("mock-cand", "Mock Candidates", "CANDIDATE");
  registry.register(descriptor);
  assert.equal(registry.isEnabled("mock-cand"), true);
});

test("unknown provider is not found", () => {
  const registry = new ProviderRegistry();
  assert.throws(
    () => registry.get("nope"),
    (error: unknown) => error instanceof ProviderRegistryError && error.code === "unknown_provider",
  );
});

test("REVIEW_REQUIRED licence is gated but not rejected outright", () => {
  const registry = new ProviderRegistry();
  registry.register({
    ...unknownLicenceDescriptor("pending"),
    licenceStatus: "REVIEW_REQUIRED",
    commercialUseStatus: "ALLOWED",
    dataRetentionStatus: "ALLOWED",
    modelTrainingUseStatus: "ALLOWED",
    regionAvailability: { regions: ["US"], status: "ALLOWED" },
  });
  registry.enable("pending");
  assert.equal(registry.isEnabled("pending"), true);
});
