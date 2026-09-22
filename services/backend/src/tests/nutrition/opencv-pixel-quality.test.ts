import assert from "node:assert/strict";
import test from "node:test";
import { OpenCvPixelQualityAssessor } from "../../nutrition/vision/openCvPixelQualityAssessor.ts";

test("OpenCV pixel-quality adapter maps worker output and uses the real image reference", async () => {
  let readReference = "";
  const assessor = new OpenCvPixelQualityAssessor({
    imageStore: {
      async read(objectId: string) {
        readReference = objectId;
        return { bytes: Buffer.from([1, 2, 3]), mediaType: "image/jpeg" as const };
      },
    },
    pythonPath: "/unused",
    runner: async () => ({ state: "RETAKE_REQUIRED", issue_codes: ["EXCESSIVE_BLUR", "LOW_CONTRAST"], policy_version: "fixture" }),
  });
  const result = await assessor.assessPixels({ imageReference: "local-meal-image:opaque" });
  assert.equal(readReference, "local-meal-image:opaque");
  assert.equal(result.state, "RETAKE_REQUIRED");
  assert.deepEqual(result.issueCodes, ["EXCESSIVE_BLUR", "LOW_CONTRAST"]);
  assert.equal(result.validationMode, "PIXEL_MODEL");
});


test("OpenCV pixel-quality adapter preserves a structured corrupt-image result", async () => {
  const assessor = new OpenCvPixelQualityAssessor({
    imageStore: { async read() { return { bytes: Buffer.from([0]), mediaType: "image/jpeg" as const }; } },
    pythonPath: "/unused",
    runner: async () => ({ state: "RETAKE_REQUIRED", issue_codes: ["CORRUPT_IMAGE"], policy_version: "fixture" }),
  });
  const result = await assessor.assessPixels({ imageReference: "bad-image" });
  assert.equal(result.state, "RETAKE_REQUIRED");
  assert.deepEqual(result.issueCodes, ["CORRUPT_IMAGE"]);
});
