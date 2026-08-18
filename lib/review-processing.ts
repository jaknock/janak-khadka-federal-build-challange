export const MAX_REVIEW_CONCURRENCY = 3;
export const REVIEW_RESPONSE_TARGET_MS = 5_000;
export const REVIEW_HARD_TIMEOUT_MS = 15_000;
export const VISION_TIMEOUT_MS = 12_000;

export async function processWithLimit<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  limit = MAX_REVIEW_CONCURRENCY,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runWorker));
  return results;
}

export async function runWithinTimeBudget<T>(
  operation: () => Promise<T>,
  budgetMs = REVIEW_HARD_TIMEOUT_MS,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`Label review could not complete within ${budgetMs / 1_000} seconds. Please try again.`)), budgetMs);
  });

  try {
    return await Promise.race([operation(), deadline]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
