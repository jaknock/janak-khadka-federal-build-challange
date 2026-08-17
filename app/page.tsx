"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, useRef, useState } from "react";
import { BatchValidation } from "@/components/BatchValidation";
import type { ExpectedFields, ReviewResult } from "@/lib/types";

type ApiItem = { result?: ReviewResult; fileName?: string; error?: string };
const emptyFields: ExpectedFields = { brandName: "", classType: "", alcoholContent: "", netContents: "", producer: "", countryOfOrigin: "" };
const sampleFields: ExpectedFields = { brandName: "OLD TOM DISTILLERY", classType: "Kentucky Straight Bourbon Whiskey", alcoholContent: "45% Alc./Vol. (90 Proof)", netContents: "750 mL", producer: "", countryOfOrigin: "" };
const fieldLabels: Array<[keyof ExpectedFields, string, string]> = [["brandName", "Brand name", "OLD TOM DISTILLERY"], ["classType", "Class / type", "Kentucky Straight Bourbon Whiskey"], ["alcoholContent", "Alcohol content", "45% Alc./Vol. (90 Proof)"], ["netContents", "Net contents", "750 mL"], ["producer", "Producer / bottler", "Optional"], ["countryOfOrigin", "Country of origin", "Optional"]];
const samples = [
  { value: "old-tom-pass", label: "Old Tom Distillery — matching label", file: "old-tom-pass.png", fields: sampleFields },
  { value: "stones-throw-case", label: "Stone's Throw — casing review", file: "stones-throw-case.png", fields: { brandName: "Stone's Throw", classType: "Straight Rye Whiskey", alcoholContent: "45%", netContents: "750 mL" } },
  { value: "wrong-abv", label: "Old Tom — wrong ABV", file: "wrong-abv.png", fields: sampleFields },
  { value: "missing-warning", label: "Old Tom — missing warning", file: "missing-warning.png", fields: sampleFields },
  { value: "title-case-warning", label: "Old Tom — title-case warning header", file: "title-case-warning.png", fields: sampleFields },
  { value: "reworded-warning", label: "Old Tom — reworded warning", file: "reworded-warning.png", fields: sampleFields },
] as const;

