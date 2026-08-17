import type { ExpectedFields } from "@/lib/types";

export type BatchApplication = { filename: string; application: ExpectedFields };

export const BATCH_CSV_HEADER = ["filename", "brand_name", "class_type", "alcohol_content", "net_contents"];
export const BATCH_CSV_TEMPLATE = `${BATCH_CSV_HEADER.join(",")}\nold-tom-pass.png,OLD TOM DISTILLERY,Kentucky Straight Bourbon Whiskey,45%,750 mL\n`;

const aliases: Record<string, keyof ExpectedFields | "filename"> = {
  filename: "filename", file: "filename", image: "filename", imagefilename: "filename",
  brand: "brandName", brandname: "brandName", classtype: "classType", class: "classType", type: "classType",
  alcohol: "alcoholContent", alcoholcontent: "alcoholContent", abv: "alcoholContent",
  netcontents: "netContents", contents: "netContents", volume: "netContents",
  producer: "producer", bottler: "producer", country: "countryOfOrigin", countryoforigin: "countryOfOrigin",
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(cell); cell = ""; }
    else if (character === "\n" || character === "\r") { if (character === "\r" && text[index + 1] === "\n") index += 1; row.push(cell); if (row.some((value) => value.trim())) rows.push(row); row = []; cell = ""; }
    else cell += character;
  }
  row.push(cell); if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export function parseBatchCsv(text: string): { rows: BatchApplication[]; errors: string[] } {
  const parsed = parseCsv(text);
  if (parsed.length < 2) return { rows: [], errors: ["The CSV needs a header row and at least one application row."] };
  const header = parsed[0].map((value) => aliases[value.toLowerCase().replace(/[^a-z]/g, "")] ?? null);
  if (!header.includes("filename")) return { rows: [], errors: [`The CSV needs a filename column. Expected columns: ${BATCH_CSV_HEADER.join(", ")}.`] };
  const errors: string[] = [];
  const rows = parsed.slice(1).flatMap((record, index) => {
    const application: ExpectedFields = {};
    let filename = "";
    record.forEach((value, column) => { const key = header[column]; if (key === "filename") filename = value.trim(); else if (key) application[key] = value.trim(); });
    if (!filename) { errors.push(`Row ${index + 2}: no filename — skipped.`); return []; }
    return [{ filename, application }];
  });
  return { rows, errors };
}

export function toCsv(rows: string[][]) {
  return rows.map((row) => row.map((value) => /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value).join(",")).join("\r\n");
}
