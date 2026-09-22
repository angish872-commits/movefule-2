#!/usr/bin/env python3
"""Build MoveFuel physical-evidence sidecars from Nutrition5k overhead RGB-D.

This is benchmark-only device-depth evidence. It does not read dish mass,
calories, ingredients, or any other nutritional ground truth.

Nutrition5k's published volume baseline gives a fixed capture-plane distance of
35.9 cm and a per-pixel surface area of 5.957e-3 cm^2 at that plane. Raw depth
uses 10,000 units per meter. Given a food-region mask, food height is therefore
(capture_plane_distance - observed_depth), and physical volume is the sum of
pixel area * food height.

The output is a MoveFuel depth-scale sidecar consumed by the canonical MoveFuel algorithm
physical volume path used for hardware/reference-calibrated evidence.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

import cv2  # type: ignore
import numpy as np

SCHEMA = "movefuel-depth-scale-sidecar-v1"
CAMERA_TO_PLANE_CM = 35.9
PIXEL_AREA_CM2 = 5.957e-3
CM_PER_PIXEL = math.sqrt(PIXEL_AREA_CM2)
RAW_UNITS_PER_CM = 100.0  # Nutrition5k: 10,000 units per meter.


def _polygon_mask(shape: tuple[int, int], polygon: list[list[float]]) -> np.ndarray:
    h, w = shape
    pts=[]
    for pair in polygon:
        if not isinstance(pair, list) or len(pair) != 2:
            continue
        x=float(pair[0]); y=float(pair[1])
        # Gemini adapter exposes normalized x/y points in [0,1].
        if not (0 <= x <= 1 and 0 <= y <= 1):
            continue
        pts.append([int(round(x*(w-1))), int(round(y*(h-1)))])
    mask=np.zeros((h,w),dtype=np.uint8)
    if len(pts) >= 3:
        cv2.fillPoly(mask,[np.asarray(pts,dtype=np.int32)],1)
    return mask.astype(bool)


def build_sidecar(depth_png: Path, scene_json: Path, output_json: Path, *, sample_id: str | None = None) -> dict[str, Any]:
    depth=cv2.imread(str(depth_png),cv2.IMREAD_UNCHANGED)
    if depth is None:
        raise ValueError(f"unable to read depth image: {depth_png}")
    if depth.ndim != 2:
        raise ValueError("raw Nutrition5k depth must be a single-channel image")
    depth=np.asarray(depth,dtype=np.float64)
    scene=json.loads(scene_json.read_text(encoding="utf-8"))
    regions=[]
    for raw in scene.get("regions",[]):
        rid=str(raw.get("regionId") or "").strip()
        polygon=raw.get("maskPolygon")
        if not rid:
            continue
        if not isinstance(polygon,list) or len(polygon)<3:
            regions.append({
                "status":"INSUFFICIENT","provider":"nutrition5k-rgbd-physical-evidence","providerVersion":"v1",
                "regionId":rid,"method":"DEVICE_DEPTH","scale":None,"heightSamples":[],
                "validCoverageFraction":0.0,"supportPlaneConfidence":1.0,
                "warnings":["region has no mask polygon; bounding-box volume is intentionally not used"],
            }); continue
        mask=_polygon_mask(depth.shape,polygon)
        mask_count=int(mask.sum())
        if mask_count <= 0:
            regions.append({
                "status":"INSUFFICIENT","provider":"nutrition5k-rgbd-physical-evidence","providerVersion":"v1",
                "regionId":rid,"method":"DEVICE_DEPTH","scale":None,"heightSamples":[],
                "validCoverageFraction":0.0,"supportPlaneConfidence":1.0,"warnings":["mask rasterized to zero pixels"],
            }); continue
        d=depth[mask]
        valid=np.isfinite(d) & (d>0) & (d<=4000)
        coverage=float(valid.sum()/mask_count)
        if valid.sum()==0:
            regions.append({
                "status":"INSUFFICIENT","provider":"nutrition5k-rgbd-physical-evidence","providerVersion":"v1",
                "regionId":rid,"method":"DEVICE_DEPTH","scale":None,"heightSamples":[],
                "validCoverageFraction":0.0,"supportPlaneConfidence":1.0,"warnings":["no valid depth pixels inside food mask"],
            }); continue
        depth_cm=d[valid]/RAW_UNITS_PER_CM
        heights=np.clip(CAMERA_TO_PLANE_CM-depth_cm,0,CAMERA_TO_PLANE_CM)
        # One aggregate sample preserves the exact central sum because central
        # height is the arithmetic mean. Sensor/rig uncertainty is not invented;
        # this sidecar is an upper-bound benchmark using the dataset's published
        # fixed geometry. Product calibration uncertainty is evaluated separately.
        central=float(np.mean(heights))
        sample={"pixelArea":int(valid.sum()),"minimumHeightCm":central,"centralHeightCm":central,"maximumHeightCm":central,"confidence":min(1.0,max(0.0,coverage))}
        regions.append({
            "status":"COMPLETED" if coverage>=0.5 and central>0 else "INSUFFICIENT",
            "provider":"nutrition5k-rgbd-physical-evidence","providerVersion":"v1",
            "regionId":rid,"method":"DEVICE_DEPTH",
            "scale":{
                "calibrationId":"nutrition5k-fixed-overhead-rig",
                "sourceId":"nutrition5k-paper-volume-baseline",
                "sourceRevision":"CVPR-2021",
                "minimumCmPerPixel":CM_PER_PIXEL,"centralCmPerPixel":CM_PER_PIXEL,"maximumCmPerPixel":CM_PER_PIXEL,
                "quality":"MEASURED",
            },
            "heightSamples":[sample],"validCoverageFraction":coverage,"supportPlaneConfidence":1.0,
            "warnings":[] if coverage>=0.9 else ["raw depth coverage below 90% inside region mask"],
        })
    payload={
        "schema":SCHEMA,"sampleId":sample_id,"imageReference":str(depth_png),"regions":regions,
        "benchmark_provenance":{
            "dataset":"Nutrition5k","camera_to_capture_plane_cm":CAMERA_TO_PLANE_CM,
            "pixel_area_at_capture_plane_cm2":PIXEL_AREA_CM2,"raw_depth_units_per_meter":10000,
            "truth_fields_used_for_inference":[],
            "warning":"Benchmark-specific RGB-D rig geometry; this does not prove metric scale from an ordinary monocular phone photo.",
        },
    }
    output_json.parent.mkdir(parents=True,exist_ok=True)
    output_json.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    return payload


def main()->int:
    ap=argparse.ArgumentParser(); ap.add_argument("--depth",type=Path,required=True);ap.add_argument("--scene",type=Path,required=True);ap.add_argument("--output",type=Path,required=True);ap.add_argument("--sample-id",default=None)
    a=ap.parse_args();p=build_sidecar(a.depth,a.scene,a.output,sample_id=a.sample_id)
    print(json.dumps({"sample_id":p.get("sampleId"),"region_count":len(p["regions"]),"completed_regions":sum(1 for r in p["regions"] if r["status"]=="COMPLETED"),"output":str(a.output)},indent=2));return 0
if __name__=="__main__":raise SystemExit(main())
