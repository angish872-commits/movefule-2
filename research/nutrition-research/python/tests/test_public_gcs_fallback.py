from pathlib import Path

from movefuel_fdc import download_manager as dm
from movefuel_fdc.source_registry import artifact_by_id


def test_gsutil_artifact_falls_back_to_public_https(monkeypatch, tmp_path: Path):
    artifact = artifact_by_id("nutrition5k_metadata")
    monkeypatch.setattr(dm.shutil, "which", lambda name: None)
    monkeypatch.setattr(dm, "_public_gcs_list", lambda bucket, prefix: [
        {"name": "nutrition5k_dataset/metadata/dish_metadata_cafe1.csv", "size": "3"},
        {"name": "nutrition5k_dataset/metadata/ingredients_metadata.csv", "size": "4"},
    ])

    written = []
    def fake_download(bucket: str, name: str, target: Path, **_kwargs):
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b"abc")
        written.append((bucket, name, target))

    monkeypatch.setattr(dm, "_download_public_gcs_object", fake_download)
    result = dm.acquire_gsutil(artifact, tmp_path)

    assert result == tmp_path / "nutrition5k/metadata"
    assert (result / "dish_metadata_cafe1.csv").exists()
    assert (result / "ingredients_metadata.csv").exists()
    assert len(written) == 2
    assert all(x[0] == "nutrition5k_dataset" for x in written)


def test_parse_gs_url_rejects_missing_prefix():
    try:
        dm._parse_gs_url("gs://nutrition5k_dataset")
    except dm.AcquisitionError:
        return
    raise AssertionError("missing GCS prefix should be rejected")
