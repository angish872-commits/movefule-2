#!/usr/bin/env python3
from __future__ import annotations

import csv
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "SCREEN_REGISTRY_404.csv"
ARCH = ROOT / "app/src/main/java/com/movefuel/mufil2/ui/navigation/MoveFuelUiArchitecture.kt"
NAV = ROOT / "app/src/main/java/com/movefuel/mufil2/ui/navigation/MoveFuelNavGraph.kt"
BOTTOM = ROOT / "app/src/main/java/com/movefuel/mufil2/ui/components/MFBottomNav.kt"
TODAY = ROOT / "app/src/main/java/com/movefuel/mufil2/ui/master/TodayMasterDashboard.kt"
FUEL = ROOT / "app/src/main/java/com/movefuel/mufil2/ui/master/FuelMasterDashboard.kt"
PROGRESS = ROOT / "app/src/main/java/com/movefuel/mufil2/ui/master/ProgressMasterDashboard.kt"
TRAIN_STATE = ROOT / "app/src/main/java/com/movefuel/mufil2/ui/state/TrainStateStore.kt"
TRS_001 = ROOT / "app/src/main/java/com/movefuel/mufil2/ui/screens/trs/TRS_001_TrainSetupWelcome.kt"
TRS_020 = ROOT / "app/src/main/java/com/movefuel/mufil2/ui/screens/trs/TRS_020_PlanPreview.kt"
TOD_005 = ROOT / "app/src/main/java/com/movefuel/mufil2/ui/screens/tod/TOD_005_TodayWorkoutPreview.kt"
MASTER_SCAFFOLD = ROOT / "app/src/main/java/com/movefuel/mufil2/ui/components/MFMasterScaffold.kt"
PRG_TRAINING = [
    ROOT / f"app/src/main/java/com/movefuel/mufil2/ui/screens/prg/PRG_{number:03d}_{name}.kt"
    for number, name in (
        (17, "TrainingProgress"),
        (18, "StrengthProgress"),
        (19, "TrainingVolume"),
        (20, "WorkoutConsistency"),
        (21, "WorkoutDuration"),
    )
]
MASTER_DASHBOARDS = [
    ROOT / "app/src/main/java/com/movefuel/mufil2/ui/master/TodayMasterDashboard.kt",
    ROOT / "app/src/main/java/com/movefuel/mufil2/ui/master/FuelMasterDashboard.kt",
    ROOT / "app/src/main/java/com/movefuel/mufil2/ui/master/TrainMasterDashboard.kt",
    ROOT / "app/src/main/java/com/movefuel/mufil2/ui/master/ProgressMasterDashboard.kt",
]

with REGISTRY.open(newline="", encoding="utf-8") as fh:
    rows = list(csv.reader(fh))

ids = [row[0] for row in rows if row]
counts = Counter(ids)
duplicates = sorted(k for k, v in counts.items() if v > 1)

arch_text = ARCH.read_text(encoding="utf-8")
nav_text = NAV.read_text(encoding="utf-8")
bottom_text = BOTTOM.read_text(encoding="utf-8")
today_text = TODAY.read_text(encoding="utf-8")
fuel_text = FUEL.read_text(encoding="utf-8")
progress_text = PROGRESS.read_text(encoding="utf-8")
train_state_text = TRAIN_STATE.read_text(encoding="utf-8")
trs_001_text = TRS_001.read_text(encoding="utf-8")
trs_020_text = TRS_020.read_text(encoding="utf-8")
tod_005_text = TOD_005.read_text(encoding="utf-8")
master_scaffold_text = MASTER_SCAFFOLD.read_text(encoding="utf-8")
prg_training_texts = [path.read_text(encoding="utf-8") for path in PRG_TRAINING]
master_dashboard_texts = [path.read_text(encoding="utf-8") for path in MASTER_DASHBOARDS]

mapped_list = re.findall(r'"([A-Z]{3,4}_\d{3})"\s+to\s+MoveFuelFlowAction', arch_text)
mapped_counts = Counter(mapped_list)
mapped = set(mapped_list)
mapped_duplicates = sorted(k for k, v in mapped_counts.items() if v > 1)

domain_ids = [sid for sid in ids if not sid.startswith("MASTER_")]
semantic_required = [sid for sid in domain_ids if not sid.startswith("SYS_")]
missing_semantics = sorted(set(semantic_required) - mapped)
unknown_semantics = sorted(mapped - set(domain_ids))

nav_routes = set(re.findall(r'MoveFuelRoute\.([A-Z]+_\d+|MASTER_[A-Z]+)\.path', nav_text))
missing_nav = sorted(set(ids) - nav_routes)

required_bottom_labels = {"Today", "Fuel", "Train", "Progress"}
bottom_labels = set(re.findall(r'NavItem\("([^"]+)"', bottom_text))

