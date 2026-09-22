"""Bounded local FoodData Central lookup for the blind runtime validator.

The production algorithm consumes the same normalized food/nutrient catalogue
created by the bulk USDA importer.  This helper exists so a serious benchmark
can run without making thousands of live FoodData Central API calls.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path
from typing import Any

from .importer import normalize_name

CORE_IDS = {
    "energyKcal": (1008, 2047, 2048),
    "proteinG": (1003,),
    "carbG": (1005,),
    "fatG": (1004,),
    "fiberG": (1079,),
    "sodiumMg": (1093,),
}


def _data_type(value: str) -> str:
    v=(value or "").lower()
    if "foundation" in v:return "FOUNDATION"
    if "survey" in v or "fndds" in v:return "FNDDS"
    if "branded" in v:return "BRANDED"
    if "sr legacy" in v or v=="sr_legacy":return "SR_LEGACY"
    return "EXPERIMENTAL"


def _nutrients(conn: sqlite3.Connection, fdc_id: int) -> dict[str, float | None]:
    ids=sorted({x for vals in CORE_IDS.values() for x in vals})
    rows=conn.execute(
        f"SELECT nutrient_id, amount FROM fdc_food_nutrient WHERE fdc_id=? AND nutrient_id IN ({','.join('?' for _ in ids)}) AND amount IS NOT NULL",
        [fdc_id,*ids],
    ).fetchall()
    by={int(r[0]):float(r[1]) for r in rows if r[1] is not None and float(r[1])>=0}
    out={}
    for name, choices in CORE_IDS.items():
        out[name]=next((by[i] for i in choices if i in by),None)
    return out


def lookup_records(db_path: Path, queries: list[str], limit_per_query: int=40) -> dict[str, Any]:
    conn=sqlite3.connect(str(db_path));conn.row_factory=sqlite3.Row
    try:
        tables={r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if "fdc_food" not in tables or "fdc_food_nutrient" not in tables:
            raise ValueError("FoodData Central catalogue is not populated")
        fts_ready = "fdc_food_fts" in tables and bool(conn.execute("SELECT 1 FROM fdc_food_fts LIMIT 1").fetchone())
        result={}; total=0
        for original in queries:
            q=normalize_name(original)
            tokens=[t for t in q.split() if len(t)>=2]
            if not tokens:
                result[original]=[];continue
            # Bounded broad retrieval. Final lexical/preparation/source ranking is
            # done by the production TypeScript SourceResolver, not by this SQL.
            source_order="""CASE
                WHEN lower(f.data_type) LIKE '%foundation%' THEN 0
                WHEN lower(f.data_type) LIKE '%survey%' OR lower(f.data_type) LIKE '%fndds%' THEN 1
                WHEN lower(f.data_type) LIKE '%branded%' THEN 2
                ELSE 3 END"""
            if fts_ready:
                match = " AND ".join(f'"{token}"*' for token in tokens[:4])
                sql=f"""
                  SELECT f.fdc_id,f.data_type,f.description,f.normalized_name,f.publication_date,
                         b.gtin_upc,b.brand_owner
                  FROM fdc_food_fts fts
                  JOIN fdc_food f ON f.fdc_id=fts.fdc_id
                  LEFT JOIN fdc_branded_metadata b ON b.fdc_id=f.fdc_id
                  WHERE fdc_food_fts MATCH ?
                  ORDER BY {source_order}, bm25(fdc_food_fts), f.fdc_id DESC
                  LIMIT ?
                """
                rows=conn.execute(sql,[match,limit_per_query]).fetchall()
            else:
                clauses=[];params=[]
                for token in tokens[:4]:
                    clauses.append("(f.normalized_name LIKE ? OR lower(f.description) LIKE ?)")
                    params.extend([f"%{token}%",f"%{token}%"])
                sql=f"""
                  SELECT DISTINCT f.fdc_id,f.data_type,f.description,f.normalized_name,f.publication_date,
                         b.gtin_upc,b.brand_owner
                  FROM fdc_food f LEFT JOIN fdc_branded_metadata b ON b.fdc_id=f.fdc_id
                  WHERE {' AND '.join(clauses)}
                  ORDER BY {source_order}, f.fdc_id DESC
                  LIMIT ?
                """
                rows=conn.execute(sql,[*params,limit_per_query]).fetchall()
            records=[]
            for row in rows:
                nutrients=_nutrients(conn,int(row["fdc_id"]))
                portions=[float(r[0]) for r in conn.execute("SELECT gram_weight FROM fdc_food_portion WHERE fdc_id=? AND gram_weight IS NOT NULL AND gram_weight>0 LIMIT 20",(int(row["fdc_id"]),)).fetchall()]
                records.append({
                    "fdcId":int(row["fdc_id"]),"dataType":_data_type(row["data_type"]),"description":row["description"],
                    "normalizedName":row["normalized_name"] or normalize_name(row["description"]),"publicationDate":row["publication_date"],
                    "gtinUpc":row["gtin_upc"],"brandName":row["brand_owner"],"portionGramWeights":portions,
                    **nutrients,
                })
            result[original]=records;total+=len(records)
        return {"schema":"movefuel-runtime-fdc-lookup-v1","query_count":len(queries),"record_count_with_duplicates":total,"results":result}
    finally:
        conn.close()


def main()->int:
    ap=argparse.ArgumentParser();ap.add_argument("--db",type=Path,required=True);ap.add_argument("--queries",type=Path,required=True);ap.add_argument("--output",type=Path,required=True);ap.add_argument("--limit",type=int,default=40)
    a=ap.parse_args();qdoc=json.loads(a.queries.read_text(encoding="utf-8"));queries=qdoc.get("queries") if isinstance(qdoc,dict) else qdoc
    if not isinstance(queries,list) or not all(isinstance(q,str) for q in queries):raise ValueError("queries JSON must be an array of strings or {queries:[...]}")
    payload=lookup_records(a.db,queries,a.limit);a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");print(json.dumps({"query_count":payload["query_count"],"record_count_with_duplicates":payload["record_count_with_duplicates"],"output":str(a.output)},indent=2));return 0
if __name__=="__main__":raise SystemExit(main())
