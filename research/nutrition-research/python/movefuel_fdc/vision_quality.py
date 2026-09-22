"""Deterministic OpenCV image-quality gate for MoveFuel food capture.

This does not detect food identity. It measures pixel properties that are cheap
and useful before any cloud call: blur, exposure, glare and contrast. Thresholds
are versioned product policy and must be calibrated on the launch-device corpus.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path

import cv2
import numpy as np

QUALITY_POLICY_VERSION = "opencv-quality-v1"


@dataclass(frozen=True)
class QualityMetrics:
    width: int
    height: int
    brightness_mean: float
    contrast_std: float
    laplacian_variance: float
    dark_fraction: float
    clipped_high_fraction: float
    glare_fraction: float


@dataclass(frozen=True)
class QualityAssessment:
    state: str
    issue_codes: tuple[str, ...]
    metrics: QualityMetrics
    policy_version: str = QUALITY_POLICY_VERSION


def metrics_for_bgr(image: np.ndarray) -> QualityMetrics:
    if image is None or image.size == 0 or image.ndim != 3:
        raise ValueError("invalid image")
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    brightness = float(gray.mean())
    contrast = float(gray.std())
    lap = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    dark = float(np.mean(gray < 25))
    clipped = float(np.mean(gray > 248))
    # Specular glare: very bright and low-saturation pixels.
    glare = float(np.mean((hsv[:, :, 2] > 245) & (hsv[:, :, 1] < 35)))
    return QualityMetrics(
        width=int(width),
        height=int(height),
        brightness_mean=brightness,
        contrast_std=contrast,
        laplacian_variance=lap,
        dark_fraction=dark,
        clipped_high_fraction=clipped,
        glare_fraction=glare,
    )


def assess_metrics(m: QualityMetrics) -> QualityAssessment:
    issues: list[str] = []
    # Product-policy thresholds; conservative because a false reject is safer
    # than a precise-looking bad portion estimate.
    if min(m.width, m.height) < 320:
        issues.append("IMAGE_TOO_SMALL")
    if m.laplacian_variance < 45:
        issues.append("EXCESSIVE_BLUR")
    if m.brightness_mean < 45 or m.dark_fraction > 0.55:
        issues.append("UNDEREXPOSED")
    if m.brightness_mean > 220 or m.clipped_high_fraction > 0.35:
        issues.append("OVEREXPOSED")
    if m.glare_fraction > 0.12:
        issues.append("GLARE")
    if m.contrast_std < 18:
        issues.append("LOW_CONTRAST")

    hard = {"IMAGE_TOO_SMALL", "EXCESSIVE_BLUR"}
    state = "RETAKE_REQUIRED" if hard.intersection(issues) else "REVIEW_RECOMMENDED" if issues else "ACCEPTABLE"
    return QualityAssessment(state=state, issue_codes=tuple(issues), metrics=m)


def assess_image(path: Path) -> QualityAssessment:
    image = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("image could not be decoded")
    return assess_metrics(metrics_for_bgr(image))


def assessment_json(path: Path) -> dict:
    try:
        result = assess_image(path)
    except ValueError:
        return {
            "state": "RETAKE_REQUIRED",
            "issue_codes": ["CORRUPT_IMAGE"],
            "metrics": None,
            "policy_version": QUALITY_POLICY_VERSION,
        }
    return {
        "state": result.state,
        "issue_codes": list(result.issue_codes),
        "metrics": asdict(result.metrics),
        "policy_version": result.policy_version,
    }
