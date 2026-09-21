export type AlgorithmDisposition =
  | "KEEP"
  | "MERGE"
  | "REBUILD"
  | "MISSING"
  | "LATER";

export type AlgorithmFamily =
  | "PROFILE_TARGETS"
  | "PORTIONWISE"
  | "BARCODE"
  | "SEARCH_RECIPE_MEAL_PLAN"
  | "TRAINING_CORE"
  | "SPORTS"
  | "CALENDAR"
  | "TODAY"
  | "PROGRESS_BEHAVIOR"
  | "WATCH_SYNC"
  | "HEALTH_WEARABLES"
  | "AI_ORCHESTRATION"
  | "EXPERT_NETWORK"
  | "COMPETITIVE_DEPTH";

export interface AlgorithmRegistryEntry {
  id: number;
  code: string;
  name: string;
  family: AlgorithmFamily;
  disposition: AlgorithmDisposition;
  canonicalSource: string;
}

const e = (
  id: number,
  name: string,
  family: AlgorithmFamily,
  disposition: AlgorithmDisposition,
  canonicalSource: string,
): AlgorithmRegistryEntry => ({
  id,
  code: `MF-${String(id).padStart(3, "0")}`,
  name,
  family,
  disposition,
  canonicalSource,
});

export const ALGORITHM_REGISTRY: readonly AlgorithmRegistryEntry[] = [
  e(1,"Age & Eligibility Policy Algorithm","PROFILE_TARGETS","MERGE","MoveFuel-2 + Nutrition NEXT"),
  e(2,"Profile Completeness / Unknown Gate","PROFILE_TARGETS","KEEP","MoveFuel-2 core"),
  e(3,"Unit Normalization Algorithm","PROFILE_TARGETS","KEEP","new target engine"),
  e(4,"Activity Normalization Algorithm","PROFILE_TARGETS","KEEP","new target engine"),
  e(5,"Energy Target Estimator","PROFILE_TARGETS","MERGE","new target engine + age safety policy"),
  e(6,"Protein Target Estimator","PROFILE_TARGETS","MERGE","new target engine + age safety policy"),
  e(7,"Carbohydrate Target Allocator","PROFILE_TARGETS","MERGE","new target engine + age safety policy"),
  e(8,"Fat Target Allocator","PROFILE_TARGETS","MERGE","new target engine + age safety policy"),
  e(9,"Fiber Target Estimator","PROFILE_TARGETS","MERGE","new target engine + nutrition policy"),
  e(10,"Different-Target-by-Day Scheduler","PROFILE_TARGETS","REBUILD","MoveFuel-2"),
  e(11,"Meal-Level Target Distribution Algorithm","PROFILE_TARGETS","REBUILD","MoveFuel-2"),
  e(12,"Target Recalibration Algorithm","PROFILE_TARGETS","MERGE","new target engine + progress evidence"),
  e(13,"Target Evidence Sufficiency / HOLD Algorithm","PROFILE_TARGETS","MERGE","new target engine + core evidence"),
  e(14,"Target Revision Reason Generator","PROFILE_TARGETS","KEEP","new target engine"),

  e(15,"Camera Input Router","PORTIONWISE","KEEP","PortionWise 4.2"),
  e(16,"Image Quality Scorer","PORTIONWISE","KEEP","PortionWise 4.2"),
  e(17,"Food Region Detector","PORTIONWISE","KEEP","PortionWise 4.2"),
  e(18,"Food Segmentation Algorithm","PORTIONWISE","KEEP","PortionWise 4.2"),
  e(19,"Food Candidate Generator","PORTIONWISE","KEEP","PortionWise 4.2"),
  e(20,"Preparation-State Inference Algorithm","PORTIONWISE","KEEP","PortionWise 4.2"),
  e(21,"Food Identity Resolver","PORTIONWISE","MERGE","PortionWise 4.2 + canonical food resolution"),
  e(22,"Trusted Food-Source Resolver","PORTIONWISE","MERGE","PortionWise 4.2 + USDA/OFF authority"),
  e(23,"Physical Portion Evidence Extractor","PORTIONWISE","KEEP","PortionWise 4.2"),
  e(24,"Food Volume Estimator","PORTIONWISE","KEEP","PortionWise 4.2"),
  e(25,"Piece / Count Estimator","PORTIONWISE","KEEP","PortionWise 4.2"),
  e(26,"Density Selector","PORTIONWISE","KEEP","PortionWise 4.2"),
  e(27,"Mass-Range Estimator","PORTIONWISE","KEEP","PortionWise 4.2"),
  e(28,"Trusted Nutrient Calculator","PORTIONWISE","MERGE","PortionWise 4.2 + USDA/OFF"),
  e(29,"Uncertainty Propagation Algorithm","PORTIONWISE","KEEP","PortionWise 4.2"),
  e(30,"Confidence Calibration Algorithm","PORTIONWISE","KEEP","PortionWise 4.2"),
  e(31,"Clarification Question Selector","PORTIONWISE","MERGE","PortionWise 4.2 + Nutrition NEXT"),
  e(32,"User Correction Reconciler","PORTIONWISE","KEEP","PortionWise 4.2"),
  e(33,"Meal Draft Revision Algorithm","PORTIONWISE","KEEP","PortionWise 4.2"),
  e(34,"Canonical Meal Confirmation Algorithm","PORTIONWISE","KEEP","PortionWise 4.2"),
  e(35,"Daily Nutrition Aggregator","PORTIONWISE","MERGE","PortionWise 4.2 + Nutrition runtime"),
  e(36,"Confirmed Serving-Prior Learner","PORTIONWISE","KEEP","PortionWise 4.2"),

  e(37,"Barcode Normalizer","BARCODE","REBUILD","MoveFuel-2 barcode engine"),
  e(38,"Catalog Product Matcher","BARCODE","REBUILD","MoveFuel-2 + OpenFoodFacts/USDA"),
  e(39,"Catalog Freshness / Conflict Resolver","BARCODE","REBUILD","MoveFuel-2 barcode engine"),
  e(40,"Serving Quantity Scaler","BARCODE","MERGE","canonical nutrient engine"),
  e(41,"Dietary Compatibility Guard","BARCODE","MERGE","Nutrition NEXT policy"),
  e(42,"Allergy Caution / Escalation Gate","BARCODE","MERGE","Nutrition NEXT policy"),
  e(43,"Barcode Fallback Router","BARCODE","REBUILD","MoveFuel-2 provider router"),
  e(44,"Catalog Source Attribution Resolver","BARCODE","REBUILD","MoveFuel-2 evidence layer"),

  e(45,"Food Search Ranking Algorithm","SEARCH_RECIPE_MEAL_PLAN","MERGE","Nutrition NEXT + food catalog"),
  e(46,"Recent / Frequent / Favorite Ranker","SEARCH_RECIPE_MEAL_PLAN","REBUILD","MoveFuel-2"),
  e(47,"Default Serving Predictor","SEARCH_RECIPE_MEAL_PLAN","MERGE","Nutrition NEXT + serving priors"),
  e(48,"Recipe Ingredient Parser","SEARCH_RECIPE_MEAL_PLAN","MERGE","Nutrition NEXT + recipe import"),
  e(49,"Recipe Ingredient Resolver","SEARCH_RECIPE_MEAL_PLAN","MERGE","canonical food resolution"),
  e(50,"Recipe Nutrient Calculator","SEARCH_RECIPE_MEAL_PLAN","MERGE","canonical nutrient engine"),
  e(51,"Recipe Serving Scaler","SEARCH_RECIPE_MEAL_PLAN","REBUILD","MoveFuel-2"),
  e(52,"Web / Video Recipe Extraction Resolver","SEARCH_RECIPE_MEAL_PLAN","REBUILD","MoveFuel-2 YouTube/Web pipeline"),
  e(53,"Meal Plan Generator","SEARCH_RECIPE_MEAL_PLAN","MERGE","Nutrition NEXT"),
  e(54,"Budget-Aware Meal Planner","SEARCH_RECIPE_MEAL_PLAN","MERGE","Nutrition NEXT"),
  e(55,"Country / Region / Cuisine Matcher","SEARCH_RECIPE_MEAL_PLAN","MERGE","Nutrition NEXT"),
  e(56,"Grocery List Aggregator","SEARCH_RECIPE_MEAL_PLAN","MERGE","Nutrition NEXT + shopping engine"),
  e(57,"Meal Timing Planner","SEARCH_RECIPE_MEAL_PLAN","REBUILD","MoveFuel-2"),
  e(58,"Adult Fasting Eligibility & Session-State Algorithm","SEARCH_RECIPE_MEAL_PLAN","LATER","adult-only future policy"),

  e(59,"Training Goal Classifier","TRAINING_CORE","KEEP","Training Engine 5"),
  e(60,"Sport / Modality Router","TRAINING_CORE","MERGE","Training Engine 5 + sports"),
  e(61,"Exercise Safety & Eligibility Filter","TRAINING_CORE","MERGE","Training Engine 5 + v1/v2 hard STOP gates"),
  e(62,"Exercise Selection / Ranking Algorithm","TRAINING_CORE","KEEP","Training Engine 5"),
  e(63,"Equipment Compatibility Filter","TRAINING_CORE","KEEP","Training Engine 5"),
  e(64,"Exercise Substitution Algorithm","TRAINING_CORE","KEEP","Training Engine 5"),
  e(65,"Time-Aware Session Sizer","TRAINING_CORE","KEEP","Training Engine 5"),
  e(66,"Workout Session Generator","TRAINING_CORE","KEEP","Training Engine 5"),
  e(67,"Training Program Generator","TRAINING_CORE","KEEP","Training Engine 5"),
  e(68,"Readiness State Engine","TRAINING_CORE","MERGE","Training Engine 5 + v3 recovery inputs"),
  e(69,"Muscle Recovery / Fatigue Estimator","TRAINING_CORE","MERGE","Training Engine 5 + v3 fatigue concepts"),
  e(70,"Training Workload Estimator","TRAINING_CORE","MERGE","Training Engine 5 + v3 workload concepts"),
  e(71,"Progression Decision Engine","TRAINING_CORE","KEEP","Training Engine 5"),
  e(72,"Load / Rep Recommendation Engine","TRAINING_CORE","KEEP","Training Engine 5"),
  e(73,"Deload / Adaptation Engine","TRAINING_CORE","MERGE","Training Engine 5 + v3 deload concepts"),
  e(74,"Exercise Preference / Exclusion Ranker","TRAINING_CORE","KEEP","Training Engine 5"),
  e(75,"Missed Workout Reconciler","TRAINING_CORE","KEEP","Training Engine 5"),
  e(76,"Workout Performance Reconciler","TRAINING_CORE","KEEP","Training Engine 5"),
  e(77,"Warm-Up Generator","TRAINING_CORE","REBUILD","MoveFuel-2 training"),
  e(78,"Cool-Down Generator","TRAINING_CORE","REBUILD","MoveFuel-2 training"),

  e(79,"Strength Training Planner","SPORTS","MERGE","Training Engine 5"),
  e(80,"Hypertrophy / Muscle-Emphasis Planner","SPORTS","MERGE","Training Engine 5"),
  e(81,"Running / Endurance Planner","SPORTS","MISSING","MoveFuel-2"),
  e(82,"Swimming Planner","SPORTS","MISSING","MoveFuel-2"),
  e(83,"Football / Soccer Performance Planner","SPORTS","MISSING","MoveFuel-2"),
  e(84,"Yoga Planner","SPORTS","MISSING","MoveFuel-2"),
  e(85,"Mobility Planner","SPORTS","MISSING","MoveFuel-2"),
  e(86,"General Cardio Planner","SPORTS","REBUILD","MoveFuel-2"),
  e(87,"Competition Taper / Peaking Planner","SPORTS","LATER","future sports depth"),
  e(88,"Cross-Training Interference Manager","SPORTS","LATER","future sports depth"),

  e(89,"Availability Normalizer","CALENDAR","KEEP","Training Engine 5"),
  e(90,"Calendar Constraint Solver","CALENDAR","KEEP","Training Engine 5"),
  e(91,"Workout Placement Optimizer","CALENDAR","KEEP","Training Engine 5"),
  e(92,"Recovery Spacing Optimizer","CALENDAR","KEEP","Training Engine 5"),
  e(93,"Meal Timing Placement Optimizer","CALENDAR","REBUILD","MoveFuel-2 nutrition/calendar"),
  e(94,"Calendar Conflict Resolver","CALENDAR","MERGE","Training Engine 5 + core calendar"),
  e(95,"Calendar Stale-Revision Reconciler","CALENDAR","MERGE","Training Engine 5 + sync contracts"),

  e(96,"Today Candidate Validator","TODAY","REBUILD","MoveFuel-2 Today orchestrator"),
  e(97,"Today Next-Best-Action Ranker","TODAY","REBUILD","MoveFuel-2 Today orchestrator"),
  e(98,"Today Stale / Unknown Suppression Algorithm","TODAY","REBUILD","MoveFuel-2 Today orchestrator"),

  e(99,"Goal-Aware Progress Mode Selector","PROGRESS_BEHAVIOR","REBUILD","MoveFuel-2 Progress"),
  e(100,"Strength Progress Calculator","PROGRESS_BEHAVIOR","MERGE","Training Engine 5 + Progress"),
  e(101,"Swimming Progress Calculator","PROGRESS_BEHAVIOR","MISSING","MoveFuel-2 Progress"),
  e(102,"Running / Endurance Progress Calculator","PROGRESS_BEHAVIOR","MISSING","MoveFuel-2 Progress"),
  e(103,"Yoga / Mobility Progress Calculator","PROGRESS_BEHAVIOR","MISSING","MoveFuel-2 Progress"),
  e(104,"Nutrition Adherence / Trend Calculator","PROGRESS_BEHAVIOR","MERGE","Nutrition NEXT + Progress"),
  e(105,"Recovery / Sleep Trend Calculator","PROGRESS_BEHAVIOR","REBUILD","MoveFuel-2 Progress"),
  e(106,"Weight Trend Smoother","PROGRESS_BEHAVIOR","REBUILD","MoveFuel-2 Progress"),
  e(107,"Measurement Trend Calculator","PROGRESS_BEHAVIOR","REBUILD","MoveFuel-2 Progress"),
  e(108,"Weekly Report Generator","PROGRESS_BEHAVIOR","REBUILD","MoveFuel-2 Progress"),
  e(109,"Monthly Report Generator","PROGRESS_BEHAVIOR","REBUILD","MoveFuel-2 Progress"),
  e(110,"Data Quality / Anomaly Detector","PROGRESS_BEHAVIOR","REBUILD","MoveFuel-2 core"),
  e(111,"Weekly Check-In Question Selector","PROGRESS_BEHAVIOR","REBUILD","MoveFuel-2 Progress"),
  e(112,"Logging Break Detector","PROGRESS_BEHAVIOR","REBUILD","MoveFuel-2 behavior"),
  e(113,"Missed Workout Reason Classifier","PROGRESS_BEHAVIOR","MERGE","Training Engine 5 + behavior"),
  e(114,"Schedule Friction Detector","PROGRESS_BEHAVIOR","MERGE","Training Engine 5 + behavior"),
  e(115,"Adherence Pattern Analyzer","PROGRESS_BEHAVIOR","MERGE","Training Engine 5 + Nutrition NEXT"),

  e(116,"Watch Peer / Account Verification Algorithm","WATCH_SYNC","KEEP","Training Engine 5 watch/sync"),
  e(117,"Canonical Workout Delivery Revision Selector","WATCH_SYNC","KEEP","Training Engine 5 watch/sync"),
  e(118,"Offline Workout Journal Ordering Algorithm","WATCH_SYNC","KEEP","Training Engine 5 watch/sync"),
  e(119,"Sync Idempotency / Deduplication Algorithm","WATCH_SYNC","KEEP","Training Engine 5 + MoveFuel Core"),
  e(120,"Stale Event Rejection Algorithm","WATCH_SYNC","KEEP","Training Engine 5 + MoveFuel Core"),
  e(121,"Device / User Ownership Gate","WATCH_SYNC","KEEP","MoveFuel Core"),
  e(122,"Canonical Sync Reconciler","WATCH_SYNC","KEEP","Training Engine 5 + MoveFuel Core"),
  e(123,"Sync Receipt / ACK State Resolver","WATCH_SYNC","KEEP","Training Engine 5 + MoveFuel Core"),

  e(124,"Health Data Normalizer","HEALTH_WEARABLES","REBUILD","MoveFuel-2 Health"),
  e(125,"Health Source Dedupe / Priority Resolver","HEALTH_WEARABLES","REBUILD","MoveFuel-2 Health"),
  e(126,"Steps / Activity Aggregator","HEALTH_WEARABLES","REBUILD","MoveFuel-2 Health"),
  e(127,"Sleep Summary Extractor","HEALTH_WEARABLES","REBUILD","MoveFuel-2 Health"),
  e(128,"Imported Workout Reconciler","HEALTH_WEARABLES","REBUILD","MoveFuel-2 Health"),
  e(129,"Recovery Signal Extractor","HEALTH_WEARABLES","MERGE","MoveFuel-2 Health + Training Engine 5"),
  e(130,"Offline-to-Online State Merge Algorithm","HEALTH_WEARABLES","MERGE","MoveFuel Core sync"),

  e(131,"AI Provider / Model Router","AI_ORCHESTRATION","REBUILD","MoveFuel-2 AI gateway"),
  e(132,"Structured Output Validator","AI_ORCHESTRATION","MERGE","Nutrition NEXT + MoveFuel-2"),
  e(133,"Provider Fallback / Abstention Engine","AI_ORCHESTRATION","REBUILD","MoveFuel-2 AI gateway"),
  e(134,"Evidence Grounding Checker","AI_ORCHESTRATION","REBUILD","MoveFuel-2 AI gateway"),
  e(135,"AI Cost / Token Policy Router","AI_ORCHESTRATION","REBUILD","MoveFuel-2 AI gateway"),
  e(136,"Explanation / Reason-Code Generator","AI_ORCHESTRATION","MERGE","Training Engine 5 + MoveFuel-2"),

  e(137,"Expert Specialty Matcher","EXPERT_NETWORK","LATER","future expert network"),
  e(138,"Expert Credential / Scope Validator","EXPERT_NETWORK","LATER","future expert network"),
  e(139,"User Data Scope Resolver","EXPERT_NETWORK","LATER","future expert network"),
  e(140,"Expert Report Generator","EXPERT_NETWORK","LATER","future expert network"),
  e(141,"Expert Proposal Scope Validator","EXPERT_NETWORK","LATER","future expert network"),
  e(142,"Proposal Conflict Detector","EXPERT_NETWORK","LATER","future expert network"),
  e(143,"Multi-Expert Conflict Resolver","EXPERT_NETWORK","LATER","future expert network"),
  e(144,"Expert Proposal Canonicalization Engine","EXPERT_NETWORK","LATER","future expert network"),
  e(145,"Creator-vs-Professional Content Classifier","EXPERT_NETWORK","LATER","future expert network"),
  e(146,"Sponsorship / Conflict-of-Interest Labeler","EXPERT_NETWORK","LATER","future expert network"),
  e(147,"Expert Alert Triage Algorithm","EXPERT_NETWORK","LATER","future expert network"),
  e(148,"Marketplace Quality / Reputation Ranker","EXPERT_NETWORK","LATER","future expert network"),
  e(149,"Moderation / Risk Triage Algorithm","EXPERT_NETWORK","LATER","future expert network"),
  e(150,"Clinical-Lane Routing Gate","EXPERT_NETWORK","LATER","future expert network"),
  e(151,"Consent Expiry / Revocation Resolver","EXPERT_NETWORK","LATER","future expert network"),

  e(152,"Dynamic Energy Expenditure Estimator","COMPETITIVE_DEPTH","LATER","future validated model"),
  e(153,"Partial Logging Quality Classifier","COMPETITIVE_DEPTH","REBUILD","MoveFuel-2 nutrition"),
  e(154,"Weekly Target Adjustment Smoother","COMPETITIVE_DEPTH","REBUILD","MoveFuel-2 targets"),
  e(155,"Full Nutrient Adequacy Analyzer","COMPETITIVE_DEPTH","MERGE","Nutrition NEXT"),
  e(156,"Food Nutrient Contribution Ranker","COMPETITIVE_DEPTH","MERGE","Nutrition NEXT"),
  e(157,"Cross-Metric Correlation Analyzer","COMPETITIVE_DEPTH","LATER","future analytics"),
  e(158,"Recipe Recommendation Ranker","COMPETITIVE_DEPTH","MERGE","Nutrition NEXT + recipes"),
  e(159,"Meal Plan Swap / Replan Optimizer","COMPETITIVE_DEPTH","MERGE","Nutrition NEXT"),
  e(160,"Household Meal Portion Planner","COMPETITIVE_DEPTH","LATER","future household"),
  e(161,"Nutrition Label Extraction / Resolver","COMPETITIVE_DEPTH","REBUILD","MoveFuel-2 food pipeline"),
  e(162,"Restaurant / Menu Candidate Resolver","COMPETITIVE_DEPTH","LATER","future restaurant data"),
  e(163,"Estimated Strength / 1RM Model","COMPETITIVE_DEPTH","REBUILD","MoveFuel-2 training"),
  e(164,"Training Volume Balance Optimizer","COMPETITIVE_DEPTH","MERGE","Training Engine 5"),
  e(165,"Superset / Circuit Composer","COMPETITIVE_DEPTH","REBUILD","MoveFuel-2 training"),
  e(166,"Workout Refresh Trigger Orchestrator","COMPETITIVE_DEPTH","MERGE","Training Engine 5 + Today"),
  e(167,"Behavior Intervention Ranker","COMPETITIVE_DEPTH","REBUILD","MoveFuel-2 behavior")
] as const;

export function getAlgorithmById(id: number): AlgorithmRegistryEntry | undefined {
  return ALGORITHM_REGISTRY.find((entry) => entry.id === id);
}

export function getAlgorithmsByFamily(
  family: AlgorithmFamily,
): readonly AlgorithmRegistryEntry[] {
  return ALGORITHM_REGISTRY.filter((entry) => entry.family === family);
}

export function assertRegistryIntegrity(): void {
  if (ALGORITHM_REGISTRY.length !== 167) {
    throw new Error(`Expected 167 algorithms, found ${ALGORITHM_REGISTRY.length}`);
  }

  const ids = new Set(ALGORITHM_REGISTRY.map((entry) => entry.id));
  if (ids.size !== 167 || !ids.has(1) || !ids.has(167)) {
    throw new Error("Algorithm registry IDs must be unique and cover 1..167");
  }
}
