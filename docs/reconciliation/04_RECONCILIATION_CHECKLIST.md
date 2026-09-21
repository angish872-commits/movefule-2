# Full Reconciliation Checklist

## Gate A — Repository and sources
- [x] MoveFuel-2 integration repository exists.
- [x] Verified `Mufil-2` baseline imported.
- [x] Dedicated reconciliation branch created.
- [x] Reconciliation plan created.
- [x] Source registry created.
- [x] SRC-000 exact 459-file manifest generated.
- [x] Canonical 167-algorithm reconciliation matrix generated.
- [x] All 302 known database/resource definitions inventoried.
- [x] Safe ZIP intake and comparison protocol prepared.
- [x] ZIP fingerprint and manifest comparison helper tools added.
- [ ] Mufil-1 historical source frozen/imported.
- [ ] Any separate Mufil-2 legacy source frozen/imported.
- [ ] Any other MoveFuel historical source frozen/imported.
- [ ] G/latest ZIP frozen/imported.
- [ ] File inventories generated for every additional source.

## Gate B — Data architecture
- [x] Inventory: 81 core + 29 draft + 15 food/barcode + 141 training + 32 Android SQLite + 4 Wear SQLite = 302 source definitions.
- [ ] Reconcile 81 core definitions.
- [ ] Reconcile 29 proposed additions.
- [ ] Reconcile 15 food/barcode definitions.
- [ ] Reconcile 141 training definitions.
- [ ] Reconcile 32 Android SQLite definitions.
- [ ] Reconcile 4 Wear SQLite definitions.
- [ ] Add any newly discovered source tables.
- [ ] Lock canonical logical entities and ownership.
- [ ] Lock physical persistence boundaries.

## Gate C — Formula registry
- [ ] Discover formulas embedded across every historical source.
- [ ] Deduplicate formulas by behavior.
- [ ] F01 Energy.
- [ ] F02 Macronutrients.
- [ ] F03 Micronutrients/Hydration.
- [ ] F04 Food/Portion.
- [ ] F05 Training Workload.
- [ ] F06 Readiness/Recovery.
- [ ] F07 Progression/Adaptation.
- [ ] F08 Progress/Statistics/Confidence.
- [ ] Versioning/evidence/test vectors implemented.

## Gate D — 167 algorithms
- [x] Canonical names/families loaded into comparison matrix.
- [x] Legacy Notion implementation/file evidence loaded where present.
- [ ] Inventory implementations from every historical source.
- [ ] Map implementations to canonical algorithm IDs.
- [ ] Complete one reconciliation record per algorithm.
- [ ] Resolve duplicate algorithms.
- [ ] Resolve embedded duplicate formulas.
- [ ] Lock safety/policy dependencies.
- [ ] Implement missing algorithms.
- [ ] Add regression and canonical tests.

## Gate E — Application integration
- [ ] API/use-case contracts.
- [ ] Android Room/offline sync.
- [ ] Wear offline execution and receipts.
- [ ] Barcode/food provider integration.
- [ ] Recipe/YouTube import integration.
- [ ] AI/Jev bounded ranking/explanation layer.
- [ ] Connect relevant controls across all 400 domain screens.
- [ ] Validate four master dashboards.

## Gate F — Release quality
- [ ] End-to-end tests.
- [ ] Scientific/algorithm validation.
- [ ] Security/privacy validation.
- [ ] Performance/load validation.
- [ ] Observability and audit trails.
- [ ] Migration/recovery tests.
- [ ] Canonical build branch created.

## Current gate

**PRE-ZIP SETUP COMPLETE.** The next requested work requires the historical ZIP source(s). Freeze and inventory them before selecting algorithm winners or copying historical code into `Mufil-2`.
