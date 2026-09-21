# SRC-002 — Uploaded Old MoveFuel ZIP Inventory

Status: FROZEN UPLOAD

## Raw archive provenance

- Uploaded filename: `movefule.zip`
- Raw archive SHA-256: `4b23521a0a4cf389f15af5af3e9fac188071ad39ba6c6a8787c79cafdecb71b5`
- Raw archive size: **268,264,800 bytes**
- Archive file entries: **27,349**
- Uncompressed bytes: **512,724,736**
- Unsafe archive paths detected: **0**
- Top archive roots: `movefule/` (12,551 files) and `__MACOSX/` (14,798 metadata entries)

## Embedded Git provenance

The ZIP contains `movefule/.git/`.

- Embedded HEAD branch: `all`
- Embedded HEAD commit: `4debb60a8197b55470b107fddf5397b9775d4705`
- That commit exists in `angish872-commits/movefule`.
- Commit tree: `b18dfae466000029a308a9d939df49dc2cbf3d85`
- Commit message: `feat(wave5): integrate canonical diet training and calendar flows`
- Commit date: 2026-09-03T14:35:58Z

### Important: the ZIP is not a clean checkout of that commit

The embedded working/index state differs heavily from HEAD:

- 1,001 staged deletions
- 1 staged modification
- 12 staged additions
- 9 untracked top-level/path groups
- Git index tree: `0ab25e9e0084bc361dbb8238b6797d81594e8c30`
- Current index tracks only 13 files

Therefore SRC-002 is defined by the **uploaded archive bytes**, not by HEAD commit alone.

## Meaningful source preserved

The ZIP is dominated by Git objects, Android build output, dependency packages, generated artifacts, and macOS metadata. The meaningful source snapshot found outside those generated areas contains **13 files**:

- 3 nutrition implementation files + nutrition package/docs
- 4 training implementation files + training package/docs
- 1 integration report
- root README

The exact 13-file source subset is preserved in GitHub at:

`sources/src002-old-upload/src002_old_meaningful_source.zip`

Sanitized source ZIP SHA-256:

`e511b87b790f18f62eb4d40fdee24cc20f66a79cfccc4b79cec19ea4351f94f8`

The sanitized ZIP is only a preservation copy of meaningful source. The raw uploaded ZIP hash remains the primary archive fingerprint.

## Completeness warning

SRC-002 is not a complete runnable algorithm package. Static import analysis of the preserved source found **65 relative imports, only 7 resolved and 58 unresolved**. Examples of missing modules include nutrition planning, nutrient engine, allergen/diet rules, and most Training Engine 5 support modules.

Treat SRC-002 as partial historical implementation evidence, not as a buildable source of truth.
