"""Convert rectified metric depth into food-height samples.

The caller must provide surface depth and support-plane depth in meters in the
same camera/rectified coordinate system. This module intentionally does not
turn arbitrary relative monocular depth into centimeters.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
import numpy as np


@dataclass(frozen=True)
class HeightSample:
    pixel_area: int
    minimum_height_cm: float
    central_height_cm: float
    maximum_height_cm: float
    confidence: float


def build_height_samples(
    surface_depth_m: np.ndarray,
    support_depth_m: np.ndarray,
    food_mask: np.ndarray,
    *,
    block_size: int = 16,
    minimum_pixels_per_block: int = 8,
    maximum_height_cm: float = 30.0,
) -> list[HeightSample]:
    if surface_depth_m.shape != support_depth_m.shape or surface_depth_m.shape != food_mask.shape:
        raise ValueError("surface, support and mask shapes must match")
    if surface_depth_m.ndim != 2:
        raise ValueError("depth arrays must be 2D")
    if block_size <= 0 or minimum_pixels_per_block <= 0:
        raise ValueError("block settings must be positive")

    valid = (
        food_mask.astype(bool)
        & np.isfinite(surface_depth_m)
        & np.isfinite(support_depth_m)
        & (surface_depth_m > 0)
        & (support_depth_m > 0)
    )
    raw_height_cm = (support_depth_m - surface_depth_m) * 100.0
    valid &= raw_height_cm >= 0
    valid &= raw_height_cm <= maximum_height_cm

    samples: list[HeightSample] = []
    height, width = surface_depth_m.shape
    for y in range(0, height, block_size):
        for x in range(0, width, block_size):
            block_valid = valid[y:y+block_size, x:x+block_size]
            count = int(block_valid.sum())
            if count < minimum_pixels_per_block:
                continue
            values = raw_height_cm[y:y+block_size, x:x+block_size][block_valid]
            if values.size == 0:
                continue
            coverage = count / block_valid.size
            samples.append(HeightSample(
                pixel_area=count,
                minimum_height_cm=float(np.quantile(values, 0.10)),
                central_height_cm=float(np.quantile(values, 0.50)),
                maximum_height_cm=float(np.quantile(values, 0.90)),
                confidence=float(min(1.0, 0.5 + 0.5 * coverage)),
            ))
    return samples


def to_backend_json(samples: list[HeightSample]) -> list[dict]:
    return [
        {
            "pixelArea": sample.pixel_area,
            "minimumHeightCm": sample.minimum_height_cm,
            "centralHeightCm": sample.central_height_cm,
            "maximumHeightCm": sample.maximum_height_cm,
            "confidence": sample.confidence,
        }
        for sample in samples
    ]
