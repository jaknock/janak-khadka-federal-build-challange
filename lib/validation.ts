import type { ExpectedFields, FieldFinding, LabelExtraction, ReviewResult, ReviewState } from "@/lib/types";

export const GOVERNMENT_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

export function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeForComparison(value: string) {
  return collapseWhitespace(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[.,/#!$%^&*;:{}=_`~()\-]/g, "")
    .toLocaleLowerCase();
}

function stateFromFindings(findings: FieldFinding[]): ReviewState {
  if (findings.some((finding) => finding.state === "mismatch")) return "mismatch";
  if (findings.some((finding) => finding.state === "needs_review")) return "needs_review";
  return "pass";
}

function expectedFinding(
  field: string,
  expected: string | undefined,
  extracted: string | null,
): FieldFinding | null {
  if (!expected) return null;
  if (!extracted) {
    return { field, expected, extracted: null, state: "needs_review", message: "Could not locate this value clearly." };
  }
  if (field === "Alcohol content") {
    const expectedAlcohol = parseAlcoholContent(expected);
    const extractedAlcohol = parseAlcoholContent(extracted);
    if (expectedAlcohol && extractedAlcohol) {
      if (/\babv\b/i.test(extracted)) {
        return { field, expected, extracted, state: "mismatch", message: 'For distilled spirits, “ABV” is not an allowed abbreviation for the alcohol-by-volume statement.' };
      }
      if (!/(?:alcohol|alc\.?)[\s./]*(?:by\s*)?(?:volume|vol\.?)/i.test(extracted)) {
        return { field, expected, extracted, state: "needs_review", message: "Confirm the label states alcohol content in an allowed alcohol-by-volume format." };
      }
      if (expectedAlcohol.percent !== extractedAlcohol.percent) {
        return { field, expected, extracted, state: "mismatch", message: "Alcohol by volume does not match the application value." };
      }
      if (extractedAlcohol.proof !== null && extractedAlcohol.proof !== extractedAlcohol.percent * 2) {
        return { field, expected, extracted, state: "needs_review", message: "The proof value does not correspond to the label's alcohol-by-volume value." };
      }
      if (expectedAlcohol.proof !== null && extractedAlcohol.proof !== null && expectedAlcohol.proof !== extractedAlcohol.proof) {
        return { field, expected, extracted, state: "mismatch", message: "Proof does not match the application value." };
      }
      return { field, expected, extracted, state: "pass", message: "Alcohol by volume matches; proof is treated as an optional accompanying statement." };
    }
  }
  if (normalizeForComparison(expected) === normalizeForComparison(extracted) && collapseWhitespace(expected) === collapseWhitespace(extracted)) {
    return { field, expected, extracted, state: "pass", message: "Matches the application value." };
  }
  if (normalizeForComparison(expected) === normalizeForComparison(extracted)) {
    return { field, expected, extracted, state: "needs_review", message: "Likely match, but capitalization or punctuation differs." };
  }
  return { field, expected, extracted, state: "mismatch", message: "Does not match the application value." };
}

function parseAlcoholContent(value: string) {
  const percent = value.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!percent) return null;
  const proof = value.match(/(\d+(?:\.\d+)?)\s*proof\b/i);
  return { percent: Number(percent[1]), proof: proof ? Number(proof[1]) : null };
}

export function validateLabel(
  fileName: string,
  expected: ExpectedFields,
  extraction: LabelExtraction,
  elapsedMs = 0,
): ReviewResult {
  const findings: FieldFinding[] = [];
  const fields: Array<[string, string | undefined, string | null]> = [
    ["Brand name", expected.brandName, extraction.brandName],
    ["Class / type", expected.classType, extraction.classType],
    ["Alcohol content", expected.alcoholContent, extraction.alcoholContent],
    ["Net contents", expected.netContents, extraction.netContents],
    ["Producer / bottler", expected.producer, extraction.producer],
    ["Country of origin", expected.countryOfOrigin, extraction.countryOfOrigin],
  ];
  for (const [field, expectedValue, extracted] of fields) {
    const finding = expectedFinding(field, expectedValue, extracted);
    if (finding) findings.push(finding);
  }

  if (!extraction.readable || extraction.confidence < 0.65 || extraction.imageQualityIssues.length) {
    const qualityIssueLabels = {
      glare: "glare or reflection",
      perspective_skew: "perspective skew",
      blur: "blur",
      cropping: "cropping",
      obstruction: "an obstruction",
    } as const;
    const observedIssues = extraction.imageQualityIssues.map((issue) => qualityIssueLabels[issue]);
    findings.push({
      field: "Image readability",
      expected: null,
      extracted: null,
      state: "needs_review",
      message: observedIssues.length ? `Visible ${observedIssues.join(" and ")} requires a clear, unobstructed image before a reviewer can make a final decision.` : "Image quality or extraction confidence is too low for an automated recommendation.",
    });
  }

  const extractedWarning = extraction.governmentWarning ? collapseWhitespace(extraction.governmentWarning) : null;
  const header = extraction.warningHeaderText ? collapseWhitespace(extraction.warningHeaderText) : null;
  const warning = extractedWarning?.startsWith("(1)") && header === "GOVERNMENT WARNING:"
    ? `GOVERNMENT WARNING: ${extractedWarning}`
    : extractedWarning;
  if (!warning) {
    findings.push({ field: "Government warning", expected: GOVERNMENT_WARNING, extracted: null, state: "mismatch", message: "Required warning was not detected." });
  } else if (warning !== GOVERNMENT_WARNING) {
    findings.push({ field: "Government warning", expected: GOVERNMENT_WARNING, extracted: warning, state: "mismatch", message: "Warning wording or punctuation is not exact." });
  } else if (extraction.warningHeaderUppercase !== true || extraction.warningHeaderBold !== true || extraction.warningBodyBold !== false) {
    findings.push({ field: "Warning format", expected: "Uppercase bold header; non-bold body", extracted: null, state: "needs_review", message: "Confirm that GOVERNMENT WARNING: is uppercase and bold, and that the rest of the warning is not bold." });
  } else {
    findings.push({ field: "Government warning", expected: "Exact required text", extracted: "Exact text and required formatting observed", state: "pass", message: "Exact text, uppercase bold header, and non-bold warning body observed." });
  }

  return { fileName, state: stateFromFindings(findings), findings, extraction, elapsedMs };
}
