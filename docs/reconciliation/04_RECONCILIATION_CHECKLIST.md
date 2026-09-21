# Full Reconciliation Checklist

## Gate A — Repository and sources

- [x] MoveFuel-2 integration repository exists.
- [x] Verified `Mufil-2` baseline imported.
- [x] Dedicated reconciliation branch created.
- [x] Reconciliation plan created.
- [x] Source registry created.
- [ ] Mufil-1 frozen/imported.
- [ ] Any separate Mufil-2 legacy snapshot frozen/imported.
- [ ] Any other MoveFuel legacy source frozen/imported.
- [ ] G/latest ZIP frozen/imported.
- [ ] File inventories generated for every source.

## Gate B — Data architecture

- [ ] Reconcile 81 core definitions.
- [ ] Reconcile 29 proposed additions.
- [ ] Reconcile 15 food/barcode definitions.
- [ ] Reconcile 141 training definitions.
- [ ] Reconcile 32 Android SQLite definitions.
- [ ] Reconcile 4 Wear SQLite definitions.
- [ ] Add newly discovered source tables.
- [ ] Lock canonical logical entities and ownership.
- [ ] Lock physical persistence boundaries.

## Gate C — Formula registry

- [ ] F01 Energy
- [ ] F02 Macronutrients
- [ ] F03 Micronutrients/Hydration
- [ ] F04 Food/Portion
- [ ] F05 Training Workload
- [ ] F06 Readiness/Recovery
- [ ] F07 Progression/Adaptation
- [ ] F08 Progress/Statistics/Confidence
- [ ] Versioning/evidence/test vectors implemented.

## Gate D — 167 algorithms

- [ ] Inventory all implementations.
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
- [ ] Connect all relevant controls across 400 domain screens.
- [ ] Validate 4 master dashboards.

## Gate F — Release quality

- [ ] End-to-end tests.
- [ ] Scientific/algorithm validation.
- [ ] Security/privacy validation.
- [ ] Performance/load validation.
- [ ] Observability and audit trails.
- [ ] Migration/recovery tests.
- [ ] Canonical build branch created.
