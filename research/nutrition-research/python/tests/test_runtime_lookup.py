import sqlite3
from pathlib import Path
from movefuel_fdc.catalogue_schema import schema_sql
from movefuel_fdc.runtime_lookup import lookup_records

def test_runtime_lookup_returns_core_nutrients_and_optional_missing(tmp_path:Path):
    db=tmp_path/'x.sqlite';c=sqlite3.connect(db);c.executescript(schema_sql())
    c.execute("INSERT INTO fdc_food VALUES(?,?,?,?,?,?,?,?)",(1,'Foundation','Rice, white, cooked','rice white cooked',None,'2026-04-01','04-2026',None))
    c.execute("INSERT INTO fdc_food_nutrient(id,fdc_id,nutrient_id,amount,release) VALUES(1,1,1008,130,'04-2026')")
    c.execute("INSERT INTO fdc_food_nutrient(id,fdc_id,nutrient_id,amount,release) VALUES(2,1,1003,2.7,'04-2026')")
    c.commit();c.close()
    out=lookup_records(db,['rice cooked'])
    row=out['results']['rice cooked'][0]
    assert row['energyKcal']==130
    assert row['proteinG']==2.7
    assert row['fiberG'] is None
