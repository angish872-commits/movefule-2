"""CSV import from a FoodData Central bulk bundle into SQLite.

Streams CSV rows straight from the zip archive into a SQLite catalogue.
Rejected or malformed rows are quarantined and counted, never silently
dropped.

The bulk bundle tables are imported under stable names:

  food, food_portion, food_nutrient, nutrient, food_category,
  foundation_food, survey_fndds_food, sr_legacy_food,
  experimental_food, branded_food, food_update_log_entry,
  wweia_food_category, retention_factor, food_nutrient_source,
  food_nutrient_derivation, measure_unit, food_component,
  food_attribute, food_calorie_conversion_factor,
  food_protein_conversion_factor, food_nutrient_conversion_factor

Additional tables in the bundle are preserved under their original names.
"""

from __future__ import annotations

import csv
import io
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator


@dataclass
class ImportRow:
    table: str
    row_index: int
    error: str | None = None
    row: dict | None = None


@dataclass
class ImportSummary:
    release: str
    tables: dict[str, int] = field(default_factory=dict)
    rejected: int = 0
    errors: list[ImportRow] = field(default_factory=list)

    def merge(self, other: "ImportSummary") -> None:
        for table, count in other.tables.items():
            self.tables[table] = self.tables.get(table, 0) + count
        self.rejected += other.rejected
        self.errors.extend(other.errors)


def iter_csv_rows(zip_path: Path, archive_prefix: str, table_name: str) -> Iterator[tuple[dict, int]]:
    """Yield (row, row_index) from a table CSV inside the bundle."""
    member = f"{archive_prefix}/{table_name}.csv"
    with zipfile.ZipFile(zip_path) as zf:
        with zf.open(member) as raw:
            text = io.TextIOWrapper(raw, encoding="utf-8-sig", errors="replace")
            reader = csv.DictReader(text)
            for index, row in enumerate(reader):
                yield row, index


def load_table_names(zip_path: Path, archive_prefix: str) -> list[str]:
    with zipfile.ZipFile(zip_path) as zf:
        names = []
        for name in zf.namelist():
            if not name.startswith(archive_prefix):
                continue
            relative = name[len(archive_prefix):].lstrip("/")
            if relative.endswith(".csv"):
                names.append(relative[:-4])
        return sorted(names)
