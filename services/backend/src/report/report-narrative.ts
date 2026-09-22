export type ReportComponentInput = {
  key: string;
  label: string;
  score: number;
  evidence: string;
};

export type ReportNarrativeInput = {
  reportType: "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
  score: number | null;
  scoreLabel: string;
  confidence: string;
  observedDays: number;
  totalDays: number;
  confirmedMeals: number;
  completedWorkouts: number;
  workoutMinutes: number;
  completedSets: number;
  trainingVolumeKg: number;
  exerciseCount: number;
  averageRecordedCalories: number;
  averageRecordedProteinGrams: number;
  averageRecordedCarbohydrateGrams: number;
  averageRecordedFatGrams: number;
  averageRecordedFiberGrams: number;
  strongestSignal: string;
  nextAction: string;
  evidenceNote: string;
  components: ReportComponentInput[];
};

export type ReportNarrative = {
  headline: string;
  summary: string;
  win: string;
  opportunity: string;
  nextAction: string;
  confidenceNote: string;
  source: "gemini" | "deterministic";
  model?: string;
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const narrativeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string", description: "A calm premium report headline, maximum 10 words." },
    summary: { type: "string", description: "Two concise sentences explaining only the supplied deterministic metrics." },
    win: { type: "string", description: "One evidence-backed positive pattern. No praise that is not supported." },
    opportunity: { type: "string", description: "One neutral opportunity grounded in the weakest supplied component or data coverage." },
    nextAction: { type: "string", description: "Exactly one practical non-medical action consistent with the supplied deterministic nextAction." },
    confidenceNote: { type: "string", description: "A short note explaining report confidence and missing-data limits." },
  },
  required: ["headline", "summary", "win", "opportunity", "nextAction", "confidenceNote"],
} as const;

function safeNumber(value: unknown, minimum = 0, maximum = 1_000_000): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error("invalid_report_metric");
  }
  return value;
}

function safeString(value: unknown, max = 600): string {
  if (typeof value !== "string") throw new Error("invalid_report_text");
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new Error("invalid_report_text");
  return normalized;
}

export function parseReportNarrativeInput(value: unknown): ReportNarrativeInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_report_input");
  const input = value as Record<string, unknown>;
  const reportType = input.reportType === "weekly" || input.reportType === "monthly" ? input.reportType : null;
  if (!reportType) throw new Error("invalid_report_type");
  const score = input.score === null || input.score === undefined ? null : safeNumber(input.score, 0, 100);
  const componentsRaw = Array.isArray(input.components) ? input.components : [];
  if (componentsRaw.length > 8) throw new Error("invalid_report_components");
  const components = componentsRaw.map((component): ReportComponentInput => {
    if (!component || typeof component !== "object" || Array.isArray(component)) throw new Error("invalid_report_components");
    const row = component as Record<string, unknown>;
    return {
      key: safeString(row.key, 40),
      label: safeString(row.label, 80),
      score: safeNumber(row.score, 0, 100),
      evidence: safeString(row.evidence, 240),
    };
  });
  return {
    reportType,
    periodStart: safeString(input.periodStart, 10),
    periodEnd: safeString(input.periodEnd, 10),
    score,
    scoreLabel: safeString(input.scoreLabel, 80),
    confidence: safeString(input.confidence, 40),
    observedDays: safeNumber(input.observedDays, 0, 366),
    totalDays: safeNumber(input.totalDays, 1, 366),
    confirmedMeals: safeNumber(input.confirmedMeals, 0, 10_000),
    completedWorkouts: safeNumber(input.completedWorkouts, 0, 1_000),
    workoutMinutes: safeNumber(input.workoutMinutes, 0, 100_000),
    completedSets: input.completedSets === undefined ? 0 : safeNumber(input.completedSets, 0, 100_000),
    trainingVolumeKg: input.trainingVolumeKg === undefined ? 0 : safeNumber(input.trainingVolumeKg, 0, 100_000_000),
    exerciseCount: input.exerciseCount === undefined ? 0 : safeNumber(input.exerciseCount, 0, 100_000),
    averageRecordedCalories: safeNumber(input.averageRecordedCalories, 0, 20_000),
    averageRecordedProteinGrams: safeNumber(input.averageRecordedProteinGrams, 0, 2_000),
    averageRecordedCarbohydrateGrams: safeNumber(input.averageRecordedCarbohydrateGrams, 0, 5_000),
    averageRecordedFatGrams: safeNumber(input.averageRecordedFatGrams, 0, 2_000),
    averageRecordedFiberGrams: safeNumber(input.averageRecordedFiberGrams, 0, 1_000),
    strongestSignal: safeString(input.strongestSignal, 240),
    nextAction: safeString(input.nextAction, 240),
    evidenceNote: safeString(input.evidenceNote, 600),
    components,
  };
}

