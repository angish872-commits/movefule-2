/**
 * Local OpenCV-backed pixel quality gate.
 *
 * The Node backend keeps image bytes in its private image store, writes a
 * short-lived temp file, invokes the Python OpenCV worker, parses only the
 * resulting quality metrics, and deletes the temp file immediately.
 */

import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { MealImageStore } from "../../meal/local-image-store.ts";
import type { ImageMetadataInput, ImageQualityResult, PixelQualityAssessor, QualityIssueCode } from "./qualityAssessment.ts";

const execFileAsync = promisify(execFile);
export const OPENCV_PIXEL_QUALITY_ADAPTER_VERSION = "1.0.0";

type WorkerPayload = {
  state: "ACCEPTABLE" | "REVIEW_RECOMMENDED" | "RETAKE_REQUIRED";
  issue_codes: string[];
  policy_version: string;
};

export type OpenCvPixelQualityOptions = {
  imageStore: Pick<MealImageStore, "read">;
  /** Path to nutrition-research/python. */
  pythonPath: string;
  pythonBin?: string;
  runner?: (imagePath: string, pythonPath: string, pythonBin: string) => Promise<WorkerPayload>;
};

const allowedIssues = new Set<QualityIssueCode>([
  "IMAGE_TOO_SMALL", "EXCESSIVE_BLUR", "UNDEREXPOSED", "OVEREXPOSED", "GLARE", "LOW_CONTRAST", "CORRUPT_IMAGE",
]);

async function defaultRunner(imagePath: string, pythonPath: string, pythonBin: string): Promise<WorkerPayload> {
  const env = { ...process.env, PYTHONPATH: pythonPath };
  const { stdout } = await execFileAsync(pythonBin, ["-m", "movefuel_fdc.vision_quality_worker", imagePath], {
    env,
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
  });
  return JSON.parse(stdout) as WorkerPayload;
}

export class OpenCvPixelQualityAssessor implements PixelQualityAssessor {
  readonly name = "opencv-pixel-quality";
  private readonly options: OpenCvPixelQualityOptions;

  constructor(options: OpenCvPixelQualityOptions) {
    this.options = options;
  }

  async assessPixels(input: ImageMetadataInput): Promise<ImageQualityResult> {
    const image = await this.options.imageStore.read(input.imageReference);
    const dir = await mkdtemp(path.join(tmpdir(), "movefuel-quality-"));
    const extension = image.mediaType === "image/png" ? "png" : image.mediaType === "image/webp" ? "webp" : "jpg";
    const imagePath = path.join(dir, `capture.${extension}`);
    try {
      await writeFile(imagePath, image.bytes, { mode: 0o600 });
      const payload = await (this.options.runner ?? defaultRunner)(imagePath, this.options.pythonPath, this.options.pythonBin ?? "python3");
      const issueCodes = payload.issue_codes.filter((issue): issue is QualityIssueCode => allowedIssues.has(issue as QualityIssueCode));
      const state = payload.state;
      return {
        state,
        issueCodes,
        userMessage: state === "ACCEPTABLE"
          ? "The photo passed the local pixel-quality gate."
          : state === "RETAKE_REQUIRED"
            ? "Retake the photo for a more reliable food estimate."
            : "The photo is usable but has quality warnings.",
        retryRecommendation: state === "RETAKE_REQUIRED" ? "RETAKE" : "NO_RETRY",
        safeFallback: state === "RETAKE_REQUIRED" ? "MANUAL_ENTRY" : "USE_METADATA_ONLY",
        evidenceSource: `${this.name}@${payload.policy_version}`,
        analyserVersion: `${this.name}@${OPENCV_PIXEL_QUALITY_ADAPTER_VERSION}`,
        validationMode: "PIXEL_MODEL",
      };
    } catch {
      return {
        state: "REVIEW_RECOMMENDED",
        issueCodes: ["ANALYSIS_PROVIDER_UNAVAILABLE"],
        userMessage: "The local pixel-quality check is unavailable; use manual entry or retry.",
        retryRecommendation: "RETRY",
        safeFallback: "MANUAL_ENTRY",
        evidenceSource: `${this.name}@unavailable`,
        analyserVersion: `${this.name}@${OPENCV_PIXEL_QUALITY_ADAPTER_VERSION}`,
        validationMode: "PIXEL_MODEL",
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
