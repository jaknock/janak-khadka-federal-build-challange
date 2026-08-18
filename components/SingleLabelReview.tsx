"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import type { ExpectedFields, ReviewResult } from "@/lib/types";

type ApiItem = { result?: ReviewResult; fileName?: string; error?: string };
const emptyFields: ExpectedFields = { brandName: "", classType: "", alcoholContent: "", netContents: "", producer: "", countryOfOrigin: "" };
const sampleFields: ExpectedFields = { brandName: "OLD TOM DISTILLERY", classType: "Kentucky Straight Bourbon Whiskey", alcoholContent: "45% Alc./Vol. (90 Proof)", netContents: "750 mL", producer: "", countryOfOrigin: "" };
const cedarHollowFields: ExpectedFields = { brandName: "CEDAR HOLLOW DISTILLING", classType: "American Single Malt Whiskey", alcoholContent: "46% Alc./Vol. (92 Proof)", netContents: "700 mL" };
const harborFieldFields: ExpectedFields = { brandName: "HARBOR & FIELD SPIRITS", classType: "Straight Bourbon Whiskey", alcoholContent: "43% Alc./Vol. (86 Proof)", netContents: "750 mL" };
const juniperTrailFields: ExpectedFields = { brandName: "JUNIPER TRAIL DISTILLERS", classType: "Small Batch Rye Whiskey", alcoholContent: "50% Alc./Vol. (100 Proof)", netContents: "1L" };
const northstarFields: ExpectedFields = { brandName: "NORTHSTAR BARREL HOUSE", classType: "Tennessee Whiskey", alcoholContent: "42% Alc./Vol. (84 Proof)", netContents: "1L" };
const fieldLabels: Array<[keyof ExpectedFields, string, string]> = [["brandName", "Brand name", "OLD TOM DISTILLERY"], ["classType", "Class / type", "Kentucky Straight Bourbon Whiskey"], ["alcoholContent", "Alcohol content", "45% Alc./Vol."], ["netContents", "Net contents", "750 mL"], ["producer", "Producer / bottler", "Optional"], ["countryOfOrigin", "Country of origin", "Optional"]];
const samples = [
  { value: "old-tom-pass", label: "Old Tom Distillery — matching label", file: "old-tom-pass.png", fields: sampleFields },
  { value: "stones-throw-case", label: "Stone's Throw — casing review", file: "stones-throw-case.png", fields: { brandName: "Stone's Throw", classType: "Straight Rye Whiskey", alcoholContent: "47% Alc./Vol. (94 Proof)", netContents: "700 mL" } },
  { value: "wrong-abv", label: "Northstar Barrel House — wrong ABV", file: "wrong-abv.png", fields: northstarFields },
  { value: "missing-warning", label: "Juniper Trail Distillers — missing warning", file: "missing-warning.png", fields: juniperTrailFields },
  { value: "title-case-warning", label: "Cedar Hollow Distilling — title-case warning header", file: "title-case-warning.png", fields: cedarHollowFields },
  { value: "reworded-warning", label: "Harbor & Field Spirits — reworded warning", file: "reworded-warning.png", fields: harborFieldFields },
  { value: "glare-low-confidence", label: "Old Tom Distillery — warning glare", file: "glare-low-confidence.png", fields: sampleFields },
  { value: "skewed-photo", label: "Old Tom Distillery — skewed photograph", file: "skewed-photo.png", fields: sampleFields },
] as const;

function StatePill({ state }: { state: ReviewResult["state"] }) {
  return <span className={`verdict ${state}`}>{state === "pass" ? "Match" : state === "mismatch" ? "Mismatch" : "Needs review"}</span>;
}

