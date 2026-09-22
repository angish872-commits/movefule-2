/**
 * Provider registry (Phase 7).
 *
 * The registry holds descriptors only; the pipeline itself never changes when
 * a provider is added or removed. A provider may only be enabled when its
 * licence and privacy gates are all KNOWN (never UNKNOWN, never REJECTED).
 */

import { type ProviderDescriptor, providerCanBeEnabled, BenchmarkContractError } from "../benchmark/benchmarkContracts.ts";

export class ProviderRegistryError extends BenchmarkContractError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "ProviderRegistryError";
  }
}

export class ProviderRegistry {
  private readonly providers = new Map<string, ProviderDescriptor>();

  register(descriptor: ProviderDescriptor): void {
    if (!descriptor.providerId || descriptor.providerId.trim().length === 0) {
      throw new ProviderRegistryError("blank_provider_id", "A providerId is required.");
    }
    if (this.providers.has(descriptor.providerId)) {
      throw new ProviderRegistryError("duplicate_provider_id", `Provider "${descriptor.providerId}" is already registered.`);
    }
    const registered = { ...descriptor };
    if (registered.enabled && !providerCanBeEnabled(registered)) {
      throw new ProviderRegistryError(
        "unknown_licence_cannot_enable",
        `Provider "${registered.providerId}" has UNKNOWN or REJECTED licence/privacy gates and cannot be enabled.`,
      );
    }
    this.providers.set(registered.providerId, registered);
  }

  get(providerId: string): ProviderDescriptor {
    const descriptor = this.providers.get(providerId);
    if (!descriptor) {
      throw new ProviderRegistryError("unknown_provider", `Provider "${providerId}" is not registered.`);
    }
    return descriptor;
  }

  list(): readonly ProviderDescriptor[] {
    return [...this.providers.values()];
  }

  isEnabled(providerId: string): boolean {
    return this.get(providerId).enabled;
  }

  enable(providerId: string): void {
    const descriptor = this.get(providerId);
    if (!providerCanBeEnabled(descriptor)) {
      throw new ProviderRegistryError(
        "unknown_licence_cannot_enable",
        `Provider "${providerId}" has UNKNOWN or REJECTED licence/privacy gates and cannot be enabled.`,
      );
    }
    this.providers.set(providerId, { ...descriptor, enabled: true });
  }

  disable(providerId: string): void {
    const descriptor = this.get(providerId);
    this.providers.set(providerId, { ...descriptor, enabled: false });
  }
}

export function mockDescriptor(providerId: string, providerName: string, adapterType: ProviderDescriptor["adapterType"]): ProviderDescriptor {
  return {
    providerId,
    providerName,
    adapterType,
    modelVersion: "0.1.0",
    deploymentType: "MOCK",
    licenceStatus: "APPROVED",
    commercialUseStatus: "ALLOWED",
    dataRetentionStatus: "ALLOWED",
    modelTrainingUseStatus: "NOT_ALLOWED",
    regionAvailability: { regions: ["GLOBAL"], status: "ALLOWED" },
    expectedInput: {
      imageFormats: ["image/jpeg", "image/png"],
      maxBytes: 20 * 1024 * 1024,
      requiresSideView: false,
      requiresDepth: false,
      notes: ["deterministic fixture provider"],
    },
    expectedOutput: {
      masks: false,
      boundingBoxes: true,
      foodIdentity: false,
      preparation: false,
      portionEstimate: false,
      nutrients: false,
      notes: ["mock providers never invent identity or nutrient values"],
    },
    cost: { currency: "USD", perImageUsd: 0, perConfirmedMealUsd: 0, evidence: "internal mock" },
    latency: { p50Ms: 0, p95Ms: 0, evidence: "internal mock" },
    evidenceStatus: "UNVERIFIED",
    enabled: true,
  };
}
