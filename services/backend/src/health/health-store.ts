import { sha256 } from "../domain/sync-store.ts";
import { ContractError } from "../shared/contracts.ts";
import type { OwnerScopedRepository, RepositoryRow } from "../foundation/repository.ts";

export type HealthPlatform = "android_health_connect" | "samsung_health" | "apple_health" | "manual";

export type HealthSampleInput = {
  localDate: string;
  value: number;
  unit: string;
  measuredStart: string;
  measuredEnd: string;
  sourceDevice?: string;
};

export type HealthConnection = {
  connectionId: string;
  userId: string;
  platform: HealthPlatform;
  sourceName: string;
  permissionState: "GRANTED" | "DENIED" | "PARTIAL";
  lastSuccessAt?: string;
  lastErrorCode?: string;
  revision: number;
  updatedAt: string;
};

export type HealthSampleSummary = {
  summaryId: string;
  userId: string;
  localDate: string;
  dataType: string;
  value: number;
  unit: string;
  sourcePlatform: HealthPlatform;
  sourceDevice?: string;
  provenanceHash: string;
  revision: number;
  measuredStart: string;
  measuredEnd: string;
};

export type HealthImportInput = {
  connectionId: string;
  platform: HealthPlatform;
  sourceName: string;
  permissionState: "GRANTED" | "DENIED" | "PARTIAL";
  dataType: string;
  samples: unknown;
  /** A caller-protected cursor token. The local projection stores only a hash. */
  cursorToken?: string;
};

export type HealthImportResult = {
  connection: HealthConnection;
  imported: number;
  duplicates: number;
  summaries: HealthSampleSummary[];
  cursorStored: boolean;
  cursorMetadata?: { cursorHash: string; lastWindowEnd: string };
};

export type HealthGapAssessment = {
  userId: string;
  localDate: string;
  dataType: string;
  status: "MISSING" | "OBSERVED" | "PARTIAL" | "COVERED";
  observedSummaryCount: number;
  observedStart?: string;
  observedEnd?: string;
  expectedStart?: string;
  expectedEnd?: string;
};

export interface HealthStoreLike {
  import(userId: string, input: HealthImportInput): HealthImportResult | Promise<HealthImportResult>;
  listConnections(userId: string): HealthConnection[] | Promise<HealthConnection[]>;
  listSummaries(userId: string, localDate?: string, dataType?: string): HealthSampleSummary[] | Promise<HealthSampleSummary[]>;
  assessGap(userId: string, input: { localDate: string; dataType: string; expectedStart?: string; expectedEnd?: string }): HealthGapAssessment | Promise<HealthGapAssessment>;
}

const MAX_SAMPLES_PER_IMPORT = 500;
const VALID_PLATFORMS = new Set<HealthPlatform>([
  "android_health_connect",
  "samsung_health",
  "apple_health",
  "manual",
]);

const clone = <T>(value: T): T => structuredClone(value);

function requireString(value: unknown, code: string, message: string, maxLength = 128): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > maxLength) {
    throw new ContractError(code, message);
  }
  return value.trim();
}

function requireLocalDate(value: unknown): string {
  const date = requireString(value, "invalid_health_date", "localDate is required.", 32);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ContractError("invalid_health_date", "localDate must use YYYY-MM-DD.");
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== (month ?? 0) - 1 || parsed.getUTCDate() !== day) {
    throw new ContractError("invalid_health_date", "localDate is not a real calendar date.");
  }
  return date;
}

function requireTimestamp(value: unknown, field: string): string {
  const timestamp = requireString(value, `invalid_${field}`, `${field} is required.`, 64);
  if (!Number.isFinite(Date.parse(timestamp))) throw new ContractError(`invalid_${field}`, `${field} must be an ISO timestamp.`);
  return new Date(timestamp).toISOString();
}

