import type { ConfirmedMeal, NutritionTotals } from "./contracts.ts";
import { addNutritionTotals } from "./nutrition.ts";

export type NutritionReportDay = NutritionTotals & {
  localDate: string;
  confirmedMealCount: number;
  mealIds: string[];
};

export type NutritionReport = {
  reportType: "nutrition_daily";
  periodStart: string;
  periodEnd: string;
  source: "confirmed_meals";
  freshness: "confirmed_only";
  generatedAtEpochMillis: number;
  days: NutritionReportDay[];
  totals: NutritionTotals & { confirmedMealCount: number };
};

const zeroTotals = (): NutritionTotals => ({
  energyKcal: 0,
  proteinGrams: 0,
  carbGrams: 0,
  fatGrams: 0,
  fiberGrams: 0,
});

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("invalid_report_date");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month! - 1 || date.getUTCDate() !== day) throw new Error("invalid_report_date");
  return date;
}

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Builds a bounded, confirmed-only report for the authenticated owner. */
export function buildNutritionReport(
  meals: readonly ConfirmedMeal[],
  periodStart: string,
  periodEnd: string,
  now = Date.now(),
): NutritionReport {
  const start = parseDate(periodStart);
  const end = parseDate(periodEnd);
  if (start.getTime() > end.getTime()) throw new Error("invalid_report_range");
  const spanDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (spanDays > 366) throw new Error("report_range_too_large");

  const byDate = new Map<string, NutritionReportDay>();
  for (let offset = 0; offset < spanDays; offset += 1) {
    const localDate = dateString(new Date(start.getTime() + offset * 86_400_000));
    byDate.set(localDate, { localDate, ...zeroTotals(), confirmedMealCount: 0, mealIds: [] });
  }

  let reportTotals: NutritionTotals = zeroTotals();
  let reportMealCount = 0;
  for (const meal of meals) {
    if (meal.status !== "CONFIRMED") continue;
    const day = byDate.get(meal.localDate);
    if (!day) continue;
    const dayTotals = addNutritionTotals(day, meal.totals);
    Object.assign(day, dayTotals);
    day.confirmedMealCount += 1;
    day.mealIds.push(meal.mealId);
    reportTotals = addNutritionTotals(reportTotals, meal.totals);
    reportMealCount += 1;
  }

  return {
    reportType: "nutrition_daily",
    periodStart,
    periodEnd,
    source: "confirmed_meals",
    freshness: "confirmed_only",
    generatedAtEpochMillis: now,
    days: [...byDate.values()],
    totals: { ...reportTotals, confirmedMealCount: reportMealCount },
  };
}

export function defaultReportRange(now = new Date()): { periodStart: string; periodEnd: string } {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end.getTime() - 6 * 86_400_000);
  return { periodStart: dateString(start), periodEnd: dateString(end) };
}
