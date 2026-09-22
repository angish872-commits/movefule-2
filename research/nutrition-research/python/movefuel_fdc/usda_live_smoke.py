"""Small live FoodData Central readiness probe.

No API key is written to disk or output.  This is intentionally a smoke test,
not the production bulk-ingestion path.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

DEFAULT_QUERIES = [
    "banana raw",
    "rice white long-grain cooked",
    "chicken breast cooked roasted",
    "egg whole cooked hard-boiled",
    "apple raw with skin",
    "yogurt plain whole milk",
]


def _energy_kcal(food: dict) -> float | None:
    nutrients = food.get("foodNutrients") or []
    candidates = []
    for item in nutrients:
        name = str(item.get("nutrientName") or item.get("name") or "").lower()
        unit = str(item.get("unitName") or item.get("unit") or "").lower()
        value = item.get("value") if item.get("value") is not None else item.get("amount")
        if value is None:
            continue
        if "energy" in name and unit in {"kcal", "cal"}:
            candidates.append(float(value))
    return candidates[0] if candidates else None


def run_usda_smoke(*, api_key: str | None = None, queries: list[str] | None = None, timeout: float = 20.0) -> dict:
    key = (api_key or os.getenv("USDA_FDC_API_KEY") or os.getenv("FDC_API_KEY") or "DEMO_KEY").strip()
    results = []
    for query in queries or DEFAULT_QUERIES:
        url = "https://api.nal.usda.gov/fdc/v1/foods/search?" + urlencode({
            "api_key": key,
            "query": query,
            "pageSize": 3,
        })
        req = Request(url, headers={"Accept": "application/json", "User-Agent": "MoveFuel-Algorithm-V4/1.0"})
        with urlopen(req, timeout=timeout) as response:  # noqa: S310 - fixed official HTTPS host
            payload = json.loads(response.read().decode("utf-8"))
        foods = payload.get("foods") or []
        top = foods[0] if foods else None
        results.append({
            "query": query,
            "match": None if top is None else {
                "fdcId": top.get("fdcId"),
                "description": top.get("description"),
                "dataType": top.get("dataType"),
                "energyKcalPer100gOrReportedBasis": _energy_kcal(top),
            },
        })
    return {
        "status": "COMPLETED",
        "source": "USDA FoodData Central API",
        "apiKeySource": "private_env" if api_key or os.getenv("USDA_FDC_API_KEY") or os.getenv("FDC_API_KEY") else "DEMO_KEY",
        "queries": results,
    }


def write_smoke(path: Path, **kwargs) -> dict:
    result = run_usda_smoke(**kwargs)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return result
