import numpy as np

from movefuel_fdc.physical_depth import build_height_samples, to_backend_json


def test_metric_support_difference_produces_physical_height_samples():
    support = np.full((32, 32), 0.50, dtype=np.float32)
    surface = np.full((32, 32), 0.45, dtype=np.float32)
    mask = np.ones((32, 32), dtype=np.uint8)
    samples = build_height_samples(surface, support, mask, block_size=16)
    assert len(samples) == 4
    assert abs(samples[0].central_height_cm - 5.0) < 1e-3
    payload = to_backend_json(samples)
    assert payload[0]["pixelArea"] == 256


def test_invalid_negative_height_is_not_invented():
    support = np.full((16, 16), 0.45, dtype=np.float32)
    surface = np.full((16, 16), 0.50, dtype=np.float32)
    mask = np.ones((16, 16), dtype=np.uint8)
    assert build_height_samples(surface, support, mask) == []
