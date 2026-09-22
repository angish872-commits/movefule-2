import json
import sqlite3
import tempfile
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from movefuel_fdc.all_data_audit import (
    audit_density_records,
    audit_nutrition5k_files,
    audit_source_ledger,
    audit_usda_catalogue,
)
from movefuel_fdc.catalogue_schema import schema_sql
from movefuel_fdc.knowledge_schema import knowledge_schema_sql


def test_usda_audit_passes_clean_minimal_catalogue():
    with tempfile.TemporaryDirectory() as td:
        db = Path(td) / "food.sqlite"
        conn = sqlite3.connect(db)
        conn.executescript(schema_sql())
        conn.execute("INSERT INTO fdc_food VALUES(?,?,?,?,?,?,?,?)", (1,"Foundation","rice","rice",None,"2026-04-30","2026-04-30",None))
        conn.execute("INSERT INTO fdc_nutrient_definition VALUES(?,?,?,?,?)", (1008,"Energy","kcal","208",None))
        conn.execute("INSERT INTO fdc_nutrient_definition VALUES(?,?,?,?,?)", (1003,"Protein","g","203",None))
        conn.execute("INSERT INTO fdc_nutrient_definition VALUES(?,?,?,?,?)", (1004,"Total lipid (fat)","g","204",None))
        conn.execute("INSERT INTO fdc_nutrient_definition VALUES(?,?,?,?,?)", (1005,"Carbohydrate, by difference","g","205",None))
        for i,(nut,amt) in enumerate(((1008,130.0),(1003,2.4),(1004,0.3),(1005,28.0)),1):
            conn.execute("INSERT INTO fdc_food_nutrient(id,fdc_id,nutrient_id,amount,release) VALUES(?,?,?,?,?)",(i,1,nut,amt,"2026-04-30"))
        conn.commit(); conn.close()
        out = audit_usda_catalogue(db)
        assert out["status"] == "PASS"
        assert out["hard_issue_count"] == 0


def test_usda_audit_fails_negative_nutrient():
    with tempfile.TemporaryDirectory() as td:
        db = Path(td) / "food.sqlite"
        conn = sqlite3.connect(db); conn.executescript(schema_sql())
        conn.execute("INSERT INTO fdc_food VALUES(?,?,?,?,?,?,?,?)", (1,"Foundation","bad","bad",None,"2026-04-30","2026-04-30",None))
        conn.execute("INSERT INTO fdc_nutrient_definition VALUES(?,?,?,?,?)", (1008,"Energy","kcal","208",None))
        conn.execute("INSERT INTO fdc_food_nutrient(id,fdc_id,nutrient_id,amount,release) VALUES(?,?,?,?,?)",(1,1,1008,-1.0,"2026-04-30"))
        conn.commit(); conn.close()
        out = audit_usda_catalogue(db)
        assert out["status"] == "FAIL"
        assert out["issues"]["negative_nutrient_amounts"] == 1


def test_density_audit_checks_interval_order():
    with tempfile.TemporaryDirectory() as td:
        db = Path(td) / "kb.sqlite"
        conn=sqlite3.connect(db); conn.executescript(knowledge_schema_sql())
        conn.execute("INSERT INTO kb_source VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",("s","s","p","density",1,"g","x","l","u","c","a","ok",""))
        conn.execute("""INSERT INTO kb_density_record(density_id,source_id,source_version,source_row_id,food_name,normalized_food_name,preparation,physical_form,density_central_g_ml,density_min_g_ml,density_max_g_ml,region,evidence_quality,source_reference,source_notes,raw_json,active,imported_at_epoch) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                     ("d","s","1","1","rice","rice","cooked",None,0.8,0.7,0.9,None,"measured","ref",None,"{}",1,1))
        conn.commit(); conn.close()
        assert audit_density_records(db)["status"] == "PASS"


def test_nutrition5k_audit_detects_split_leakage_and_blank_name():
    with tempfile.TemporaryDirectory() as td:
        root=Path(td)
        (root/"metadata").mkdir(); (root/"dish_ids"/"splits").mkdir(parents=True)
        # one dish, two ingredients where one name is blank
        row=["dish_0000000001","100","100","5","10","10","2","ingr_0000000001","rice","50","60","1","8","1","ingr_0000000002","","50","40","4","2","9"]
        with (root/"metadata"/"dish_metadata_cafe1.csv").open("w",newline="") as f:
            import csv; csv.writer(f).writerow(row)
        (root/"dish_ids"/"splits"/"rgb_train_ids.txt").write_text("dish_0000000001\n")
        (root/"dish_ids"/"splits"/"rgb_test_ids.txt").write_text("dish_0000000001\n")
        out=audit_nutrition5k_files(root)
        assert out["blank_ingredient_name_dishes"] == 1
        assert out["split_overlap_dishes"] == 1
        assert out["status"] == "FAIL"


def test_source_ledger_has_no_unresolved_runtime_authority():
    ledger = Path(__file__).resolve().parents[3] / "algorithm-validation" / "verified-source-ledger-2026-08-10.json"
    out = audit_source_ledger(ledger)
    assert out["status"] == "PASS"
    assert out["source_count"] >= 10
