/**
 * Deterministic mock segmentation adapter (Phase 6).
 *
 * Free, offline, fixture-driven and repeatable. Given the same input
 * (checksum/correlation id) it produces the same output. It never invents
 * food identity and never returns nutrient values.
 */

import {
  type NormalizedBBox,
  type OverlapState,
  type SegmentationAdapter,
  type SegmentationAnalysis,
  type SegmentationRegion,
  type SegmentationRequest,
  type VisualPortionEstimate,
} from "../../nutrition/vision/segmentationAdapter.ts";

export type MockRegionFixture = {
  regionId?: string;
  bbox?: NormalizedBBox;
  maskReference?: string;
  segmentationConfidence?: number;
  overlapState?: OverlapState;
  warnings?: readonly string[];
  visualPortionEstimate?: VisualPortionEstimate;
};

export type MockSegmentationConfig = {
  /** Explicit fixture regions. When omitted, regions are derived from the checksum. */
  regions?: readonly MockRegionFixture[];
  /** Force zero regions. */
  zeroRegions?: boolean;
  status?: SegmentationAnalysis["status"];
  latencyMs?: number;
  /** When true, the adapter returns maskless (bounding-box-only) regions. */
  maskless?: boolean;
};

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const FALLBACK_REGIONS: readonly SegmentationRegion[] = [
  {
    regionId: "region-1",
    bbox: { x: 0.15, y: 0.2, width: 0.7, height: 0.6 },
    segmentationConfidence: 0.92,
    overlapState: "NONE",
    warnings: [],
  },
];

export class MockSegmentationAdapter implements SegmentationAdapter {
  readonly name = "mock-segmentation";
  readonly providerVersion = "0.1.0";
  private readonly config: MockSegmentationConfig;

  constructor(config: MockSegmentationConfig = {}) {
    this.config = config;
  }

  async segment(input: SegmentationRequest): Promise<SegmentationAnalysis> {
    if (this.config.status === "FAILED") {
      return {
        provider: this.name,
        providerVersion: this.providerVersion,
        status: "FAILED",
        regions: [],
        latencyMs: this.config.latencyMs ?? 0,
        warnings: ["mock segmentation failed"],
      };
    }
    if (this.config.status === "UNAVAILABLE") {
      return {
        provider: this.name,
        providerVersion: this.providerVersion,
        status: "UNAVAILABLE",
        regions: [],
        latencyMs: this.config.latencyMs ?? 0,
        warnings: ["mock segmentation provider unavailable"],
      };
    }

    if (this.config.zeroRegions || this.config.regions?.length === 0) {
      return {
        provider: this.name,
        providerVersion: this.providerVersion,
        status: "COMPLETED",
        regions: [],
        latencyMs: this.config.latencyMs ?? 0,
        warnings: ["no regions detected"],
      };
    }

    const regions = this.deterministicRegions(input);
    return {
      provider: this.name,
      providerVersion: this.providerVersion,
      status: "COMPLETED",
      regions,
      latencyMs: this.config.latencyMs ?? 0,
      warnings: [],
    };
  }

  /** Deterministic: regions derive from the checksum (or correlation id). */
  private deterministicRegions(input: SegmentationRequest): readonly SegmentationRegion[] {
    if (this.config.regions && this.config.regions.length > 0) {
      return this.config.regions.map((fixture, index) => ({
        regionId: fixture.regionId ?? `region-${index + 1}`,
        bbox: fixture.bbox ?? { x: 0.1 + index * 0.05, y: 0.15, width: 0.6, height: 0.55 },
        ...(this.config.maskless ? {} : { maskReference: fixture.maskReference ?? `mask://${fixture.regionId ?? `region-${index + 1}`}` }),
        segmentationConfidence: fixture.segmentationConfidence ?? 0.9,
        overlapState: fixture.overlapState ?? "NONE",
        warnings: fixture.warnings ?? [],
        ...(fixture.visualPortionEstimate ? { visualPortionEstimate: fixture.visualPortionEstimate } : {}),
      }));
    }

    const seed = input.checksum ?? input.correlationId ?? input.imageReference ?? "default";
    const hash = fnv1a(seed);
    const count = hash % 4; // 0..3 regions
    if (count === 0) {
      return [];
    }
    // Unsigned shifts (>>> 0) keep coordinates/confidence in range. x+width<=1
    // and y+height<=1 are guaranteed: x in [0.1,0.4], y in [0.15,0.45].
    return Array.from({ length: count }, (_unused, index) => {
      const regionId = `region-${index + 1}`;
      const x = 0.1 + ((hash >>> (index * 4)) % 30) / 100;
      const y = 0.15 + ((hash >>> (index * 4 + 2)) % 30) / 100;
      return {
        regionId,
        ...(this.config.maskless ? {} : { maskReference: `mask://${regionId}` }),
        bbox: { x, y, width: 0.55, height: 0.5 },
        segmentationConfidence: 0.85 + ((hash >>> index) % 10) / 100,
        overlapState: "NONE",
        warnings: [],
      };
    });
  }
}
