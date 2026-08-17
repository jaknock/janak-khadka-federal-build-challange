import { describe, expect, it } from "vitest";
import { type LabelExtraction } from "@/lib/types";
import { GOVERNMENT_WARNING, validateLabel } from "@/lib/validation";

const base: LabelExtraction = { brandName: "OLD TOM DISTILLERY", classType: "Kentucky Straight Bourbon Whiskey", alcoholContent: "45% Alc./Vol. (90 Proof)", netContents: "750 mL", producer: null, countryOfOrigin: null, governmentWarning: GOVERNMENT_WARNING, warningHeaderText: "GOVERNMENT WARNING:", warningHeaderUppercase: true, warningHeaderBold: true, warningBodyBold: false, readable: true, confidence: .9, notes: null };

describe("label validation", () => {
  it("passes a complete matching label", () => {
    expect(validateLabel("label.png", { brandName: "OLD TOM DISTILLERY", alcoholContent: "45% Alc./Vol. (90 Proof)" }, base).state).toBe("pass");
  });
  it("passes the complete Old Tom fixture data", () => {
    const result = validateLabel("old-tom-pass.png", { brandName: "OLD TOM DISTILLERY", classType: "Kentucky Straight Bourbon Whiskey", alcoholContent: "45% Alc./Vol. (90 Proof)", netContents: "750 mL" }, base);
    expect(result.state).toBe("pass");
  });
  it("uses a separately transcribed exact header when a vision response starts at the warning body", () => {
    const result = validateLabel("old-tom-pass.png", { brandName: "OLD TOM DISTILLERY" }, { ...base, governmentWarning: GOVERNMENT_WARNING.replace("GOVERNMENT WARNING: ", "") });
    expect(result.state).toBe("pass");
  });
  it("routes capitalization-only differences to human review", () => {
    expect(validateLabel("label.png", { brandName: "Old Tom Distillery" }, base).state).toBe("needs_review");
  });
  it("treats an optional proof statement as equivalent when ABV matches", () => {
    const result = validateLabel("stones-throw-case.png", { brandName: "Stone's Throw", classType: "Straight Rye Whiskey", alcoholContent: "45%", netContents: "750 mL" }, { ...base, brandName: "STONE'S THROW", classType: "Straight Rye Whiskey" });
    expect(result.findings.find((finding) => finding.field === "Alcohol content")?.state).toBe("pass");
    expect(result.state).toBe("needs_review");
  });
  it("flags a proof value that conflicts with the label's ABV", () => {
    const result = validateLabel("label.png", { alcoholContent: "45%" }, { ...base, alcoholContent: "45% Alc./Vol. (80 Proof)" });
    expect(result.findings.find((finding) => finding.field === "Alcohol content")?.state).toBe("needs_review");
  });
  it("flags ABV as an invalid abbreviation on a distilled-spirits alcohol statement", () => {
    const result = validateLabel("label.png", { alcoholContent: "45%" }, { ...base, alcoholContent: "45% ABV" });
    expect(result.findings.find((finding) => finding.field === "Alcohol content")?.state).toBe("mismatch");
  });
  it("flags a changed ABV as a mismatch", () => {
    expect(validateLabel("label.png", { alcoholContent: "40% Alc./Vol." }, base).state).toBe("mismatch");
  });
  it("requires exact warning words", () => {
    const result = validateLabel("label.png", {}, { ...base, governmentWarning: GOVERNMENT_WARNING.replace("health problems", "health issue") });
    expect(result.findings.find((item) => item.field === "Government warning")?.state).toBe("mismatch");
  });
  it("needs review when warning formatting cannot be observed", () => {
    expect(validateLabel("label.png", {}, { ...base, warningHeaderBold: null }).state).toBe("needs_review");
  });
  it("needs review when the warning body is bold", () => {
    expect(validateLabel("label.png", {}, { ...base, warningBodyBold: true }).state).toBe("needs_review");
  });
  it("marks the title-case warning fixture for review and nothing else", () => {
    const result = validateLabel("title-case-warning.png", { brandName: "OLD TOM DISTILLERY", classType: "Kentucky Straight Bourbon Whiskey", alcoholContent: "45%", netContents: "750 mL" }, { ...base, warningHeaderText: "Government Warning:", warningHeaderUppercase: false, warningHeaderBold: null });
    expect(result.state).toBe("needs_review");
    expect(result.findings.filter((finding) => finding.state !== "pass")).toHaveLength(1);
    expect(result.findings[4].field).toBe("Warning format");
  });
  it("marks the reworded-warning fixture as a mismatch", () => {
    const result = validateLabel("reworded-warning.png", { brandName: "OLD TOM DISTILLERY", alcoholContent: "45%" }, { ...base, governmentWarning: GOVERNMENT_WARNING.replace("health problems", "health issues") });
    expect(result.state).toBe("mismatch");
    expect(result.findings.find((finding) => finding.field === "Government warning")?.state).toBe("mismatch");
  });
  it("marks the missing-warning fixture as a mismatch", () => {
    const result = validateLabel("missing-warning.png", { brandName: "OLD TOM DISTILLERY", alcoholContent: "45%" }, { ...base, governmentWarning: null, warningHeaderText: null, warningHeaderUppercase: null, warningHeaderBold: null, warningBodyBold: null });
    expect(result.state).toBe("mismatch");
  });
  it("marks the wrong-ABV fixture as a mismatch", () => {
    const result = validateLabel("wrong-abv.png", { brandName: "OLD TOM DISTILLERY", alcoholContent: "45%" }, { ...base, alcoholContent: "40% Alc./Vol. (80 Proof)" });
    expect(result.state).toBe("mismatch");
  });
});
