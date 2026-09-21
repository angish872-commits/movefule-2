import type {
  AlgorithmContext,
  AlgorithmResult,
  EvidenceRef,
} from "../core/contracts";

export interface SyncEvent<T> {
  eventId: string;
  userId: string;
  deviceId: string;
  clientSequence: number;
  entityId: string;
  entityRevision: number;
  payload: T;
}

export interface SyncState {
  lastAcceptedSequenceByDevice: Record<string, number>;
  latestRevisionByEntity: Record<string, number>;
  acceptedEventIds: ReadonlySet<string>;
}

export type SyncDecision = "ACCEPT" | "DUPLICATE" | "STALE" | "WRONG_OWNER";

export interface SyncResolution<T> {
  decision: SyncDecision;
  event: SyncEvent<T>;
  reasonCode: string;
}

/**
 * Canonical retry-safe sync gate for phone/watch facts.
 */
export function reconcileSyncEvent<T>(
  context: AlgorithmContext,
  state: SyncState,
  event: SyncEvent<T>,
  evidence: EvidenceRef[] = [],
): AlgorithmResult<SyncResolution<T>> {
  if (event.userId !== context.userId) {
    return {
      algorithmId: "MF-121",
      status: "STOP",
      output: {
        decision: "WRONG_OWNER",
        event,
        reasonCode: "SYNC_USER_OWNERSHIP_MISMATCH",
      },
      reasonCodes: ["SYNC_USER_OWNERSHIP_MISMATCH"],
      evidence,
      versions: context.versions,
      generatedAt: context.now,
    };
  }

  if (state.acceptedEventIds.has(event.eventId)) {
    return {
      algorithmId: "MF-119",
      status: "SUCCESS",
      output: {
        decision: "DUPLICATE",
        event,
        reasonCode: "SYNC_IDEMPOTENT_DUPLICATE",
      },
      reasonCodes: ["SYNC_IDEMPOTENT_DUPLICATE"],
      evidence,
      versions: context.versions,
      generatedAt: context.now,
    };
  }

  const lastSequence = state.lastAcceptedSequenceByDevice[event.deviceId] ?? -1;
  const latestRevision = state.latestRevisionByEntity[event.entityId] ?? -1;

  if (
    event.clientSequence <= lastSequence ||
    event.entityRevision < latestRevision
  ) {
    return {
      algorithmId: "MF-120",
      status: "PARTIAL",
      output: {
        decision: "STALE",
        event,
        reasonCode: "SYNC_STALE_EVENT_REJECTED",
      },
      reasonCodes: ["SYNC_STALE_EVENT_REJECTED"],
      evidence,
      versions: context.versions,
      generatedAt: context.now,
    };
  }

  return {
    algorithmId: "MF-122",
    status: "SUCCESS",
    output: {
      decision: "ACCEPT",
      event,
      reasonCode: "SYNC_EVENT_ACCEPTED",
    },
    reasonCodes: ["SYNC_EVENT_ACCEPTED"],
    evidence,
    versions: context.versions,
    generatedAt: context.now,
  };
}
