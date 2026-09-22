# MoveFuel — Model & Repository Licence Audit

Status: IN PROGRESS
Last updated: 2026-08-06

Scope: audit before importing any third-party code, weights or datasets.

## Repositories reviewed (2026-08-06)

| Repository | Approach | Licence status | MoveFuel verdict |
|---|---|---|---|
| `ahmedjavedcodes/Dietry-Estimation-System` | YOLO instance segmentation + XGBoost weight regression | No clear root licence found; **do not import without approval** | Study pattern only (practical baseline) |
| `Yangxinyee/3D-FoodCalorie` | Mask R-CNN + depth estimation + nutrition regression | No clear root licence found | Research reference (V2) only |
| `andn29/Food-Detection-and-Calories-Estimation` | YOLOv8 detect + portion classifier | No clear root licence found | Learning example only |
| `meghanamreddy/Calorie-estimation-from-food-images-OpenCV` | OpenCV Canny/watershed + SVM | No clear root licence found | Geometry/calibration lesson only |
| `oual99/Food-Calorie-Estimation-Using-deep-learning-Image-Processing` | CNN + segmentation | No clear root licence found | Learning example only |
| `takladuck/Food_Calorie_Estimation` | MobileNetV2 classifier + fixed lookup | No clear root licence found | Learning example only |

## Third-party runtime dependencies

| Dependency | Licence | Commercial note |
|---|---|---|
| Ultralytics (YOLO) | AGPL-3.0 | AGPL obligations apply; proprietary deployment may require Enterprise licence. **Not adopted until approved.** |
| TensorFlow / PyTorch | Apache-2.0 / BSD | Permissive |
| OpenCV | Apache-2.0 | Permissive |

## Provider licence gates (Phase 7)

The provider registry (`backend/src/nutrition/providerRegistry.ts`) enforces
that no provider may be enabled when licence or privacy status is UNKNOWN.
Each descriptor records: providerId, providerName, adapterType
(SEGMENTATION/CANDIDATE/COMBINED), model/version, deployment type
(LOCAL/SERVER/CLOUD_API/MOCK), licence status
(APPROVED/REVIEW_REQUIRED/REJECTED/UNKNOWN), commercial-use status,
data-retention status, model-training-use status, region availability,
expected input/output, cost, latency, evidence status, and an enabled flag.

| Provider | Licence status | Commercial use | Model weights licence | API terms | Dependency licence compat | Verdict |
|---|---|---|---|---|---|---|
| (none approved) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | NOT APPROVED |

Verified terms must be recorded with a source and date before any provider is
enabled. See `PROVIDER_PRIVACY_AUDIT.md` for the privacy gates.

## Position

- No code/weights imported from the above repositories.
- Vision layer is behind adapter interfaces with a deterministic free
  `mockProvider`.
- No real provider is integrated in Phase 7; the comparison harness runs
  mocks and records structured placeholders.
- Any future model import requires: licence documentation + approval, and
  entry appended below.

## Open items

- Confirm whether the MoveFuel app itself (mobile) triggers AGPL copyleft
  if a server-side AGPL model is used. Decision needed before integration.
