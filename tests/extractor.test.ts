import { describe, expect, it } from "vitest";
import { parseExtraction } from "@/lib/extractor";

describe("extraction normalization", () => {
  it("converts the model's literal null string to JSON null", () => {
    const extraction = parseExtraction(JSON.stringify({ brandName: "OLD TOM DISTILLERY", classType: "Kentucky Straight Bourbon Whiskey", alcoholContent: "45% Alc./Vol. (90 Proof)", netContents: "750 mL", producer: "Distilled and bottled by Old Tom Distillery Co., Bardstown, KY", countryOfOrigin: "null", governmentWarning: "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.", warningHeaderText: "GOVERNMENT WARNING:", warningHeaderUppercase: true, warningHeaderBold: true, warningBodyBold: false, readable: true, confidence: .95, imageQualityIssues: [], notes: "null" }));
    expect(extraction.countryOfOrigin).toBeNull();
    expect(extraction.notes).toBeNull();
    expect(extraction.imageQualityIssues).toEqual([]);
  });
  it("rejects an incomplete provider response", () => {
    expect(() => parseExtraction(JSON.stringify({ brandName: "Old Tom" }))).toThrow();
  });
});