function requireSamples(value: unknown): HealthSampleInput[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SAMPLES_PER_IMPORT) {
    throw new ContractError("invalid_health_samples", `samples must contain 1-${MAX_SAMPLES_PER_IMPORT} items.`);
  }
  return value.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ContractError("invalid_health_sample", "Each health sample must be an object.");
    const sample = raw as Record<string, unknown>;
    if (typeof sample.value !== "number" || !Number.isFinite(sample.value) || sample.value < 0) {
      throw new ContractError("invalid_health_value", "Health sample value must be a finite non-negative number.");
    }
    const measuredStart = requireTimestamp(sample.measuredStart, "measured_start");
    const measuredEnd = requireTimestamp(sample.measuredEnd, "measured_end");
    if (Date.parse(measuredEnd) < Date.parse(measuredStart)) {
      throw new ContractError("invalid_health_window", "measuredEnd cannot be before measuredStart.");
    }
    return {
      localDate: requireLocalDate(sample.localDate),
      value: sample.value,
      unit: requireString(sample.unit, "invalid_health_unit", "unit is required.", 32),
      measuredStart,
      measuredEnd,
      ...(sample.sourceDevice === undefined ? {} : { sourceDevice: requireString(sample.sourceDevice, "invalid_health_device", "sourceDevice is invalid.") }),
    };
  });
}

/**
 * Deterministic health projection. Raw provider samples are validated and
 * discarded after producing provenance-bearing summaries; credentials and
 * provider-specific cursors never cross this boundary.
 */
export class HealthStore implements HealthStoreLike {
  private readonly connections = new Map<string, HealthConnection>();
  private readonly cursors = new Map<string, { cursorHash: string; lastWindowEnd: string; updatedAt: string }>();
  private readonly summaries = new Map<string, HealthSampleSummary>();
  private readonly now: () => number;

  constructor(options: { now?: () => number } = {}) {
    this.now = options.now ?? (() => Date.now());
  }

  import(userId: string, input: HealthImportInput): HealthImportResult {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const connectionId = requireString(input.connectionId, "invalid_connection_id", "connectionId is required.");
    const sourceName = requireString(input.sourceName, "invalid_health_source", "sourceName is required.", 64);
    if (!VALID_PLATFORMS.has(input.platform)) throw new ContractError("invalid_health_platform", "platform is unsupported.");
    if (!['GRANTED', 'DENIED', 'PARTIAL'].includes(input.permissionState)) {
      throw new ContractError("invalid_health_permission", "permissionState is invalid.");
    }
    const dataType = requireString(input.dataType, "invalid_health_data_type", "dataType is required.", 64);
    if (!/^[a-z][a-z0-9_.-]*$/.test(dataType)) throw new ContractError("invalid_health_data_type", "dataType has an invalid format.");
    const samples = requireSamples(input.samples);
    if (input.permissionState === "DENIED" && samples.length > 0) {
      throw new ContractError("health_permission_denied", "Health samples cannot be imported while permission is denied.");
    }
    const now = new Date(this.now()).toISOString();
    const connectionKey = `${owner}:${connectionId}`;
    const priorConnection = this.connections.get(connectionKey);
    const connection: HealthConnection = {
      connectionId,
      userId: owner,
      platform: input.platform,
      sourceName,
      permissionState: input.permissionState,
      ...(samples.length > 0 && input.permissionState !== "DENIED" ? { lastSuccessAt: now } : {}),
      ...(input.permissionState === "DENIED" ? { lastErrorCode: "permission_denied" } : {}),
      revision: (priorConnection?.revision ?? 0) + 1,
      updatedAt: now,
    };
    this.connections.set(connectionKey, connection);

    let imported = 0;
    let duplicates = 0;
    const importedSummaries: HealthSampleSummary[] = [];
    for (const sample of samples) {
      const provenanceHash = sha256({ owner, connectionId, dataType, ...sample });
      const summaryId = `health-${provenanceHash.slice(0, 48)}`;
      const summary: HealthSampleSummary = {
        summaryId,
        userId: owner,
        localDate: sample.localDate,
        dataType,
        value: sample.value,
        unit: sample.unit,
        sourcePlatform: input.platform,
        ...(sample.sourceDevice === undefined ? {} : { sourceDevice: sample.sourceDevice }),
        provenanceHash,
        revision: 1,
        measuredStart: sample.measuredStart,
        measuredEnd: sample.measuredEnd,
      };
      if (this.summaries.has(`${owner}:${summaryId}`)) {
        duplicates += 1;
        continue;
      }
      this.summaries.set(`${owner}:${summaryId}`, summary);
      imported += 1;
      importedSummaries.push(clone(summary));
    }

    let cursorStored = false;
    let cursorMetadata: HealthImportResult["cursorMetadata"];
    if (input.cursorToken !== undefined) {
      const cursorToken = requireString(input.cursorToken, "invalid_health_cursor", "cursorToken is invalid.", 2048);
      const lastWindowEnd = samples.reduce((latest, sample) => Math.max(latest, Date.parse(sample.measuredEnd)), 0);
      cursorMetadata = {
        cursorHash: sha256({ owner, connectionId, dataType, cursorToken }),
        lastWindowEnd: new Date(lastWindowEnd || this.now()).toISOString(),
      };
      this.cursors.set(`${owner}:${connectionId}:${dataType}`, {
        cursorHash: cursorMetadata.cursorHash,
        lastWindowEnd: cursorMetadata.lastWindowEnd,
        updatedAt: now,
      });
      cursorStored = true;
    }
    return {
      connection: clone(connection),
      imported,
      duplicates,
      summaries: importedSummaries,
      cursorStored,
      ...(cursorMetadata ? { cursorMetadata } : {}),
    };
  }