export function SingleLabelReview() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sample, setSample] = useState("");
  const [fields, setFields] = useState<ExpectedFields>(emptyFields);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState("");
  const [item, setItem] = useState<ApiItem>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requiredComplete = ["brandName", "classType", "alcoholContent", "netContents"].every((key) => fields[key as keyof ExpectedFields]?.trim());

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setFile(selected); setPreview(URL.createObjectURL(selected)); setItem(undefined); setError("");
  }
  async function loadSample(value: string) {
    setSample(value);
    if (!value) { setFields(emptyFields); setFile(undefined); setPreview(""); setItem(undefined); return; }
    const selected = samples.find((entry) => entry.value === value);
    if (!selected) return;
    try {
      const response = await fetch(`/samples/${selected.file}`);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      setFields({ ...selected.fields }); setFile(new File([blob], selected.file, { type: "image/png" })); setPreview(URL.createObjectURL(blob)); setItem(undefined); setError("");
    } catch { setError("Could not load the bundled sample. Please try again."); }
  }
  async function analyze(event: FormEvent) {
    event.preventDefault();
    if (!file || !requiredComplete) return;
    setBusy(true); setError(""); setItem(undefined);
    const body = new FormData(); body.append("labels", file); body.append("expectedFields", JSON.stringify(Object.fromEntries(Object.entries(fields).filter(([, value]) => value))));
    try {
      const response = await fetch("/api/reviews", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed.");
      setItem(data.results?.[0]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Analysis failed."); }
    finally { setBusy(false); }
  }
  const result = item?.result;

  return <><section className="intro"><p className="kicker">MANUAL REVIEW</p><h2>Check one label.<br />Keep the judgment.</h2><p>Enter the application details and choose one label image. Label Check surfaces evidence; a compliance agent makes every final determination.</p></section><form onSubmit={analyze}><div className="verify-grid"><section className="panel" aria-labelledby="application-title"><div className="panel-heading"><h3 id="application-title">1. Application details</h3><label className="sample-select"><span>Sample data</span><select value={sample} onChange={(event) => loadSample(event.target.value)}><option value="">Choose a bundled sample</option>{samples.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label></div><p className="panel-intro">The first four fields are required.</p><div className="field-grid">{fieldLabels.map(([key, label, placeholder]) => <label key={key}><span>{label}{["brandName", "classType", "alcoholContent", "netContents"].includes(key) && <b aria-label="required"> *</b>}</span><input value={fields[key] ?? ""} placeholder={placeholder} onChange={(event) => setFields((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div></section><section className="panel" aria-labelledby="upload-title"><div className="panel-heading"><h3 id="upload-title">2. Label image</h3></div><button type="button" className="upload-area" onClick={() => inputRef.current?.click()}>{preview ? <img className="upload-preview" src={preview} alt={`Preview of ${file?.name}`} /> : <><span className="upload-symbol" aria-hidden>↑</span><strong>Click to choose a label image</strong><span>PNG, JPEG, or WebP · up to 8 MB</span></>}</button><input ref={inputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseFile} />{file && <p className="selected-single-file">Selected: <strong>{file.name}</strong></p>}</section></div><button className="verify-button" disabled={busy || !file || !requiredComplete}>{busy ? "Checking label…" : "Verify label"}</button>{!busy && (!file || !requiredComplete) && <p className="action-help">Complete the required fields and add a label image to enable verification.</p>}{error && <p className="alert" role="alert"><strong>Something went wrong:</strong> {error}</p>}</form>{item?.error && <p className="alert" role="alert"><strong>{item.fileName}:</strong> {item.error}</p>}{result && <section className="results" aria-live="polite"><div className="results-heading"><div><p className="kicker">REVIEW FINDINGS</p><h2>Application versus label</h2></div><p>Review the evidence below before making a determination.</p></div><article className="result-card"><div className={`result-banner ${result.state}`}>{preview && <a className="result-preview" href={preview} target="_blank" rel="noreferrer"><img src={preview} alt={`Label artwork: ${result.fileName}`} /></a>}<div><StatePill state={result.state} /><strong>{result.fileName}</strong><p>{result.extraction.notes || "Extraction completed."}</p></div><span>checked in {(result.elapsedMs / 1000).toFixed(1)}s</span></div><div className="result-table-wrap"><table><thead><tr><th>Item</th><th>Application says</th><th>Label shows</th><th>Result</th></tr></thead><tbody>{result.findings.map((finding) => <tr key={finding.field}><td><strong>{finding.field}</strong><p>{finding.message}</p></td><td>{finding.expected ?? "—"}</td><td>{finding.extracted ?? <em>Not detected</em>}</td><td><StatePill state={finding.state} /></td></tr>)}</tbody></table></div></article></section>}</>;
}
