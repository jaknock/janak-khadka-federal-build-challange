import { type PendingNotification, ReviewQueue } from "@/components/ReviewQueue";

export function LabelCheckApp({ notifications }: { notifications: PendingNotification[] }) {
  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to review inbox</a><header className="site-header"><div className="site-title"><span className="agency-mark" aria-hidden>TTB</span><div><p>TTB LABEL COMPLIANCE</p><h1>Label Check</h1></div></div><span className="prototype-note">Prototype · human review required</span></header><main id="main-content" className="page-content"><ReviewQueue initialNotifications={notifications} /></main></div>;
}