  listConnections(userId: string): HealthConnection[] {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    return [...this.connections.values()].filter((connection) => connection.userId === owner).map(clone);
  }

  listSummaries(userId: string, localDate?: string, dataType?: string): HealthSampleSummary[] {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const date = localDate === undefined ? undefined : requireLocalDate(localDate);
    return [...this.summaries.values()]
      .filter((summary) => summary.userId === owner && (date === undefined || summary.localDate === date) && (dataType === undefined || summary.dataType === dataType))
      .map(clone)
      .sort((left, right) => right.measuredEnd.localeCompare(left.measuredEnd));
  }

  assessGap(userId: string, input: { localDate: string; dataType: string; expectedStart?: string; expectedEnd?: string }): HealthGapAssessment {
    const owner = requireString(userId, "invalid_user_id", "userId is required.");
    const localDate = requireLocalDate(input.localDate);
    const dataType = requireString(input.dataType, "invalid_health_data_type", "dataType is required.", 64);
    const summaries = this.listSummaries(owner, localDate, dataType);
    const observedStart = summaries.map((summary) => summary.measuredStart).sort()[0];
    const observedEnd = summaries.map((summary) => summary.measuredEnd).sort().at(-1);
    if (summaries.length === 0) return { userId: owner, localDate, dataType, status: "MISSING", observedSummaryCount: 0 };
    if (input.expectedStart === undefined || input.expectedEnd === undefined) {
      return { userId: owner, localDate, dataType, status: "OBSERVED", observedSummaryCount: summaries.length, observedStart, observedEnd };
    }
    const expectedStart = requireTimestamp(input.expectedStart, "expected_start");
    const expectedEnd = requireTimestamp(input.expectedEnd, "expected_end");
    if (Date.parse(expectedEnd) < Date.parse(expectedStart)) throw new ContractError("invalid_health_window", "expectedEnd cannot be before expectedStart.");
    const covered = Date.parse(observedStart ?? expectedStart) <= Date.parse(expectedStart) && Date.parse(observedEnd ?? expectedEnd) >= Date.parse(expectedEnd);
    return { userId: owner, localDate, dataType, status: covered ? "COVERED" : "PARTIAL", observedSummaryCount: summaries.length, observedStart, observedEnd, expectedStart, expectedEnd };
  }
}

type HealthConnectionRow = {
  connectionId: string;
  userId: string;
  platform: string;
  sourceName: string;
  permissionStateJson: string;
  lastSuccessAt?: string;
  lastErrorCode?: string;
  revision: number;
  updatedAt: string;
};

