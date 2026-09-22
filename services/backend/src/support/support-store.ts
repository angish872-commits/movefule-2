import { randomUUID } from "node:crypto";
import { ContractError } from "../shared/contracts.ts";
import type { OwnerScopedRepository } from "../foundation/repository.ts";

export type SupportTicket = {
  ticketId: string;
  userId: string;
  category: string;
  subject: string;
  bodyRedacted: string;
  safeContextJson: string;
  state: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
};

function redactSecrets(value: string): string {
  return value
    .replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|AIza[A-Za-z0-9_-]{20,})\b/g, "[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*\b/gi, "Bearer [redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[redacted]")
    .replace(/\b(?:api[_ -]?key|token|secret|password)\s*[:=]\s*[^\s,;]{8,}/gi, (match) => `${match.split(/[:=]/, 1)[0]}=[redacted]`);
}

function safeText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new ContractError(`invalid_${field}`, `${field} is required and must be at most ${max} characters.`);
  }
  return redactSecrets(value.trim());
}

const SAFE_CONTEXT_KEYS = new Set([
  "screen", "appVersion", "buildType", "osVersion", "deviceClass", "watchConnected",
  "networkState", "syncState", "feature", "errorCode", "correlationId",
]);

function safeContext(value: unknown): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, string | number | boolean | null> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!SAFE_CONTEXT_KEYS.has(key)) continue;
    if (typeof raw === "string") result[key] = redactSecrets(raw.slice(0, 200));
    else if (typeof raw === "number" && Number.isFinite(raw)) result[key] = raw;
    else if (typeof raw === "boolean" || raw === null) result[key] = raw;
  }
  return result;
}

export class SupportTicketStore {
  private readonly local = new Map<string, SupportTicket>();
  async create(userId: string, input: { category: unknown; subject: unknown; body: unknown; safeContext?: unknown }, repository?: OwnerScopedRepository): Promise<SupportTicket> {
    const owner = safeText(userId, "user_id", 128);
    const now = new Date().toISOString();
    const ticket: SupportTicket = {
      ticketId: `ticket-${randomUUID()}`,
      userId: owner,
      category: safeText(input.category, "category", 64),
      subject: safeText(input.subject, "subject", 160),
      bodyRedacted: safeText(input.body, "body", 4000),
      safeContextJson: JSON.stringify(safeContext(input.safeContext)),
      state: "OPEN",
      createdAt: now,
      updatedAt: now,
    };
    if (repository) return await repository.createOwned("support_ticket", owner, ticket.ticketId, ticket) as unknown as SupportTicket;
    this.local.set(`${owner}:${ticket.ticketId}`, ticket);
    return structuredClone(ticket);
  }
}
