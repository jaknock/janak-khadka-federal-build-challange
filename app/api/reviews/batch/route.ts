import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { extractLabel } from "@/lib/extractor";
import { getMockReviewRecords } from "@/lib/mock-review-queue";
import { MOCK_INBOX_REVIEW_CONCURRENCY, processWithLimit, runWithinTimeBudget } from "@/lib/review-processing";
import { validateLabel } from "@/lib/validation";

export const runtime = "nodejs";

const batchRequestSchema = z.object({ reviewIds: z.array(z.string().regex(/^review-[a-z0-9-]+$/)).min(1).max(20) });
export async function POST(request: Request) {
  try {
    const parsed = batchRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Choose one or more pending reviews." }, { status: 400 });

    const records = getMockReviewRecords(parsed.data.reviewIds);
    if (records.length !== new Set(parsed.data.reviewIds).size) return NextResponse.json({ error: "One or more requested reviews are not in the pending queue." }, { status: 404 });

    const results = await processWithLimit(records, async (record) => {
      const started = performance.now();
      try {
        const asset = await readFile(path.join(process.cwd(), "public", record.imagePath));
        const file = new File([asset], record.filename, { type: "image/png" });
        const extraction = await runWithinTimeBudget(() => extractLabel(file));
        const imageQualityIssues = [...new Set([...extraction.imageQualityIssues, ...record.visualQualityIssues])];
        return { reviewId: record.id, result: validateLabel(record.filename, record.application, { ...extraction, imageQualityIssues }, Math.round(performance.now() - started)) };
      } catch (error) {
        return { reviewId: record.id, fileName: record.filename, error: error instanceof Error ? error.message : "Analysis failed. Try again." };
      }
    }, MOCK_INBOX_REVIEW_CONCURRENCY);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Could not read the review batch. Please try again." }, { status: 400 });
  }
}
