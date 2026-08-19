"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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

function notificationDescription(item?: BatchItem) {
  if (item?.error) return "Verification could not finish.";
  if (item?.result) return `Checked in ${(item.result.elapsedMs / 1000).toFixed(1)}s`;
  return null;
}

function sameDecision(first?: ReviewDecision, second?: ReviewDecision) {
  return first?.value === second?.value && first?.rejectionReason === second?.rejectionReason;
}

function FindingsTable({ result }: { result: ReviewResult }) {
  return <div className="result-table-wrap"><table><caption className="sr-only">Comparison of submitted application fields with extracted label evidence</caption><thead><tr><th scope="col">Item</th><th scope="col">Application says</th><th scope="col">Label shows</th><th scope="col">Result</th></tr></thead><tbody>{result.findings.map((finding) => <tr key={finding.field}><th scope="row"><strong>{finding.field}</strong><p>{finding.message}</p></th><td>{finding.expected ?? "—"}</td><td>{finding.extracted ?? <em>Not detected</em>}</td><td><StatePill state={finding.state} /></td></tr>)}</tbody></table></div>;
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
  const detailRef = useRef<HTMLElement>(null);
  const rejectionEditorRef = useRef<HTMLDivElement>(null);
  const rejectionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldFocusRejectionEditor = useRef(false);
  const generatedRejectionReason = item?.result ? suggestedRejectionReason(item.result) : "";
  const [rejectionReason, setRejectionReason] = useState(decision?.rejectionReason ?? generatedRejectionReason);
  const [showRejectionReason, setShowRejectionReason] = useState(decision?.value === "rejected");
  const [pendingDecision, setPendingDecision] = useState<ReviewDecision | undefined>(decision);
  const decisionIsSaved = sameDecision(pendingDecision, decision);

  useEffect(() => {
    detailRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!showRejectionReason || !shouldFocusRejectionEditor.current) return;
    shouldFocusRejectionEditor.current = false;
    rejectionEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    rejectionTextareaRef.current?.focus({ preventScroll: true });
  }, [showRejectionReason]);

  function beginRejection() {
    setRejectionReason((pendingDecision?.value === "rejected" ? pendingDecision.rejectionReason : decision?.rejectionReason) || generatedRejectionReason);
    shouldFocusRejectionEditor.current = true;
    setShowRejectionReason(true);
  }

  function confirmRejection() {
    const reason = rejectionReason.trim();
    if (!reason) return;
    setPendingDecision({ value: "rejected", rejectionReason: reason });
    setShowRejectionReason(false);
  }

  function cancelRejection() {
    setRejectionReason((pendingDecision?.value === "rejected" ? pendingDecision.rejectionReason : decision?.rejectionReason) ?? generatedRejectionReason);
    setShowRejectionReason(false);
  }

  function selectApproval() {
    setPendingDecision({ value: "approved" });
    setShowRejectionReason(false);
  }

  return <article ref={detailRef} className="application-detail" id={`application-${notification.id}`} tabIndex={-1}>
    <header className="application-detail-heading"><div><p className="kicker">APPLICATION REVIEW</p><h2>{notification.title}</h2><p>Compare the application data with its submitted label before making a final determination.</p></div><button type="button" className="secondary-button" onClick={onClose}>Close application</button></header>
    <div className="application-side-by-side">
      <section className="application-data" aria-labelledby={`application-data-${notification.id}`}><h3 id={`application-data-${notification.id}`}>Application details</h3><dl>{applicationFields.map(([field, label]) => <div key={field}><dt>{label}</dt><dd>{notification.application[field] || "Not supplied"}</dd></div>)}</dl></section>
      <figure className="application-label"><img src={notification.imagePath} alt={`Submitted label for ${notification.title}`} /><figcaption><strong>Submitted label artwork</strong><a href={notification.imagePath} target="_blank" rel="noreferrer">Open full-size label</a></figcaption></figure>
    </div>
    {item?.error && <p className="alert" role="alert"><strong>Verification could not finish:</strong> {item.error}</p>}
    {!item?.result && <section className="application-awaiting"><p>This application has not been verified yet. Verification results and submitted final decisions are saved only in this browser.</p><button type="button" className="verify-button application-verify-button" disabled={busy} onClick={onVerify}>{busy ? "Verifying application…" : "Verify application"}</button><p>One label is sent for review. The app applies deterministic checks after evidence extraction.</p></section>}
    {item?.result && <section className="application-findings" aria-labelledby={`findings-${notification.id}`}><div className="application-findings-heading"><div><h3 id={`findings-${notification.id}`}>Verification findings</h3><p>{summary(item.result)}</p></div><div><StatePill state={item.result.state} /><span>checked in {(item.result.elapsedMs / 1000).toFixed(1)}s</span></div></div><FindingsTable result={item.result} /><fieldset className="final-decision"><legend>Final determination — human reviewer only</legend><p>Choose an outcome, then submit it to save the decision in this browser. It does not change verification findings or submit anything to TTB.</p><div><button type="button" className={`approve-button ${pendingDecision?.value === "approved" ? "selected" : ""}`} aria-pressed={pendingDecision?.value === "approved"} onClick={selectApproval}>Approve application</button><button type="button" className={`reject-button ${pendingDecision?.value === "rejected" ? "selected" : ""}`} aria-pressed={pendingDecision?.value === "rejected"} onClick={beginRejection}>Reject application</button></div>{showRejectionReason && <div ref={rejectionEditorRef} className="rejection-reason"><label htmlFor={`rejection-reason-${notification.id}`}>Reason for rejection <span aria-hidden="true">*</span></label><p>Auto-populated from verification findings. Review or edit it before setting the rejection outcome.</p><textarea ref={rejectionTextareaRef} id={`rejection-reason-${notification.id}`} value={rejectionReason} maxLength={1200} required aria-required="true" onChange={(event) => setRejectionReason(event.target.value)} /><div className="rejection-reason-actions"><button type="button" className="reject-button confirm-reject-button" disabled={!rejectionReason.trim()} onClick={confirmRejection}>Set rejection outcome</button><button type="button" className="secondary-button" onClick={cancelRejection}>Cancel</button></div></div>}{pendingDecision && <div className="decision-submit"><p className="decision-status" role="status">{decisionIsSaved ? <>Saved in this browser: <strong>{pendingDecision.value === "approved" ? "Approved" : "Rejected"}</strong>.</> : <>Ready to submit: <strong>{pendingDecision.value === "approved" ? "Approved" : "Rejected"}</strong>.</>}</p>{decisionIsSaved && decision?.value === "rejected" && decision.rejectionReason && <p className="saved-rejection-reason"><strong>Saved rejection reason:</strong> {decision.rejectionReason}</p>}{!decisionIsSaved && <button type="button" className="verify-button submit-decision-button" onClick={() => onDecision(pendingDecision)}>Submit determination</button>}</div>}</fieldset></section>}
  </article>;
}

