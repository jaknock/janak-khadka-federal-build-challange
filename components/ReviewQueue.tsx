"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useSyncExternalStore } from "react";
import { clearBrowserReviewQueue, getBrowserReviewQueue, getServerReviewQueue, saveBrowserReviewQueue, subscribeToBrowserReviewQueue } from "@/lib/review-queue-storage";
import type { ReviewDecision } from "@/lib/review-queue-storage";
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
type FinalDecision = "approved" | "rejected";

const applicationFields: Array<[keyof ExpectedFields, string]> = [
  ["brandName", "Brand name"],
  ["classType", "Class / type"],
  ["alcoholContent", "Alcohol content"],
  ["netContents", "Net contents"],
  ["producer", "Producer / bottler"],
  ["countryOfOrigin", "Country of origin"],
];

function StatePill({ state }: { state: ReviewResult["state"] }) {
  const copy = state === "pass" ? "Match" : state === "mismatch" ? "Mismatch" : "Needs review";
  return <span className={`verdict ${state}`}>{copy}</span>;
}

function DecisionPill({ decision }: { decision: FinalDecision }) {
  return <span className={`decision-pill ${decision}`}>{decision === "approved" ? "Approved" : "Rejected"}</span>;
}

function summary(result: ReviewResult) {
  const concerns = result.findings.filter((finding) => finding.state !== "pass");
  return concerns.length ? concerns.map((finding) => `${finding.field}: ${finding.message}`).join(" ") : "All reviewed application fields and warning checks passed.";
}

function suggestedRejectionReason(result: ReviewResult) {
  const concerns = result.findings.filter((finding) => finding.state !== "pass");
  if (concerns.length) return concerns.map((finding) => `${finding.field}: ${finding.message}`).join(" ");
  return "The reviewer rejected this application despite no automated mismatch. Add the specific reason for rejection.";
}

function displayBrandName(value: string) {
  return value.toLocaleLowerCase().replace(/\b\w/g, (character) => character.toLocaleUpperCase());
}

function notificationDescription(notification: PendingNotification, item?: BatchItem) {
  if (item?.error) return `Verification could not finish: ${item.error}`;
  if (item?.result) return "Verification complete. Open the application to review the evidence and record a decision.";
  return notification.description || `Application lists ${notification.application.classType}, ${notification.application.alcoholContent}, ${notification.application.netContents}.`;
}

function FindingsTable({ result }: { result: ReviewResult }) {
  return <div className="result-table-wrap"><table><thead><tr><th>Item</th><th>Application says</th><th>Label shows</th><th>Result</th></tr></thead><tbody>{result.findings.map((finding) => <tr key={finding.field}><td><strong>{finding.field}</strong><p>{finding.message}</p></td><td>{finding.expected ?? "—"}</td><td>{finding.extracted ?? <em>Not detected</em>}</td><td><StatePill state={finding.state} /></td></tr>)}</tbody></table></div>;
}

