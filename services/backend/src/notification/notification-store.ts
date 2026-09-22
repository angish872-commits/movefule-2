import { randomUUID } from "node:crypto";
import { ContractError } from "../shared/contracts.ts";
import type { OwnerScopedRepository, RepositoryRow } from "../foundation/repository.ts";

export type MoveFuelNotification = {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  deepLink: string;
  objectId: string;
  priority: "LOW" | "NORMAL" | "HIGH";
  createdAt: string;
  readAt: string | null;
  expiresAt: string | null;
};

export interface NotificationStoreLike {
  list(userId: string, unreadOnly?: boolean): Promise<MoveFuelNotification[]> | MoveFuelNotification[];
  markRead(userId: string, notificationId: string): Promise<MoveFuelNotification> | MoveFuelNotification;
  create(userId: string, input: Omit<MoveFuelNotification, "notificationId" | "userId" | "createdAt" | "readAt">): Promise<MoveFuelNotification> | MoveFuelNotification;
}

const owner = (value: string): string => {
  const result = value?.trim();
  if (!result) throw new ContractError("invalid_user_id", "An authenticated user is required.");
  return result;
};
const id = (value: string): string => {
  const result = value?.trim();
  if (!result) throw new ContractError("invalid_notification_id", "notificationId is required.");
  return result;
};

export class LocalNotificationStore implements NotificationStoreLike {
  private readonly rows = new Map<string, MoveFuelNotification>();
  create(userId: string, input: Omit<MoveFuelNotification, "notificationId" | "userId" | "createdAt" | "readAt">): MoveFuelNotification {
    const user = owner(userId);
    const row: MoveFuelNotification = {
      ...input,
      notificationId: `notification-${randomUUID()}`,
      userId: user,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    this.rows.set(`${user}:${row.notificationId}`, row);
    return structuredClone(row);
  }
  list(userId: string, unreadOnly = false): MoveFuelNotification[] {
    const user = owner(userId);
    return [...this.rows.values()]
      .filter((row) => row.userId === user && (!unreadOnly || row.readAt === null))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((row) => structuredClone(row));
  }
  markRead(userId: string, notificationId: string): MoveFuelNotification {
    const user = owner(userId);
    const key = `${user}:${id(notificationId)}`;
    const row = this.rows.get(key);
    if (!row) throw new ContractError("notification_not_found", "Notification not found.");
    if (!row.readAt) row.readAt = new Date().toISOString();
    this.rows.set(key, row);
    return structuredClone(row);
  }
}

export class AppwriteNotificationStore implements NotificationStoreLike {
  private readonly repository: OwnerScopedRepository;
  constructor(repository: OwnerScopedRepository) { this.repository = repository; }
  async create(userId: string, input: Omit<MoveFuelNotification, "notificationId" | "userId" | "createdAt" | "readAt">): Promise<MoveFuelNotification> {
    const user = owner(userId);
    const notificationId = `notification-${randomUUID()}`;
    const data = {
      notificationId, userId: user, type: input.type, title: input.title, body: input.body,
      deepLink: input.deepLink, objectId: input.objectId, priority: input.priority,
      createdAt: new Date().toISOString(), readAt: null, expiresAt: input.expiresAt,
    };
    const row = await this.repository.createOwned("notification", user, notificationId, data);
    return row as unknown as MoveFuelNotification;
  }
  async list(userId: string, unreadOnly = false): Promise<MoveFuelNotification[]> {
    const user = owner(userId);
    const result = await this.repository.listOwned("notification", user, { limit: 100 });
    return result.rows
      .map((row) => row as unknown as MoveFuelNotification)
      .filter((row) => !unreadOnly || !row.readAt)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  async markRead(userId: string, notificationId: string): Promise<MoveFuelNotification> {
    const user = owner(userId);
    const notification = id(notificationId);
    const existing = await this.repository.getOwned("notification", user, notification);
    if (!existing) throw new ContractError("notification_not_found", "Notification not found.");
    if (existing.readAt) return existing as unknown as MoveFuelNotification;
    return await this.repository.updateOwned("notification", user, notification, { readAt: new Date().toISOString() }) as unknown as MoveFuelNotification;
  }
}
