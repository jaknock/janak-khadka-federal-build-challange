import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LabelExtraction } from "@/lib/types";

const { extractLabelMock } = vi.hoisted(() => ({ extractLabelMock: vi.fn() }));
vi.mock("@/lib/extractor", () => ({ extractLabel: extractLabelMock }));

import { POST } from "@/app/api/reviews/batch/route";
import { GOVERNMENT_WARNING } from "@/lib/validation";

const extraction: LabelExtraction = {
  brandName: "OLD TOM DISTILLERY", classType: "Kentucky Straight Bourbon Whiskey", alcoholContent: "45% Alc./Vol. (90 Proof)", netContents: "750 mL", producer: "Distilled and bottled by Old Tom Distillery Co., Bardstown, KY", countryOfOrigin: null, governmentWarning: GOVERNMENT_WARNING, warningHeaderText: "GOVERNMENT WARNING:", warningHeaderUppercase: true, warningHeaderBold: true, warningBodyBold: false, readable: true, confidence: .95, notes: null,
};

function request(body: unknown) {
  return new Request("http://localhost/api/reviews/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

describe("POST /api/reviews/batch", () => {
  beforeEach(() => { extractLabelMock.mockReset(); });

  it("verifies selected mock records using their server-owned label artwork", async () => {
    extractLabelMock.mockResolvedValue(extraction);
    const response = await POST(request({ reviewIds: ["review-old-tom-pass", "review-wrong-abv"] }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.results).toHaveLength(2);
    expect(body.results.map((item: { reviewId: string }) => item.reviewId)).toEqual(["review-old-tom-pass", "review-wrong-abv"]);
    expect(body.results[0].result.state).toBe("pass");
    expect(extractLabelMock).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed batches before calling the extractor", async () => {
    const response = await POST(request({ reviewIds: [] }));
    expect(response.status).toBe(400);
    expect(extractLabelMock).not.toHaveBeenCalled();
  });

  it("rejects unknown records before calling the extractor", async () => {
    const response = await POST(request({ reviewIds: ["review-not-real"] }));
    expect(response.status).toBe(404);
    expect(extractLabelMock).not.toHaveBeenCalled();
  });

  it("processes mock reviews with no more than three simultaneous extractions", async () => {
    let active = 0;
    let peak = 0;
    extractLabelMock.mockImplementation(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return extraction;
    });

    const response = await POST(request({ reviewIds: ["review-old-tom-pass", "review-stones-throw-case", "review-title-case-warning", "review-reworded-warning"] }));
    expect(response.status).toBe(200);
    expect(peak).toBe(3);
  });
});
