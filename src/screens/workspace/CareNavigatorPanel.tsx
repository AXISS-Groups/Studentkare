import React, { useState } from 'react';
import { AlertTriangle, LifeBuoy, PhoneCall, Send, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../data/http';
import { FormError, useMutation } from '../../components/interface/WorkflowUI';
import { EmptyState } from '../../components/interface/WorkflowUI';
import {
  evaluateCrisisGate,
  CrisisKind,
  EMERGENCY_NUMBER,
  TELE_MANAS_PRIMARY,
  TELE_MANAS_TOLL_FREE,
} from '../../ai/crisisGate';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
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

type Translate = ReturnType<typeof useT>;

/** Contacts for a locally-detected crisis. The server sends its own list; this mirrors
 *  it so a student still gets help when the request cannot be made at all.
 *  No "campus counsellor" line: the bundled DEFAULT_CAMPUS_COUNSELLOR number is not a
 *  campus's counselling desk, so naming it one would send a student in crisis to the
 *  wrong place. A campus's own number belongs here once it is configured per campus. */
export function localResources(kind: CrisisKind, t: Translate): CrisisResource[] {
  const teleManas = { label: 'Tele-MANAS', number: TELE_MANAS_PRIMARY, detail: t('assist.nav.res.teleManasDetail') };
  const emergency = { label: t('assist.nav.res.emergency'), number: EMERGENCY_NUMBER, detail: t('assist.nav.res.emergencyDetail') };
  if (kind === 'CRISIS_OVERDOSE') {
    return [{ label: t('assist.nav.res.poison'), number: POISON_HELPLINE, detail: t('assist.nav.res.poisonDetail') }, emergency, teleManas];
  }
  if (kind === 'CRISIS_MEDICAL') return [emergency, teleManas];
  return [
    teleManas,
    { label: t('assist.nav.res.teleManasTollFree'), number: TELE_MANAS_TOLL_FREE, detail: t('assist.nav.res.teleManasTollFreeDetail') },
    emergency,
  ];
}

/** What to say for a crisis caught on this device. The gate's own message is English,
 *  addresses the student as "Student" and carries an internal reason, so it is not shown. */
const LOCAL_CRISIS_MESSAGE: Record<CrisisKind, MessageKey> = {
  CRISIS_SELF_HARM: 'assist.nav.crisis.selfHarm',
  CRISIS_OVERDOSE: 'assist.nav.crisis.overdose',
  CRISIS_MEDICAL: 'assist.nav.crisis.medical',
  ERROR_FAIL_CLOSED: 'assist.nav.crisis.failClosed',
  CLEAR: 'assist.nav.crisis.failClosed',
};

/** Support contacts, announced assertively and reachable in one tap. Never rendered
 *  with citations or the "unverified answer" note — this is not a retrieval result. */
function CrisisSupport({ message, resources }: { message: string; resources: CrisisResource[] }) {
  const t = useT();
  return <section className="wf-card wf-section-gap" role="alert" style={{ border: '2px solid var(--emergency)' }}>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow" style={{ color: 'var(--emergency)' }}>{t('assist.nav.supportNow')}</span>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><LifeBuoy size={20} aria-hidden="true" />{t('assist.crisis.notAlone')}</h3>
    </div></div>
    <p style={{ fontSize: 14, lineHeight: 1.8 }}>{message}</p>
    <div className="wf-order-list">
      {resources.map(resource => <div className="wf-order-line" key={`${resource.label}-${resource.number}`}>
        <div><strong>{resource.label}</strong><small>{resource.detail}</small></div>
        <a
          className="health-button health-button-primary"
          href={`tel:${resource.number.replace(/[^\d+]/g, '')}`}
          aria-label={t('assist.crisis.callSpoken', { label: resource.label, number: resource.number })}
          style={{ minHeight: 44, minWidth: 44 }}
        ><PhoneCall size={16} aria-hidden="true" />{resource.number}</a>
      </div>)}
    </div>
  </section>;
}

export function CareNavigatorPanel() {
  const t = useT();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<NavigateResult | null>(null);
  const [localCrisis, setLocalCrisis] = useState<CrisisKind | null>(null);
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
      setLocalCrisis(gate.kind);
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
      <span className="care-eyebrow">{t('assist.nav.eyebrow')}</span>
      <h2>{t('assist.ayush.title')}</h2>
      <p>{t('assist.nav.intro')}</p>
    </div></div>

    <form className="wf-card wf-form" onSubmit={ask} style={{ maxWidth: 640 }}>
      <FormError message={mutation.error} />
      <label className="wf-field">{t('assist.nav.questionLabel')}
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('assist.nav.questionPlaceholder')} maxLength={500} />
      </label>
      <button className="health-button health-button-primary" type="submit" style={{ minHeight: 44 }} disabled={mutation.busy || !query.trim()}><Send size={16} aria-hidden="true" />{t('assist.nav.ask')}</button>
    </form>

    {localCrisis && <CrisisSupport message={t(LOCAL_CRISIS_MESSAGE[localCrisis])} resources={localResources(localCrisis, t)} />}

    {result && serverCrisis && <CrisisSupport message={result.answer} resources={serverCrisis.resources} />}

    {result && !serverCrisis && <section className="wf-card wf-section-gap">
      <div className="wf-notice" role="status" style={{ marginBottom: 14, background: result.confident ? 'var(--sk-color-positive-bg)' : 'var(--sk-color-attention-bg)', color: result.confident ? 'var(--sk-color-positive)' : 'var(--sk-color-attention)', borderColor: result.confident ? 'var(--sk-color-positive)' : 'var(--sk-color-attention)' }}>
        {result.confident ? <ShieldCheck size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}{result.answer}
      </div>
      {result.citations.length ? <div className="wf-order-list">{result.citations.map(c => <div className="wf-order-line" key={c.sourceId}><div><strong>{c.title}</strong><small>{t('assist.nav.citationMeta', { version: c.version })}</small><p style={{ fontSize: 12 }}>{c.snippet}…</p></div></div>)}</div> : <EmptyState title={t('assist.nav.noSourceTitle')} description={t('assist.nav.noSourceBody')} />}
    </section>}
  </>;
}
