import assert from "node:assert/strict";
import test from "node:test";
import { MealStore } from "../../meal/store.ts";

const item = { displayName: "Food", portionGrams: 100, energyKcal: 100, proteinGrams: 5, carbGrams: 10, fatGrams: 2, fiberGrams: 1 };

test("draft and reviewed analysis do not enter confirmed ledger until explicit confirmation", () => { let id=0; const store=new MealStore({now:()=>1000,idFactory:()=>`id-${++id}`}); const draft=store.createDraft("owner",{localDate:"2026-08-30",mealType:"lunch",sourceType:"manual"}); store.reviseDraft("owner",draft.draftId,{expectedRevision:1,items:[item]}); assert.equal(store.getDailyTotals("owner","2026-08-30").confirmedMealCount,0); assert.equal(store.listConfirmedMeals("owner").length,0); });

test("confirmation is idempotent and stale revision is rejected", () => { let id=0; const store=new MealStore({now:()=>1000,idFactory:()=>`id-${++id}`}); const draft=store.createDraft("owner",{localDate:"2026-08-30",mealType:"lunch",sourceType:"manual"}); const reviewed=store.reviseDraft("owner",draft.draftId,{expectedRevision:1,items:[item]}); assert.throws(()=>store.confirmMeal("owner",{draftId:draft.draftId,idempotencyKey:"stale",confirmed:true,expectedRevision:1}),/stale/); const first=store.confirmMeal("owner",{draftId:draft.draftId,idempotencyKey:"confirm-1",confirmed:true,expectedRevision:reviewed.activeRevision}); const duplicate=store.confirmMeal("owner",{draftId:draft.draftId,idempotencyKey:"confirm-1",confirmed:true,expectedRevision:reviewed.activeRevision}); assert.equal(first.status,"CONFIRMED"); assert.equal(duplicate.status,"DUPLICATE"); assert.equal(first.meal.mealId,duplicate.meal.mealId); assert.equal(store.getDailyTotals("owner","2026-08-30").confirmedMealCount,1); });

test("confirmed ledger is owner isolated", () => { let id=0; const store=new MealStore({now:()=>1000,idFactory:()=>`id-${++id}`}); const draft=store.createDraft("owner-a",{localDate:"2026-08-30",mealType:"lunch",sourceType:"manual"}); const reviewed=store.reviseDraft("owner-a",draft.draftId,{expectedRevision:1,items:[item]}); store.confirmMeal("owner-a",{draftId:draft.draftId,idempotencyKey:"confirm",confirmed:true,expectedRevision:reviewed.activeRevision}); assert.equal(store.listConfirmedMeals("owner-b").length,0); assert.equal(store.getDailyTotals("owner-b","2026-08-30").confirmedMealCount,0); });

test("cross-user draft and confirmed-meal mutations are rejected by backend ownership boundaries", () => {
  let id = 0;
  const store = new MealStore({ now: () => 1000, idFactory: () => `id-${++id}` });
  const draft = store.createDraft("owner-a", { localDate: "2026-08-30", mealType: "lunch", sourceType: "manual" });
  const reviewed = store.reviseDraft("owner-a", draft.draftId, { expectedRevision: 1, items: [item] });
  assert.throws(() => store.getDraft("owner-b", draft.draftId), /not found/i);
  assert.throws(() => store.reviseDraft("owner-b", draft.draftId, { expectedRevision: reviewed.activeRevision, items: [item] }), /not found/i);
  assert.throws(() => store.confirmMeal("owner-b", { draftId: draft.draftId, idempotencyKey: "cross-confirm", confirmed: true, expectedRevision: reviewed.activeRevision }), /not found/i);
  const confirmed = store.confirmMeal("owner-a", { draftId: draft.draftId, idempotencyKey: "owner-confirm", confirmed: true, expectedRevision: reviewed.activeRevision });
  assert.equal(confirmed.status, "CONFIRMED");
  assert.throws(() => store.getConfirmedMeal("owner-b", confirmed.meal.mealId), /not found/i);
  assert.throws(() => store.reviseConfirmedMeal("owner-b", { mealId: confirmed.meal.mealId, expectedRevision: 1, idempotencyKey: "cross-correct", items: confirmed.meal.items }), /not found/i);
  assert.throws(() => store.deleteConfirmedMeal("owner-b", { mealId: confirmed.meal.mealId, expectedRevision: 1, idempotencyKey: "cross-delete" }), /not found/i);
  assert.equal(store.listConfirmedMeals("owner-a").length, 1);
  assert.equal(store.listConfirmedMeals("owner-b").length, 0);
});
