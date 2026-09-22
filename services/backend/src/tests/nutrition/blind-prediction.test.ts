import assert from "node:assert/strict";
import test from "node:test";
import { blindPredictionFromEstimate } from "../../nutrition/benchmark/blindPrediction.ts";
import type { ImageEstimateResult } from "../../nutrition/algorithm/imageEstimatePipeline.ts";

function result(): ImageEstimateResult {
  return {
    schemaVersion: 1, resultId: "r", requestId: "q", correlationId: null, ownerUserId: "u",
    state: "COMPLETED_NEEDS_CONFIRMATION", imageQuality: { state:"ACCEPTABLE", issueCodes:[], userMessage:"", retryRecommendation:"NO_RETRY", safeFallback:"USE_METADATA_ONLY", evidenceSource:"test", analyserVersion:"1", validationMode:"METADATA_ONLY" },
    items: [
      { itemId:"i1", regionId:"x", foodType:"BASIC", candidates:[], selectedSource:{source:"USDA_FDC",fdcId:1,recipeRevisionId:null,dataType:"FOUNDATION",description:"x"}, portion:{minimumGrams:90,centralGrams:100,maximumGrams:110,confidence:"HIGH",requiresClarification:false,assumptions:[],uncertainties:[],selectedEvidenceType:"MANUAL_GRAMS",policyVersion:1}, nutrients:{energyKcal:{minimum:90,central:100,maximum:110},proteinG:{minimum:9,central:10,maximum:11},carbG:{minimum:null,central:null,maximum:null},fatG:{minimum:1,central:2,maximum:3},fiberG:{minimum:null,central:null,maximum:null},sodiumMg:{minimum:null,central:null,maximum:null}}, clarificationQuestions:[], uncertainties:[], requiresUserConfirmation:true, confidence:{imageQuality:"ACCEPTABLE",segmentation:"HIGH",identity:.9,portionEvidence:"HIGH",preparationCertainty:.9,nutritionSourceMatch:"RESOLVED",recipeReviewStatus:"REVIEWED",finalPolicyVersion:1,overall:"HIGH",cappedBy:[]} },
      { itemId:"i2", regionId:"y", foodType:"BASIC", candidates:[], selectedSource:{source:"USDA_FDC",fdcId:2,recipeRevisionId:null,dataType:"FOUNDATION",description:"y"}, portion:{minimumGrams:40,centralGrams:50,maximumGrams:60,confidence:"MEDIUM",requiresClarification:false,assumptions:[],uncertainties:[],selectedEvidenceType:"MANUAL_GRAMS",policyVersion:1}, nutrients:{energyKcal:{minimum:80,central:100,maximum:120},proteinG:{minimum:4,central:5,maximum:6},carbG:{minimum:null,central:null,maximum:null},fatG:{minimum:2,central:3,maximum:4},fiberG:{minimum:null,central:null,maximum:null},sodiumMg:{minimum:null,central:null,maximum:null}}, clarificationQuestions:[], uncertainties:[], requiresUserConfirmation:true, confidence:{imageQuality:"ACCEPTABLE",segmentation:"HIGH",identity:.9,portionEvidence:"MEDIUM",preparationCertainty:.9,nutritionSourceMatch:"RESOLVED",recipeReviewStatus:"REVIEWED",finalPolicyVersion:1,overall:"MEDIUM",cappedBy:[]} },
    ], requiresUserConfirmation:true, confirmed:false, createdAt:new Date(0).toISOString(),
  };
}

test("blind prediction sums component intervals and preserves unknown optional macros", () => {
  const row=blindPredictionFromEstimate({sampleId:"s1",category:"plate",result:result(),algorithmVersion:"3",modelVersion:"m"});
  assert.ok(row);
  assert.equal(row?.predicted_central_g,150);
  assert.equal(row?.predicted_central_kcal,200);
  assert.equal(row?.predicted_central_protein_g,15);
  assert.equal(row?.predicted_central_carb_g,null);
});

test("blind prediction refuses to manufacture values when any component portion is insufficient", () => {
  const r=result();
  (r.items[0] as any).portion.confidence="INSUFFICIENT";
  assert.equal(blindPredictionFromEstimate({sampleId:"s1",category:"plate",result:r,algorithmVersion:"3",modelVersion:"m"}),null);
});