function ApplicationDetail({
  notification,
  item,
  decision,
  busy,
  onClose,
  onVerify,
  onDecision,
}: {
  notification: PendingNotification;
  item?: BatchItem;
  decision?: ReviewDecision;
  busy: boolean;
  onClose: () => void;
  onVerify: () => void;
  onDecision: (decision: ReviewDecision) => void;
}) {
  const generatedRejectionReason = item?.result ? suggestedRejectionReason(item.result) : "";
  const [rejectionReason, setRejectionReason] = useState(decision?.rejectionReason ?? generatedRejectionReason);
  const [showRejectionReason, setShowRejectionReason] = useState(decision?.value === "rejected");

  function beginRejection() {
    setRejectionReason(decision?.rejectionReason || generatedRejectionReason);
    setShowRejectionReason(true);
  }

  function confirmRejection() {
    const reason = rejectionReason.trim();
    if (!reason) return;
    onDecision({ value: "rejected", rejectionReason: reason });
  }

  function cancelRejection() {
    setRejectionReason(decision?.rejectionReason ?? generatedRejectionReason);
    setShowRejectionReason(decision?.value === "rejected");
  }

  return <article className="application-detail" id={`application-${notification.id}`} tabIndex={-1}>
    <header className="application-detail-heading"><div><p className="kicker">APPLICATION REVIEW</p><h2>{notification.title}</h2><p>Compare the application data with its submitted label before making a final determination.</p></div><button type="button" className="secondary-button" onClick={onClose}>Close application</button></header>
    <div className="application-side-by-side">
      <section className="application-data" aria-labelledby={`application-data-${notification.id}`}><h3 id={`application-data-${notification.id}`}>Application details</h3><dl>{applicationFields.map(([field, label]) => <div key={field}><dt>{label}</dt><dd>{notification.application[field] || "Not supplied"}</dd></div>)}</dl></section>
      <figure className="application-label"><img src={notification.imagePath} alt={`Submitted label for ${notification.title}`} /><figcaption><strong>Submitted label artwork</strong><a href={notification.imagePath} target="_blank" rel="noreferrer">Open full-size label</a></figcaption></figure>
    </div>
    {item?.error && <p className="alert" role="alert"><strong>Verification could not finish:</strong> {item.error}</p>}
    {!item?.result && <section className="application-awaiting"><p>This application has not been verified yet. Verification results and your final decision are saved only in this browser.</p><button type="button" className="verify-button application-verify-button" disabled={busy} onClick={onVerify}>{busy ? "Verifying application…" : "Verify application"}</button><p>One label is sent for review. The app applies deterministic checks after evidence extraction.</p></section>}
    {item?.result && <section className="application-findings" aria-labelledby={`findings-${notification.id}`}><div className="application-findings-heading"><div><h3 id={`findings-${notification.id}`}>Verification findings</h3><p>{summary(item.result)}</p></div><div><StatePill state={item.result.state} /><span>checked in {(item.result.elapsedMs / 1000).toFixed(1)}s</span></div></div><FindingsTable result={item.result} /><fieldset className="final-decision"><legend>Final determination — human reviewer only</legend><p>These controls save your decision in this browser only. They do not change the verification findings or submit anything to TTB.</p><div><button type="button" className={`approve-button ${decision?.value === "approved" ? "selected" : ""}`} aria-pressed={decision?.value === "approved"} onClick={() => { setShowRejectionReason(false); onDecision({ value: "approved" }); }}>Approve application</button><button type="button" className={`reject-button ${decision?.value === "rejected" ? "selected" : ""}`} aria-pressed={decision?.value === "rejected"} onClick={beginRejection}>Reject application</button>{decision && <p className="decision-status" role="status">Saved in this browser: <strong>{decision.value === "approved" ? "Approved" : "Rejected"}</strong>.</p>}</div>{showRejectionReason && <div className="rejection-reason"><label htmlFor={`rejection-reason-${notification.id}`}>Reason for rejection <span aria-hidden="true">*</span></label><p>Auto-populated from verification findings. Review or edit it before confirming the rejection.</p><textarea id={`rejection-reason-${notification.id}`} value={rejectionReason} maxLength={1200} required aria-required="true" onChange={(event) => setRejectionReason(event.target.value)} /><div className="rejection-reason-actions"><button type="button" className="reject-button confirm-reject-button" disabled={!rejectionReason.trim()} onClick={confirmRejection}>{decision?.value === "rejected" ? "Update rejection reason" : "Confirm rejection"}</button><button type="button" className="secondary-button" onClick={cancelRejection}>Cancel</button></div></div>}</fieldset></section>}
  </article>;
}

