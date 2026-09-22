import { sha256 } from "../domain/sync-store.ts";
import type { OwnerScopedRepository, RepositoryRow } from "./repository.ts";

export type ConsentRecordInput = {
  consentType: string;
  documentVersion: string;
  choice: "GRANTED" | "DENIED";
  jurisdiction?: string;
  sourcePlatform: string;
};

export type StoredConsentRecord = ConsentRecordInput & {
  consentId: string;
  userId: string;
  recordedAt: string;
  revokedAt: string | null;
};

export class ConsentContractError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = "ConsentContractError";
    this.code = code;
  }
}

function nonEmpty(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > maxLength) {
    throw new ConsentContractError(`invalid_${field}`, `${field} must be a non-empty string of at most ${maxLength} characters.`);
  }
  return value.trim();
}

export function parseConsentRecords(value: unknown): ConsentRecordInput[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 16) {
    throw new ConsentContractError("invalid_consents", "consents must contain between 1 and 16 records.");
  }
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ConsentContractError("invalid_consent", "Each consent record must be an object.");
    }
    const record = item as Record<string, unknown>;
    const choice = record.choice;
    if (choice !== "GRANTED" && choice !== "DENIED") {
      throw new ConsentContractError("invalid_consent_choice", "choice must be GRANTED or DENIED.");
    }
    return {
      consentType: nonEmpty(record.consentType, "consent_type", 64),
      documentVersion: nonEmpty(record.documentVersion, "document_version", 64),
      choice,
      ...(record.jurisdiction === undefined ? {} : { jurisdiction: nonEmpty(record.jurisdiction, "jurisdiction", 64) }),
      sourcePlatform: nonEmpty(record.sourcePlatform, "source_platform", 32),
    };
  });
}

/**
 * Persists versioned consent records behind the authenticated owner boundary.
 * Repeating the same user/type/version is an idempotent update, so an offline
 * retry cannot create duplicate legal state. No secrets or raw device data are
 * accepted by this service.
 */
export class OnboardingConsentService {
  private readonly localRows = new Map<string, StoredConsentRecord>();

  public async save(
    userId: string,
    records: readonly ConsentRecordInput[],
    repository?: OwnerScopedRepository,
  ): Promise<{ userId: string; source: "appwrite" | "local_fixture"; consents: StoredConsentRecord[] }> {
    if (!userId.trim()) throw new ConsentContractError("invalid_user", "An authenticated user is required.");
    const saved: StoredConsentRecord[] = [];
    for (const record of records) {
      const consentId = `consent-${sha256({ userId, consentType: record.consentType, documentVersion: record.documentVersion }).slice(0, 48)}`;
      const now = new Date().toISOString();
      const row: StoredConsentRecord = {
        ...record,
        consentId,
        userId,
        recordedAt: now,
        revokedAt: null,
      };
      if (repository) {
        const existing = await repository.getOwned<StoredConsentRecord>("consent_record", userId, consentId);
        const stored = existing
          ? await repository.updateOwned<StoredConsentRecord>("consent_record", userId, consentId, row)
          : await repository.createOwned<StoredConsentRecord>("consent_record", userId, consentId, row);
        saved.push(stored);
      } else {
        this.localRows.set(`${userId}:${consentId}`, row);
        saved.push(row);
      }
    }
    return { userId, source: repository ? "appwrite" : "local_fixture", consents: saved };
  }
}
