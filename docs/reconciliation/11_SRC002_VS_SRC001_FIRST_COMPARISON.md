# SRC-002 vs SRC-001 — First Algorithm Comparison

This is the first semantic pass over code actually present in the uploaded old ZIP (SRC-002) against the newer historical source (SRC-001).

## Main conclusion

SRC-002 contains useful safety ideas and an older Training Engine 5 facade, but it is **partial and non-runnable as uploaded** because most of its imported modules are absent. SRC-001 contains the broader backend, canonical contracts, versioned algorithms, tests, database integration and the complete 16-file training core.

The canonical strategy is therefore **not** “copy the newer repo blindly.” For the algorithms represented in SRC-002, use SRC-001 as the implementation base and merge specific stronger invariants from SRC-002 where they are still valuable.

## Algorithm decisions from the code now compared

| Algorithm | SRC-002 evidence | SRC-001 evidence | Provisional decision |
|---|---|---|---|
| ALG-001 Age & Eligibility Policy | Explicit youth restrictions and restrictive-goal blocking, but depends on missing constants and is standalone | Versioned canonical target policy, UNKNOWN handling, persistence eligibility, explicit youth/general-guidance behavior | **KEEP_AND_IMPROVE SRC-001**; preserve SRC-002's explicit prohibition metadata as policy/UX reason codes |
| ALG-028 Trusted Nutrient Calculator | Only referenced through a missing `nutrient-engine.mjs`; no calculator implementation in ZIP | Real deterministic basis/grams calculator with missing-data semantics and range support | **KEEP SRC-001** |
| ALG-041 Dietary Compatibility Guard | Good hard-gate ordering concept (age → allergy → diet), but allergen/diet modules are missing | Structured user-declared profile policy + deterministic candidate validation/ranking | **MERGE INVARIANT INTO SRC-001**; hard safety gates must remain before ranking |
| ALG-053 Meal Plan Generator | `NutritionService.planWeek()` calls a missing weekly planner | Registry/newer code still does not evidence a full prescriptive planner | **MISSING_IMPLEMENT**; old facade is not proof of implementation |
| ALG-058 Adult Fasting Eligibility & Session-State | Old policy disables fasting prescription; no session-state implementation | Newer target policy blocks restrictive behavior but registry says fasting lifecycle is planned only | **MISSING_IMPLEMENT / POLICY DEFAULT SAFE**; do not claim the old code implements session state |
| ALG-061 Exercise Safety & Eligibility Filter | Useful equipment/location/experience/youth/recovery gates; includes movement-skill and explicit `youthSafe` concepts | Stronger canonical contracts, UNKNOWN handling, readiness stop, contraindications, deterministic reason codes | **MERGE**; base on SRC-001 and consider preserving movement-skill/catalog youth-safe checks where supported by Training Knowledge |
| ALG-063 Equipment Compatibility Filter | Explicit required-equipment rejection | Equivalent structured filter exists in SRC-001 policy | **KEEP SRC-001** |
| ALG-067 Training Program Generator | Old engine exposes a broad facade but most imported implementation files are missing in ZIP | Complete deterministic orchestration across normalized profile → state → intent → requirements → eligibility → scoring → session → validation | **KEEP_AND_IMPROVE SRC-001** |
| ALG-068 Readiness State Engine | Simple pain/illness STOP, self-report mean, FULL/REDUCED/RECOVERY states | Adds bounded inputs, health STOP/CAUTION, workload context, UNKNOWN/device quality, stronger confidence/reason codes | **KEEP_AND_IMPROVE SRC-001**; multiplier thresholds remain calibratable policy, not copied blindly |
| ALG-069 Muscle Recovery / Fatigue Estimator | Only a coarse `recoveryStatus` input affects high-fatigue exercise eligibility | Newer code still only partially represents recovery/fatigue | **REWRITE/IMPLEMENT CANONICAL** using raw observations + workload + region/muscle evidence |
| ALG-070 Training Workload Estimator | Old safety code has weekly-set caps and sudden workload ratio checks | Newer program state tracks recent sets and readiness can consume workload ratio, but canonical workload estimation remains partial | **MERGE THEN IMPLEMENT**; preserve old hard guard concepts as versioned workload policy instead of burying them in eligibility code |
| ALG-071 Progression Decision Engine | Old facade references progression but the progression module is absent from uploaded source | Newer repo contains an actual bounded deterministic progression implementation | **KEEP_AND_IMPROVE SRC-001** |

## Important old-code concepts that should not be lost

1. Nutrition must never justify punishment training.
2. Under-fueling must never automatically increase training difficulty.
3. Youth restrictive nutrition behavior remains blocked.
4. Hard allergy/diet/eligibility filters run before recommendation ranking.
5. Pain/illness stops automatic training generation.
6. Sudden workload increase and excessive weekly set volume deserve explicit versioned policy checks.
7. Exercise movement-skill and youth-safety metadata should be supported if the canonical Training Knowledge catalog contains those fields.

## Old code that should not be copied as-is

- `NutritionService` facade: most dependencies are absent.
- Old Training Engine facade: exports/imports dozens of modules absent from the uploaded ZIP.
- Hard-coded thresholds should not be treated as scientifically final just because they appeared in the older engine.
- Build/dependency artifacts, `node_modules`, Android build products and macOS metadata are not canonical source.

## Next pass

The next comparison should drill through canonical algorithms in numerical order, starting with Profile + Targets (ALG-001 onward), and for each one compare exact logic, formulas, tests, database authority and safety before writing the final MoveFuel-2 implementation.