export function ReviewQueue({ initialNotifications }: { initialNotifications: PendingNotification[] }) {
  const persisted = useSyncExternalStore(subscribeToBrowserReviewQueue, getBrowserReviewQueue, getServerReviewQueue);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => initialNotifications.map((item) => item.id));
  const [openApplicationId, setOpenApplicationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const results = persisted.results as Record<string, BatchItem>;
  const decisions = persisted.decisions;
  const reviewable = initialNotifications.filter((item) => !results[item.id]?.result);
  const selectedReviewable = reviewable.filter((item) => selectedIds.includes(item.id));
  const allReviewableSelected = reviewable.length > 0 && selectedReviewable.length === reviewable.length;
  const openApplication = initialNotifications.find((item) => item.id === openApplicationId);

  useEffect(() => {
    if (!openApplicationId) return;
    const detail = document.getElementById(`application-${openApplicationId}`);
    detail?.scrollIntoView({ behavior: "smooth", block: "start" });
    detail?.focus({ preventScroll: true });
  }, [openApplicationId]);

  function toggleSelection(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
  }

  function toggleAll() {
    setSelectedIds((current) => allReviewableSelected ? current.filter((id) => !reviewable.some((item) => item.id === id)) : [...new Set([...current, ...reviewable.map((item) => item.id)])]);
  }

  async function verifyReviewIds(reviewIds: string[]) {
    if (!reviewIds.length) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/reviews/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewIds }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Batch verification failed.");
      const nextItems = data.results as BatchItem[];
      const next = Object.fromEntries(nextItems.map((item) => [item.reviewId, item]));
      const completedIds = nextItems.filter((item) => item.result).map((item) => item.reviewId);
      if (!saveBrowserReviewQueue({ ...persisted, results: { ...results, ...next } })) {
        setError("This browser could not save demo review state. Verification still works until this page is refreshed.");
      }
      setSelectedIds((current) => current.filter((id) => !completedIds.includes(id)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Batch verification failed.");
    } finally {
      setBusy(false);
    }
  }

  function resetDemoState() {
    if (!clearBrowserReviewQueue()) {
      setError("This browser could not reset demo review state.");
      return;
    }
    setSelectedIds(initialNotifications.map((item) => item.id));
    setOpenApplicationId(null);
    setError("");
  }

  return <>
    <section className="intro queue-intro"><p className="kicker">REVIEW INBOX</p><h2>Labels waiting<br />for your review.</h2><p>The mock review database has {initialNotifications.length} fictional applications ready to check. Select one or more applications for batch verification, or open an application below to compare its details with the submitted label.</p></section>
    <section className="notification-panel" aria-labelledby="notifications-title">
      <div className="notification-heading"><div><h3 id="notifications-title">Review notifications</h3><p>{reviewable.length ? `${reviewable.length} label${reviewable.length === 1 ? "" : "s"} awaiting verification` : "All labels verified"}</p></div><span className={`notification-count ${reviewable.length ? "" : "complete"}`} aria-label={`${reviewable.length} pending notifications`}>{reviewable.length}</span></div>
      <div className="inbox-selection-actions"><label><input type="checkbox" checked={allReviewableSelected} disabled={busy || !reviewable.length} onChange={toggleAll} /> Select all awaiting verification</label><button type="button" className="secondary-button" disabled={busy || !reviewable.length} onClick={toggleAll}>{allReviewableSelected ? "Clear selection" : "Select all"}</button></div>
      <ul className="notification-list">{initialNotifications.map((notification) => { const item = results[notification.id]; const canVerify = !item?.result; const decision = decisions[notification.id]; return <li className={openApplicationId === notification.id ? "open" : ""} key={notification.id}><label className="notification-select"><input type="checkbox" checked={selectedIds.includes(notification.id)} disabled={busy || !canVerify} onChange={() => toggleSelection(notification.id)} /><span className="sr-only">Select {notification.title} for verification</span></label><img src={notification.imagePath} alt="" /><div><strong>{notification.title}</strong><p>{notificationDescription(notification, item)}</p><span>Product application: {displayBrandName(notification.application.brandName ?? "")} · {notification.application.classType} · {notification.application.alcoholContent}</span></div><div className="notification-actions"><button type="button" className="secondary-button open-application-button" aria-expanded={openApplicationId === notification.id} aria-controls={`application-${notification.id}`} onClick={() => setOpenApplicationId(notification.id)}>Open application</button>{decision ? <DecisionPill decision={decision.value} /> : item?.result ? <StatePill state={item.result.state} /> : <span className={`batch-status ${item?.error ? "error" : "waiting"}`}>{item?.error ? "Error" : "Awaiting review"}</span>}</div></li>; })}</ul>
    </section>
    {reviewable.length > 0 && <div className="queue-actions"><button type="button" className="verify-button" disabled={busy || !selectedReviewable.length} onClick={() => verifyReviewIds(selectedReviewable.map((item) => item.id))}>{busy ? `Verifying ${selectedReviewable.length} labels…` : `Verify selected (${selectedReviewable.length})`}</button><p>Up to three selected labels are verified in parallel. You can also select all {reviewable.length} pending applications.</p></div>}
    <div className="demo-storage-actions"><p>Verification findings and Approve/Reject choices are saved in this browser only.</p><button type="button" className="text-button" onClick={resetDemoState}>Reset this browser’s demo state</button></div>
    {error && <p className="alert" role="alert"><strong>Something went wrong:</strong> {error}</p>}
    {openApplication ? <ApplicationDetail notification={openApplication} item={results[openApplication.id]} decision={decisions[openApplication.id]} busy={busy} onClose={() => setOpenApplicationId(null)} onVerify={() => verifyReviewIds([openApplication.id])} onDecision={(decision) => { if (!saveBrowserReviewQueue({ ...persisted, decisions: { ...decisions, [openApplication.id]: decision } })) setError("This browser could not save your decision."); }} /> : <p className="open-application-help">Open an application to compare its details with the submitted label side-by-side.</p>}
  </>;
}
