# MoveFuel canonical contracts v1

`contracts.json` is the language-neutral authority for shared records and enums. Generated TypeScript, Kotlin and Swift files are derived artifacts; domain teams must not create incompatible copies.

Compatibility rules:

- producers always send `schemaVersion`;
- readers accept declared supported versions only;
- unknown fields are ignored for additive forward compatibility;
- unknown enum values are rejected and surfaced as a schema mismatch;
- required fields and semantics cannot change inside v1;
- renames, removals, type changes and meaning changes require a new schema version plus a deterministic adapter;
- timestamps are ISO-8601 instants, dates are ISO local dates, and timezones are IANA identifiers;
- IDs, revisions and idempotency keys are opaque strings/integers and never inferred from client time.

Generate or verify:

```bash
node contracts/codegen/generate-contracts.mjs
node contracts/codegen/generate-contracts.mjs --check
```

The registry is transport/schema authority only. It does not implement Food estimation, Nutrition ranking, Training planning, Calendar scheduling or Today ranking.
