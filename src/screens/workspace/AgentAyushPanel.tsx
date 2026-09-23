import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, LifeBuoy, PhoneCall, Send, ShieldCheck } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { FormError, useMutation } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface Citation {
  sourceId: string; title: string; category: string;
  version: number; snippet: string; score: number; stale: boolean;
}
interface CrisisResource { label: string; number: string; detail: string }
type Outcome = 'ANSWERED' | 'NO_SOURCE' | 'REFUSED_SCOPE' | 'REFUSED_PERSONAL'
  | 'REFUSED_OUTPUT' | 'CRISIS' | 'EMPTY';

interface AyushReply {
  agent: string;
  outcome: Outcome;
  answer: string;
  citations: Citation[];
  answered: boolean;
  refusedFor?: string;
  crisis?: { kind: string; resources: CrisisResource[] };
}
interface Turn { id: string; question: string; answer: string; outcome: Outcome; createdAt: number }

/** Why the agent declined, said plainly. A refusal the reader can't interpret reads
 *  as a broken assistant rather than a deliberate boundary. */
const REFUSAL_NOTE: Partial<Record<Outcome, string>> = {
  NO_SOURCE: 'No approved source covers this yet. Ayush will not guess.',
  REFUSED_SCOPE: 'Diagnosis, prescribing and dosage are for a registered clinician.',
  REFUSED_PERSONAL: 'Ayush cannot read your records — that boundary is deliberate.',
  REFUSED_OUTPUT: 'The approved source read as clinical advice, so it was withheld.',
};

const STARTERS = [
  'How do I book an appointment?',
  'How do I share a record with a clinician?',
  'How does campus verification work?',
];

export function AgentAyushPanel() {
  const [conversationId] = useState(() => `conv-${Date.now().toString(36)}`);
  const [question, setQuestion] = useState('');
  const [thread, setThread] = useState<Array<{ q: string; reply: AyushReply }>>([]);
  const mutation = useMutation();
  const foot = useRef<HTMLDivElement>(null);
  const history = useApiResource<{ items: Turn[] }>('/agents/ayush/history?limit=10');

  useEffect(() => {
    if (thread.length) foot.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [thread.length]);

  const send = (text: string) => {
    const asked = text.trim();
    if (!asked) return;
    setQuestion('');
    mutation.run(
      () => apiRequest<AyushReply>('/agents/ayush/ask', {
        method: 'POST', body: JSON.stringify({ question: asked, conversationId }),
      }),
      (reply) => setThread(previous => [...previous, { q: asked, reply }]),
    );
  };

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">AGENT AYUSH</span>
      <h2>Ask about your care.</h2>
      <p>
        Ayush answers only from sources your care team has approved, and shows you which
        one every answer came from. It does not diagnose, prescribe, or read your health
        records.
      </p>
    </div></div>

    <FormError message={mutation.error} />

    <section className="wf-card" aria-live="polite" aria-label="Conversation with Agent Ayush">
      {thread.length === 0 && <div className="wf-notice" role="status" style={{ marginBottom: 16 }}>
        <ShieldCheck size={18} aria-hidden="true" />
        Every answer carries its source. If there isn't one, Ayush says so instead of guessing.
      </div>}

      {thread.map(({ q, reply }, index) => <article key={`${conversationId}-${index}`}
        style={{ marginBottom: 22 }}>
        <p style={{ fontWeight: 600, marginBottom: 10 }}>{q}</p>

        {reply.outcome === 'CRISIS' && reply.crisis ? (
          <div role="alert" className="wf-card" style={{ border: '2px solid var(--emergency)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LifeBuoy size={20} aria-hidden="true" />You are not alone.
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.8 }}>{reply.answer}</p>
            <div className="wf-order-list">
              {reply.crisis.resources.map(resource => <div className="wf-order-line"
                key={`${resource.label}-${resource.number}`}>
                <div><strong>{resource.label}</strong><small>{resource.detail}</small></div>
                <a className="health-button health-button-primary" style={{ minHeight: 44, minWidth: 44 }}
                  href={`tel:${resource.number.replace(/[^\d+]/g, '')}`}
                  aria-label={`Call ${resource.label} on ${resource.number}`}>
                  <PhoneCall size={16} aria-hidden="true" />{resource.number}
                </a>
              </div>)}
            </div>
          </div>
        ) : <>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.8 }}>{reply.answer}</p>

          {REFUSAL_NOTE[reply.outcome] && <div className="wf-notice" role="status"
            style={{ borderColor: 'var(--attention)', marginTop: 10 }}>
            <AlertTriangle size={16} aria-hidden="true" />{REFUSAL_NOTE[reply.outcome]}
          </div>}

          {reply.citations.length > 0 && <div style={{ marginTop: 12 }}>
            <span className="care-eyebrow">
              {reply.citations.length === 1 ? 'APPROVED SOURCE' : 'APPROVED SOURCES'}
            </span>
            <div className="wf-order-list">
              {reply.citations.map(citation => <div className="wf-order-line" key={citation.sourceId}>
                <div>
                  <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BookOpen size={15} aria-hidden="true" />{citation.title}
                  </strong>
                  <small>{citation.category} · version {citation.version}</small>
                  <p style={{ fontSize: 12 }}>{citation.snippet}…</p>
                  {citation.stale && <small style={{ color: 'var(--attention)' }}>
                    This source has been edited since it was indexed.
                  </small>}
                </div>
              </div>)}
            </div>
          </div>}
        </>}
      </article>)}

      <div ref={foot} />

      <form className="wf-form" onSubmit={event => { event.preventDefault(); send(question); }}>
        <label className="wf-field" htmlFor="ayush-question">Your question
          <input id="ayush-question" value={question} maxLength={1000}
            onChange={event => setQuestion(event.target.value)}
            placeholder="e.g. How do I share a report with my doctor?" />
        </label>
        <button className="health-button health-button-primary" type="submit"
          disabled={mutation.busy || !question.trim()} style={{ minHeight: 44 }}>
          <Send size={16} aria-hidden="true" />{mutation.busy ? 'Asking…' : 'Ask Ayush'}
        </button>
      </form>

      {thread.length === 0 && <div className="wf-choice-row" style={{ marginTop: 14 }}
        aria-label="Example questions">
        {STARTERS.map(starter => <button key={starter} type="button" style={{ minHeight: 44 }}
          onClick={() => send(starter)}>{starter}</button>)}
      </div>}
    </section>

    {history.data?.items.length ? <section className="wf-card wf-section-gap">
      <div className="wf-panel-heading"><div>
        <span className="care-eyebrow">EARLIER QUESTIONS</span>
        <h3>Your past conversations</h3>
        <p>Only you can see these.</p>
      </div></div>
      <div className="wf-order-list">
        {history.data.items.slice(-5).reverse().map(turn => <div className="wf-order-line" key={turn.id}>
          <div>
            <strong>{turn.question}</strong>
            <small>{turn.outcome === 'ANSWERED' ? 'Answered from an approved source'
              : REFUSAL_NOTE[turn.outcome] || 'Support offered'}</small>
          </div>
        </div>)}
      </div>
    </section> : null}
  </>;
}
