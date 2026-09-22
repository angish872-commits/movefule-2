# Nutrition release artifacts

Production facts are immutable reviewed release artifacts, not AI-written runtime rows.

- `MOVEFUEL_KNOWLEDGE_SNAPSHOT`: production-cleared, source-bound density evidence.
- `MOVEFUEL_PORTION_CALIBRATION_PROFILES`: held-out portion calibration for the current portion-estimator version; public camera release requires at least one profile with 30+ held-out samples.
- `MOVEFUEL_REVIEWED_RECIPE_SNAPSHOT`: optional checksum-validated human-reviewed regional recipe records. An empty or unreviewed recipe file is never production nutrition authority.
- `reviewed-recipes.template.json`: empty schema-shaped template only; it contains no production food facts.

Do not copy benchmark example recipes into production until a human has reviewed ingredients, cooked yield, portion definition and the resulting checksum.

Templates are schema-shaped and intentionally fail the production release gate until real reviewed evidence is inserted:

- `knowledge-snapshot.template.json` — empty production knowledge/density template.
- `portion-calibration.template.json` — empty held-out calibration template.
- `reviewed-recipes.template.json` — empty reviewed recipe template.

Do not change release checks merely to make an empty template pass. Build real artifacts from approved source data and weighed/held-out validation.
