import type { TrainingPlanEnvelope } from "../../../../contracts/generated/typescript/MoveFuelContractsV1.ts";
import { DietPlanService } from "../diet-intelligence/diet-plan-service.ts";
import { DietRecommendationPersistence } from "../diet-intelligence/persistence.ts";
import { CurrentTrainingPlanStore } from "../training/current-plan-store.ts";
import type { AppwriteTablesClient, OwnerScopedRepository, RepositoryRow, ServerOwnedRepository } from "../foundation/repository.ts";
import type { ProfileResult, ProfileService } from "../foundation/profile.ts";
import type { ConfirmedMealStoreLike } from "../meal/confirmed-meals.ts";
import type { RequestContext } from "../http/requestSupport.ts";
import type { TodayCandidateInput } from "./contracts.ts";
import type { TodaySourceProvider, TodaySourceRequest, TodaySourceSnapshot } from "./service.ts";
import { emptyTodayDomainCandidateSets } from "./runtime.ts";
import { AppwriteCalendarStore } from "../calendar/appwrite-calendar-store.ts";

function sessionLocalDate(raw: unknown): string {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "";
  const session = raw as Record<string, unknown>;
  return typeof session.localDate === "string" ? session.localDate : "";
}

/** Adapts canonical Training plan sessions for the requested date. No prescription happens here. */
function trainingInputsForDate(
  plan: TrainingPlanEnvelope,
  userId: string,
  localDate: string,
): readonly TodayCandidateInput[] {
  const dated = plan.sessions.filter((raw) => sessionLocalDate(raw) === localDate);
  const inputs: TodayCandidateInput[] = [];
  for (const raw of dated) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const session = raw as Record<string, unknown>;
    const semanticSessionId = typeof session.semanticSessionId === "string" ? session.semanticSessionId : "";
    if (!semanticSessionId) continue;
    const purpose = typeof session.purpose === "string" ? session.purpose : "TRAINING";
    const expiresAt = typeof session.expiresAt === "string" ? session.expiresAt : plan.validity.expiresAt ?? plan.generatedAt;
    const candidate = Object.freeze({
      schemaVersion: 1,
      candidateId: `training:${plan.planId}:${semanticSessionId}`,
      semanticActionKey: `training:session:${semanticSessionId}`,
      userId,
      domain: "TRAINING",
      type: "TRAINING_SESSION",
      blockingState: "NON_BLOCKING",
      reasonCodes: Object.freeze(["VALID_TRAINING_SESSION", `PURPOSE_${purpose}`]),
      sourceObjectId: plan.planId,
      sourceRevision: String(plan.planRevision),
      validFrom: plan.generatedAt,
      expiresAt,
      requiresNetwork: false,
      deepLink: Object.freeze({ destination: "training/session", semanticSessionId, sourcePlanId: plan.planId, sourcePlanRevision: plan.planRevision }),
    });
    inputs.push(Object.freeze({
      candidate,
      domainValidity: "VALID",
      dependencyState: "SATISFIED",
      freshness: "FRESH",
    }));
  }
  return Object.freeze(inputs);
}

export type ProductionTodaySourceContextDependencies = {
  profileService: ProfileService;
  ownerRepositoryForContext: (context: { userId: string; accessToken?: string }) => OwnerScopedRepository | undefined;
  serverOwnedRepository?: ServerOwnedRepository;
  confirmedMealsFor: (context: { userId: string; accessToken?: string }) => ConfirmedMealStoreLike;
  serverTablesClient?: AppwriteTablesClient;
  appwriteDatabaseId?: string;
  now?: () => Date;
};

/**
 * Binds the production Today source to an authenticated request. Returns null
 * when the request has no canonical persistence boundary (local/test runtime).
 */
export function createProductionTodaySourceForContext(
  deps: ProductionTodaySourceContextDependencies,
): (context: RequestContext) => TodaySourceProvider | null {
  return (context) => {
    if (context.provider !== "appwrite") return null;
    const repository = deps.ownerRepositoryForContext({
      userId: context.userId,
      ...(context.accessToken ? { accessToken: context.accessToken } : {}),
    });
    if (!repository || !deps.serverOwnedRepository || !deps.serverTablesClient) return null;
    const confirmedMeals = deps.confirmedMealsFor({
      userId: context.userId,
      ...(context.accessToken ? { accessToken: context.accessToken } : {}),
    });
    const dietService = new DietPlanService(
      new DietRecommendationPersistence(repository, deps.serverOwnedRepository),
      confirmedMeals,
    );
    const planStore = new CurrentTrainingPlanStore(
      repository,
      deps.serverTablesClient,
      deps.appwriteDatabaseId ?? "movefuel_mvp",
    );
    return createProductionTodaySource({
      profileService: deps.profileService,
      dietService,
      confirmedMealsFor: () => confirmedMeals,
      ownerRepositoryForContext: deps.ownerRepositoryForContext,
      currentPlanFor: (userId) => planStore.readCurrent(userId),
      calendarEntriesFor: async (userId) => (await new AppwriteCalendarStore(deps.serverOwnedRepository!).readCurrent(userId)).entries,
      now: deps.now,
    });
  };
}

