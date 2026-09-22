import numpy as np
import pytest

from movefuel_fdc.depth_anything_v2_adapter import fit_relative_to_metric, apply_metric_calibration


def test_relative_depth_requires_explicit_metric_anchor_fit():
    relative = np.linspace(1.0, 2.0, 20)
    metric = 0.25 * relative + 0.30
    fit = fit_relative_to_metric(relative, metric)
    assert fit.accepted is True
    assert fit.r_squared > 0.99
    calibrated = apply_metric_calibration(relative.reshape(4, 5), fit)
    assert np.allclose(calibrated, metric.reshape(4, 5), atol=1e-5)


def test_bad_sparse_calibration_is_rejected():
    fit = fit_relative_to_metric(np.array([1.0, 2.0]), np.array([0.5, 0.6]))
    assert fit.accepted is False
    with pytest.raises(ValueError):
        apply_metric_calibration(np.ones((2, 2)), fit)
