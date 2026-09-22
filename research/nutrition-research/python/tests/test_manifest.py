import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from movefuel_fdc.release_manifest import (
    DownloadError,
    full_bundle_artifact,
    sha256_of_file,
    update_manifest,
    DownloadedRelease,
)
from movefuel_fdc.validator import validate_catalogue


class ReleaseManifestTests(unittest.TestCase):
    def test_bundle_artifact_points_at_fdc(self):
        artifact = full_bundle_artifact("2026-04-30")
        self.assertIn("https://fdc.nal.usda.gov/fdc-datasets/", artifact.url)
        self.assertIn("FoodData_Central_csv_2026-04-30.zip", artifact.name)

    def test_sha256_known(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "f.bin"
            path.write_bytes(b"movefuel test payload")
            digest = sha256_of_file(path)
            self.assertEqual(len(digest), 64)
            self.assertTrue(all(c in "0123456789abcdef" for c in digest))

    def test_manifest_update_and_dedupe(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "manifest.json"
            rec = DownloadedRelease(
                release="2026-04-30",
                name="FoodData_Central_csv_2026-04-30.zip",
                url="https://example.invalid/x.zip",
                file_size_bytes=1,
                sha256="a" * 64,
                downloaded_at_epoch=1,
                source_ref="x",
            )
            update_manifest(path, rec)
            rec2 = DownloadedRelease(
                release="2026-04-30",
                name="FoodData_Central_csv_2026-04-30.zip",
                url="https://example.invalid/y.zip",
                file_size_bytes=2,
                sha256="b" * 64,
                downloaded_at_epoch=2,
                source_ref="y",
            )
            update_manifest(path, rec2)
            import json

            records = json.loads(path.read_text())
            self.assertEqual(len(records), 1)
            self.assertEqual(records[0]["sha256"], "b" * 64)


class ValidatorTests(unittest.TestCase):
    def test_validate_empty_db_reports_zeroes(self):
        with tempfile.TemporaryDirectory() as td:
            db = Path(td) / "catalogue.sqlite"
            report = validate_catalogue(db)
            self.assertEqual(report["food_count"], 0)


if __name__ == "__main__":
    unittest.main()
