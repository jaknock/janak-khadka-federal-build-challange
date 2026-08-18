import { z } from "zod";
import { labelExtractionSchema, reviewStates } from "@/lib/types";

const fieldFindingSchema = z.object({
  field: z.string(),
  expected: z.string().nullable(),
  extracted: z.string().nullable(),
  state: z.enum(reviewStates),
  message: z.string(),
});

const reviewResultSchema = z.object({
  fileName: z.string(),
  state: z.enum(reviewStates),
  findings: z.array(fieldFindingSchema),
  extraction: labelExtractionSchema,
  elapsedMs: z.number().finite().nonnegative(),
});

const batchItemSchema = z.object({
  reviewId: z.string().regex(/^review-[a-z0-9-]+$/),
  result: reviewResultSchema.optional(),
  fileName: z.string().optional(),
  error: z.string().optional(),
});

const reviewDecisionSchema = z.object({
  value: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().trim().min(1).max(1200).optional(),
});

const persistedReviewQueueSchema = z.object({
  version: z.literal(2),
  results: z.record(z.string(), batchItemSchema),
  decisions: z.record(z.string(), reviewDecisionSchema),
});

const legacyPersistedReviewQueueSchema = z.object({
  version: z.literal(1),
  results: z.record(z.string(), batchItemSchema),
  decisions: z.record(z.string(), z.enum(["approved", "rejected"])),
});

export type PersistedReviewQueue = z.infer<typeof persistedReviewQueueSchema>;
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;

export const REVIEW_QUEUE_STORAGE_KEY = "ttb-label-review:mock-queue:v1";
const REVIEW_QUEUE_STORAGE_EVENT = "ttb-label-review:mock-queue-changed";
const serverReviewQueue = { version: 2, results: {}, decisions: {} } satisfies PersistedReviewQueue;
let cachedValue: PersistedReviewQueue = serverReviewQueue;
let cachedRawValue: string | null | undefined;

export function emptyPersistedReviewQueue(): PersistedReviewQueue {
  return { version: 2, results: {}, decisions: {} };
}

export function readPersistedReviewQueue(value: string | null): PersistedReviewQueue {
  if (!value) return emptyPersistedReviewQueue();

  try {
    const parsed = JSON.parse(value);
    const current = persistedReviewQueueSchema.safeParse(parsed);
    if (current.success) return current.data;

    const legacy = legacyPersistedReviewQueueSchema.safeParse(parsed);
    if (legacy.success) {
      return { version: 2, results: legacy.data.results, decisions: Object.fromEntries(Object.entries(legacy.data.decisions).map(([reviewId, decision]) => [reviewId, { value: decision }])) };
    }

    return emptyPersistedReviewQueue();
  } catch {
    return emptyPersistedReviewQueue();
  }
}

export function getBrowserReviewQueue(): PersistedReviewQueue {
  const value = window.localStorage.getItem(REVIEW_QUEUE_STORAGE_KEY);
  if (value === cachedRawValue) return cachedValue;

  cachedRawValue = value;
  cachedValue = readPersistedReviewQueue(value);
  return cachedValue;
}

export function getServerReviewQueue(): PersistedReviewQueue {
  return serverReviewQueue;
}

export function subscribeToBrowserReviewQueue(onStoreChange: () => void) {
  const notifyForThisQueue = (event: StorageEvent) => {
    if (event.key === REVIEW_QUEUE_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", notifyForThisQueue);
  window.addEventListener(REVIEW_QUEUE_STORAGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", notifyForThisQueue);
    window.removeEventListener(REVIEW_QUEUE_STORAGE_EVENT, onStoreChange);
  };
}

export function saveBrowserReviewQueue(value: PersistedReviewQueue) {
  try {
    const rawValue = JSON.stringify(value);
    window.localStorage.setItem(REVIEW_QUEUE_STORAGE_KEY, rawValue);
    cachedRawValue = rawValue;
    cachedValue = value;
    window.dispatchEvent(new Event(REVIEW_QUEUE_STORAGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function clearBrowserReviewQueue() {
  try {
    window.localStorage.removeItem(REVIEW_QUEUE_STORAGE_KEY);
    cachedRawValue = null;
    cachedValue = emptyPersistedReviewQueue();
    window.dispatchEvent(new Event(REVIEW_QUEUE_STORAGE_EVENT));
    return true;
  } catch {
    return false;
  }
}
