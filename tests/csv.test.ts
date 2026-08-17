import { describe, expect, it } from "vitest";
import { BATCH_CSV_HEADER, BATCH_CSV_TEMPLATE, parseBatchCsv, toCsv } from "@/lib/csv";

describe("batch CSV parsing", () => {
  it("parses the shipped template", () => {
    const parsed = parseBatchCsv(BATCH_CSV_TEMPLATE);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toEqual([{ filename: "old-tom-pass.png", application: { brandName: "OLD TOM DISTILLERY", classType: "Kentucky Straight Bourbon Whiskey", alcoholContent: "45%", netContents: "750 mL" } }]);
  });
  it("accepts aliases and quoted CSV fields", () => {
    const parsed = parseBatchCsv('image,brand,class,abv,volume\n"label, one.png","Old, Tom",Whiskey,45%,750 mL');
    expect(parsed.rows[0]).toEqual({ filename: "label, one.png", application: { brandName: "Old, Tom", classType: "Whiskey", alcoholContent: "45%", netContents: "750 mL" } });
  });
  it("requires a filename header", () => {
    expect(parseBatchCsv("brand_name,class_type\nOld Tom,Whiskey").errors[0]).toContain("filename");
  });
  it("reports and skips rows without an image filename", () => {
    const parsed = parseBatchCsv(`${BATCH_CSV_HEADER.join(",")}\n,Old Tom,Whiskey,45%,750 mL`);
    expect(parsed.rows).toEqual([]);
    expect(parsed.errors[0]).toContain("no filename");
  });
  it("serializes values that contain commas or quotes", () => {
    expect(toCsv([["brand", "Old, Tom", 'Stone\'s "Throw"']])).toBe('brand,"Old, Tom","Stone\'s ""Throw"""');
  });
});
