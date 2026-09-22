/**
 * Replay/file boundary for physically calibrated depth evidence.
 *
 * The algorithm/device team may generate this sidecar from hardware depth,
 * camera intrinsics, a known reference object, or a benchmark RGB-D rig.  The
 * sidecar contains only physical evidence and provenance; it never contains
 * meal mass, calories, or other ground truth.  Relative monocular depth is not
 * accepted as COMPLETED physical evidence unless a metric scale is present.
 */
import { readFile } from "node:fs/promises";
import type { DepthScaleAdapter, DepthScaleRegionResult, DepthScaleRequest } from "./depthScaleAdapter.ts";
import { validateDepthScaleResult } from "./depthScaleAdapter.ts";

export const DEPTH_SCALE_SIDECAR_SCHEMA = "movefuel-depth-scale-sidecar-v1" as const;

export type DepthScaleSidecar = {
  schema: typeof DEPTH_SCALE_SIDECAR_SCHEMA;
  sampleId?: string;
  imageReference?: string;
  regions: readonly DepthScaleRegionResult[];
};

export function validateDepthScaleSidecar(sidecar: DepthScaleSidecar): string[] {
  const errors: string[] = [];
  if (sidecar.schema !== DEPTH_SCALE_SIDECAR_SCHEMA) errors.push("invalid_schema");
  if (!Array.isArray(sidecar.regions)) return [...errors, "regions_must_be_array"];
  const seen = new Set<string>();
  for (const region of sidecar.regions) {
    if (seen.has(region.regionId)) errors.push(`duplicate_region:${region.regionId}`);
    seen.add(region.regionId);
    for (const error of validateDepthScaleResult(region)) errors.push(`${region.regionId}:${error}`);
    // Production safety boundary: a raw/relative monocular depth output is not
    // metric scale. MONOCULAR_CALIBRATED is only legal with provenance + scale.
    if (region.status === "COMPLETED" && region.method === "MONOCULAR_CALIBRATED" && region.scale === null) {
      errors.push(`${region.regionId}:monocular_missing_metric_scale`);
    }
  }
  return errors;
}

export class SidecarDepthScaleAdapter implements DepthScaleAdapter {
  readonly name = "sidecar-physical-depth-scale";
  private readonly byRegion: ReadonlyMap<string, DepthScaleRegionResult>;

  constructor(sidecar: DepthScaleSidecar) {
    const errors = validateDepthScaleSidecar(sidecar);
    if (errors.length > 0) throw new Error(`invalid_depth_scale_sidecar:${errors.join(",")}`);
    this.byRegion = new Map(sidecar.regions.map((entry) => [entry.regionId, entry]));
  }

  static async fromFile(path: string): Promise<SidecarDepthScaleAdapter> {
    const parsed = JSON.parse(await readFile(path, "utf8")) as DepthScaleSidecar;
    return new SidecarDepthScaleAdapter(parsed);
  }

  async analyzeRegion(input: DepthScaleRequest): Promise<DepthScaleRegionResult> {
    const result = this.byRegion.get(input.region.regionId);
    if (result) return result;
    return {
      status: "INSUFFICIENT",
      provider: this.name,
      providerVersion: DEPTH_SCALE_SIDECAR_SCHEMA,
      regionId: input.region.regionId,
      method: "KNOWN_REFERENCE_GEOMETRY",
      scale: null,
      heightSamples: [],
      validCoverageFraction: 0,
      supportPlaneConfidence: 0,
      warnings: ["no calibrated physical evidence for this region"],
    };
  }
}
