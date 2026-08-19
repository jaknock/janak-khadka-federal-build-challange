import { z } from "zod";
import { imageQualityIssueSchema, type ExpectedFields } from "@/lib/types";

export const mockReviewRecordSchema = z.object({
  id: z.string().regex(/^review-[a-z0-9-]+$/),
  filename: z.string().regex(/^[a-z0-9-]+\.png$/),
  imagePath: z.string().regex(/^\/samples\/[a-z0-9-]+\.png$/),
  application: z.object({
    brandName: z.string().min(1),
    classType: z.string().min(1),
    alcoholContent: z.string().min(1),
    netContents: z.string().min(1),
    producer: z.string().optional(),
    countryOfOrigin: z.string().optional(),
  }),
  notification: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
  }),
  visualQualityIssues: z.array(imageQualityIssueSchema).default([]),
});

export type MockReviewRecord = z.infer<typeof mockReviewRecordSchema> & { application: ExpectedFields };

const queue = [
  {
    id: "review-old-tom-pass",
    filename: "old-tom-pass.png",
    imagePath: "/samples/old-tom-pass.png",
    application: { brandName: "OLD TOM DISTILLERY", classType: "Kentucky Straight Bourbon Whiskey", alcoholContent: "45% Alc./Vol. (90 Proof)", netContents: "750 mL" },
    notification: { title: "Old Tom Distillery", description: "Label evidence has not yet been extracted." },
  },
  {
    id: "review-stones-throw-case",
    filename: "stones-throw-case.png",
    imagePath: "/samples/stones-throw-case.png",
    application: { brandName: "Stone's Throw", classType: "Straight Rye Whiskey", alcoholContent: "47% Alc./Vol. (94 Proof)", netContents: "700 mL" },
    notification: { title: "Stone's Throw Distilling Co.", description: "Label evidence has not yet been extracted." },
  },
  {
    id: "review-title-case-warning",
    filename: "title-case-warning.png",
    imagePath: "/samples/title-case-warning.png",
    application: { brandName: "CEDAR HOLLOW DISTILLING", classType: "American Single Malt Whiskey", alcoholContent: "46% Alc./Vol. (92 Proof)", netContents: "700 mL" },
    notification: { title: "Cedar Hollow Distilling Co.", description: "Label evidence has not yet been extracted." },
  },
  {
    id: "review-reworded-warning",
    filename: "reworded-warning.png",
    imagePath: "/samples/reworded-warning.png",
    application: { brandName: "HARBOR & FIELD SPIRITS", classType: "Straight Bourbon Whiskey", alcoholContent: "43% Alc./Vol. (86 Proof)", netContents: "750 mL" },
    notification: { title: "Harbor & Field Spirits", description: "Label evidence has not yet been extracted." },
  },
  {
    id: "review-missing-warning",
    filename: "missing-warning.png",
    imagePath: "/samples/missing-warning.png",
    application: { brandName: "JUNIPER TRAIL DISTILLERS", classType: "Small Batch Rye Whiskey", alcoholContent: "50% Alc./Vol. (100 Proof)", netContents: "1L" },
    notification: { title: "Juniper Trail Distillers", description: "Label evidence has not yet been extracted." },
  },
  {
    id: "review-wrong-abv",
    filename: "wrong-abv.png",
    imagePath: "/samples/wrong-abv.png",
    application: { brandName: "NORTHSTAR BARREL HOUSE", classType: "Tennessee Whiskey", alcoholContent: "42% Alc./Vol. (84 Proof)", netContents: "1L" },
    notification: { title: "Northstar Barrel House", description: "Label evidence has not yet been extracted." },
  },
  {
    id: "review-glare-low-confidence",
    filename: "glare-low-confidence.png",
    imagePath: "/samples/glare-low-confidence.png",
    application: { brandName: "OLD TOM DISTILLERY", classType: "Kentucky Straight Bourbon Whiskey", alcoholContent: "45% Alc./Vol. (90 Proof)", netContents: "750 mL" },
    notification: { title: "Old Tom Distillery — warning glare", description: "Label photograph has glare across part of the warning." },
    visualQualityIssues: ["glare"],
  },
  {
    id: "review-skewed-photo",
    filename: "skewed-photo.png",
    imagePath: "/samples/skewed-photo.png",
    application: { brandName: "OLD TOM DISTILLERY", classType: "Kentucky Straight Bourbon Whiskey", alcoholContent: "45% Alc./Vol. (90 Proof)", netContents: "750 mL" },
    notification: { title: "Old Tom Distillery — skewed photo", description: "Label photograph has visible perspective skew." },
    visualQualityIssues: ["perspective_skew"],
  },
] as const;

export const mockReviewQueue = z.array(mockReviewRecordSchema).length(8).parse(queue) as MockReviewRecord[];

export function getPendingReviewNotifications() {
  return mockReviewQueue.map(({ id, filename, imagePath, application, notification }) => ({ id, filename, imagePath, application, ...notification }));
}

export function getMockReviewRecords(ids: string[]) {
  const requested = new Set(ids);
  return mockReviewQueue.filter((record) => requested.has(record.id));
}