type HealthCursorRow = {
  cursorId: string;
  userId: string;
  connectionId: string;
  dataType: string;
  opaqueCursorEncrypted?: string;
  lastWindowEnd?: string;
  updatedAt: string;
};

type HealthSummaryRow = {
  summaryId: string;
  userId: string;
  localDate: string;
  dataType: string;
  value: number;
  unit: string;
  sourcePlatform: string;
  sourceDevice?: string;
  provenanceHash: string;
  revision: number;
  measuredStart: string;
  measuredEnd: string;
};

function row<T extends Record<string, unknown>>(value: RepositoryRow<T>): T {
  return value as T;
}

function parsePermission(value: string): HealthConnection["permissionState"] {
  try {
    const parsed = JSON.parse(value) as { state?: unknown };
    if (parsed.state === "GRANTED" || parsed.state === "DENIED" || parsed.state === "PARTIAL") return parsed.state;
  } catch { /* fall through to a safe denied state */ }
  return "DENIED";
}

/** Appwrite-backed projection for authenticated sessions; it stores no raw provider samples. */
export class AppwriteHealthProjectionStore implements HealthStoreLike {
  private readonly repository: OwnerScopedRepository;
  private readonly now: () => number;

  constructor(repository: OwnerScopedRepository, options: { now?: () => number } = {}) {
    this.repository = repository;
    this.now = options.now ?? (() => Date.now());
  }

  async import(userId: string, input: HealthImportInput): Promise<HealthImportResult> {
    const local = new HealthStore({ now: this.now });
    const projected = local.import(userId, input);
    const connectionId = input.connectionId;
    const timestamp = new Date(this.now()).toISOString();
    const existingConnection = await this.repository.getOwned<HealthConnectionRow>("health_connection", userId, connectionId);
    const connection: HealthConnection = {
      ...projected.connection,
      revision: Number(existingConnection?.revision ?? 0) + 1,
      updatedAt: timestamp,
    };
    const connectionData: HealthConnectionRow = {
      connectionId: connection.connectionId,
      userId,
      platform: connection.platform,
      sourceName: connection.sourceName,
      permissionStateJson: JSON.stringify({ state: connection.permissionState }),
      ...(connection.lastSuccessAt ? { lastSuccessAt: connection.lastSuccessAt } : {}),
      ...(connection.lastErrorCode ? { lastErrorCode: connection.lastErrorCode } : {}),
      revision: connection.revision,
      updatedAt: connection.updatedAt,
    };
    if (existingConnection) await this.repository.updateOwned("health_connection", userId, connectionId, connectionData);
    else await this.repository.createOwned("health_connection", userId, connectionId, connectionData);

    const summaries: HealthSampleSummary[] = [];
    let duplicates = 0;
    for (const summary of projected.summaries) {
      const existing = await this.repository.getOwned<HealthSummaryRow>("health_sample_summary", userId, summary.summaryId);
      if (existing) {
        duplicates += 1;
        continue;
      }
      await this.repository.createOwned<HealthSummaryRow>("health_sample_summary", userId, summary.summaryId, {
        summaryId: summary.summaryId,
        userId,
        localDate: summary.localDate,
        dataType: summary.dataType,
        value: summary.value,
        unit: summary.unit,
        sourcePlatform: summary.sourcePlatform,
        ...(summary.sourceDevice ? { sourceDevice: summary.sourceDevice } : {}),
        provenanceHash: summary.provenanceHash,
        revision: summary.revision,
        measuredStart: summary.measuredStart,
        measuredEnd: summary.measuredEnd,
      });
      summaries.push(summary);
    }

    if (projected.cursorMetadata) {
      const cursorId = `cursor-${sha256({ userId, connectionId, dataType: input.dataType }).slice(0, 48)}`;
      const existingCursor = await this.repository.getOwned<HealthCursorRow>("health_import_cursor", userId, cursorId);
      const cursorData: HealthCursorRow = {
        cursorId,
        userId,
        connectionId,
        dataType: input.dataType,
        opaqueCursorEncrypted: projected.cursorMetadata.cursorHash,
        lastWindowEnd: projected.cursorMetadata.lastWindowEnd,
        updatedAt: timestamp,
      };
      if (existingCursor) await this.repository.updateOwned("health_import_cursor", userId, cursorId, cursorData);
      else await this.repository.createOwned("health_import_cursor", userId, cursorId, cursorData);
    }
    return {
      connection,
      imported: summaries.length,
      duplicates: projected.duplicates + duplicates,
      summaries,
      cursorStored: projected.cursorStored,
      ...(projected.cursorMetadata ? { cursorMetadata: projected.cursorMetadata } : {}),
    };
  }

