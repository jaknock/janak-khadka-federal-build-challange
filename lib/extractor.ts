import OpenAI from "openai";
import { VISION_TIMEOUT_MS } from "@/lib/review-processing";
import { labelExtractionSchema, type LabelExtraction } from "@/lib/types";

const extractionShape = {
  type: "object",
  additionalProperties: false,
  required: ["brandName", "classType", "alcoholContent", "netContents", "producer", "countryOfOrigin", "governmentWarning", "warningHeaderText", "warningHeaderUppercase", "warningHeaderBold", "warningBodyBold", "readable", "confidence", "imageQualityIssues", "notes"],
  properties: {
    brandName: { type: ["string", "null"] }, classType: { type: ["string", "null"] }, alcoholContent: { type: ["string", "null"] }, netContents: { type: ["string", "null"] }, producer: { type: ["string", "null"] }, countryOfOrigin: { type: ["string", "null"] }, governmentWarning: { type: ["string", "null"] }, warningHeaderText: { type: ["string", "null"] }, warningHeaderUppercase: { type: ["boolean", "null"] }, warningHeaderBold: { type: ["boolean", "null"] }, warningBodyBold: { type: ["boolean", "null"] }, readable: { type: "boolean" }, confidence: { type: "number" }, imageQualityIssues: { type: "array", items: { type: "string", enum: ["glare", "perspective_skew", "blur", "cropping", "obstruction"] }, maxItems: 5 }, notes: { type: ["string", "null"] },
  },
} as const;

const instructions = `You extract visible evidence from a distilled-spirits label image. Do not approve, reject, or make a regulatory decision. Transcribe text exactly as shown; do not correct spelling, capitalization, or punctuation. producer is the complete visible bottler/distiller/importer name-and-address statement; do not split a city/state into countryOfOrigin. countryOfOrigin is an explicit country-of-origin statement only, such as “Product of Mexico”; use the JSON null value, never the string "null", when no country name is printed. governmentWarning must be the complete visible warning, including its heading, or null. warningHeaderText must separately transcribe only the heading and its punctuation (for example, GOVERNMENT WARNING:) even when it is already included in governmentWarning. For formatting, assess only when visually verifiable: warningHeaderUppercase is whether the heading is uppercase; warningHeaderBold is whether only those heading words are bold/heavier than the body; warningBodyBold is whether the remainder of the warning statement is bold. Return null when an assessment cannot be made. imageQualityIssues must be an array containing every observed issue from only: glare (including reflection), perspective_skew, blur, cropping, or obstruction; return an empty array when none apply. In notes, explain the observed image-quality issues. If one makes evidence uncertain, set readable to false or reduce confidence to reflect that uncertainty. Preserve the complete alcohol statement, including a proof value in parentheses when visible. Use confidence 0 to 1.`;

let client: OpenAI | null = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set. Copy .env.example to .env.local and add your key.");
  }
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: VISION_TIMEOUT_MS, maxRetries: 0 });
  return client;
}

export async function extractLabel(file: File): Promise<LabelExtraction> {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const response = await getClient().chat.completions.create({
    model,
    messages: [{ role: "user", content: [{ type: "text", text: instructions }, { type: "image_url", image_url: { url: `data:${file.type};base64,${base64}`, detail: "high" } }] }],
    response_format: { type: "json_schema", json_schema: { name: "label_extraction", strict: true, schema: extractionShape } },
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("The vision model returned an empty response.");
  return parseExtraction(content);
}

/** Normalize a common model artifact before enforcing the provider contract. */
export function parseExtraction(content: string): LabelExtraction {
  const payload = JSON.parse(content) as Record<string, unknown>;
  for (const field of ["brandName", "classType", "alcoholContent", "netContents", "producer", "countryOfOrigin", "governmentWarning", "warningHeaderText", "notes"]) {
    if (typeof payload[field] === "string" && payload[field].trim().toLowerCase() === "null") payload[field] = null;
  }
  return labelExtractionSchema.parse(payload);
}
