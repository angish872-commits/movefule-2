# MoveFuel — Provider Privacy Audit

Status: IN PROGRESS (structured placeholders; no terms have been verified yet)
Last updated: 2026-08-06

This audit records the privacy gates a real provider must satisfy before it
may be enabled in the provider registry. Nothing here reflects a current
provider's terms: placeholders are UNKNOWN until verified research is done.

A provider is only enabled when every gate is KNOWN (never UNKNOWN). This is
enforced in code by `providerCanBeEnabled` in
`backend/src/nutrition/providerRegistry.ts`.

## Gates

| Gate | Requirement before enabling | Current status |
|---|---|---|
| Image retention | Images must not be retained longer than documented policy; user images are never used for unrelated purposes | UNKNOWN |
| Provider training use | Provider must not train on user-submitted food images without explicit documented consent | UNKNOWN |
| Opt-out availability | A documented, user-facing opt-out path must exist | UNKNOWN |
| Deletion policy | A documented deletion procedure must exist and be actionable | UNKNOWN |
| Supported regions | Provider must support the regions MoveFuel serves | UNKNOWN |
| Commercial-use permission | Provider terms must permit commercial use | UNKNOWN |
| Data-transfer transparency | Any cross-border transfer must be disclosed | UNKNOWN |

## Placeholder matrix (populate during verified provider research)

| Provider ID | Image retention | Training use | Opt-out | Deletion | Regions | Commercial use | Status |
|---|---|---|---|---|---|---|---|
| (none approved) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | NOT APPROVED |

## Rules

- No provider is added to the registry with `enabled: true` while any privacy
  gate is UNKNOWN.
- Benchmarks run with MOCK providers only; no real user image is sent anywhere.
- Image bytes are never logged or embedded in benchmark artefacts; only
  references are stored.
- Verified terms must be recorded with a source link and a dated entry below,
  not invented during coding.

## Open items

- Verify terms for each candidate provider before any integration decision.
- Decide whether the app must offer a "do not use my photos for model
  training" toggle and how that maps to each provider gate.
