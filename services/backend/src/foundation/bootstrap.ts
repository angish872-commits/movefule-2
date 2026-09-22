import { sha256 } from "../domain/sync-store.ts";
import type { OwnerScopedRepository, RepositoryRow } from "./repository.ts";

export type BootstrapResult = {
  userId: string;
  deviceId: string;
  source: "appwrite";
  created: {
    profile: boolean;
    onboarding: boolean;
    privacy: boolean;
    device: boolean;
  };
  profile: RepositoryRow;
  device: RepositoryRow;
};

/**
 * Idempotent first-session bootstrap for the deployed core tables. The
 * repository owns the Appwrite transport; this service only declares the
 * records that must exist for an authenticated user and device.
 */
export class AppwriteBootstrapService {
  private readonly repository: OwnerScopedRepository;

  public constructor(repository: OwnerScopedRepository) {
    this.repository = repository;
  }

  async ensure(userId: string, deviceId: string): Promise<BootstrapResult> {
    if (!userId.trim() || !deviceId.trim()) throw new Error("bootstrap_identity_required");
    const now = new Date().toISOString();
    const profileId = userId;
    const deviceRowId = deviceId;

    let profile = await this.repository.getOwned("user_profile", userId, profileId);
    const profileCreated = !profile;
    if (!profile) {
      profile = await this.repository.createOwned("user_profile", userId, profileId, {
        displayName: "",
        locale: "en",
        timeZone: "UTC",
        onboardingState: "NOT_STARTED",
        revision: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    let device = await this.repository.getOwned("device", userId, deviceRowId);
    const deviceCreated = !device;
    if (!device) {
      device = await this.repository.createOwned("device", userId, deviceRowId, {
        deviceId,
        platform: "android",
        deviceClass: "phone",
        installationIdHash: sha256({ deviceId }),
        appVersion: "unknown",
        capabilityJson: JSON.stringify({ camera: true, watchDataLayer: true }),
        lastSeenAt: now,
      });
    }

    const onboarding = await this.repository.getOwned("onboarding_progress", userId, userId);
    const onboardingCreated = !onboarding;
    if (!onboarding) {
      await this.repository.createOwned("onboarding_progress", userId, userId, {
        currentStep: 0,
        completedStepsJson: "[]",
        draftValuesJson: "{}",
        schemaVersion: 1,
        revision: 1,
        updatedAt: now,
      });
    }

    const privacy = await this.repository.getOwned("privacy_preference", userId, userId);
    const privacyCreated = !privacy;
    if (!privacy) {
      await this.repository.createOwned("privacy_preference", userId, userId, {
        retainMealImages: false,
        imageRetentionDays: 0,
        analyticsAllowed: false,
        modelImprovementAllowed: false,
        exportLocale: "en",
        revision: 1,
        updatedAt: now,
      });
    }

    return {
      userId,
      deviceId,
      source: "appwrite",
      created: {
        profile: profileCreated,
        onboarding: onboardingCreated,
        privacy: privacyCreated,
        device: deviceCreated,
      },
      profile,
      device,
    };
  }
}
