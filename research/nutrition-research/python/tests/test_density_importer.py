import sqlite3
import tempfile
import unittest
from pathlib import Path
import sys

from openpyxl import Workbook

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from movefuel_fdc.density_importer import import_density_xlsx
from movefuel_fdc.knowledge_base import initialize_knowledge_base, search_density


class DensityImporterTests(unittest.TestCase):
    def test_header_detection_import_quarantine_and_search(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            xlsx = root / "density.xlsx"
            wb = Workbook()
            ws = wb.active
            ws.title = "Density database"
            ws.append(["FAO density table", None, None, None])
            ws.append(["Food name", "Preparation", "Density g/ml", "Reference"])
            ws.append(["Rice, white", "cooked", 0.81, "source A"])
            ws.append(["Leafy salad", "raw", "0.34", "source B"])
            ws.append(["Broken row", "raw", "not available", "source C"])
            wb.save(xlsx)

            db = root / "kb.sqlite"
            initialize_knowledge_base(db)
            result = import_density_xlsx(xlsx, db)
            self.assertEqual(result.rows_seen, 3)
            self.assertEqual(result.rows_imported, 2)
            self.assertEqual(result.rows_rejected, 1)

            rice = search_density(db, "rice white", "cooked")
            self.assertEqual(len(rice), 1)
            self.assertAlmostEqual(rice[0]["density_central_g_ml"], 0.81)
            conn = sqlite3.connect(db)
            try:
                quarantined = conn.execute("SELECT count(*) FROM kb_quarantine").fetchone()[0]
            finally:
                conn.close()
            self.assertEqual(quarantined, 1)


if __name__ == "__main__":
    unittest.main()