function StatePill({ state }: { state: ReviewResult["state"] }) {
  const copy = state === "pass" ? "Match" : state === "mismatch" ? "Mismatch" : "Needs review";
  return <span className={`verdict ${state}`}>{copy}</span>;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [sample, setSample] = useState("");
  const [fields, setFields] = useState<ExpectedFields>(emptyFields);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [results, setResults] = useState<ApiItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const requiredComplete = ["brandName", "classType", "alcoholContent", "netContents"].every((key) => fields[key as keyof ExpectedFields]?.trim());

  function setSelected(next: File[]) {
    const selected = next.slice(0, 20);
    setPreviews((current) => Object.fromEntries(selected.map((file) => [file.name, current[file.name] || URL.createObjectURL(file)])));
    setFiles(selected); setResults([]); setError("");
  }
  function chooseFiles(event: ChangeEvent<HTMLInputElement>) { setSelected(Array.from(event.target.files ?? [])); }
  function handleDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragOver(false); setSelected(Array.from(event.dataTransfer.files)); }
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); inputRef.current?.click(); } }
  async function loadSample(value: string) {
    setSample(value);
    if (!value) { setFields(emptyFields); setSelected([]); return; }
    const selected = samples.find((entry) => entry.value === value);
    if (!selected) return;
    try {
      const response = await fetch(`/samples/${selected.file}`);
      if (!response.ok) throw new Error();
      setFields({ ...selected.fields });
      setSelected([new File([await response.blob()], selected.file, { type: "image/png" })]);
    } catch { setError("Could not load the bundled sample. Please try again."); }
  }

  async function analyze(event: FormEvent) {
    event.preventDefault(); setError(""); setResults([]);
    if (!files.length || !requiredComplete) return;
    setBusy(true);
    const body = new FormData(); files.forEach((file) => body.append("labels", file));
    body.append("expectedFields", JSON.stringify(Object.fromEntries(Object.entries(fields).filter(([, value]) => value))));
    try {
      const response = await fetch("/api/reviews", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed.");
      setResults(data.results);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Analysis failed."); }
    finally { setBusy(false); }
  }

  return <main className="app-shell">
    <header className="site-header"><div className="site-title"><span className="agency-mark" aria-hidden>TTB</span><div><p>TTB LABEL COMPLIANCE</p><h1>Label Check</h1></div></div><span className="prototype-note">Prototype · human review required</span></header>
    <div className="page-content">
      <section className="intro"><p className="kicker">AI-ASSISTED VERIFICATION</p><h2>Check the routine details.<br />Keep the judgment.</h2><p>Compare label artwork with the application in seconds. Label Check surfaces the evidence; a compliance agent makes every final determination.</p></section>
      <nav className="mode-switch" aria-label="Verification mode"><button type="button" className={mode === "single" ? "active" : ""} onClick={() => setMode("single")}>Check one label</button><button type="button" className={mode === "batch" ? "active" : ""} onClick={() => setMode("batch")}>Check a batch with CSV</button></nav>
      {mode === "single" ? <><form onSubmit={analyze}>
        <div className="verify-grid">
          <section className="panel" aria-labelledby="application-title"><div className="panel-heading"><h3 id="application-title">1. Application details</h3><label className="sample-select"><span>Sample data</span><select value={sample} onChange={(event) => loadSample(event.target.value)}><option value="">Choose a bundled sample</option>{samples.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label></div><p className="panel-intro">Enter the values from the application. The first four fields are required.</p><div className="field-grid">{fieldLabels.map(([key, label, placeholder]) => <label key={key}><span>{label}{["brandName", "classType", "alcoholContent", "netContents"].includes(key) && <b aria-label="required"> *</b>}</span><input value={fields[key] ?? ""} placeholder={placeholder} onChange={(event) => setFields((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div></section>
          <section className="panel" aria-labelledby="upload-title"><div className="panel-heading"><h3 id="upload-title">2. Label image</h3><span className="file-count">{files.length} of 20 selected</span></div><div role="button" tabIndex={0} onClick={() => inputRef.current?.click()} onKeyDown={handleKeyDown} onDragOver={(event) => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} className={`upload-area ${dragOver ? "drag-over" : ""}`}>{files.length === 1 && previews[files[0].name] ? <img className="upload-preview" src={previews[files[0].name]} alt={`Preview of ${files[0].name}`} /> : <><span className="upload-symbol" aria-hidden>↑</span><strong>{files.length ? "Add or replace label images" : "Drop label images here, or click to choose files"}</strong><span>PNG, JPEG, or WebP · up to 8 MB each · angled or glare-affected images are accepted</span></>}</div><input ref={inputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={chooseFiles} />{files.length > 0 && <ul className="selected-files" aria-label="Selected label images">{files.map((file) => <li key={`${file.name}-${file.size}`}><span className="file-icon" aria-hidden>▧</span><span>{file.name}<small>{(file.size / 1024 / 1024).toFixed(1)} MB</small></span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setSelected(files.filter((current) => current !== file))}>×</button></li>)}</ul>}</section>
        </div>
        <button className="verify-button" disabled={busy || !files.length || !requiredComplete}>{busy ? "Checking label images…" : `Verify ${files.length || ""} label${files.length === 1 ? "" : "s"}`}</button>
        {!busy && (!files.length || !requiredComplete) && <p className="action-help">{!requiredComplete && "Fill in the four required application fields"}{!requiredComplete && !files.length && " and "}{!files.length && "add at least one label image"} to enable verification.</p>}
        {error && <p className="alert" role="alert"><strong>Something went wrong:</strong> {error}</p>}
      </form>
      {results.length > 0 && <section className="results" aria-live="polite"><div className="results-heading"><div><p className="kicker">REVIEW FINDINGS</p><h2>Application versus label</h2></div><p>Review the evidence below before making a determination.</p></div>{results.map((item, index) => item.error ? <article className="error-result" key={`${item.fileName}-${index}`}><strong>{item.fileName}</strong><p>{item.error}</p></article> : item.result && <article className="result-card" key={item.result.fileName}><div className={`result-banner ${item.result.state}`}>{previews[item.result.fileName] && <a className="result-preview" href={previews[item.result.fileName]} target="_blank" rel="noreferrer" title="Open label image"><img src={previews[item.result.fileName]} alt={`Label artwork: ${item.result.fileName}`} /></a>}<div><StatePill state={item.result.state} /><strong>{item.result.fileName}</strong><p>{item.result.extraction.notes || "Extraction completed."}</p></div><span>checked in {(item.result.elapsedMs / 1000).toFixed(1)}s</span></div><div className="result-table-wrap"><table><thead><tr><th>Item</th><th>Application says</th><th>Label shows</th><th>Result</th></tr></thead><tbody>{item.result.findings.map((finding) => <tr key={finding.field}><td><strong>{finding.field}</strong><p>{finding.message}</p></td><td>{finding.expected ?? "—"}</td><td>{finding.extracted ?? <em>Not detected</em>}</td><td><StatePill state={finding.state} /></td></tr>)}</tbody></table></div></article>)}</section>}</> : <BatchValidation />}
    </div>
    <footer>Prototype for evaluation only — uploaded labels are not stored. Results are recommendations; the reviewing agent makes all final determinations.</footer>
  </main>;
}