export function ReviewQueue({ initialNotifications }: { initialNotifications: PendingNotification[] }) {
  const persisted = useSyncExternalStore(subscribeToBrowserReviewQueue, getBrowserReviewQueue, getServerReviewQueue);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openApplicationId, setOpenApplicationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const reviewButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const results = persisted.results as Record<string, BatchItem>;
  const decisions = persisted.decisions;
  const reviewable = initialNotifications.filter((item) => !results[item.id]?.result);
  const selectedReviewable = reviewable.filter((item) => selectedIds.includes(item.id));
  const allReviewableSelected = reviewable.length > 0 && selectedReviewable.length === reviewable.length;
  const openApplication = initialNotifications.find((item) => item.id === openApplicationId);

  function toggleSelection(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
  }

  function toggleAll() {
    const reviewableIds = reviewable.map((item) => item.id);
    setSelectedIds((current) => {
      const everyReviewableItemIsSelected = reviewableIds.every((id) => current.includes(id));
      return everyReviewableItemIsSelected
        ? current.filter((id) => !reviewableIds.includes(id))
        : [...new Set([...current, ...reviewableIds])];
    });
  }

  async function verifyReviewIds(reviewIds: string[]) {
    if (!reviewIds.length) return;
    setBusy(true);
    setError("");
    setAnnouncement(`Verifying ${reviewIds.length} ${reviewIds.length === 1 ? "application" : "applications"}.`);
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
      setAnnouncement(`Verification complete for ${completedIds.length} ${completedIds.length === 1 ? "application" : "applications"}.`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Batch verification failed.";
      setError(message);
      setAnnouncement(`Verification failed. ${message}`);
    } finally {
      setBusy(false);
    }
  }

  function resetDemoState() {
    if (!clearBrowserReviewQueue()) {
      setError("This browser could not reset demo review state.");
      return;
    }
    setSelectedIds([]);
    setOpenApplicationId(null);
    setError("");
    setAnnouncement("Demo review state reset.");
  }

  function closeApplication() {
    const closingId = openApplicationId;
    setOpenApplicationId(null);
    if (closingId) requestAnimationFrame(() => reviewButtonRefs.current[closingId]?.focus());
  }

  return <>
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    <section className="notification-panel" aria-labelledby="notifications-title">
      <div className="notification-heading"><div><p className="kicker">REVIEW INBOX</p><h2 id="notifications-title">Pending applications</h2><p>{reviewable.length ? "Select records to verify, or open one to compare the application and label." : "All applications have been verified."}</p></div><div className="notification-heading-actions"><button type="button" className="secondary-button" aria-label="Reset this browser’s demo state" onClick={resetDemoState}>RESET</button><span className={`notification-count ${reviewable.length ? "" : "complete"}`} aria-label={`${reviewable.length} pending notifications`}>{reviewable.length}</span></div></div>
      <div className="review-workspace"><div className="review-queue-pane"><div className="inbox-selection-actions">{reviewable.length ? <p className="selection-count"><strong>{selectedReviewable.length}</strong> selected</p> : <p className="selection-complete" role="status"><strong>All verifications complete.</strong> Open an application to review the results.</p>}<button type="button" className="secondary-button" aria-pressed={allReviewableSelected} aria-label={!reviewable.length ? "All applications have been verified" : allReviewableSelected ? "Clear selected applications" : `Select all ${reviewable.length} pending applications`} disabled={busy || !reviewable.length} onClick={toggleAll}>{allReviewableSelected ? "Clear selection" : "Select all"}</button></div><ul className="notification-list" aria-label="Pending review notifications">{initialNotifications.map((notification) => { const item = results[notification.id]; const description = notificationDescription(item); const canVerify = !item?.result; const decision = decisions[notification.id]; const isOpen = openApplicationId === notification.id; return <li className={isOpen ? "open" : ""} key={notification.id}><label className="notification-select"><input type="checkbox" checked={selectedIds.includes(notification.id)} disabled={busy || !canVerify} onChange={() => toggleSelection(notification.id)} /><span className="sr-only">Select {notification.title} for verification</span></label><button type="button" className="notification-review-target" aria-label={`Review ${notification.title}`} onClick={() => setOpenApplicationId(notification.id)}><strong>{notification.title}</strong>{description && <span>{description}</span>}</button><div className="notification-actions"><button ref={(node) => { reviewButtonRefs.current[notification.id] = node; }} type="button" className="secondary-button open-application-button" aria-label={`Review ${notification.title}`} onClick={() => setOpenApplicationId(notification.id)}>Review</button>{decision ? <DecisionPill decision={decision.value} /> : item?.result ? <StatePill state={item.result.state} /> : <span className={`batch-status ${item?.error ? "error" : "waiting"}`}>{item?.error ? "Error" : "Awaiting review"}</span>}</div></li>; })}</ul>{reviewable.length > 0 && <div className="queue-actions"><button type="button" className="verify-button" disabled={busy || !selectedReviewable.length} onClick={() => verifyReviewIds(selectedReviewable.map((item) => item.id))}>{busy ? `Verifying ${selectedReviewable.length} labels…` : `Verify selected (${selectedReviewable.length})`}</button></div>}</div><aside className="review-detail-pane" aria-label="Application review detail">{openApplication ? <ApplicationDetail key={openApplication.id} notification={openApplication} item={results[openApplication.id]} decision={decisions[openApplication.id]} busy={busy} onClose={closeApplication} onVerify={() => verifyReviewIds([openApplication.id])} onDecision={(nextDecision) => { if (!saveBrowserReviewQueue({ ...persisted, decisions: { ...decisions, [openApplication.id]: nextDecision } })) { setError("This browser could not save your decision."); setAnnouncement("The determination could not be saved in this browser."); } else { setAnnouncement(`Saved ${nextDecision.value} determination for ${openApplication.title}.`); } }} /> : <div className="review-detail-empty"><span aria-hidden="true">↗</span><h4>Choose an application to review</h4><p>Select any application from the queue to compare its label artwork, findings, and submitted details here.</p></div>}</aside></div>
    </section>
    {error && <p className="alert" role="alert"><strong>Something went wrong:</strong> {error}</p>}
  </>;
}
