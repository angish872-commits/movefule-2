import type { IncomingMessage, ServerResponse } from "node:http";
import { ConsentContractError, OnboardingConsentService, parseConsentRecords } from "../foundation/consents.ts";
import { ProfileContractError, ProfileService, type ProfileInput } from "../foundation/profile.ts";
import { previewPersonalTargets } from "../foundation/target-engine.ts";
import { AccountLifecycleService } from "../foundation/account-lifecycle.ts";
import type { OwnerScopedRepository } from "../foundation/repository.ts";
import { ContractError } from "../shared/contracts.ts";
import { readJson, response, sendJson, type RequestContext } from "./requestSupport.ts";

export function createProfileAccountRouteHandler(options: {
  onboardingConsentService: OnboardingConsentService;
  profileService: ProfileService;
  accountLifecycleService: AccountLifecycleService;
  repositoryFor: (context: RequestContext) => OwnerScopedRepository | undefined;
}) {
  const { onboardingConsentService, profileService, accountLifecycleService, repositoryFor } = options;
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    context: { auth: RequestContext; url: URL; correlationId: string },
  ): Promise<boolean> => {
    const { auth, url, correlationId } = context;
      if (req.method === "PUT" && url.pathname === "/v1/consents") {
        const body = await readJson(req);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          throw new ConsentContractError("invalid_request", "Consent request body must be an object.");
        }
        const records = parseConsentRecords((body as Record<string, unknown>).consents);
        const repository = repositoryFor(auth);
        sendJson(res, 200, response(
          await onboardingConsentService.save(auth.userId, records, repository),
          null,
          correlationId,
        ));
        return true;
      }

      if (req.method === "POST" && url.pathname === "/v1/targets/preview") {
        const body = await readJson(req);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          throw new ContractError("invalid_target_preview", "Target preview body must be an object.");
        }
        const candidate = body as Record<string, unknown>;
        const finite = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
        const preview = previewPersonalTargets({
          dateOfBirth: typeof candidate.dateOfBirth === "string" ? candidate.dateOfBirth : undefined,
          heightCm: finite(candidate.heightCm),
          weightKg: finite(candidate.weightKg),
          sexForEnergyEstimate: typeof candidate.sexForEnergyEstimation === "string" ? candidate.sexForEnergyEstimation : undefined,
          activityLevel: typeof candidate.activityLevel === "string" ? candidate.activityLevel : undefined,
          trainingFrequency: typeof candidate.trainingFrequency === "string" ? candidate.trainingFrequency : undefined,
          goal: typeof candidate.goal === "string" ? candidate.goal : undefined,
          dietaryPreferences: typeof candidate.dietaryPreferences === "string" ? candidate.dietaryPreferences : undefined,
        });
        sendJson(res, 200, response(preview, null, correlationId));
        return true;
      }

      if (req.method === "POST" && url.pathname === "/v1/targets/commit") {
        const body = await readJson(req);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          throw new ContractError("invalid_target_commit", "Target commit body must be an object.");
        }
        const candidate = body as Record<string, unknown>;
        const energyKcal = typeof candidate.energyKcal === "number" && Number.isFinite(candidate.energyKcal)
          ? Math.round(candidate.energyKcal)
          : Number.NaN;
        const proteinG = typeof candidate.proteinG === "number" && Number.isFinite(candidate.proteinG)
          ? Math.round(candidate.proteinG)
          : Number.NaN;
        if (!Number.isInteger(energyKcal) || energyKcal <= 0 || !Number.isInteger(proteinG) || proteinG <= 0) {
          throw new ContractError("invalid_target_commit", "Positive energyKcal and proteinG are required.");
        }
        if (candidate.userConfirmed !== true) {
          throw new ContractError("target_confirmation_required", "Targets must be explicitly reviewed and confirmed by the user.");
        }
        const repository = repositoryFor(auth);
        const current = await profileService.get(auth.userId, repository);
        if (!current) throw new ContractError("profile_not_found", "Save the profile before committing targets.");
        let draft: Record<string, unknown> = {};
        try {
          draft = JSON.parse(String(current.onboarding.draftValuesJson ?? "{}")) as Record<string, unknown>;
        } catch {
          throw new ContractError("profile_draft_invalid", "The saved onboarding profile cannot be used to commit targets.");
        }
        const saved = await profileService.save(auth.userId, {
          displayName: String(draft.displayName ?? current.profile.displayName ?? ""),
          dateOfBirth: String(draft.dateOfBirth ?? current.profile.dateOfBirth ?? ""),
          countryRegion: String(draft.countryRegion ?? current.profile.countryCode ?? ""),
          timeZone: String(draft.timeZone ?? current.profile.timeZone ?? "UTC"),
          metricUnits: draft.metricUnits !== false,
          height: String(draft.height ?? ""),
          weight: String(draft.weight ?? ""),
          goal: String(draft.goal ?? current.goal?.goalType ?? ""),
          activityLevel: String(draft.activityLevel ?? current.profile.activityLevel ?? ""),
          trainingFrequency: String(draft.trainingFrequency ?? current.profile.trainingFrequency ?? ""),
          sexForEnergyEstimation: String(draft.sexForEnergyEstimation ?? current.profile.sexForEnergyEstimate ?? ""),
          calorieTarget: String(energyKcal),
          proteinTarget: String(proteinG),
          dietaryPreferences: String(draft.dietaryPreferences ?? ""),
          bodyCompositionRange: String(draft.bodyCompositionRange ?? ""),
          preferredSessionMinutes: typeof draft.preferredSessionMinutes === "number" ? draft.preferredSessionMinutes : 30,
          cameraConsent: draft.cameraConsent === true,
          healthConsent: draft.healthConsent === true,
          watchConnection: String(draft.watchConnection ?? ""),
          notificationsEnabled: draft.notificationsEnabled !== false,
          analyticsAllowed: draft.analyticsAllowed === true,
          completed: true,
          onboardingStep: 18,
        }, repository);
        sendJson(res, 200, response({ target: saved.target, goal: saved.goal }, null, correlationId));
        return true;
      }

      if ((req.method === "GET" || req.method === "PUT") && url.pathname === "/v1/profile") {
        const repository = repositoryFor(auth);
        if (req.method === "GET") {
          const profile = await profileService.get(auth.userId, repository);
          if (!profile) throw new ContractError("profile_not_found", "The authenticated profile has not been saved yet.");
          sendJson(res, 200, response(profile, null, correlationId));
          return true;
        }
        const body = await readJson(req);
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          throw new ProfileContractError("invalid_profile", "Profile body must be an object.");
        }
        const candidate = body as Record<string, unknown>;
        if (typeof candidate.metricUnits !== "boolean" ||
            typeof candidate.cameraConsent !== "boolean" ||
            typeof candidate.healthConsent !== "boolean" ||
            typeof candidate.notificationsEnabled !== "boolean" ||
            typeof candidate.analyticsAllowed !== "boolean") {
          throw new ProfileContractError("invalid_profile_flags", "Profile permission and unit flags must be boolean.");
        }
        const saved = await profileService.save(auth.userId, {
          displayName: candidate.displayName as string,
          dateOfBirth: candidate.dateOfBirth as string | undefined,
          countryRegion: candidate.countryRegion as string,
          timeZone: candidate.timeZone as string | undefined,
          metricUnits: candidate.metricUnits,
          height: candidate.height as string | undefined,
          weight: candidate.weight as string | undefined,
          goal: candidate.goal as string | undefined,
          activityLevel: candidate.activityLevel as string | undefined,
          trainingFrequency: candidate.trainingFrequency as string | undefined,
          sexForEnergyEstimation: candidate.sexForEnergyEstimation as string | undefined,
          calorieTarget: candidate.calorieTarget as string | undefined,
          proteinTarget: candidate.proteinTarget as string | undefined,
          dietaryPreferences: candidate.dietaryPreferences as string | undefined,
          bodyCompositionRange: candidate.bodyCompositionRange as string | undefined,
          preferredSessionMinutes: typeof candidate.preferredSessionMinutes === "number" ? candidate.preferredSessionMinutes : undefined,
          cameraConsent: candidate.cameraConsent,
          healthConsent: candidate.healthConsent,
          watchConnection: candidate.watchConnection as string | undefined,
          notificationsEnabled: candidate.notificationsEnabled,
          analyticsAllowed: candidate.analyticsAllowed,
          completed: candidate.completed === undefined ? true : Boolean(candidate.completed),
          onboardingStep: typeof candidate.onboardingStep === "number" ? candidate.onboardingStep : undefined,
        } satisfies ProfileInput, repository);
        sendJson(res, 200, response(saved, null, correlationId));
        return true;
      }

      if ((req.method === "GET" || req.method === "POST") && url.pathname === "/v1/account/export") {
        const repository = repositoryFor(auth);
        sendJson(res, 200, response(await accountLifecycleService.export(auth.userId, repository), null, correlationId));
        return true;
      }

      if (req.method === "POST" && url.pathname === "/v1/account/delete") {
        const body = await readJson(req);
        const confirmed = Boolean(body && typeof body === "object" && !Array.isArray(body) &&
          (body as Record<string, unknown>).confirm === true);
        const repository = repositoryFor(auth);
        sendJson(res, 200, response(await accountLifecycleService.delete(auth.userId, confirmed, repository), null, correlationId));
        return true;
      }

    return false;
  };
}

export { ConsentContractError, ProfileContractError };
