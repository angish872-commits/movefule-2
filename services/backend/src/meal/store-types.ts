import type {
  ConfirmedMeal,
  DailyMealTotals,
  MealAnalyzerProvider,
} from "./contracts.ts";

export type MealAnalysisRequestInput = {
  draftId: string;
  idempotencyKey: string;
  provider?: "local" | "gemini";
  expectedRevision?: number;
};

export type MealAnalysisRetryInput = {
  requestId: string;
  idempotencyKey: string;
  expectedRevision?: number;
};

export type MealAnalysisCancelInput = {
  requestId: string;
  expectedRevision?: number;
};

export type ConfirmedMealRevisionInput = {
  mealId: string;
  idempotencyKey: string;
  expectedRevision: number;
  items: unknown;
};

export type ConfirmedMealDeleteInput = {
  mealId: string;
  idempotencyKey: string;
  expectedRevision: number;
};

export type ConfirmMealInput = {
  draftId: string;
  idempotencyKey: string;
  confirmed: boolean;
  expectedRevision?: number;
  items?: unknown;
};

export type ConfirmMealResult = {
  status: "CONFIRMED" | "DUPLICATE";
  meal: ConfirmedMeal;
  totals: DailyMealTotals;
};

export type MealStoreOptions = {
  now?: () => number;
  idFactory?: () => string;
  defaultProvider?: MealAnalyzerProvider;
  providerResolver?: (provider: "local" | "gemini") => MealAnalyzerProvider;
};

export type IdempotentRecord<T> = {
  requestHash: string;
  value: T;
};
