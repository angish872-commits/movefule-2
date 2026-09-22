import type {
  CalendarAvailability,
  PolicyBand,
  ReadinessInput,
  TrainingHistorySession,
  TrainingProfile,
} from "../../../../algorithms/training/src/contracts.ts";
import type { CalendarSnapshot } from "../calendar/types.ts";
import type { ProfileResult } from "../foundation/profile.ts";
import type { RepositoryRow } from "../foundation/repository.ts";
import type { StoredTrainingSetup } from "./setup-service.ts";

export type TrainingRuntimeDataSources = {
  profileFor: (userId: string) => Promise<ProfileResult | null>;
  setupFor: (userId: string) => Promise<StoredTrainingSetup | null>;
  canonicalHistoryFor: (userId: string) => Promise<readonly TrainingHistorySession[]>;
  calendarFor: (userId: string) => Promise<CalendarSnapshot | null>;
  wellnessFor: (userId: string, localDate: string) => Promise<readonly RepositoryRow[]>;
};

export type TrainingSetupAction = {
  type: "TRAINING_SETUP";
  missingFields: readonly string[];
  reasonCodes: readonly string[];
};

export type TrainingRuntimeInput = {
  profile: TrainingProfile;
  policyBand: PolicyBand;
  readiness: ReadinessInput;
  history: readonly TrainingHistorySession[];
  availability: readonly CalendarAvailability[];
  calendarRevision: number;
};

export type TrainingRuntimeInputResult =
  | { status: "READY"; input: TrainingRuntimeInput }
  | { status: "MISSING_INFORMATION"; action: TrainingSetupAction; partialProfile: TrainingProfile };

const WEEKDAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberInRange(value: unknown, minimum: number, maximum: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum ? value : null;
}

function localDateFor(instant: string, timezone: string): string {
  const date = new Date(instant);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addLocalDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + days));
  return shifted.toISOString().slice(0, 10);
}

function weekday(localDate: string): string {
  const [year, month, day] = localDate.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)).getUTCDay()]!;
}

function policyBand(dateOfBirth: string, generatedAt: string): PolicyBand {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return "UNKNOWN";
  const birth = new Date(`${dateOfBirth}T00:00:00.000Z`);
  const now = new Date(generatedAt);
  if (!Number.isFinite(birth.getTime()) || !Number.isFinite(now.getTime()) || birth > now) return "UNKNOWN";
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday = now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  if (age < 18) return "YOUTH";
  if (age >= 65) return "OLDER_ADULT";
  return "ADULT";
}

function compositeRevision(profileRevision: number, setupRevision: number): number {
  return Math.max(0, Math.trunc(profileRevision)) * 1_000_000 + Math.max(0, Math.trunc(setupRevision));
}

function buildTrainingProfile(userId: string, profile: ProfileResult | null, setup: StoredTrainingSetup | null): TrainingProfile {
  const coreRevision = Number(profile?.profile.revision ?? 0);
  const goal = text(profile?.goal?.goalType);
  const unknownFields: string[] = [];
  if (!goal) unknownFields.push("goalCodes");
  if (!setup) unknownFields.push("experienceBand", "equipmentCodes", "environmentCodes", "availabilityMinutesByDay", "preferenceCodes", "limitationCodes");
  const coreUpdatedAt = text(profile?.profile.updatedAt) || new Date(0).toISOString();
  const updatedAt = setup && setup.updatedAt > coreUpdatedAt ? setup.updatedAt : coreUpdatedAt;
  return {
    schemaVersion: 1,
    userId,
    goalCodes: goal ? [goal] : [],
    experienceBand: setup?.experienceBand ?? "",
    equipmentCodes: setup?.equipmentCodes ?? [],
    environmentCodes: setup?.environmentCodes ?? [],
    availabilityMinutesByDay: setup?.availabilityMinutesByDay ?? {},
    preferenceCodes: setup?.preferenceCodes ?? [],
    limitationCodes: setup?.limitationCodes ?? [],
    unknownFields: [...new Set(unknownFields)].sort(),
    revision: compositeRevision(Number.isFinite(coreRevision) ? coreRevision : 0, setup?.revision ?? 0),
    updatedAt,
  };
}

