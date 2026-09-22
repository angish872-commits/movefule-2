import { createHash, randomUUID } from "node:crypto";
import { ContractError } from "../shared/contracts.ts";
import type { OwnerScopedRepository, AppwriteTablesClient, RepositoryRow } from "../foundation/repository.ts";
import type { ReportNarrativeInput, ReportNarrative } from "./report-narrative.ts";
import type { ProgressEnvelope } from "../progress/progress.ts";

export function reportSnapshotFromProgress(progress: ProgressEnvelope, reportType: "weekly" | "monthly"): ReportNarrativeInput {
  const totalDays = progress.coverage.totalDays;
  const observed = progress.coverage.mealObservedDays;
  const coverageScore = Math.round(observed * 100 / Math.max(1, totalDays));
  const trainingScore = Math.round(progress.coverage.workoutObservedDays * 100 / Math.max(1, totalDays));
  const activityScore = Math.round(progress.coverage.stepObservedDays * 100 / Math.max(1, totalDays));
  const components = [
    { key: "meal_coverage", label: "Confirmed meal coverage", score: coverageScore, evidence: `${observed} of ${totalDays} days contain confirmed meal records.` },
    { key: "training_coverage", label: "Training coverage", score: trainingScore, evidence: `${progress.coverage.workoutObservedDays} of ${totalDays} days contain completed canonical workouts.` },
    { key: "activity_coverage", label: "Activity coverage", score: activityScore, evidence: `${progress.coverage.stepObservedDays} of ${totalDays} days contain recorded steps.` },
  ];
  const strongest = components.slice().sort((a, b) => b.score - a.score)[0]!;
  return {
    reportType,
    periodStart: progress.periodStart,
    periodEnd: progress.periodEnd,
    score: null,
    scoreLabel: "Evidence summary",
    confidence: observed > 0 || progress.totals.completedWorkouts > 0 || progress.coverage.stepObservedDays > 0 ? "Recorded evidence" : "No recorded evidence",
    observedDays: Math.max(observed, progress.coverage.workoutObservedDays, progress.coverage.stepObservedDays),
    totalDays,
    confirmedMeals: progress.totals.confirmedMeals,
    completedWorkouts: progress.totals.completedWorkouts,
    workoutMinutes: progress.totals.workoutMinutes,
    completedSets: progress.totals.completedSets,
    trainingVolumeKg: progress.totals.trainingVolumeKg,
    exerciseCount: progress.totals.completedSets,
    averageRecordedCalories: progress.averages.recordedEnergyKcal ?? 0,
    averageRecordedProteinGrams: progress.averages.recordedProteinGrams ?? 0,
    averageRecordedCarbohydrateGrams: progress.averages.recordedCarbGrams ?? 0,
    averageRecordedFatGrams: progress.averages.recordedFatGrams ?? 0,
    averageRecordedFiberGrams: progress.averages.recordedFiberGrams ?? 0,
    strongestSignal: `${strongest.label}: ${strongest.evidence}`,
    nextAction: "Keep confirming meals and recording completed sessions so the next report has stronger evidence.",
    evidenceNote: "Backend-generated from confirmed meals, completed canonical workouts, and approved health summaries. Missing evidence remains unknown; this report is not a medical or physiological score.",
    components,
  };
}

export type StoredReport = {
  reportId: string;
  userId: string;
  reportType: "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
  status: "COMPLETED";
  sourceRevisionHash: string;
  createdAt: string;
  completedAt: string;
  snapshot: ReportNarrativeInput;
  narrative?: ReportNarrative;
  persistence: "local_fixture" | "appwrite_metadata" | "appwrite_frozen";
};

export type ReportExport = {
  exportJobId: string;
  reportId: string;
  format: "json";
  state: "COMPLETED";
  checksum: string;
  sizeBytes: number;
  expiresAt: string;
  content: string;
};

type ReportRow = {
  reportId: string; userId: string; reportType: string; periodStart: string; periodEnd: string; status: string;
  sourceRevisionHash: string; createdAt: string; completedAt: string;
};
type ReportSectionRow = {
  sectionId: string; reportId: string; sortOrder: number; sectionType: string; title: string;
  narrative: string; chartSpecJson: string; provenanceJson: string;
};

