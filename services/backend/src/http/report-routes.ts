import type { IncomingMessage, ServerResponse } from "node:http";
import { GeminiReportNarrator, parseReportNarrativeInput } from "../report/report-narrative.ts";
import { ReportStore } from "../report/report-store.ts";
import { reportSnapshotFromProgress } from "../report/report-store.ts";
import type { ProgressEnvelope } from "../progress/progress.ts";
import type { OwnerScopedRepository } from "../foundation/repository.ts";
import { ContractError } from "../shared/contracts.ts";
import { readJson, response, sendJson, type RequestContext } from "./requestSupport.ts";

export function createReportRouteHandler(options: {
  reportStore: ReportStore;
  reportNarrator: GeminiReportNarrator;
  repositoryFor: (context: RequestContext) => OwnerScopedRepository | undefined;
  progressFor: (context: RequestContext, periodStart: string, periodEnd: string) => Promise<ProgressEnvelope>;
}) {
  const { reportStore, reportNarrator, repositoryFor, progressFor } = options;
  return async (req: IncomingMessage, res: ServerResponse, context: { auth: RequestContext; url: URL; correlationId: string }): Promise<boolean> => {
    const { auth, url, correlationId } = context;
      if (req.method === "POST" && url.pathname === "/v1/reports") {
        const body = await readJson(req);
        const candidate = body && typeof body === "object" && !Array.isArray(body) && "report" in body
          ? (body as Record<string, unknown>).report
          : body;
        let reportInput;
        try { reportInput = parseReportNarrativeInput(candidate); }
        catch { throw new ContractError("invalid_report_input", "The deterministic report snapshot could not be validated."); }
        const repository = repositoryFor(auth);
        const stored = await reportStore.create(auth.userId, reportInput, repository);
        sendJson(res, 201, response({ report: stored }, null, correlationId));
        return true;
      }

      if (req.method === "POST" && url.pathname === "/v1/reports/generate") {
        const body = await readJson(req);
        const input = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
        const reportType = input.reportType === "monthly" ? "monthly" : input.reportType === "weekly" ? "weekly" : null;
        if (!reportType) throw new ContractError("invalid_report_type", "Report type must be weekly or monthly.");
        const periodStart = typeof input.periodStart === "string" ? input.periodStart : new Date(Date.now() - (reportType === "weekly" ? 6 : 29) * 86_400_000).toISOString().slice(0, 10);
        const periodEnd = typeof input.periodEnd === "string" ? input.periodEnd : new Date().toISOString().slice(0, 10);
        const progress = await progressFor(auth, periodStart, periodEnd);
        const snapshot = reportSnapshotFromProgress(progress, reportType);
        const stored = await reportStore.create(auth.userId, snapshot, repositoryFor(auth));
        sendJson(res, 201, response({ report: stored }, null, correlationId));
        return true;
      }

      const narrativeMatch = url.pathname.match(/^\/v1\/reports\/([^/]+)\/narrative$/);
      if (req.method === "POST" && narrativeMatch) {
        const repository = repositoryFor(auth);
        const stored = await reportStore.get(auth.userId, decodeURIComponent(narrativeMatch[1]!), repository);
        if (!stored) throw new ContractError("report_not_found", "Report not found.");
        const narrative = await reportNarrator.narrate(stored.snapshot);
        await reportStore.attachNarrative(auth.userId, stored.reportId, narrative, repository);
        sendJson(res, 200, response({ narrative, reportId: stored.reportId, persistence: stored.persistence }, null, correlationId));
        return true;
      }

      if (req.method === "GET" && url.pathname === "/v1/reports") {
        const reports = await reportStore.list(auth.userId, repositoryFor(auth));
        sendJson(res, 200, response({ reports }, null, correlationId));
        return true;
      }

      const reportMatch = url.pathname.match(/^\/v1\/reports\/([^/]+)$/);
      if (req.method === "GET" && reportMatch && reportMatch[1] !== "nutrition") {
        const repository = repositoryFor(auth);
        const stored = await reportStore.get(auth.userId, decodeURIComponent(reportMatch[1]!), repository);
        if (!stored) throw new ContractError("report_not_found", "Report not found.");
        sendJson(res, 200, response({ report: stored }, null, correlationId));
        return true;
      }

      const reportExportMatch = url.pathname.match(/^\/v1\/reports\/([^/]+)\/export$/);
      if (req.method === "POST" && reportExportMatch) {
        const repository = repositoryFor(auth);
        const exported = await reportStore.export(auth.userId, decodeURIComponent(reportExportMatch[1]!), repository);
        sendJson(res, 200, response({ export: exported }, null, correlationId));
        return true;
      }

      if (req.method === "POST" && url.pathname === "/v1/reports/narrative") {
        const body = await readJson(req);
        try {
          const report = parseReportNarrativeInput(body);
          const narrative = await reportNarrator.narrate(report);
          const repository = repositoryFor(auth);
          const stored = await reportStore.create(auth.userId, report, repository, narrative);
          sendJson(res, 200, response({ narrative, reportId: stored.reportId, persistence: stored.persistence }, null, correlationId));
        } catch (error) {
          const message = error instanceof Error ? error.message : "invalid_report_input";
          if (message.startsWith("gemini_report_http_") || message === "invalid_report_narrative") {
            throw new ContractError("report_narrative_unavailable", "The AI report explanation is temporarily unavailable. The deterministic report remains valid.", true);
          }
          throw new ContractError("invalid_report_input", "The report summary could not be validated.");
        }
        return true;
      }

    return false;
  };
}
