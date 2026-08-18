"use client";

import { ChangeEvent, useRef, useState } from "react";
import { BATCH_CSV_TEMPLATE, parseBatchCsv, toCsv, type BatchApplication } from "@/lib/csv";
import type { ReviewResult } from "@/lib/types";

type Status = "missing" | "waiting" | "checking" | "done" | "error";
type Row = BatchApplication & { status: Status; result?: ReviewResult; error?: string };
const concurrency = 3;

function download(name: string, content: string) { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([content], { type: "text/csv" })); link.download = name; link.click(); URL.revokeObjectURL(link.href); }
function statusText(status: Status) { return ({ missing: "Image missing", waiting: "Ready", checking: "Checking…", done: "Complete", error: "Error" })[status]; }
function resultDescription(result: ReviewResult) {
  const findings = result.findings.filter((finding) => finding.state !== "pass");
  return findings.length === 0
    ? "All reviewed application fields and warning checks passed."
    : findings.map((finding) => `${finding.field}: ${finding.message}`).join(" ");
}
function pendingDescription(status: Status) { return ({ missing: "Upload an image whose filename matches this CSV row.", waiting: "Ready to validate.", checking: "Label extraction and validation are in progress.", done: "Complete.", error: "The validation request failed; retry this row." })[status]; }

export function BatchValidation() {
  const csvInput = useRef<HTMLInputElement>(null); const imagesInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]); const [images, setImages] = useState<Map<string, File>>(new Map());
  const [errors, setErrors] = useState<string[]>([]); const [running, setRunning] = useState(false);
  const pairRows = (applications: BatchApplication[], fileMap: Map<string, File>) => applications.map((application) => ({ ...application, status: fileMap.has(application.filename.toLowerCase()) ? "waiting" as const : "missing" as const }));
  const updateRow = (index: number, patch: Partial<Row>) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));

  async function loadCsv(file: File | undefined) { if (!file) return; const parsed = parseBatchCsv(await file.text()); setErrors(parsed.errors); setRows(pairRows(parsed.rows, images)); }
  function loadImages(event: ChangeEvent<HTMLInputElement>) { const next = new Map(images); Array.from(event.target.files ?? []).forEach((file) => next.set(file.name.toLowerCase(), file)); setImages(next); setRows((current) => current.map((row) => next.has(row.filename.toLowerCase()) ? { ...row, status: "waiting", error: undefined } : row)); }
  async function loadBundledSample() {
    try {
      const parsed = parseBatchCsv(await (await fetch("/samples/applications.csv")).text());
      const files = await Promise.all(parsed.rows.map(async ({ filename }) => { const response = await fetch(`/samples/${filename}`); return new File([await response.blob()], filename, { type: "image/png" }); }));
      const next = new Map(files.map((file) => [file.name.toLowerCase(), file])); setImages(next); setErrors(parsed.errors); setRows(pairRows(parsed.rows, next));
    } catch { setErrors(["Could not load the bundled sample data. Try again or upload your own CSV and images."]); }
  }
  async function run() {
    setRunning(true); const queue = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.status === "waiting" || row.status === "error"); let cursor = 0;
    const worker = async () => { while (cursor < queue.length) { const current = queue[cursor++]; const image = images.get(current.row.filename.toLowerCase()); if (!image) continue; updateRow(current.index, { status: "checking", error: undefined }); try { const formData = new FormData(); formData.append("labels", image); formData.append("expectedFields", JSON.stringify(current.row.application)); const response = await fetch("/api/reviews", { method: "POST", body: formData }); const data = await response.json(); const result = data.results?.[0]?.result as ReviewResult | undefined; if (!response.ok || !result) throw new Error(data.error || data.results?.[0]?.error || "Verification failed."); updateRow(current.index, { status: "done", result }); } catch (error) { updateRow(current.index, { status: "error", error: error instanceof Error ? error.message : "Verification failed." }); } } };
    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker)); setRunning(false);
  }
  function exportResults() { download("label-check-results.csv", toCsv([["filename", "brand_name", "result", "time_seconds", "description"], ...rows.map((row) => [row.filename, row.application.brandName || "", row.result?.state || statusText(row.status), row.result ? (row.result.elapsedMs / 1000).toFixed(1) : "", row.error || (row.result ? resultDescription(row.result) : pendingDescription(row.status))]) ])); }
  const ready = rows.filter((row) => row.status === "waiting" || row.status === "error").length; const complete = rows.filter((row) => row.status === "done").length;

  return <section className="batch-workflow"><div className="panel batch-intro"><h3>Batch validation with CSV</h3><p>Upload one row per application and images with matching filenames. Up to three labels are checked in parallel, and results appear as each label completes.</p><ol><li><button type="button" className="text-button" onClick={() => download("label-check-template.csv", BATCH_CSV_TEMPLATE)}>Download CSV template</button> or load the bundled sample batch.</li><li>Upload the applications CSV and its label images.</li><li>Start validation and export the results when complete.</li></ol><div className="batch-choices"><button type="button" className="batch-choice" onClick={() => csvInput.current?.click()}><strong>Choose applications CSV</strong><span>{rows.length ? `${rows.length} applications loaded` : "No file selected"}</span></button><button type="button" className="batch-choice" onClick={() => imagesInput.current?.click()}><strong>Choose label images</strong><span>{images.size ? `${images.size} images loaded` : "Select many at once"}</span></button></div><div className="sample-batch"><span>Want to test it first?</span><button type="button" className="text-button" onClick={loadBundledSample}>Load bundled sample batch</button></div><input ref={csvInput} className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => loadCsv(event.target.files?.[0])} /><input ref={imagesInput} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={loadImages} />{errors.length > 0 && <ul className="csv-errors">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}</div>
  {rows.length > 0 && <><div className="batch-actions"><button type="button" className="verify-button" disabled={running || !ready} onClick={run}>{running ? `Checking… ${complete} of ${rows.length} complete` : `Start checking ${ready} label${ready === 1 ? "" : "s"}`}</button>{complete > 0 && <button type="button" className="secondary-button" onClick={exportResults}>Export results CSV</button>}</div><div className="batch-table"><table><thead><tr><th>Image file</th><th>Brand name</th><th>Status / result</th><th>Description</th><th>Time</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.filename}-${index}`}><td>{row.filename}</td><td>{row.application.brandName || "—"}</td><td><span className={`batch-status ${row.result?.state || row.status}`}>{row.result?.state ? row.result.state.replace("_", " ") : statusText(row.status)}</span></td><td className="batch-description">{row.error || (row.result ? resultDescription(row.result) : pendingDescription(row.status))}</td><td>{row.result ? `${(row.result.elapsedMs / 1000).toFixed(1)}s` : "—"}</td></tr>)}</tbody></table></div></>}</section>;
}
