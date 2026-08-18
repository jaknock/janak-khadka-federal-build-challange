import { describe, expect, it } from "vitest";
import { getMockReviewRecords, getPendingReviewNotifications, mockReviewQueue } from "@/lib/mock-review-queue";

describe("mock review queue", () => {
  it("provides eight fictional pending notifications with matching review records", () => {
    const notifications = getPendingReviewNotifications();
    expect(notifications).toHaveLength(8);
    expect(notifications.map((notification) => notification.id)).toEqual(mockReviewQueue.map((record) => record.id));
    expect(notifications.every((notification) => notification.imagePath.startsWith("/samples/"))).toBe(true);
    expect(new Set(notifications.map((notification) => notification.title)).size).toBe(8);
    expect(notifications.map((notification) => notification.filename)).toContain("glare-low-confidence.png");
    expect(notifications.map((notification) => notification.filename)).toContain("skewed-photo.png");
  });

  it("only returns records requested by an exact pending-review id", () => {
    expect(getMockReviewRecords(["review-old-tom-pass"])).toHaveLength(1);
    expect(getMockReviewRecords(["review-not-real"])).toEqual([]);
  });
});
