"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import type { ExpectedFields, ReviewResult } from "@/lib/types";

export type PendingNotification = {
  id: string;
  filename: string;
  imagePath: string;
  application: ExpectedFields;
  title: string;
  description: string;
};

type BatchItem = { reviewId: string; result?: ReviewResult; fileName?: string; error?: string };

function StatePill({ state }: { state: ReviewResult["state"] }) {
  const copy = state === "pass" ? "Match" : state === "mismatch" ? "Mismatch" : "Needs review";
  return <span className={`verdict ${state}`}>{copy}</span>;
}

function summary(result: ReviewResult) {
  const concerns = result.findings.filter((finding) => finding.state !== "pass");
  return concerns.length ? concerns.map((finding) => `${finding.field}: ${finding.message}`).join(" ") : "All reviewed application fields and warning checks passed.";
}

function displayBrandName(value: string) {
  return value.toLocaleLowerCase().replace(/\b\w/g, (character) => character.toLocaleUpperCase());
}

function notificationDescription(notification: PendingNotification, item?: BatchItem) {
  if (item?.error) return `Verification could not finish: ${item.error}`;
  if (item?.result) return "Verification complete. See detailed findings below.";
  return `Awaiting verification. Application lists ${notification.application.classType}, ${notification.application.alcoholContent}, ${notification.application.netContents}.`;
}

export function ReviewQueue({ initialNotifications }: { initialNotifications: PendingNotification[] }) {
  const [results, setResults] = useState<Record<string, BatchItem>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function verifyBatch() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/reviews/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewIds: pending.map((item) => item.id) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Batch verification failed.");
      const next = Object.fromEntries((data.results as BatchItem[]).map((item) => [item.reviewId, item]));
      setResults((current) => ({ ...current, ...next }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Batch verification failed.");
    } finally { setBusy(false); }
  }

  const pending = initialNotifications.filter((item) => !results[item.id]);
  const verified = initialNotifications.filter((item) => results[item.id]);

  return <>
      <section className="intro queue-intro"><p className="kicker">REVIEW INBOX</p><h2>Labels waiting<br />for your review.</h2><p>The mock review database has six fictional applications ready to check. Verify the pending queue as one batch; Label Check returns evidence and a recommendation for each label.</p></section>
      <section className="notification-panel" aria-labelledby="notifications-title">
        <div className="notification-heading"><div><h3 id="notifications-title">Review notifications</h3><p>{pending.length ? `${pending.length} label${pending.length === 1 ? "" : "s"} awaiting verification${verified.length ? ` · ${verified.length} checked` : ""}` : `${verified.length} label${verified.length === 1 ? "" : "s"} checked`}</p></div><span className={`notification-count ${pending.length ? "" : "complete"}`} aria-label={`${pending.length} pending notifications`}>{pending.length}</span></div>
        <ul className="notification-list">{initialNotifications.map((notification) => { const item = results[notification.id]; const content = <><img src={notification.imagePath} alt="" /><div><strong>{notification.title}</strong><p>{notificationDescription(notification, item)}</p>{!item?.result && <span>Product application: {displayBrandName(notification.application.brandName ?? "")} · {notification.application.classType} · {notification.application.alcoholContent}</span>}</div>{item?.result ? <StatePill state={item.result.state} /> : <span className={`batch-status ${item?.error ? "error" : "waiting"}`}>{item?.error ? "Error" : "Pending review"}</span>}</>; return <li className={item?.result ? "notification-result-link" : ""} key={notification.id}>{item?.result ? <a href={`#review-result-${notification.id}`} aria-label={`View detailed findings for ${notification.title}`}>{content}</a> : content}</li>; })}</ul>
      </section>
      {pending.length > 0 && <div className="queue-actions"><button type="button" className="verify-button" disabled={busy} onClick={verifyBatch}>{busy ? `Verifying ${pending.length} labels…` : `Verify ${pending.length} labels`}</button><p>All six bundled labels are retrieved from the mock database; you do not need to choose image files.</p></div>}
      {error && <p className="alert" role="alert"><strong>Something went wrong:</strong> {error}</p>}
      {verified.length > 0 && <section className="results" aria-live="polite"><div className="results-heading"><div><p className="kicker">BATCH REVIEW FINDINGS</p><h2>Evidence for each label</h2></div><p>These outcomes support the compliance agent’s decision; they do not approve or reject an application.</p></div>{verified.map((notification) => { const item = results[notification.id]; return item.error ? <article className="error-result" key={notification.id}><strong>{notification.title}</strong><p>{item.error}</p></article> : item.result && <article className="result-card" id={`review-result-${notification.id}`} tabIndex={-1} key={notification.id}><div className={`result-banner ${item.result.state}`}><a className="result-preview" href={notification.imagePath} target="_blank" rel="noreferrer" title="Open label image"><img src={notification.imagePath} alt={`Label artwork: ${notification.filename}`} /></a><div><StatePill state={item.result.state} /><strong>{notification.title} · {displayBrandName(notification.application.brandName ?? "")}</strong><p>{summary(item.result)}</p></div><span>checked in {(item.result.elapsedMs / 1000).toFixed(1)}s</span></div><div className="result-table-wrap"><table><thead><tr><th>Item</th><th>Application says</th><th>Label shows</th><th>Result</th></tr></thead><tbody>{item.result.findings.map((finding) => <tr key={finding.field}><td><strong>{finding.field}</strong><p>{finding.message}</p></td><td>{finding.expected ?? "—"}</td><td>{finding.extracted ?? <em>Not detected</em>}</td><td><StatePill state={finding.state} /></td></tr>)}</tbody></table></div></article>; })}</section>}
  </>;
}