const hash = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export class ReportStore {
  private readonly local = new Map<string, StoredReport>();
  private readonly databaseId: string;
  private readonly serverClient?: AppwriteTablesClient;

  constructor(options: { databaseId?: string; serverClient?: AppwriteTablesClient } = {}) {
    this.databaseId = options.databaseId ?? "movefuel_mvp";
    this.serverClient = options.serverClient;
  }

  async create(userId: string, snapshot: ReportNarrativeInput, ownerRepository?: OwnerScopedRepository, narrative?: ReportNarrative): Promise<StoredReport> {
    if (!userId.trim()) throw new ContractError("invalid_user_id", "An authenticated user is required.");
    const sourceRevisionHash = hash(snapshot);
    const reportId = `report-${hash({ userId, reportType: snapshot.reportType, periodStart: snapshot.periodStart, periodEnd: snapshot.periodEnd, sourceRevisionHash }).slice(0, 28)}`;
    const existing = this.local.get(`${userId}:${reportId}`);
    if (existing && !narrative) return structuredClone(existing);
    const now = new Date().toISOString();
    const row: ReportRow = {
      reportId, userId, reportType: snapshot.reportType, periodStart: snapshot.periodStart, periodEnd: snapshot.periodEnd,
      status: "COMPLETED", sourceRevisionHash, createdAt: now, completedAt: now,
    };
    let persistence: StoredReport["persistence"] = "local_fixture";
    if (ownerRepository) {
      const current = await ownerRepository.getOwned<ReportRow>("report", userId, reportId);
      if (!current) await ownerRepository.createOwned<ReportRow>("report", userId, reportId, row);
      persistence = "appwrite_metadata";
    }
    if (this.serverClient) {
      const sectionId = `${reportId}-summary`;
      const section: ReportSectionRow = {
        sectionId, reportId, sortOrder: 0, sectionType: "SUMMARY", title: snapshot.reportType === "weekly" ? "Weekly report" : "Monthly report",
        narrative: JSON.stringify({ snapshot, narrative: narrative ?? null }),
        chartSpecJson: JSON.stringify({ version: 1, score: snapshot.score, components: snapshot.components }),
        provenanceJson: JSON.stringify({ sourceRevisionHash, evidenceNote: snapshot.evidenceNote, confidence: snapshot.confidence }),
      };
      const currentSection = await this.serverClient.getRow<ReportSectionRow>(this.databaseId, "report_section", sectionId);
      if (!currentSection) await this.serverClient.createRow(this.databaseId, "report_section", sectionId, section, []);
      else await this.serverClient.updateRow(this.databaseId, "report_section", sectionId, section);
      for (const [index, component] of snapshot.components.entries()) {
        const evidenceId = `${reportId}-e${index + 1}`;
        const evidence = {
          reportEvidenceId: evidenceId, reportId, sectionId, sourceType: component.key,
          sourceObjectId: `${snapshot.periodStart}:${snapshot.periodEnd}:${component.key}`, sourceRevision: 1,
          summaryJson: JSON.stringify(component),
        };
        const currentEvidence = await this.serverClient.getRow(this.databaseId, "report_evidence", evidenceId);
        if (!currentEvidence) await this.serverClient.createRow(this.databaseId, "report_evidence", evidenceId, evidence, []);
        else await this.serverClient.updateRow(this.databaseId, "report_evidence", evidenceId, evidence);
      }
      persistence = "appwrite_frozen";
    }
    const stored: StoredReport = { ...row, reportType: snapshot.reportType, status: "COMPLETED", snapshot: structuredClone(snapshot), ...(narrative ? { narrative: structuredClone(narrative) } : {}), persistence };
    this.local.set(`${userId}:${reportId}`, stored);
    return structuredClone(stored);
  }

  async get(userId: string, reportId: string, ownerRepository?: OwnerScopedRepository): Promise<StoredReport | null> {
    const local = this.local.get(`${userId}:${reportId}`);
    if (local) return structuredClone(local);
    if (!ownerRepository) return null;
    const metadata = await ownerRepository.getOwned<ReportRow>("report", userId, reportId);
    if (!metadata) return null;
    if (!this.serverClient) {
      throw new ContractError("report_content_requires_server_storage", "Report metadata exists, but frozen report content requires the configured server-only report section store.", true);
    }
    const section = await this.serverClient.getRow<ReportSectionRow>(this.databaseId, "report_section", `${reportId}-summary`);
    if (!section) throw new ContractError("report_content_missing", "Frozen report content is missing.", true);
    let payload: { snapshot?: ReportNarrativeInput; narrative?: ReportNarrative | null };
    try { payload = JSON.parse(String(section.narrative)); } catch { throw new ContractError("report_content_invalid", "Frozen report content is invalid."); }
    if (!payload.snapshot) throw new ContractError("report_content_invalid", "Frozen report snapshot is missing.");
    const stored: StoredReport = {
      reportId, userId, reportType: metadata.reportType as "weekly" | "monthly", periodStart: metadata.periodStart, periodEnd: metadata.periodEnd,
      status: "COMPLETED", sourceRevisionHash: metadata.sourceRevisionHash, createdAt: metadata.createdAt, completedAt: metadata.completedAt,
      snapshot: payload.snapshot, ...(payload.narrative ? { narrative: payload.narrative } : {}), persistence: "appwrite_frozen",
    };
    this.local.set(`${userId}:${reportId}`, stored);
    return structuredClone(stored);
  }

  async list(userId: string, ownerRepository?: OwnerScopedRepository): Promise<StoredReport[]> {
    const local = [...this.local.values()].filter((report) => report.userId === userId);
    if (!ownerRepository) return local.map((report) => structuredClone(report)).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
    const result = await ownerRepository.listOwned<ReportRow>("report", userId, { limit: 100 });
    const reports: StoredReport[] = [];
    for (const row of result.rows) {
      const report = await this.get(userId, String(row.reportId), ownerRepository);
      if (report) reports.push(report);
    }
    return reports.sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
  }

  async attachNarrative(userId: string, reportId: string, narrative: ReportNarrative, ownerRepository?: OwnerScopedRepository): Promise<StoredReport> {
    const current = await this.get(userId, reportId, ownerRepository);
    if (!current) throw new ContractError("report_not_found", "Report not found.");
    return await this.create(userId, current.snapshot, ownerRepository, narrative);
  }

  async export(userId: string, reportId: string, ownerRepository?: OwnerScopedRepository): Promise<ReportExport> {
    const report = await this.get(userId, reportId, ownerRepository);
    if (!report) throw new ContractError("report_not_found", "Report not found.");
    const content = JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), report }, null, 2);
    const exportJobId = `export-${randomUUID()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    if (ownerRepository) {
      await ownerRepository.createOwned("export_job", userId, exportJobId, {
        exportJobId, userId, exportType: "REPORT_JSON", state: "COMPLETED", requestedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), expiresAt, errorCode: null,
      });
    }
    return { exportJobId, reportId, format: "json", state: "COMPLETED", checksum: hash(content), sizeBytes: Buffer.byteLength(content), expiresAt, content };
  }
}
