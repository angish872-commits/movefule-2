from movefuel_fdc.vision_quality import QualityMetrics, assess_metrics


def metrics(**overrides):
    values = dict(
        width=1080,
        height=1080,
        brightness_mean=120.0,
        contrast_std=40.0,
        laplacian_variance=120.0,
        dark_fraction=0.02,
        clipped_high_fraction=0.01,
        glare_fraction=0.01,
    )
    values.update(overrides)
    return QualityMetrics(**values)


def test_good_reference_metrics_are_acceptable():
    result = assess_metrics(metrics())
    assert result.state == "ACCEPTABLE"
    assert result.issue_codes == ()


def test_blur_and_motion_like_low_edge_variance_require_retake():
    for variance in (0.0, 10.0, 44.99):
        result = assess_metrics(metrics(laplacian_variance=variance))
        assert result.state == "RETAKE_REQUIRED"
        assert "EXCESSIVE_BLUR" in result.issue_codes


def test_darkness_warns_instead_of_pretending_capture_is_clean():
    by_mean = assess_metrics(metrics(brightness_mean=30.0))
    by_fraction = assess_metrics(metrics(dark_fraction=0.8))
    for result in (by_mean, by_fraction):
        assert result.state == "REVIEW_RECOMMENDED"
        assert "UNDEREXPOSED" in result.issue_codes


def test_overexposure_warns_instead_of_pretending_capture_is_clean():
    by_mean = assess_metrics(metrics(brightness_mean=230.0))
    by_clipping = assess_metrics(metrics(clipped_high_fraction=0.5))
    for result in (by_mean, by_clipping):
        assert result.state == "REVIEW_RECOMMENDED"
        assert "OVEREXPOSED" in result.issue_codes


def test_glare_and_low_contrast_are_explicit_quality_limitations():
    glare = assess_metrics(metrics(glare_fraction=0.2))
    contrast = assess_metrics(metrics(contrast_std=10.0))
    assert glare.state == "REVIEW_RECOMMENDED"
    assert glare.issue_codes == ("GLARE",)
    assert contrast.state == "REVIEW_RECOMMENDED"
    assert contrast.issue_codes == ("LOW_CONTRAST",)


def test_small_capture_requires_retake_even_when_other_metrics_look_good():
    result = assess_metrics(metrics(width=319, height=1080))
    assert result.state == "RETAKE_REQUIRED"
    assert "IMAGE_TOO_SMALL" in result.issue_codes


def test_multiple_quality_failures_preserve_all_observed_reasons_and_hard_failure_wins():
    result = assess_metrics(metrics(
        laplacian_variance=5.0,
        brightness_mean=20.0,
        dark_fraction=0.9,
        contrast_std=8.0,
    ))
    assert result.state == "RETAKE_REQUIRED"
    assert "EXCESSIVE_BLUR" in result.issue_codes
    assert "UNDEREXPOSED" in result.issue_codes
    assert "LOW_CONTRAST" in result.issue_codes
