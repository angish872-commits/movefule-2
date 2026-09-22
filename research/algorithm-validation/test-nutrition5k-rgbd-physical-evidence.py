import importlib.util
import json
import math
from pathlib import Path

import cv2
import numpy as np

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("n5phys",HERE/"nutrition5k-rgbd-physical-evidence.py")
mod=importlib.util.module_from_spec(spec); assert spec and spec.loader; spec.loader.exec_module(mod)


def test_synthetic_two_cm_food_volume(tmp_path: Path):
    # 100x100 depth; a 10x10 polygon at 33.9cm gives ~2cm food height.
    raw=np.full((100,100),3590,dtype=np.uint16)
    raw[20:31,20:31]=3390
    dp=tmp_path/"depth.png";cv2.imwrite(str(dp),raw)
    scene=tmp_path/"scene.json"
    # Polygon coordinates chosen to include approximately 11x11 pixels after rasterization.
    scene.write_text(json.dumps({"regions":[{"regionId":"r1","maskPolygon":[[.20,.20],[.30,.20],[.30,.30],[.20,.30]]}]}))
    out=tmp_path/"sidecar.json";payload=mod.build_sidecar(dp,scene,out,sample_id="x")
    r=payload["regions"][0];assert r["status"]=="COMPLETED"
    s=r["heightSamples"][0]
    assert 1.9 <= s["centralHeightCm"] <= 2.1
    expected=s["pixelArea"]*mod.PIXEL_AREA_CM2*s["centralHeightCm"]
    scale=r["scale"]["centralCmPerPixel"]
    reconstructed=s["pixelArea"]*(scale**2)*s["centralHeightCm"]
    assert math.isclose(expected,reconstructed,rel_tol=1e-9)
    assert payload["benchmark_provenance"]["truth_fields_used_for_inference"]==[]
