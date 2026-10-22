import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, LifeBuoy, PhoneCall, Send, ShieldCheck } from 'lucide-react';
import { useApiResource } from '../../hooks/api/useApiResource';
import { apiRequest } from '../../data/services/http';
import { FormError, useMutation } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { ayushCategoryLabel } from '@/features/ayush/useAyushConversation';
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
const REFUSAL_NOTE: Partial<Record<Outcome, MessageKey>> = {
  NO_SOURCE: 'assist.ayush.refusal.noSource',
  REFUSED_SCOPE: 'assist.ayush.refusal.scope',
  REFUSED_PERSONAL: 'assist.ayush.refusal.personal',
  REFUSED_OUTPUT: 'assist.ayush.refusal.output',
};

const STARTERS: readonly MessageKey[] = [
  'assist.ayush.starter.book',
  'assist.ayush.starter.share',
  'assist.ayush.starter.verify',
];

function RefusalNote({ outcome }: { outcome: Outcome }) {
  const t = useT();
  const note = REFUSAL_NOTE[outcome];
  if (!note) return null;
  return <div className="wf-notice" role="status" style={{ borderColor: 'var(--attention)', marginTop: 10 }}>
    <AlertTriangle size={16} aria-hidden="true" />{t(note)}
  </div>;
}

export function AgentAyushPanel() {
  const t = useT();
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
      <span className="care-eyebrow">{t('assist.ayush.eyebrow')}</span>
      <h2>{t('assist.ayush.title')}</h2>
      <p>{t('assist.ayush.intro')}</p>
    </div></div>

    <FormError message={mutation.error} />

    <section className="wf-card" aria-live="polite" aria-label={t('assist.ayush.conversationLabel')}>
      {thread.length === 0 && <div className="wf-notice" role="status" style={{ marginBottom: 16 }}>
        <ShieldCheck size={18} aria-hidden="true" />
        {t('assist.ayush.sourceNote')}
      </div>}

      {thread.map(({ q, reply }, index) => <article key={`${conversationId}-${index}`}
        style={{ marginBottom: 22 }}>
        <p style={{ fontWeight: 600, marginBottom: 10 }}>{q}</p>

        {reply.outcome === 'CRISIS' && reply.crisis ? (
          <div role="alert" className="wf-card" style={{ border: '2px solid var(--emergency)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LifeBuoy size={20} aria-hidden="true" />{t('assist.crisis.notAlone')}
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.8 }}>{reply.answer}</p>
            <div className="wf-order-list">
              {reply.crisis.resources.map(resource => <div className="wf-order-line"
                key={`${resource.label}-${resource.number}`}>
                <div><strong>{resource.label}</strong><small>{resource.detail}</small></div>
                <a className="health-button health-button-primary" style={{ minHeight: 44, minWidth: 44 }}
                  href={`tel:${resource.number.replace(/[^\d+]/g, '')}`}
                  aria-label={t('assist.crisis.callSpoken', { label: resource.label, number: resource.number })}>
                  <PhoneCall size={16} aria-hidden="true" />{resource.number}
                </a>
              </div>)}
            </div>
          </div>
        ) : <>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.8 }}>{reply.answer}</p>

          <RefusalNote outcome={reply.outcome} />

          {reply.citations.length > 0 && <div style={{ marginTop: 12 }}>
            <span className="care-eyebrow">
              {t(reply.citations.length === 1 ? 'assist.ayush.sourceOne' : 'assist.ayush.sourceOther')}
            </span>
            <div className="wf-order-list">
              {reply.citations.map(citation => <div className="wf-order-line" key={citation.sourceId}>
                <div>
                  <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BookOpen size={15} aria-hidden="true" />{citation.title}
                  </strong>
                  <small>{t('assist.ayush.citationMeta', { category: ayushCategoryLabel(citation.category, t), version: citation.version })}</small>
                  <p style={{ fontSize: 12 }}>{citation.snippet}…</p>
                  {citation.stale && <small style={{ color: 'var(--attention)' }}>
                    {t('assist.ayush.stale')}
                  </small>}
                </div>
              </div>)}
            </div>
          </div>}
        </>}
      </article>)}

      <div ref={foot} />

      <form className="wf-form" onSubmit={event => { event.preventDefault(); send(question); }}>
        <label className="wf-field" htmlFor="ayush-question">{t('assist.ayush.questionLabel')}
          <input id="ayush-question" value={question} maxLength={1000}
            onChange={event => setQuestion(event.target.value)}
            placeholder={t('assist.ayush.questionPlaceholder')} />
        </label>
        <button className="health-button health-button-primary" type="submit"
          disabled={mutation.busy || !question.trim()} style={{ minHeight: 44 }}>
          <Send size={16} aria-hidden="true" />{mutation.busy ? t('assist.ayush.asking') : t('assist.ayush.ask')}
        </button>
      </form>

      {thread.length === 0 && <div className="wf-choice-row" style={{ marginTop: 14 }}
        aria-label={t('assist.ayush.examples')}>
        {STARTERS.map(starter => <button key={starter} type="button" style={{ minHeight: 44 }}
          onClick={() => send(t(starter))}>{t(starter)}</button>)}
      </div>}
    </section>

    {history.data?.items.length ? <section className="wf-card wf-section-gap">
      <div className="wf-panel-heading"><div>
        <span className="care-eyebrow">{t('assist.ayush.historyEyebrow')}</span>
        <h3>{t('assist.ayush.historyTitle')}</h3>
        <p>{t('assist.ayush.historyPrivate')}</p>
      </div></div>
      <div className="wf-order-list">
        {history.data.items.slice(-5).reverse().map(turn => <div className="wf-order-line" key={turn.id}>
          <div>
            <strong>{turn.question}</strong>
            <small>{t(turn.outcome === 'ANSWERED' ? 'assist.ayush.historyAnswered'
              : REFUSAL_NOTE[turn.outcome] ?? 'assist.ayush.historySupport')}</small>
          </div>
        </div>)}
      </div>
    </section> : null}
  </>;
}
