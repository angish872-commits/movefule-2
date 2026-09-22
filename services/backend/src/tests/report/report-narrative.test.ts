import assert from "node:assert/strict";
import test from "node:test";
import {
  GeminiReportNarrator,
  buildReportNarrativePrompt,
  deterministicReportNarrative,
  parseReportNarrativeInput,
} from "../../report/report-narrative.ts";

const fixture = {
  reportType: "weekly" as const,
  periodStart: "2026-08-01",
  periodEnd: "2026-08-07",
  score: 82,
  scoreLabel: "Strong consistency",
  confidence: "High",
  observedDays: 7,
  totalDays: 7,
  confirmedMeals: 19,
  completedWorkouts: 4,
  workoutMinutes: 160,
  averageRecordedCalories: 2230,
  averageRecordedProteinGrams: 138,
  averageRecordedCarbohydrateGrams: 240,
  averageRecordedFatGrams: 70,
  averageRecordedFiberGrams: 28,
  strongestSignal: "Training consistency is the strongest recorded signal (100/100).",
  nextAction: "Use the Fuel screen to close the recorded protein gap on the days you track.",
  evidenceNote: "Missing meals/days are not treated as zero intake.",
  components: [
    { key: "logging", label: "Tracking coverage", score: 100, evidence: "7 of 7 days observed." },
    { key: "protein", label: "Recorded protein progress", score: 78, evidence: "Compared with reviewed target." },
    { key: "training", label: "Training consistency", score: 100, evidence: "4 completed sessions." },
  ],
};

test("report parser accepts bounded deterministic digest", () => {
  const parsed = parseReportNarrativeInput(fixture);
  assert.equal(parsed.score, 82);
  assert.equal(parsed.components.length, 3);
});

test("prompt forbids score recalculation and missing-data invention", () => {
  const prompt = buildReportNarrativePrompt(fixture);
  assert.match(prompt, /NEVER recalculate/i);
  assert.match(prompt, /unknown, not zero intake/i);
  assert.match(prompt, /Do not diagnose/i);
});

test("deterministic fallback preserves MoveFuel score", () => {
  const narrative = deterministicReportNarrative(fixture);
  assert.equal(narrative.source, "deterministic");
  assert.match(narrative.summary, /82\/100/);
});

test("Gemini narrator requests structured JSON and validates response", async () => {
  let requestBody = "";
  const narrator = new GeminiReportNarrator("secret", "gemini-test", async (_input, init) => {
    requestBody = String(init?.body ?? "");
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        headline: "A strong week",
        summary: "Your confirmed records show a steady week. The score remains evidence-bounded.",
        win: "Training consistency led the week.",
        opportunity: "Recorded protein progress has room to build.",
        nextAction: fixture.nextAction,
        confidenceNote: "High confidence from seven observed days.",
      }) }] } }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  });
  const result = await narrator.narrate(fixture);
  assert.equal(result.source, "gemini");
  assert.equal(result.model, "gemini-test");
  assert.match(requestBody, /responseFormat/);
  assert.match(requestBody, /application\/json/);
});
