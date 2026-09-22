from pathlib import Path
import cv2
import numpy as np

from movefuel_fdc.vision_quality import assess_image, assessment_json


def test_dark_flat_image_is_retake_or_review(tmp_path: Path):
    image = np.zeros((400, 400, 3), dtype=np.uint8)
    path = tmp_path / "dark.png"
    cv2.imwrite(str(path), image)
    result = assess_image(path)
    assert "UNDEREXPOSED" in result.issue_codes
    assert "EXCESSIVE_BLUR" in result.issue_codes
    assert result.state == "RETAKE_REQUIRED"


def test_high_contrast_checker_is_not_blur(tmp_path: Path):
    image = np.zeros((400, 400, 3), dtype=np.uint8)
    for y in range(0, 400, 40):
        for x in range(0, 400, 40):
            if (x // 40 + y // 40) % 2 == 0:
                image[y:y+40, x:x+40] = 220
            else:
                image[y:y+40, x:x+40] = 60
    path = tmp_path / "checker.png"
    cv2.imwrite(str(path), image)
    result = assess_image(path)
    assert "EXCESSIVE_BLUR" not in result.issue_codes


def test_corrupt_image_returns_structured_retake(tmp_path: Path):
    path = tmp_path / "corrupt.jpg"
    path.write_bytes(b"not-an-image")
    result = assessment_json(path)
    assert result["state"] == "RETAKE_REQUIRED"
    assert result["issue_codes"] == ["CORRUPT_IMAGE"]
