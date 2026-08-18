import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LabelExtraction } from "@/lib/types";

const { extractLabelMock } = vi.hoisted(() => ({ extractLabelMock: vi.fn() }));
vi.mock("@/lib/extractor", () => ({ extractLabel: extractLabelMock }));

import { POST } from "@/app/api/reviews/route";
import { GOVERNMENT_WARNING } from "@/lib/validation";

const extraction: LabelExtraction = {
  brandName: "OLD TOM DISTILLERY", classType: "Kentucky Straight Bourbon Whiskey", alcoholContent: "45% Alc./Vol. (90 Proof)", netContents: "750 mL", producer: "Distilled and bottled by Old Tom Distillery Co., Bardstown, KY", countryOfOrigin: null, governmentWarning: GOVERNMENT_WARNING, warningHeaderText: "GOVERNMENT WARNING:", warningHeaderUppercase: true, warningHeaderBold: true, warningBodyBold: false, readable: true, confidence: .95, notes: null,
};

function image(name = "label.png", type = "image/png") { return new File(["fixture"], name, { type }); }
function request(files: File[] = [image()], expectedFields = { brandName: "OLD TOM DISTILLERY", classType: "Kentucky Straight Bourbon Whiskey", alcoholContent: "45%", netContents: "750 mL" }) {
  const form = new FormData(); files.forEach((file) => form.append("labels", file)); form.append("expectedFields", JSON.stringify(expectedFields));
  return new Request("http://localhost/api/reviews", { method: "POST", body: form });
}

describe("POST /api/reviews", () => {
  beforeEach(() => { extractLabelMock.mockReset(); });

  it("returns a validated result for a valid label", async () => {
    extractLabelMock.mockResolvedValue(extraction);
    const response = await POST(request()); const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.results[0].result.state).toBe("pass");
    expect(body.results[0].result.elapsedMs).toBeLessThan(5_000);
    expect(extractLabelMock).toHaveBeenCalledOnce();
  });
  it("rejects a request with no labels", async () => {
    const response = await POST(request([]));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("at least one");
  });
  it("rejects invalid expected fields before calling the extractor", async () => {
    const response = await POST(request([image()], ["not an object"] as never));
    expect(response.status).toBe(400);
    expect(extractLabelMock).not.toHaveBeenCalled();
  });
  it("returns a per-file error for unsupported image types", async () => {
    const response = await POST(request([image("label.gif", "image/gif")])); const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.results[0].error).toContain("PNG, JPEG, or WebP");
    expect(extractLabelMock).not.toHaveBeenCalled();
  });
  it("returns a per-file error when an image exceeds the request limit", async () => {
    extractLabelMock.mockResolvedValue(extraction);
    const oversized = new File([new Uint8Array(8 * 1024 * 1024 + 1)], "large.png", { type: "image/png" });
    const response = await POST(request([oversized])); const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.results[0].error).toContain("smaller than 8 MB");
    expect(extractLabelMock).not.toHaveBeenCalled();
  });
  it("isolates a provider failure to the affected file", async () => {
    extractLabelMock.mockRejectedValue(new Error("Vision service timed out"));
    const response = await POST(request()); const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.results[0].error).toBe("Vision service timed out");
  });
  it("enforces the batch file limit", async () => {
    const response = await POST(request(Array.from({ length: 21 }, (_, index) => image(`label-${index}.png`))));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("no more than 20");
  });
  it("returns an independent result for each valid batch item", async () => {
    extractLabelMock.mockResolvedValue(extraction);
    const response = await POST(request([image("first.png"), image("second.png")])); const body = await response.json();
    expect(body.results).toHaveLength(2);
    expect(body.results.map((item: { result: { state: string } }) => item.result.state)).toEqual(["pass", "pass"]);
    expect(extractLabelMock).toHaveBeenCalledTimes(2);
  });
  it("processes uploaded labels with no more than three simultaneous extractions", async () => {
    let active = 0;
    let peak = 0;
    extractLabelMock.mockImplementation(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return extraction;
    });

    const response = await POST(request(Array.from({ length: 4 }, (_, index) => image(`label-${index}.png`))));
    expect(response.status).toBe(200);
    expect(peak).toBe(3);
  });
});
