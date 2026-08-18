import { describe, expect, it } from "vitest";
import { MAX_REVIEW_CONCURRENCY, REVIEW_HARD_TIMEOUT_MS, REVIEW_RESPONSE_TARGET_MS, VISION_TIMEOUT_MS, processWithLimit, runWithinTimeBudget } from "@/lib/review-processing";

describe("review processing limits", () => {
  it("keeps result order while running up to three reviews in parallel", async () => {
    let active = 0;
    let peak = 0;
    const results = await processWithLimit([1, 2, 3, 4, 5], async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return value * 2;
    });

    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(peak).toBe(MAX_REVIEW_CONCURRENCY);
  });

  it("fails a review that exceeds its hard safety timeout", async () => {
    await expect(runWithinTimeBudget(
      () => new Promise((resolve) => setTimeout(resolve, 30)),
      5,
    )).rejects.toThrow("5 seconds");
    expect(REVIEW_RESPONSE_TARGET_MS).toBe(5_000);
    expect(REVIEW_HARD_TIMEOUT_MS).toBe(15_000);
    expect(VISION_TIMEOUT_MS).toBe(12_000);
  });
});
