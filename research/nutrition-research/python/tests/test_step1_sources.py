import json
import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from movefuel_fdc.source_registry import artifact_by_id, artifacts_for_profile, source_manifest
from movefuel_fdc.knowledge_base import initialize_knowledge_base, validate_step1


class Step1SourceRegistryTests(unittest.TestCase):
    def test_registry_contains_expected_authoritative_sources(self):
        manifest = source_manifest()
        ids = {row["source_id"] for row in manifest["sources"]}
        self.assertTrue({"usda_fdc", "fao_infoods_density_v2", "nutrition5k", "nepal_food_composition_2017"}.issubset(ids))
        usda = next(row for row in manifest["sources"] if row["source_id"] == "usda_fdc")
        self.assertEqual(usda["licence"], "CC0-1.0")
        self.assertEqual(usda["status"], "approved")
        nepal = next(row for row in manifest["sources"] if row["source_id"] == "nepal_food_composition_2017")
        self.assertIn("reference_only", nepal["status"])

    def test_registered_urls_match_current_step1_release(self):
        full = artifact_by_id("usda_full_csv_2026_04_30")
        self.assertEqual(full.version, "2026-04-30")
        self.assertTrue(full.url.endswith("FoodData_Central_csv_2026-04-30.zip"))
        density = artifact_by_id("fao_density_v2_xlsx")
        self.assertTrue(density.url.endswith("density_DB_v2_0_final-1__1_.xlsx"))
        self.assertEqual(density.transport, "https")

    def test_profiles_are_bounded(self):
        step1 = {a.artifact_id for a in artifacts_for_profile("step1")}
        self.assertIn("usda_full_csv_2026_04_30", step1)
        self.assertNotIn("usda_branded_json_2026_04_30", step1)
        light = {a.artifact_id for a in artifacts_for_profile("lightweight")}
        self.assertNotIn("usda_full_csv_2026_04_30", light)
        self.assertIn("usda_foundation_json_2026_04_30", light)

    def test_schema_bootstrap_and_rights_hold(self):
        with tempfile.TemporaryDirectory() as td:
            db = Path(td) / "kb.sqlite"
            initialize_knowledge_base(db)
            report = validate_step1(db)
            self.assertGreaterEqual(report["source_count"], 5)
            self.assertGreaterEqual(report["regional_references_held_for_rights_review"], 2)
            self.assertFalse(report["knowledge_import_complete"])


if __name__ == "__main__":
    unittest.main()
