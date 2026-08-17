import { z } from "zod";

export const reviewStates = ["pass", "needs_review", "mismatch"] as const;
export type ReviewState = (typeof reviewStates)[number];

export const expectedFieldsSchema = z.object({
  brandName: z.string().trim().max(160).optional(),
  classType: z.string().trim().max(160).optional(),
  alcoholContent: z.string().trim().max(80).optional(),
  netContents: z.string().trim().max(80).optional(),
  producer: z.string().trim().max(180).optional(),
  countryOfOrigin: z.string().trim().max(120).optional(),
});
export type ExpectedFields = z.infer<typeof expectedFieldsSchema>;

export const labelExtractionSchema = z.object({
  brandName: z.string().nullable(),
  classType: z.string().nullable(),
  alcoholContent: z.string().nullable(),
  netContents: z.string().nullable(),
  producer: z.string().nullable(),
  countryOfOrigin: z.string().nullable(),
  governmentWarning: z.string().nullable(),
  warningHeaderText: z.string().nullable(),
  warningHeaderUppercase: z.boolean().nullable(),
  warningHeaderBold: z.boolean().nullable(),
  warningBodyBold: z.boolean().nullable(),
  readable: z.boolean(),
  confidence: z.number().min(0).max(1),
  notes: z.string().max(500).nullable(),
});
export type LabelExtraction = z.infer<typeof labelExtractionSchema>;

export type FieldFinding = {
  field: string;
  expected: string | null;
  extracted: string | null;
  state: ReviewState;
  message: string;
};

export type ReviewResult = {
  fileName: string;
  state: ReviewState;
  findings: FieldFinding[];
  extraction: LabelExtraction;
  elapsedMs: number;
};