  async listConnections(userId: string): Promise<HealthConnection[]> {
    const result = await this.repository.listOwned<HealthConnectionRow>("health_connection", userId, { limit: 100 });
    return result.rows.map((value) => {
      const data = row(value);
      return {
        connectionId: data.connectionId,
        userId: data.userId,
        platform: data.platform as HealthPlatform,
        sourceName: data.sourceName,
        permissionState: parsePermission(data.permissionStateJson),
        ...(data.lastSuccessAt ? { lastSuccessAt: data.lastSuccessAt } : {}),
        ...(data.lastErrorCode ? { lastErrorCode: data.lastErrorCode } : {}),
        revision: data.revision,
        updatedAt: data.updatedAt,
      };
    });
  }

  async listSummaries(userId: string, localDate?: string, dataType?: string): Promise<HealthSampleSummary[]> {
    const result = await this.repository.listOwned<HealthSummaryRow>("health_sample_summary", userId, {
      queries: [
        ...(localDate ? [{ field: "localDate", operator: "equal" as const, value: localDate }] : []),
        ...(dataType ? [{ field: "dataType", operator: "equal" as const, value: dataType }] : []),
      ],
      limit: 500,
    });
    return result.rows.map((value) => {
      const data = row(value);
      return {
        summaryId: data.summaryId,
        userId: data.userId,
        localDate: data.localDate,
        dataType: data.dataType,
        value: data.value,
        unit: data.unit,
        sourcePlatform: data.sourcePlatform as HealthPlatform,
        ...(data.sourceDevice ? { sourceDevice: data.sourceDevice } : {}),
        provenanceHash: data.provenanceHash,
        revision: data.revision,
        measuredStart: data.measuredStart,
        measuredEnd: data.measuredEnd,
      };
    }).sort((left, right) => right.measuredEnd.localeCompare(left.measuredEnd));
  }

  async assessGap(userId: string, input: { localDate: string; dataType: string; expectedStart?: string; expectedEnd?: string }): Promise<HealthGapAssessment> {
    const summaries = await this.listSummaries(userId, input.localDate, input.dataType);
    const observedStart = summaries.map((summary) => summary.measuredStart).sort()[0];
    const observedEnd = summaries.map((summary) => summary.measuredEnd).sort().at(-1);
    if (summaries.length === 0) return { userId, localDate: input.localDate, dataType: input.dataType, status: "MISSING", observedSummaryCount: 0 };
    if (input.expectedStart === undefined || input.expectedEnd === undefined) return { userId, localDate: input.localDate, dataType: input.dataType, status: "OBSERVED", observedSummaryCount: summaries.length, observedStart, observedEnd };
    const expectedStart = requireTimestamp(input.expectedStart, "expected_start");
    const expectedEnd = requireTimestamp(input.expectedEnd, "expected_end");
    if (Date.parse(expectedEnd) < Date.parse(expectedStart)) throw new ContractError("invalid_health_window", "expectedEnd cannot be before expectedStart.");
    const covered = Date.parse(observedStart ?? expectedStart) <= Date.parse(expectedStart) && Date.parse(observedEnd ?? expectedEnd) >= Date.parse(expectedEnd);
    return { userId, localDate: input.localDate, dataType: input.dataType, status: covered ? "COVERED" : "PARTIAL", observedSummaryCount: summaries.length, observedStart, observedEnd, expectedStart, expectedEnd };
  }
}
