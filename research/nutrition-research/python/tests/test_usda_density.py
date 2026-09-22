import sqlite3
from pathlib import Path

from movefuel_fdc.catalogue_schema import schema_sql
from movefuel_fdc.knowledge_base import initialize_knowledge_base
from movefuel_fdc.usda_density import derive_usda_portion_densities


def test_derives_density_only_from_real_volume_units(tmp_path: Path):
    db=tmp_path/"x.sqlite"; initialize_knowledge_base(db)
    c=sqlite3.connect(db); c.executescript(schema_sql())
    c.execute("INSERT INTO fdc_food(fdc_id,data_type,description,normalized_name,release) VALUES(1,'Foundation','Rice, cooked','rice cooked','2026-04-30')")
    c.execute("INSERT INTO fdc_measure_unit(id,name,abbreviation) VALUES(1000,'cup','cup')")
    c.execute("INSERT INTO fdc_measure_unit(id,name,abbreviation) VALUES(1001,'piece','piece')")
    c.execute("INSERT INTO fdc_food_portion(id,fdc_id,amount,measure_unit_id,gram_weight) VALUES(10,1,1,'1000',186)")
    c.execute("INSERT INTO fdc_food_portion(id,fdc_id,amount,measure_unit_id,gram_weight) VALUES(11,1,1,'1001',50)")
    c.commit(); c.close()
    r=derive_usda_portion_densities(db)
    assert r["records_written"] == 1 and r["portion_rows_used"] == 1
    c=sqlite3.connect(db)
    row=c.execute("SELECT source_id,density_central_g_ml,evidence_quality FROM kb_density_record").fetchone();c.close()
    assert row[0] == "usda_fdc" and row[2] == "DERIVED"
    assert 0.75 < row[1] < 0.82


def test_multiple_volume_portions_produce_observed_range(tmp_path: Path):
    db=tmp_path/"x.sqlite"; initialize_knowledge_base(db)
    c=sqlite3.connect(db); c.executescript(schema_sql())
    c.execute("INSERT INTO fdc_food(fdc_id,data_type,description,normalized_name,release) VALUES(1,'Survey','Yogurt','yogurt','2026-04-30')")
    c.execute("INSERT INTO fdc_measure_unit(id,name,abbreviation) VALUES(1,'cup','cup')")
    for i,g in enumerate([230,240,250],1):
        c.execute("INSERT INTO fdc_food_portion(id,fdc_id,amount,measure_unit_id,gram_weight) VALUES(?,1,1,'1',?)",(i,g))
    c.commit();c.close()
    derive_usda_portion_densities(db)
    c=sqlite3.connect(db);lo,mid,hi=c.execute("SELECT density_min_g_ml,density_central_g_ml,density_max_g_ml FROM kb_density_record").fetchone();c.close()
    assert lo < mid < hi
