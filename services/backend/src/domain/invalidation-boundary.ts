export type CanonicalInvalidationDomain =
  | "CALENDAR"
  | "TODAY"
  | "WORKOUT_SUMMARY"
  | "TRAINING_PROGRESSION"
  | "NUTRITION_LEDGER"
  | "NUTRITION"
  | "MEAL";

export type CanonicalInvalidation = {
  userId: string;
  domain: CanonicalInvalidationDomain;
  sourceType: "CALENDAR" | "WORKOUT" | "MEAL";
  sourceId: string;
  sourceRevision: number;
  operationId: string;
  reasonCode: string;
  invalidatedAt: string;
};

export type CanonicalInvalidationListener =
  (event: CanonicalInvalidation) => void | Promise<void>;

/**
 * Cross-domain handoff only. It never recalculates Today, progression or
 * nutrition; those owners subscribe and rebuild their own projections.
 * The latest dirty marker is retained for the process lifetime so an accepted
 * mutation cannot be mistaken for a clean projection inside this runtime.
 */
export class CanonicalInvalidationBoundary {
  private readonly dirty = new Map<string, CanonicalInvalidation>();
  private readonly listeners = new Set<CanonicalInvalidationListener>();

  private readonly now: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  async markDirty(input: Omit<CanonicalInvalidation, "invalidatedAt">): Promise<CanonicalInvalidation> {
    const event: CanonicalInvalidation = { ...input, invalidatedAt: this.now().toISOString() };
    this.dirty.set(`${event.userId}:${event.domain}`, event);
    for (const listener of this.listeners) await listener(event);
    return event;
  }

  getDirty(userId: string, domain: CanonicalInvalidationDomain): CanonicalInvalidation | null {
    return this.dirty.get(`${userId}:${domain}`) ?? null;
  }

  clearIfCurrent(userId: string, domain: CanonicalInvalidationDomain, operationId: string): boolean {
    const key = `${userId}:${domain}`;
    const current = this.dirty.get(key);
    if (!current || current.operationId !== operationId) return false;
    this.dirty.delete(key);
    return true;
  }

  subscribe(listener: CanonicalInvalidationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
