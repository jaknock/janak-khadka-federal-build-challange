import { describe, expect, it } from "vitest";
import { emptyPersistedReviewQueue, readPersistedReviewQueue } from "@/lib/review-queue-storage";

describe("review queue browser storage", () => {
  it("returns an empty state for missing or malformed browser data", () => {
    expect(readPersistedReviewQueue(null)).toEqual(emptyPersistedReviewQueue());
    expect(readPersistedReviewQueue("not json")).toEqual(emptyPersistedReviewQueue());
    expect(readPersistedReviewQueue('{"version":3}')).toEqual(emptyPersistedReviewQueue());
  });

  it("migrates persisted results that predate image-quality evidence", () => {
    const stored = JSON.stringify({
      version: 2,
      decisions: { "review-old-tom-pass": { value: "rejected", rejectionReason: "Alcohol content does not match the submitted application." } },
      results: {
        "review-old-tom-pass": {
          reviewId: "review-old-tom-pass",
          result: {
            fileName: "old-tom-pass.png",
            state: "pass",
            findings: [],
            extraction: { brandName: null, classType: null, alcoholContent: null, netContents: null, producer: null, countryOfOrigin: null, governmentWarning: null, warningHeaderText: null, warningHeaderUppercase: null, warningHeaderBold: null, warningBodyBold: null, readable: true, confidence: 1, notes: null },
            elapsedMs: 1200,
          },
        },
      },
    });

    expect(readPersistedReviewQueue(stored).decisions["review-old-tom-pass"]).toEqual({ value: "rejected", rejectionReason: "Alcohol content does not match the submitted application." });
    expect(readPersistedReviewQueue(stored).results["review-old-tom-pass"]?.result?.state).toBe("pass");
    expect(readPersistedReviewQueue(stored).results["review-old-tom-pass"]?.result?.extraction.imageQualityIssues).toEqual([]);
  });

  it("migrates the earlier decision-only browser state", () => {
    const stored = JSON.stringify({ version: 1, decisions: { "review-old-tom-pass": "approved" }, results: {} });
    expect(readPersistedReviewQueue(stored).decisions["review-old-tom-pass"]).toEqual({ value: "approved" });
  });
});
