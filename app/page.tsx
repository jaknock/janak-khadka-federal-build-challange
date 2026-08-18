import { LabelCheckApp } from "@/components/LabelCheckApp";
import { getPendingReviewNotifications } from "@/lib/mock-review-queue";

export default function Home() {
  return <LabelCheckApp notifications={getPendingReviewNotifications()} />;
}
