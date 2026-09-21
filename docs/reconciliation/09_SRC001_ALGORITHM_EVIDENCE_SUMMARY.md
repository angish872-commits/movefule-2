# SRC-001 Algorithm Evidence Summary

## Frozen source

- Repository: `angish872-commits/movefule_1`
- Branch at capture: `ui-test`
- Commit: `699bf3d6bda7949d3d10bf320fa0ecfbf495016c`
- Commit tree: `3b5be260c545a3bbde4fe48f87ac31594750f524`
- Files: **1,532**
- Backend source files under `services/backend/src/`: **373**
- Files under `algorithms/`: **16**
- Test-like files discovered by path/name: **299**

## Critical identity check

The `Mufil-2/` subtree inside SRC-001 has tree SHA:

`6875fa95185b9c9e2c4424444fa6347e3065454a`

That is exactly the same SHA as SRC-000 `Mufil-2/`.

Therefore the current MoveFuel-2 UI/database baseline is byte-for-byte the same Mufil-2 snapshot carried by this historical source. The meaningful extra comparison material in SRC-001 is primarily outside `Mufil-2/`: backend, algorithm, app, contract, infrastructure, test, and research code.

## 167-algorithm structural evidence

The canonical reconciliation matrix was checked against the exact SRC-001 file tree using legacy file paths from the Notion registry.

- Canonical algorithms: **167**
- Algorithms with referenced legacy file paths physically present in SRC-001: **74**
- Algorithms with no explicit legacy file path hint in the registry: **93**
- Referenced paths missing from SRC-001 after path normalization: **0**

Among the 74 algorithms with file evidence, the historical registry labels them:

- **49 Implemented**
- **22 Partial**
- **3 Planned only**

Family distribution of those 74:

- Profile + Targets: **12**
- PortionWise: **22**
- Barcode + Dietary: **8**
- Search + Recipe + Meal Planning: **10**
- Training Core: **18**
- Sports: **4**

These counts are evidence of file presence and historical registry status only. They are **not** a quality judgment and they do not select a winning implementation.

## Next comparison gate

When SRC-002, the older historical ZIP, is supplied:

1. fingerprint and freeze the archive;
2. generate its exact file manifest;
3. compare SRC-002 structurally against SRC-001;
4. locate implementations by behavior, not filename;
5. compare the relevant code for each canonical algorithm;
6. separate embedded formulas from orchestration logic;
7. assign KEEP / KEEP_AND_IMPROVE / MERGE / REWRITE / REMOVE_DUPLICATE / MISSING_IMPLEMENT / FUTURE;
8. only then write improved canonical code into MoveFuel-2.