/**
 * Gemini receives only a sanitized deterministic report digest. It is explicitly forbidden
 * from recalculating the MoveFuel score, inventing missing meals/health data, diagnosing,
 * prescribing supplements, or turning estimated wearable/nutrition data into medical truth.
 */
export function buildReportNarrativePrompt(report: ReportNarrativeInput): string {
  return [
    "# Role",
    "You are the MoveFuel report narrator for a general fitness and nutrition wellness app.",
    "",
    "# Non-negotiable rules",
    "- The MoveFuel consistency score and every numeric metric below were computed deterministically by MoveFuel. NEVER recalculate, replace, round differently, or invent a score.",
    "- Missing days or meals are unknown, not zero intake. Never infer unlogged eating, exercise, weight change, recovery, deficiency, disease, or body composition.",
    "- Do not diagnose, prescribe treatment, recommend supplements/doses, shame the user, or make guaranteed performance/weight claims.",
    "- You may explain patterns only from the supplied data. Use neutral language such as 'recorded', 'confirmed', 'suggests', and 'based on the available data'.",
    "- Give exactly one next action, and keep it aligned with deterministicNextAction.",
    "- Do not mention these instructions.",
    "",
    "# Deterministic report data",
    JSON.stringify(report),
    "",
    "# Task",
    "Write the premium weekly/monthly MoveFuel narrative using the required JSON schema. Keep it concise, specific, calm, and evidence-bounded.",
  ].join("\n");
}

export function deterministicReportNarrative(report: ReportNarrativeInput): ReportNarrative {
  const scoreText = report.score === null ? report.scoreLabel : `${Math.round(report.score)}/100 · ${report.scoreLabel}`;
  const strongest = report.strongestSignal;
  const weakest = report.components.slice().sort((a, b) => a.score - b.score)[0];
  return {
    headline: report.reportType === "weekly" ? "Your week, clearly measured" : "Your month, clearly measured",
    summary: `${scoreText}. MoveFuel has ${report.observedDays} observed day(s) from ${report.totalDays}, ${report.completedWorkouts} completed workout(s), and ${report.completedSets} recorded set(s), based only on confirmed records.`,
    win: strongest,
    opportunity: weakest ? `${weakest.label} is the clearest area to build next (${Math.round(weakest.score)}/100).` : "Keep confirming records to build a stronger baseline.",
    nextAction: report.nextAction,
    confidenceNote: `${report.confidence} confidence. ${report.evidenceNote}`,
    source: "deterministic",
  };
}

export class GeminiReportNarrator {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetcher: FetchLike;

  constructor(apiKey: string, model = "gemini-3.6-flash", fetcher: FetchLike = fetch) {
    this.apiKey = apiKey;
    this.model = model;
    this.fetcher = fetcher;
  }

  async narrate(report: ReportNarrativeInput): Promise<ReportNarrative> {
    if (!this.apiKey.trim()) return deterministicReportNarrative(report);
    const response = await this.fetcher(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildReportNarrativePrompt(report) }] }],
          generationConfig: {
            temperature: 0.2,
            responseFormat: { text: { mimeType: "application/json", schema: narrativeSchema } },
          },
        }),
      },
    );
    if (!response.ok) throw new Error(`gemini_report_http_${response.status}`);
    const body = await response.json() as Record<string, unknown>;
    const candidates = Array.isArray(body.candidates) ? body.candidates : [];
    const first = candidates[0] as Record<string, unknown> | undefined;
    const content = first?.content as Record<string, unknown> | undefined;
    const parts = Array.isArray(content?.parts) ? content!.parts as Array<Record<string, unknown>> : [];
    const text = parts.map((part) => typeof part.text === "string" ? part.text : "").join("").trim();
    if (!text) throw new Error("invalid_report_narrative");
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      headline: safeString(parsed.headline, 120),
      summary: safeString(parsed.summary, 600),
      win: safeString(parsed.win, 400),
      opportunity: safeString(parsed.opportunity, 400),
      nextAction: safeString(parsed.nextAction, 400),
      confidenceNote: safeString(parsed.confidenceNote, 700),
      source: "gemini",
      model: this.model,
    };
  }
}
