"""Depth Anything V2 Small adapter and metric calibration helpers.

The model's raw monocular output is treated as RELATIVE depth only. It becomes
metric depth only after an explicit calibration fit against metric anchors.
This prevents a relative depth map from silently entering grams/volume math.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import importlib
import sys

import cv2
import numpy as np


@dataclass(frozen=True)
class RelativeDepthResult:
    depth: np.ndarray
    provider: str
    provider_version: str
    metric: bool = False


@dataclass(frozen=True)
class MetricCalibration:
    slope: float
    intercept: float
    rmse_m: float
    r_squared: float
    sample_count: int
    accepted: bool


class DepthAnythingV2Small:
    """Loads the official Depth Anything V2 Small implementation from a local clone.

    The repository and checkpoint are external artifacts so their exact revision,
    checksum and license can be pinned independently from MoveFuel source.
    """

    def __init__(self, repo_dir: Path, checkpoint: Path, device: str | None = None):
        import torch
        self._torch = torch
        self.repo_dir = repo_dir
        self.checkpoint = checkpoint
        if not repo_dir.exists() or not checkpoint.exists():
            raise FileNotFoundError("Depth Anything V2 repo/checkpoint not found")
        sys.path.insert(0, str(repo_dir))
        try:
            module = importlib.import_module("depth_anything_v2.dpt")
            model_cls = module.DepthAnythingV2
        finally:
            try:
                sys.path.remove(str(repo_dir))
            except ValueError:
                pass
        self.device = device or ("cuda" if torch.cuda.is_available() else "mps" if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available() else "cpu")
        config = {"encoder": "vits", "features": 64, "out_channels": [48, 96, 192, 384]}
        model = model_cls(**config)
        state = torch.load(str(checkpoint), map_location="cpu")
        model.load_state_dict(state)
        self.model = model.to(self.device).eval()

    def infer(self, image_path: Path) -> RelativeDepthResult:
        image = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("image could not be decoded")
        depth = self.model.infer_image(image)
        depth = np.asarray(depth, dtype=np.float32)
        if depth.ndim != 2 or not np.isfinite(depth).any():
            raise ValueError("invalid relative depth output")
        return RelativeDepthResult(depth=depth, provider="depth-anything-v2-small", provider_version="external-pinned-revision")


def fit_relative_to_metric(relative_values: np.ndarray, metric_meters: np.ndarray, *, minimum_samples: int = 8) -> MetricCalibration:
    x = np.asarray(relative_values, dtype=np.float64).reshape(-1)
    y = np.asarray(metric_meters, dtype=np.float64).reshape(-1)
    valid = np.isfinite(x) & np.isfinite(y) & (y > 0)
    x, y = x[valid], y[valid]
    if x.size < minimum_samples:
        return MetricCalibration(0, 0, float("inf"), 0, int(x.size), False)
    design = np.column_stack([x, np.ones_like(x)])
    slope, intercept = np.linalg.lstsq(design, y, rcond=None)[0]
    pred = slope * x + intercept
    residual = y - pred
    rmse = float(np.sqrt(np.mean(residual ** 2)))
    total = float(np.sum((y - y.mean()) ** 2))
    r2 = 1.0 - float(np.sum(residual ** 2)) / total if total > 0 else 1.0
    # The sign of a relative-depth output can vary by implementation, so either
    # sign is acceptable; fit quality and positive resulting metric depth matter.
    accepted = math_is_finite(slope) and math_is_finite(intercept) and r2 >= 0.90 and rmse <= 0.03
    return MetricCalibration(float(slope), float(intercept), rmse, r2, int(x.size), accepted)


def apply_metric_calibration(relative_depth: np.ndarray, calibration: MetricCalibration) -> np.ndarray:
    if not calibration.accepted:
        raise ValueError("relative depth calibration not accepted")
    metric = calibration.slope * np.asarray(relative_depth, dtype=np.float64) + calibration.intercept
    metric = np.where(np.isfinite(metric) & (metric > 0), metric, np.nan)
    return metric.astype(np.float32)


def math_is_finite(value: float) -> bool:
    return bool(np.isfinite(value))
