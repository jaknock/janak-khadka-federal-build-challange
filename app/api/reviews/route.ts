import { NextResponse } from "next/server";
import { extractLabel } from "@/lib/extractor";
import { expectedFieldsSchema } from "@/lib/types";
import { validateLabel } from "@/lib/validation";

export const runtime = "nodejs";
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 8 * 1024 * 1024;
const maxFiles = 20;
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
    const formData = await request.formData();
    const files = formData.getAll("labels").filter((value): value is File => value instanceof File);
    if (!files.length) return NextResponse.json({ error: "Choose at least one label image." }, { status: 400 });
    if (files.length > maxFiles) return NextResponse.json({ error: `Upload no more than ${maxFiles} labels at once.` }, { status: 400 });
    const parsedExpected = expectedFieldsSchema.safeParse(JSON.parse(String(formData.get("expectedFields") || "{}")));
    if (!parsedExpected.success) return NextResponse.json({ error: "The application fields are invalid." }, { status: 400 });

    const results = await processWithLimit(files, async (file) => {
      if (!acceptedTypes.has(file.type)) return { fileName: file.name, error: "Use a PNG, JPEG, or WebP image." };
      if (!file.size || file.size > maxBytes) return { fileName: file.name, error: "Each image must be smaller than 8 MB." };
      const started = performance.now();
      try {
        const extraction = await extractLabel(file);
        return { result: validateLabel(file.name, parsedExpected.data, extraction, Math.round(performance.now() - started)) };
      } catch (error) {
        return { fileName: file.name, error: error instanceof Error ? error.message : "Analysis failed. Try again." };
      }
    });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Could not read the upload. Please try again." }, { status: 400 });
  }
}
