import { MockPixelQualityAssessor } from "../helpers/mockPixelQualityAssessor.ts";
import assert from "node:assert/strict";
import test from "node:test";
import {
  MetadataOnlyQualityAssessor,
  type ImageMetadataInput,
} from "../../nutrition/vision/qualityAssessment.ts";

const validMetadata: ImageMetadataInput = {
  imageReference: "tmp://img-1",
  mimeType: "image/jpeg",
  widthPx: 1200,
  heightPx: 900,
  bytes: 1024 * 1024,
  checksum: "sha256:abc",
};

test("supported valid metadata is ACCEPTABLE and labelled METADATA_ONLY", () => {
  const result = new MetadataOnlyQualityAssessor().validateMetadata(validMetadata);
  assert.equal(result.state, "ACCEPTABLE");
  assert.equal(result.validationMode, "METADATA_ONLY");
  assert.deepEqual(result.issueCodes, []);
});

test("unsupported MIME type is UNSUPPORTED with MANUAL_ENTRY fallback", () => {
  const result = new MetadataOnlyQualityAssessor().validateMetadata({ ...validMetadata, mimeType: "image/gif" });
  assert.equal(result.state, "UNSUPPORTED");
  assert.ok(result.issueCodes.includes("UNSUPPORTED_MIME_TYPE"));
  assert.equal(result.safeFallback, "MANUAL_ENTRY");
});

test("missing image reference is INVALID_IMAGE", () => {
  const result = new MetadataOnlyQualityAssessor().validateMetadata({ imageReference: "  " });
  assert.equal(result.state, "INVALID_IMAGE");
  assert.equal(result.safeFallback, "MANUAL_ENTRY");
});

test("corrupt image via mock pixel assessor is INVALID_IMAGE and PIXEL_MODEL labelled", () => {
  const assessor = new MockPixelQualityAssessor(["CORRUPT_IMAGE"]);
  const result = assessor.assessPixels(validMetadata);
  assert.equal(result.state, "INVALID_IMAGE");
  assert.equal(result.validationMode, "PIXEL_MODEL");
  assert.equal(result.retryRecommendation, "RETAKE");
});

test("too-small image requires a retake", () => {
  const result = new MetadataOnlyQualityAssessor().validateMetadata({ ...validMetadata, widthPx: 200, heightPx: 200 });
  assert.equal(result.state, "RETAKE_REQUIRED");
  assert.ok(result.issueCodes.includes("IMAGE_TOO_SMALL"));
  assert.equal(result.retryRecommendation, "RETAKE");
});

test("oversized image requires a retake", () => {
  const result = new MetadataOnlyQualityAssessor().validateMetadata({ ...validMetadata, widthPx: 12000, heightPx: 12000 });
  assert.equal(result.state, "RETAKE_REQUIRED");
  assert.ok(result.issueCodes.includes("IMAGE_TOO_LARGE"));
});

test("oversized byte count requires a retake", () => {
  const result = new MetadataOnlyQualityAssessor().validateMetadata({ ...validMetadata, bytes: 21 * 1024 * 1024 });
  assert.equal(result.state, "RETAKE_REQUIRED");
  assert.ok(result.issueCodes.includes("IMAGE_TOO_LARGE"));
});

test("metadata-only results never fabricate pixel findings", () => {
  const metadataResult = new MetadataOnlyQualityAssessor().validateMetadata(validMetadata);
  assert.equal(metadataResult.validationMode, "METADATA_ONLY");
  assert.ok(!metadataResult.issueCodes.includes("EXCESSIVE_BLUR"));
  assert.ok(!metadataResult.issueCodes.includes("GLARE"));
  const pixelResult = new MockPixelQualityAssessor(["EXCESSIVE_BLUR"]).assessPixels(validMetadata);
  assert.equal(pixelResult.validationMode, "PIXEL_MODEL");
});

test("provider unavailable keeps manual entry and suggests retry", () => {
  const assessor = new MockPixelQualityAssessor(["ANALYSIS_PROVIDER_UNAVAILABLE"]);
  const result = assessor.assessPixels(validMetadata);
  assert.equal(result.retryRecommendation, "RETRY");
  assert.equal(result.safeFallback, "MANUAL_ENTRY");
  assert.equal(result.validationMode, "PIXEL_MODEL");
});

test("mock pixel blur maps to RETAKE_REQUIRED", () => {
  const result = new MockPixelQualityAssessor(["EXCESSIVE_BLUR"]).assessPixels(validMetadata);
  assert.equal(result.state, "RETAKE_REQUIRED");
});

test("mock pixel glare maps to REVIEW_RECOMMENDED", () => {
  const result = new MockPixelQualityAssessor(["GLARE"]).assessPixels(validMetadata);
  assert.equal(result.state, "REVIEW_RECOMMENDED");
});
