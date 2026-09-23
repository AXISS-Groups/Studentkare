import React, { useState } from 'react';
import { AlertTriangle, LifeBuoy, PhoneCall, Send, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../data/http';
import { FormError, useMutation } from '../../components/interface/WorkflowUI';
import { EmptyState } from '../../components/interface/WorkflowUI';
import {
  evaluateCrisisGate,
  CrisisKind,
  DEFAULT_CAMPUS_COUNSELLOR,
  EMERGENCY_NUMBER,
  TELE_MANAS_PRIMARY,
  TELE_MANAS_TOLL_FREE,
} from '../../ai/crisisGate';
import '../../theme/workflows.css';

interface CrisisResource { label: string; number: string; detail: string }
interface CrisisPayload { kind: CrisisKind; resources: CrisisResource[] }
interface NavigateResult {
  answer: string;
  citations: { sourceId: string; title: string; snippet: string; version: number }[];
  confident: boolean;
  domain: string;
  crisis?: CrisisPayload;
}

const POISON_HELPLINE = '1800-116-117';

/** Contacts for a locally-detected crisis. The server sends its own list; this mirrors
 *  it so a student still gets help when the request cannot be made at all. */
function localResources(kind: CrisisKind): CrisisResource[] {
  const teleManas = { label: 'Tele-MANAS', number: TELE_MANAS_PRIMARY, detail: 'Free, confidential, 24/7 — English, Hindi, Telugu' };
  const emergency = { label: 'Emergency Services', number: EMERGENCY_NUMBER, detail: 'If you are in immediate danger' };
  if (kind === 'CRISIS_OVERDOSE') {
    return [{ label: 'National Poison Helpline', number: POISON_HELPLINE, detail: '24/7 poison control' }, emergency, teleManas];
  }
  if (kind === 'CRISIS_MEDICAL') return [emergency, teleManas];
  return [
    teleManas,
    { label: 'Tele-MANAS (toll free)', number: TELE_MANAS_TOLL_FREE, detail: 'Same service, toll-free line' },
    emergency,
    { label: 'Campus Counsellor', number: DEFAULT_CAMPUS_COUNSELLOR, detail: 'Student counselling support' },
  ];
}

/** Support contacts, announced assertively and reachable in one tap. Never rendered
 *  with citations or the "unverified answer" note — this is not a retrieval result. */
function CrisisSupport({ message, resources }: { message: string; resources: CrisisResource[] }) {
  return <section className="wf-card wf-section-gap" role="alert" style={{ border: '2px solid var(--emergency)' }}>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow" style={{ color: 'var(--emergency)' }}>SUPPORT IS AVAILABLE RIGHT NOW</span>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><LifeBuoy size={20} aria-hidden="true" />You are not alone.</h3>
    </div></div>
    <p style={{ fontSize: 14, lineHeight: 1.8 }}>{message}</p>
    <div className="wf-order-list">
      {resources.map(resource => <div className="wf-order-line" key={`${resource.label}-${resource.number}`}>
        <div><strong>{resource.label}</strong><small>{resource.detail}</small></div>
        <a
          className="health-button health-button-primary"
          href={`tel:${resource.number.replace(/[^\d+]/g, '')}`}
          aria-label={`Call ${resource.label} on ${resource.number}`}
          style={{ minHeight: 44, minWidth: 44 }}
        ><PhoneCall size={16} aria-hidden="true" />{resource.number}</a>
      </div>)}
    </div>
  </section>;
}

export function CareNavigatorPanel() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<NavigateResult | null>(null);
  const [localCrisis, setLocalCrisis] = useState<{ message: string; kind: CrisisKind } | null>(null);
  const mutation = useMutation();

  const ask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Evaluate on the device first. A crisis is answered here and the query is not
    // sent: the server would return the same contacts, and the text stays local.
    // The gate fails closed, so an evaluation error also lands in this branch.
    const gate = evaluateCrisisGate(query);
    if (gate.isCrisis) {
      setResult(null);
      setLocalCrisis({ message: gate.message, kind: gate.kind });
      // Report the kind only, so the follow-up queue sees this student without ever
      // receiving what they wrote. Deliberately not awaited and never surfaced: the
      // support contacts are already on screen and must not depend on this call.
      void apiRequest('/care/crisis-signal', {
        method: 'POST',
        body: JSON.stringify({ kind: gate.kind, surface: 'care_navigator' }),
      }).catch(() => { /* the contacts above are what matter */ });
      return;
    }

    setLocalCrisis(null);
    mutation.run(
      () => apiRequest<NavigateResult>('/care/navigate', { method: 'POST', body: JSON.stringify({ query }) }),
      (res) => { setResult(res); },
    );
  };

  // The server gate is authoritative: its table may be ahead of the bundled one.
  const serverCrisis = result?.crisis;

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">CARE NAVIGATOR</span>
      <h2>Ask about your care.</h2>
      <p>A read-only assistant that answers from approved sources with citations. It never diagnoses or prescribes.</p>
    </div></div>

    <form className="wf-card wf-form" onSubmit={ask} style={{ maxWidth: 640 }}>
      <FormError message={mutation.error} />
      <label className="wf-field">Question
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="e.g. How do I book an appointment?" maxLength={500} />
      </label>
      <button className="health-button health-button-primary" type="submit" disabled={mutation.busy || !query.trim()}><Send size={16} />Ask</button>
    </form>

    {localCrisis && <CrisisSupport message={localCrisis.message} resources={localResources(localCrisis.kind)} />}

    {result && serverCrisis && <CrisisSupport message={result.answer} resources={serverCrisis.resources} />}

    {result && !serverCrisis && <section className="wf-card wf-section-gap">
      <div className="wf-notice" role="status" style={{ marginBottom: 14, background: result.confident ? '#ecfdf5' : '#fef3c7', color: result.confident ? '#065f46' : '#92400e', borderColor: result.confident ? '#a7f3d0' : '#fde68a' }}>
        {result.confident ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}{result.answer}
      </div>
      {result.citations.length ? <div className="wf-order-list">{result.citations.map(c => <div className="wf-order-line" key={c.sourceId}><div><strong>{c.title}</strong><small>Approved source · v{c.version}</small><p style={{ fontSize: 12 }}>{c.snippet}…</p></div></div>)}</div> : <EmptyState title="No approved source." description="This answer is unverified. Contact support for guidance." />}
    </section>}
  </>;
}
