"""Authoritative internet-source registry for MoveFuel Step 1.

The registry is intentionally explicit: every source has a role, a version,
licence/terms metadata, a stable landing page, and one or more artifacts.
Nothing becomes nutrition truth merely because it is downloadable.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Iterable


@dataclass(frozen=True)
class SourceArtifact:
    artifact_id: str
    source_id: str
    version: str
    kind: str
    url: str
    filename: str
    approx_bytes: int | None = None
    transport: str = "https"
    required_for_step1: bool = False
    import_mode: str = "reference_only"
    notes: str = ""


@dataclass(frozen=True)
class SourceDefinition:
    source_id: str
    title: str
    publisher: str
    role: str
    authority_tier: int
    region: str
    landing_page: str
    licence: str
    licence_url: str
    commercial_use: str
    attribution: str
    status: str
    notes: str = ""


USDA = SourceDefinition(
    source_id="usda_fdc",
    title="USDA FoodData Central",
    publisher="U.S. Department of Agriculture, Agricultural Research Service",
    role="canonical_nutrition",
    authority_tier=10,
    region="US/global-reference",
    landing_page="https://fdc.nal.usda.gov/download-datasets/",
    licence="CC0-1.0",
    licence_url="https://creativecommons.org/publicdomain/zero/1.0/",
    commercial_use="allowed",
    attribution="FoodData Central should be cited as requested by USDA.",
    status="approved",
    notes="Primary machine-readable nutrition source. Missing values remain unknown; source data type is preserved.",
)

FAO_DENSITY = SourceDefinition(
    source_id="fao_infoods_density_v2",
    title="FAO/INFOODS Density Database, Version 2.0",
    publisher="Food and Agriculture Organization of the United Nations / INFOODS",
    role="volume_to_mass_density",
    authority_tier=20,
    region="global",
    landing_page="https://www.fao.org/food-composition/tables-and-databases/detail/(global--2012)-fao-infoods-density-database---version-2/en",
    licence="CC-BY-4.0-with-FAO-database-terms",
    licence_url="https://www.fao.org/contact-us/terms/db-terms-of-use/en",
    commercial_use="legal_review_required_for_product_integration",
    attribution="FAO. 2012. FAO/INFOODS Density Database. Version 2.0. Rome, FAO; preserve dataset/source citations where supplied.",
    status="reference_and_validation_only_until_exact_terms_review",
    notes="Use for volume-to-weight validation and research. Preserve food/preparation wording and source notes; do not generalize one density to unrelated foods. FAO database terms include a commercial-promotion restriction, so copied density records must not become production authority until the exact dataset terms are reviewed.",
)

NUTRITION5K = SourceDefinition(
    source_id="nutrition5k",
    title="Nutrition5k",
    publisher="Google Research",
    role="benchmark_ground_truth",
    authority_tier=30,
    region="California cafeteria dataset",
    landing_page="https://github.com/google-research-datasets/Nutrition5k",
    licence="CC-BY-4.0",
    licence_url="https://creativecommons.org/licenses/by/4.0/",
    commercial_use="allowed_with_attribution",
    attribution="Cite the Nutrition5k dataset/paper and preserve CC BY 4.0 attribution.",
    status="approved_for_benchmark",
    notes="Benchmark only: mass/calories/macros/RGB-D. Dataset authors warn that cuisine coverage is incomplete.",
)

NEPAL_2017 = SourceDefinition(
    source_id="nepal_food_composition_2017",
    title="Nepalese Food Composition Table 2017",
    publisher="Government of Nepal, Department of Food Technology and Quality Control, National Nutrition Program",
    role="regional_food_composition_reference",
    authority_tier=15,
    region="Nepal",
    landing_page="https://www.fao.org/food-composition/tables-and-databases/detail/(nepal--2017)-nepalese-food-composition-table/en",
    licence="source-specific-review-required",
    licence_url="https://www.fao.org/contact-us/terms/en",
    commercial_use="hold_until_rights_review",
    attribution="Preserve the Government of Nepal publication citation and FAO directory provenance.",
    status="reference_only_until_licence_and_quality_review",
    notes="The FAO directory lists free access, but Step 1 must not silently treat the publication as a redistributable commercial database without a rights review.",
)

NEPAL_1994 = SourceDefinition(
    source_id="nepal_food_composition_1994",
    title="Nutrient Contents in Nepalese Foods 1994",
    publisher="His Majesty's Government of Nepal, Ministry of Agriculture, Agriculture Development Department, Nutrition Programme Section",
    role="regional_food_composition_reference",
    authority_tier=25,
    region="Nepal",
    landing_page="https://www.fao.org/food-composition/tables-and-databases/detail/(nepal--1994)-nutrient-contents-in-nepalese-foods/en",
    licence="source-specific-review-required",
    licence_url="https://www.fao.org/contact-us/terms/en",
    commercial_use="hold_until_rights_review",
    attribution="Preserve the 1994 Government of Nepal publication citation and FAO directory provenance.",
    status="reference_only_until_licence_and_quality_review",
    notes="Older regional reference; never outrank a reviewed newer regional record solely because it matches a name.",
)

NEPAL_2012 = SourceDefinition(
    source_id="nepal_food_composition_2012",
    title="Food Composition Table for Nepal 2012",
    publisher="Nepal Government, Ministry of Agriculture Development, Department of Food Technology and Quality Control, National Nutrition Program",
    role="regional_food_composition_reference",
    authority_tier=20,
    region="Nepal",
    landing_page="https://www.fao.org/food-composition/tables-and-databases/detail/(nepal--2012)-food-composition-table-for-nepal/en",
    licence="source-specific-review-required",
    licence_url="https://www.fao.org/contact-us/terms/en",
    commercial_use="hold_until_rights_review",
    attribution="Preserve the 2012 Government of Nepal publication citation and FAO directory provenance.",
    status="reference_only_until_licence_and_quality_review",
    notes="Regional cross-check source. FAO directory inclusion is not an endorsement; evaluate quality and rights before production use.",
)

FAO_ANFOOD = SourceDefinition(
    source_id="fao_infoods_anfood_v2",
    title="FAO/INFOODS Analytical Food Composition Database v2.0",
    publisher="Food and Agriculture Organization of the United Nations / INFOODS",
    role="cross_source_nutrition_reference",
    authority_tier=35,
    region="global",
    landing_page="https://www.fao.org/food-composition/tables-and-databases/detail/(global--2017)-fao-infoods-analytical-food-composition-database---version-2.0-(anfood2.0)/en",
    licence="FAO-database-terms-review-required",
    licence_url="https://www.fao.org/contact-us/terms/db-terms-of-use/en",
    commercial_use="reference_only_until_exact_terms_review",
    attribution="FAO. 2017. FAO/INFOODS Analytical food composition database version 2.0 – AnFooD2.0. Rome, FAO.",
    status="reference_only_until_licence_and_quality_review",
    notes="Use for independent cross-source checks, not automatic runtime authority, until exact rights and record applicability are reviewed.",
)

SOURCES: tuple[SourceDefinition, ...] = (USDA, FAO_DENSITY, NUTRITION5K, NEPAL_2017, NEPAL_2012, NEPAL_1994, FAO_ANFOOD)

ARTIFACTS: tuple[SourceArtifact, ...] = (
    SourceArtifact(
        artifact_id="usda_full_csv_2026_04_30",
        source_id=USDA.source_id,
        version="2026-04-30",
        kind="zip_csv",
        url="https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_csv_2026-04-30.zip",
        filename="FoodData_Central_csv_2026-04-30.zip",
        approx_bytes=460_000_000,
        required_for_step1=True,
        import_mode="usda_full_csv",
        notes="Single full bundle used by the existing streaming importer. Large, but complete and deterministic.",
    ),
    SourceArtifact(
        artifact_id="usda_foundation_json_2026_04_30",
        source_id=USDA.source_id,
        version="2026-04-30",
        kind="zip_json",
        url="https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2026-04-30.zip",
        filename="FoodData_Central_foundation_food_json_2026-04-30.zip",
        approx_bytes=459_000,
        import_mode="reference_download",
        notes="Optional compact source-specific download; retained for future JSON importer parity checks.",
    ),
    SourceArtifact(
        artifact_id="usda_fndds_json_2024_10_31",
        source_id=USDA.source_id,
        version="2024-10-31",
        kind="zip_json",
        url="https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_survey_food_json_2024-10-31.zip",
        filename="FoodData_Central_survey_food_json_2024-10-31.zip",
        approx_bytes=3_700_000,
        import_mode="reference_download",
        notes="FNDDS 2021-2023 release.",
    ),
    SourceArtifact(
        artifact_id="usda_sr_legacy_json_2018_04",
        source_id=USDA.source_id,
        version="2018-04",
        kind="zip_json",
        url="https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip",
        filename="FoodData_Central_sr_legacy_food_json_2018-04.zip",
        approx_bytes=12_300_000,
        import_mode="reference_download",
        notes="Final SR Legacy release; not current but useful for historical coverage.",
    ),
    SourceArtifact(
        artifact_id="usda_branded_json_2026_04_30",
        source_id=USDA.source_id,
        version="2026-04-30",
        kind="zip_json",
        url="https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_branded_food_json_2026-04-30.zip",
        filename="FoodData_Central_branded_food_json_2026-04-30.zip",
        approx_bytes=195_000_000,
        import_mode="reference_download",
        notes="Optional branded-food bulk source; barcode/API resolution can be used instead if storage is constrained.",
    ),
    SourceArtifact(
        artifact_id="fao_density_v2_xlsx",
        source_id=FAO_DENSITY.source_id,
        version="2.0-2012",
        kind="xlsx",
        url="https://www.fao.org/fileadmin/templates/food_composition/documents/density_DB_v2_0_final-1__1_.xlsx",
        filename="fao_infoods_density_v2.xlsx",
        approx_bytes=None,
        required_for_step1=True,
        import_mode="fao_density_xlsx",
    ),
    SourceArtifact(
        artifact_id="nutrition5k_metadata",
        source_id=NUTRITION5K.source_id,
        version="dataset-v1",
        kind="gcs_directory",
        url="gs://nutrition5k_dataset/nutrition5k_dataset/metadata",
        filename="nutrition5k/metadata",
        required_for_step1=True,
        transport="gsutil",
        import_mode="nutrition5k_metadata",
        notes="Metadata only; avoids the 181.4 GB full imagery download during Step 1.",
    ),
    SourceArtifact(
        artifact_id="nutrition5k_splits",
        source_id=NUTRITION5K.source_id,
        version="dataset-v1",
        kind="gcs_directory",
        url="gs://nutrition5k_dataset/nutrition5k_dataset/dish_ids/splits",
        filename="nutrition5k/dish_ids/splits",
        required_for_step1=True,
        transport="gsutil",
        import_mode="nutrition5k_splits",
    ),
)


def source_by_id(source_id: str) -> SourceDefinition:
    for source in SOURCES:
        if source.source_id == source_id:
            return source
    raise KeyError(source_id)


def artifact_by_id(artifact_id: str) -> SourceArtifact:
    for artifact in ARTIFACTS:
        if artifact.artifact_id == artifact_id:
            return artifact
    raise KeyError(artifact_id)


def source_manifest() -> dict:
    return {
        "version": 1,
        "sources": [asdict(source) for source in SOURCES],
        "artifacts": [asdict(artifact) for artifact in ARTIFACTS],
    }


def artifacts_for_profile(profile: str) -> tuple[SourceArtifact, ...]:
    """Return bounded download profiles.

    step1: full USDA CSV + FAO density + Nutrition5k metadata/splits.
    lightweight: compact USDA JSON references + FAO density + N5k metadata.
    branded: lightweight plus branded JSON.
    """
    if profile == "step1":
        ids = {"usda_full_csv_2026_04_30", "fao_density_v2_xlsx", "nutrition5k_metadata", "nutrition5k_splits"}
    elif profile == "lightweight":
        ids = {
            "usda_foundation_json_2026_04_30",
            "usda_fndds_json_2024_10_31",
            "usda_sr_legacy_json_2018_04",
            "fao_density_v2_xlsx",
            "nutrition5k_metadata",
            "nutrition5k_splits",
        }
    elif profile == "branded":
        ids = {a.artifact_id for a in artifacts_for_profile("lightweight")} | {"usda_branded_json_2026_04_30"}
    else:
        raise ValueError(f"unknown source profile: {profile}")
    return tuple(artifact for artifact in ARTIFACTS if artifact.artifact_id in ids)
