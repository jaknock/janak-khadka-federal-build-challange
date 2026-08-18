"use client";

import { useState } from "react";
import { BatchValidation } from "@/components/BatchValidation";
import { type PendingNotification, ReviewQueue } from "@/components/ReviewQueue";
import { SingleLabelReview } from "@/components/SingleLabelReview";

type Mode = "queue" | "single" | "batch";

export function LabelCheckApp({ notifications }: { notifications: PendingNotification[] }) {
  const [mode, setMode] = useState<Mode>("queue");
  return <main className="app-shell"><header className="site-header"><div className="site-title"><span className="agency-mark" aria-hidden>TTB</span><div><p>TTB LABEL COMPLIANCE</p><h1>Label Check</h1></div></div><span className="prototype-note">Prototype · human review required</span></header><div className="page-content"><nav className="mode-switch mode-switch-three" aria-label="Review source"><button type="button" className={mode === "queue" ? "active" : ""} onClick={() => setMode("queue")}>Review inbox</button><button type="button" className={mode === "single" ? "active" : ""} onClick={() => setMode("single")}>Upload one label</button><button type="button" className={mode === "batch" ? "active" : ""} onClick={() => setMode("batch")}>Upload CSV batch</button></nav>{mode === "queue" ? <ReviewQueue initialNotifications={notifications} /> : mode === "single" ? <SingleLabelReview /> : <><section className="intro"><p className="kicker">MANUAL BATCH REVIEW</p><h2>Upload a batch.<br />Keep the judgment.</h2><p>Pair an applications CSV with label images and check the ready rows as a batch.</p></section><BatchValidation /></>}</div><footer>Prototype for evaluation only — uploaded labels are not stored. Mock-inbox verification and decision state is saved only in this browser. Results are recommendations; the reviewing agent makes all final determinations.</footer></main>;
}