checks = {
    "registry_has_404_entries": len(ids) == 404,
    "registry_ids_unique": not duplicates,
    "all_non_system_screens_have_semantic_actions": not missing_semantics,
    "semantic_action_ids_are_known": not unknown_semantics,
    "semantic_action_ids_unique": not mapped_duplicates,
    "all_registry_routes_are_in_nav_graph": not missing_nav,
    "bottom_nav_is_exactly_four_primary_destinations": bottom_labels == required_bottom_labels,
    "today_uses_horizontal_metric_bars": "MFDailyMetricBar" in today_text and "MFMetricRing" not in today_text,
    "today_next_action_is_state_driven": "state.nextAction" in today_text and "onNavigate(action.route)" in today_text,
    "fuel_has_four_connected_subsections": all(
        route in fuel_text
        for route in ("FNO_001", "FPL_001", "FSH_001", "RCP_001")
    ),
    "wear_sync_pending_does_not_jump_to_system_loading":
        '"WAR_012" to MoveFuelFlowAction("Retry sync", MoveFuelRoute.WAR_012' in arch_text,
    "workout_summary_closes_to_train_and_progress":
        '"WRK_032" to MoveFuelFlowAction("Done", MoveFuelRoute.MASTER_TRAIN, "View Progress", MoveFuelRoute.MASTER_PROGRESS)' in arch_text,
    "planned_recipe_logging_requires_review":
        '"RCP_014" to MoveFuelFlowAction("Review serving before logging", MoveFuelRoute.FNO_012' in arch_text,

    # Final UI closure flags from the real 404-registry audit.
    "train_state_is_datastore_backed":
        "preferencesDataStore" in train_state_text
        and "enum class TrainState" in train_state_text
        and "TrainStateStore.observeState" in nav_text,
    "train_tab_routes_by_train_state":
        "requestedRoute == MoveFuelRoute.MASTER_TRAIN -> trainEntryRoute()" in nav_text
        and "TrainState.SetupIncomplete" in nav_text
        and "TrainState.PlanPreview" in nav_text
        and "TrainState.Active" in nav_text,
    "onb_014_015_are_not_targets_in_global_flow":
        "MoveFuelRoute.ONB_014" not in arch_text
        and "MoveFuelRoute.ONB_015" not in arch_text,
    "trs_001_hosts_quick_and_personalized_choice":
        "Quick setup" in trs_001_text
        and "Personalize Train" in trs_001_text
        and "showStartChoice" in trs_001_text
        and "onNavigate(MoveFuelRoute.TRS_002)" in trs_001_text,
    "trs_020_activation_is_action_and_persists_active":
        "onActivate" in trs_020_text
        and "primaryRoute = null" in trs_020_text
        and "TrainStateStore.markActive(context)" in nav_text
        and "TRS020PlanPreviewScreen(navigate, onActivate = activateTrainPlan)" in nav_text,
    "tod_005_never_fabricates_unconfigured_workout":
        "TrainState.NotConfigured" in tod_005_text
        and "Training isn't set up yet" in tod_005_text
        and "TrainState.Active" in tod_005_text
        and "TOD005TodayWorkoutPreviewScreen(navigate, trainState = trainState)" in nav_text,
    "training_progress_is_unavailable_until_train_active":
        all(
            "trainState == TrainState.Active" in text
            and "Training progress unavailable" in text
            and "no made-up workout totals" in text
            for text in prg_training_texts
        ),
    "all_four_master_headers_use_single_calendar":
        "MoveFuelRoute.CAL_001" in master_scaffold_text
        and all("MFMasterScaffold(" in text for text in master_dashboard_texts),
    "all_four_master_headers_use_single_profile":
        "MoveFuelRoute.PRO_001" in master_scaffold_text
        and all("MFMasterScaffold(" in text for text in master_dashboard_texts),
}

print("MoveFuel Mufil-2 closed-loop static audit")
print(f"Registry entries: {len(ids)}")
print(f"Domain/state screens: {len(domain_ids)}")
print(f"Semantic-required screens: {len(semantic_required)}")
print(f"Mapped semantic actions: {len(mapped)}")
print(f"Navigation routes discovered: {len(nav_routes)}")

if duplicates:
    print("Duplicate registry IDs:", ", ".join(duplicates))
if mapped_duplicates:
    print("Duplicate semantic action IDs:", ", ".join(mapped_duplicates))
if missing_semantics:
    print("Missing semantic action mappings:", ", ".join(missing_semantics))
if unknown_semantics:
    print("Unknown semantic action mappings:", ", ".join(unknown_semantics))
if missing_nav:
    print("Missing NavGraph routes:", ", ".join(missing_nav))
if bottom_labels != required_bottom_labels:
    print("Bottom navigation labels:", sorted(bottom_labels))

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(f"[{'PASS' if ok else 'FAIL'}] {name}")

if failed:
    raise SystemExit("Closed-loop audit failed: " + ", ".join(failed))

print("Closed-loop static audit passed.")
