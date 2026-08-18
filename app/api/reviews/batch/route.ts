import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { extractLabel } from "@/lib/extractor";
import { getMockReviewRecords } from "@/lib/mock-review-queue";
import { validateLabel } from "@/lib/validation";

export const runtime = "nodejs";

const batchRequestSchema = z.object({ reviewIds: z.array(z.string().regex(/^review-[a-z0-9-]+$/)).min(1).max(20) });
const concurrency = 3;

async function processWithLimit<T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
  return results;
}

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
        const extraction = await extractLabel(file);
        return { reviewId: record.id, result: validateLabel(record.filename, record.application, extraction, Math.round(performance.now() - started)) };
      } catch (error) {
        return { reviewId: record.id, fileName: record.filename, error: error instanceof Error ? error.message : "Analysis failed. Try again." };
      }
    });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Could not read the review batch. Please try again." }, { status: 400 });
  }
}
