import { NextResponse } from "next/server";
import { getPendingReviewNotifications } from "@/lib/mock-review-queue";

export const runtime = "nodejs";

export async function GET() {
  const notifications = getPendingReviewNotifications();
  return NextResponse.json({ notifications, pendingCount: notifications.length });
}
