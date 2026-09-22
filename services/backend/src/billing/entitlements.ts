import { ContractError } from "../shared/contracts.ts";

export const ENTITLEMENT_STATES = [
  "FREE",
  "TRIAL",
  "PREMIUM_ACTIVE",
  "EXPIRED",
  "CANCELLED",
] as const;

export type EntitlementState = (typeof ENTITLEMENT_STATES)[number];

export type EntitlementSnapshot = {
  userId: string;
  state: EntitlementState;
  premium: boolean;
  provider: "mock" | "google_play" | "app_store" | "stripe";
  mode: "demo" | "production";
  updatedAtEpochMillis: number;
};

export interface EntitlementProvider {
  readonly mode: "demo" | "production";
  readonly provider: EntitlementSnapshot["provider"];
  get(userId: string): EntitlementSnapshot;
}

function parseState(value: string | undefined): EntitlementState {
  const state = value?.trim().toUpperCase() as EntitlementState | undefined;
  if (!state) return "FREE";
  if (!ENTITLEMENT_STATES.includes(state)) {
    throw new ContractError("invalid_development_entitlement_state", "The configured mock entitlement state is unsupported.");
  }
  return state;
}

function isPremium(state: EntitlementState): boolean {
  return state === "TRIAL" || state === "PREMIUM_ACTIVE";
}

/**
 * Deterministic local provider. It never talks to a store and never accepts
 * card, purchase-token, or signed-payload data. A real provider can replace
 * this interface without changing the HTTP contract.
 */
export class LocalDevelopmentEntitlementProvider implements EntitlementProvider {
  readonly mode = "demo" as const;
  readonly provider = "mock" as const;
  private readonly defaultState: EntitlementState;
  private readonly overrides = new Map<string, EntitlementState>();

  constructor(defaultState = parseState(process.env.MOVEFUEL_LOCAL_ENTITLEMENT_STATE)) {
    this.defaultState = defaultState;
  }

  get(userId: string): EntitlementSnapshot {
    if (!userId.trim()) throw new ContractError("invalid_user_id", "userId is required.");
    const state = this.overrides.get(userId) ?? this.defaultState;
    return {
      userId,
      state,
      premium: isPremium(state),
      provider: this.provider,
      mode: this.mode,
      updatedAtEpochMillis: Date.now(),
    };
  }

  /** Test/demo-only state switch; no public HTTP route exposes this mutation. */
  setStateForTests(userId: string, state: EntitlementState): void {
    if (!userId.trim()) throw new ContractError("invalid_user_id", "userId is required.");
    this.overrides.set(userId, state);
  }
}

export function isEntitlementState(value: unknown): value is EntitlementState {
  return typeof value === "string" && (ENTITLEMENT_STATES as readonly string[]).includes(value);
}
