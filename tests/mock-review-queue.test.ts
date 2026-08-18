import { describe, expect, it } from "vitest";
import { getMockReviewRecords, getPendingReviewNotifications, mockReviewQueue } from "@/lib/mock-review-queue";

describe("mock review queue", () => {
  it("provides six fictional pending notifications with matching review records", () => {
    const notifications = getPendingReviewNotifications();
    expect(notifications).toHaveLength(6);
    expect(notifications.map((notification) => notification.id)).toEqual(mockReviewQueue.map((record) => record.id));
    expect(notifications.every((notification) => notification.imagePath.startsWith("/samples/"))).toBe(true);
    expect(new Set(notifications.map((notification) => notification.title)).size).toBe(6);
  });

  it("only returns records requested by an exact pending-review id", () => {
    expect(getMockReviewRecords(["review-old-tom-pass"])).toHaveLength(1);
    expect(getMockReviewRecords(["review-not-real"])).toEqual([]);
  });
});
