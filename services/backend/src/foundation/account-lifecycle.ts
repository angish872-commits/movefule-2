import { FOUNDATION_PERMISSION_DECLARATIONS, type FoundationTableId } from "./permissions.ts";
import type { OwnerScopedRepository, RepositoryRow } from "./repository.ts";
import type { AccountDeletionAdmin } from "./appwrite-account-admin.ts";

export type AccountExportResult = {
  userId: string;
  source: "appwrite" | "local_fixture";
  generatedAt: string;
  tables: Readonly<Record<string, readonly RepositoryRow[]>>;
};

export type AccountDeleteResult = {
  userId: string;
  source: "appwrite" | "local_fixture";
  deletedRows: number;
  tables: readonly FoundationTableId[];
  deletedFiles?: number;
  identityDeleted?: boolean;
};

export class AccountLifecycleError extends Error {
  public readonly code: "invalid_user_id" | "delete_confirmation_required";

  public constructor(code: AccountLifecycleError["code"], message: string) {
    super(message);
    this.name = "AccountLifecycleError";
    this.code = code;
  }
}

const ownerTables = (): FoundationTableId[] => Object.values(FOUNDATION_PERMISSION_DECLARATIONS)
  .filter((declaration) => declaration.ownerField === "userId")
  .map((declaration) => declaration.tableId);

function requireUserId(userId: string): string {
  const owner = typeof userId === "string" ? userId.trim() : "";
  if (!owner) throw new AccountLifecycleError("invalid_user_id", "An authenticated user is required.");
  return owner;
}

export class AccountLifecycleService {
  private readonly deletionAdmin?: AccountDeletionAdmin;

  constructor(options: { deletionAdmin?: AccountDeletionAdmin } = {}) {
    this.deletionAdmin = options.deletionAdmin;
  }

  private async listAll(repository: OwnerScopedRepository, tableId: FoundationTableId, userId: string): Promise<readonly RepositoryRow[]> {
    const rows: RepositoryRow[] = [];
    let cursor: string | undefined;
    const seenCursors = new Set<string>();
    do {
      const result = await repository.listOwned(tableId, userId, { limit: 500, ...(cursor ? { cursor } : {}) });
      rows.push(...result.rows);
      const next = result.cursor;
      if (!next || seenCursors.has(next) || result.rows.length === 0) break;
      seenCursors.add(next);
      cursor = next;
    } while (rows.length < 100_000);
    return rows;
  }

  async export(userId: string, repository?: OwnerScopedRepository): Promise<AccountExportResult> {
    const owner = requireUserId(userId);
    const tables: Record<string, readonly RepositoryRow[]> = {};
    if (repository) for (const tableId of ownerTables()) tables[tableId] = await this.listAll(repository, tableId, owner);
    return { userId: owner, source: repository ? "appwrite" : "local_fixture", generatedAt: new Date().toISOString(), tables };
  }

  async delete(userId: string, confirmed: boolean, repository?: OwnerScopedRepository): Promise<AccountDeleteResult> {
    const owner = requireUserId(userId);
    if (!confirmed) throw new AccountLifecycleError("delete_confirmation_required", "Account deletion requires explicit confirmation.");
    if (this.deletionAdmin) return await this.deleteWithAdmin(owner, this.deletionAdmin);
    if (!repository) return { userId: owner, source: "local_fixture", deletedRows: 0, tables: [] };

    let deletedRows = 0;
    const deletedTables: FoundationTableId[] = [];
    for (const tableId of ownerTables()) {
      const rows = await this.listAll(repository, tableId, owner);
      if (rows.length === 0) continue;
      for (const row of rows) { await repository.deleteOwned(tableId, owner, row.$id); deletedRows += 1; }
      deletedTables.push(tableId);
    }
    return { userId: owner, source: "appwrite", deletedRows, tables: deletedTables };
  }

  private async deleteWithAdmin(owner: string, admin: AccountDeletionAdmin): Promise<AccountDeleteResult> {
    let deletedRows = 0;
    let deletedFiles = 0;
    const deletedTables = new Set<FoundationTableId>();

    const rows = async (table: string, field: string, value: string) => await admin.listRows(table, field, value);
    const purgeRows = async (table: string, field: string, value: string) => {
      let count = 0;
      // Always query from the beginning after deletion so pagination cannot skip rows.
      for (let page = 0; page < 250; page += 1) {
        const batch = await rows(table, field, value);
        if (batch.length === 0) break;
        for (const row of batch) { await admin.deleteRow(table, row.$id); count += 1; }
        if (batch.length < 500) break;
      }
      deletedRows += count;
      return count;
    };

    // Delete private objects before their metadata rows so there is no orphaned
    // media if identity removal succeeds but storage cleanup did not.
    const media = await rows("meal_media", "userId", owner);
    for (const row of media) {
      if (typeof row.bucketId === "string" && typeof row.objectId === "string") {
        await admin.deleteStorageFile(row.bucketId, row.objectId);
        deletedFiles += 1;
      }
    }

    const cascade = async (rootTable: string, rootField: string, childTable: string, childField: string) => {
      const roots = await rows(rootTable, "userId", owner);
      for (const root of roots) {
        const value = root[rootField];
        if (typeof value === "string" && value) await purgeRows(childTable, childField, value);
      }
    };
    await cascade("meal_analysis_request", "requestId", "analysis_attempt", "requestId");
    await cascade("meal_analysis_request", "requestId", "analysis_event", "requestId");
    await cascade("meal_revision", "mealRevisionId", "meal_item_revision", "mealRevisionId");
    await cascade("report", "reportId", "report_section", "reportId");
    await cascade("report", "reportId", "report_evidence", "reportId");
    const plans = await rows("workout_plan", "userId", owner);
    for (const plan of plans) {
      const planId = typeof plan.planId === "string" ? plan.planId : plan.$id;
      const revisions = await rows("workout_plan_revision", "planId", planId);
      for (const revision of revisions) {
        const revisionId = typeof revision.planRevisionId === "string" ? revision.planRevisionId : revision.$id;
        await purgeRows("workout_plan_step", "planRevisionId", revisionId);
      }
      await purgeRows("workout_plan_revision", "planId", planId);
    }
    await cascade("workout_session", "sessionId", "workout_session_revision", "sessionId");
    await cascade("notification", "notificationId", "notification_delivery", "notificationId");
    await cascade("deletion_request", "deletionRequestId", "deletion_job", "deletionRequestId");
    for (const table of ["idempotency_key", "provider_call", "purchase_event"]) await purgeRows(table, "userId", owner);

    for (const tableId of ownerTables()) {
      const count = await purgeRows(tableId, "userId", owner);
      if (count > 0) deletedTables.add(tableId);
    }

    // Identity is deliberately last. A failure before this line leaves the
    // account authenticated so the user can retry the idempotent cleanup.
    await admin.deleteUser(owner);
    return {
      userId: owner,
      source: "appwrite",
      deletedRows,
      tables: [...deletedTables],
      deletedFiles,
      identityDeleted: true,
    };
  }
}