function calendarAvailability(
  profile: TrainingProfile,
  snapshot: CalendarSnapshot,
  generatedAt: string,
  timezone: string,
): readonly CalendarAvailability[] {
  const availability = profile.availabilityMinutesByDay;
  if (!availability || typeof availability !== "object" || Array.isArray(availability)) return [];
  const startDate = localDateFor(generatedAt, timezone);
  const slots: CalendarAvailability[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const localDate = addLocalDays(startDate, offset);
    const day = weekday(localDate);
    const explicit = (availability as Readonly<Record<string, unknown>>)[day];
    if (typeof explicit !== "number" || !Number.isFinite(explicit) || explicit <= 0) continue;
    const entries = snapshot.entries.filter((entry) => entry.localDate === localDate && !["CANCELLED", "COMPLETED", "MISSED"].includes(entry.status));
    const restDay = entries.some((entry) => entry.semanticObjectType === "REST_DAY");
    const occupiedMinutes = entries.reduce((sum, entry) => {
      const duration = Math.max(0, Math.round((Date.parse(entry.endAt) - Date.parse(entry.startAt)) / 60_000));
      return sum + (Number.isFinite(duration) ? duration : 0);
    }, 0);
    const availableMinutes = restDay ? 0 : Math.max(0, Math.trunc(explicit) - occupiedMinutes);
    slots.push({ localDate, weekday: day, availableMinutes, locked: restDay || availableMinutes < 10 });
  }
  return slots;
}

function readinessFromWellness(rows: readonly RepositoryRow[], limitationCodes: readonly string[]): ReadinessInput {
  const latest = [...rows].sort((left, right) => text(right.updatedAt ?? right.createdAt).localeCompare(text(left.updatedAt ?? left.createdAt)))[0];
  const limitations = new Set(limitationCodes.map((value) => value.trim().toUpperCase()));
  return {
    sleepQuality: latest ? numberInRange(latest.sleepPerception, 0, 10) : null,
    energy: latest ? numberInRange(latest.energyLevel, 0, 10) : null,
    motivation: null,
    soreness: null,
    painFlag: limitations.has("PAIN_ACTIVE"),
    illnessFlag: limitations.has("ILLNESS_ACTIVE"),
  };
}

function mergeCanonicalHistoryWithMissedCalendar(
  canonicalHistory: readonly TrainingHistorySession[],
  calendar: CalendarSnapshot,
): readonly TrainingHistorySession[] {
  const history = canonicalHistory.map((entry) => ({ ...entry }));
  const sessionIds = new Set(history.map((entry) => entry.sessionId));
  for (const entry of calendar.entries.filter((candidate) => candidate.status === "MISSED" && candidate.semanticObjectType.toUpperCase().includes("TRAINING"))) {
    if (sessionIds.has(entry.semanticObjectId)) continue;
    history.push({
      sessionId: entry.semanticObjectId,
      localDate: entry.localDate,
      status: "MISSED",
      planRevisionId: null,
      durationMinutes: null,
      exerciseIds: [],
      totalSets: 0,
    });
    sessionIds.add(entry.semanticObjectId);
  }
  return history.sort((left, right) => left.localDate.localeCompare(right.localDate) || left.sessionId.localeCompare(right.sessionId));
}

export class TrainingRuntimeInputBuilder {
  private readonly sources: TrainingRuntimeDataSources;

  public constructor(sources: TrainingRuntimeDataSources) {
    this.sources = sources;
  }

  public async build(userId: string, generatedAt = new Date().toISOString()): Promise<TrainingRuntimeInputResult> {
    const owner = userId.trim();
    if (!owner) throw new Error("training_runtime_user_required");
    if (!Number.isFinite(Date.parse(generatedAt))) throw new Error("training_runtime_time_invalid");
    const normalizedTime = new Date(generatedAt).toISOString();
    const [profileResult, setup, calendar] = await Promise.all([
      this.sources.profileFor(owner),
      this.sources.setupFor(owner),
      this.sources.calendarFor(owner),
    ]);
    const profile = buildTrainingProfile(owner, profileResult, setup);
    const timezone = text(profileResult?.profile.timeZone) || text(profileResult?.profile.timezone) || "UTC";
    const band = policyBand(text(profileResult?.profile.dateOfBirth), normalizedTime);
    const missingFields = [...profile.unknownFields];
    if (!profileResult) missingFields.push("coreProfile");
    if (band === "UNKNOWN") missingFields.push("policyBand");
    if (!calendar) missingFields.push("calendarAvailability");
    if (missingFields.length > 0) {
      return {
        status: "MISSING_INFORMATION",
        partialProfile: profile,
        action: {
          type: "TRAINING_SETUP",
          missingFields: [...new Set(missingFields)].sort(),
          reasonCodes: ["TRAINING_SETUP_REQUIRED", "UNKNOWN_REMAINS_UNKNOWN"],
        },
      };
    }

    const localDate = localDateFor(normalizedTime, timezone);
    const [canonicalHistory, wellness] = await Promise.all([
      this.sources.canonicalHistoryFor(owner),
      this.sources.wellnessFor(owner, localDate),
    ]);
    const history = mergeCanonicalHistoryWithMissedCalendar(canonicalHistory, calendar!);
    return {
      status: "READY",
      input: {
        profile,
        policyBand: band,
        readiness: readinessFromWellness(wellness, setup!.limitationCodes),
        history,
        availability: calendarAvailability(profile, calendar!, normalizedTime, timezone),
        calendarRevision: calendar!.revision?.revision ?? 0,
      },
    };
  }
}