export type ProductionTodaySourceDependencies = {
  profileService: ProfileService;
  dietService: DietPlanService;
  confirmedMealsFor: (context: { userId: string; accessToken?: string }) => ConfirmedMealStoreLike;
  ownerRepositoryForContext: (context: { userId: string; accessToken?: string }) => OwnerScopedRepository | undefined;
  currentPlanFor?: (userId: string, repository: OwnerScopedRepository) => Promise<{ state: "CURRENT"; plan: TrainingPlanEnvelope } | { state: string; plan: null }>;
  calendarEntriesFor?: (userId: string) => Promise<readonly { entryId: string; semanticObjectType: string; semanticObjectId: string; calendarRevision: number; localDate: string; status: string; locked: boolean }[]>;
  now?: () => Date;
};

async function dietInput(options: {
  dietService: DietPlanService;
  profileService: ProfileService;
  repository?: OwnerScopedRepository;
  userId: string;
  localDate: string;
  now: Date;
}): Promise<readonly TodayCandidateInput[]> {
  const profile: ProfileResult | null = options.repository
    ? await options.profileService.get(options.userId, options.repository)
    : null;
  if (!profile) return Object.freeze([]);
  const target = profile.target as Record<string, unknown> | null | undefined;
  if (target?.eligibilityDecision !== "ELIGIBLE") return Object.freeze([]);
  const action = await options.dietService.todayCandidate(profile, options.localDate, options.now);
  if (!action) return Object.freeze([]);
  return Object.freeze([Object.freeze({
    candidate: action,
    domainValidity: "VALID",
    dependencyState: "SATISFIED",
    freshness: "FRESH",
  })]);
}

/**
 * Production Today domain source. It assembles only candidates whose source
 * domain already produced a legitimate canonical state:
 *  - Training: sessions in the current canonical plan for the requested date.
 *  - Nutrition/Diet: an eligible-target advisory produced by the Diet domain
 *    through its own toDailyActionCandidate adapter (never re-ranked here).
 * No Food/Calendar/Health/Device/Progress action is manufactured here; empty
 * domains are valid when their source has no legitimate action.
 */
export function createProductionTodaySource(deps: ProductionTodaySourceDependencies): TodaySourceProvider {
  const now = deps.now ?? (() => new Date());
  return async (request: TodaySourceRequest): Promise<TodaySourceSnapshot> => {
    const userId = request.userId.trim();
    const repository = deps.ownerRepositoryForContext({ userId });

    const dietPromise = dietInput({
      dietService: deps.dietService,
      profileService: deps.profileService,
      repository,
      userId,
      localDate: request.localDate,
      now: now(),
    });
    const trainingPromise = (async (): Promise<readonly TodayCandidateInput[]> => {
      if (!deps.currentPlanFor || !repository) return Object.freeze([]);
      try {
        const recovery = await deps.currentPlanFor(userId, repository);
        if (recovery.state === "CURRENT" && recovery.plan) {
          return trainingInputsForDate(recovery.plan, userId, request.localDate);
        }
      } catch {
        // No current canonical plan is a valid empty Training domain.
      }
      return Object.freeze([]);
    })();

    const calendarPromise = (async (): Promise<readonly TodayCandidateInput[]> => {
      const entries = await deps.calendarEntriesFor?.(userId) ?? [];
      return Object.freeze(entries
        .filter((entry) => entry.localDate === request.localDate && entry.semanticObjectType === "TRAINING_SESSION" && entry.status === "SCHEDULED")
        .map((entry) => Object.freeze({
          candidate: Object.freeze({
            schemaVersion: 1,
            candidateId: `calendar:${entry.entryId}:${entry.calendarRevision}`,
            semanticActionKey: `calendar:training:${entry.semanticObjectId}`,
            userId,
            domain: "CALENDAR",
            type: "CALENDAR_TRAINING_SESSION",
            blockingState: "NON_BLOCKING",
            reasonCodes: Object.freeze(["CANONICAL_CALENDAR_PLACEMENT", ...(entry.locked ? ["CALENDAR_LOCKED"] : [])]),
            sourceObjectId: entry.entryId,
            sourceRevision: String(entry.calendarRevision),
            validFrom: now().toISOString(),
            expiresAt: new Date(now().getTime() + 24 * 60 * 60 * 1000).toISOString(),
            requiresNetwork: false,
            deepLink: Object.freeze({ destination: "calendar", semanticSessionId: entry.semanticObjectId }),
          }),
          domainValidity: "VALID" as const,
          dependencyState: "SATISFIED" as const,
          freshness: "FRESH" as const,
        })));
    })();

    const [nutrition, training, calendar] = await Promise.all([dietPromise, trainingPromise, calendarPromise]);
    const hasContent = nutrition.length > 0 || training.length > 0 || calendar.length > 0;
    return Object.freeze({
      domains: Object.freeze({
        food: emptyTodayDomainCandidateSets().food,
        nutrition,
        training,
        calendar,
        healthDevice: emptyTodayDomainCandidateSets().healthDevice,
        missingInformation: emptyTodayDomainCandidateSets().missingInformation,
      }),
      syncState: "SYNCED",
      freshness: hasContent ? "FRESH" : "UNKNOWN",
      revision: 1,
    } as TodaySourceSnapshot);
  };
}
