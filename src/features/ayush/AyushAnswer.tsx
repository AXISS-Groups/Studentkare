import React, { useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { AYUSH_REFUSAL_NOTE, ayushCategoryLabel } from './useAyushConversation';
import type { AyushOutcome, AyushTurn } from './useAyushConversation';
import './ayush.css';

const BADGE: Record<AyushOutcome, { label: MessageKey; tone: 'positive' | 'attention' | 'muted' | 'danger' }> = {
  ANSWERED: { label: 'swt.ayush.badge.answered', tone: 'positive' },
  NO_SOURCE: { label: 'swt.ayush.badge.noSource', tone: 'muted' },
  REFUSED_SCOPE: { label: 'swt.ayush.badge.refused', tone: 'attention' },
  REFUSED_PERSONAL: { label: 'swt.ayush.badge.refused', tone: 'attention' },
  REFUSED_OUTPUT: { label: 'swt.ayush.badge.refused', tone: 'attention' },
  CRISIS: { label: 'swt.ayush.badge.crisis', tone: 'danger' },
  EMPTY: { label: 'swt.ayush.badge.noSource', tone: 'muted' },
};

/** Where a declined question can go instead (a person, never a product). */
const ROUTES: Partial<Record<AyushOutcome, ReadonlyArray<{ label: MessageKey; route: RoutePath }>>> = {
  REFUSED_SCOPE: [{ label: 'swt.ayush.route.clinician', route: 'care' }],
  REFUSED_OUTPUT: [{ label: 'swt.ayush.route.clinician', route: 'care' }],
  REFUSED_PERSONAL: [{ label: 'swt.ayush.route.review', route: 'care' }],
  // Not a dead end: the help centre (support) and a doctor.
  NO_SOURCE: [{ label: 'assist.ayush.noSource.help', route: 'support' }, { label: 'assist.ayush.noSource.book', route: 'care' }],
};

/**
 * One question and Ayush's reply, exactly as the server sent it: the answer,
 * its citations (only from the response), why it declined, or — for crisis
 * language — the server's helplines as call buttons.
 */
export function AyushAnswer({ turn, onRoute }: { turn: AyushTurn; onRoute?: () => void }) {
  const t = useT();
  const { reply } = turn;
  const badge = BADGE[reply.outcome] ?? BADGE.NO_SOURCE;
  const note = AYUSH_REFUSAL_NOTE[reply.outcome];
  const routes = ROUTES[reply.outcome] ?? [];
  const crisis = reply.outcome === 'CRISIS';
  const noSource = reply.outcome === 'NO_SOURCE';
  return (
    <>
      <div className="sk-ay-q">{turn.question}</div>
      <div className={`sk-ay-a${crisis ? ' is-crisis' : ''}`} role={crisis ? 'alert' : undefined}>
        <div className="sk-ay-a__meta">
          <span className={`sk-ay-badge is-${badge.tone}`}>{t(badge.label)}</span>
          {reply.outcome === 'ANSWERED' ? <span>{t('swt.ayush.grounded')}</span> : null}
        </div>
        {noSource ? <p>{t('assist.ayush.noSource.title')}</p> : <p>{reply.answer}</p>}
        {noSource ? <p className="sk-ay-a__meta">{t('assist.ayush.noSource.next')}</p> : note ? <p className="sk-ay-a__meta">{t(note)}</p> : null}
        {crisis && reply.crisis?.resources.length ? (
          <div className="sk-ay-calls">
            {reply.crisis.resources.map((resource) => (
              <a key={`${resource.label}-${resource.number}`} href={`tel:${resource.number.replace(/[^\d+]/g, '')}`} aria-label={t('assist.crisis.callSpoken', { label: resource.label, number: resource.number })}>
                <Icon name="phone-2" size={17} />{resource.label} · {resource.number}
              </a>
            ))}
          </div>
        ) : null}
        {reply.citations.map((citation) => <Citation key={citation.sourceId} title={citation.title} meta={t('assist.ayush.citationMeta', { category: ayushCategoryLabel(citation.category, t), version: citation.version })} snippet={citation.snippet} stale={citation.stale} />)}
        {routes.map((route) => (
          <button key={route.route} type="button" className="sk-ay-route" onClick={() => { onRoute?.(); navigate(route.route); }}>
            {t(route.label)}<Icon name="arrow-right" size={15} />
          </button>
        ))}
      </div>
    </>
  );
}

function Citation({ title, meta, snippet, stale }: { title: string; meta: string; snippet: string; stale: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div className="sk-ay-cite">
      <div className="sk-ay-cite__row">
        <Icon name="file-2" size={17} />
        <span className="sk-ay-cite__text"><strong>{title}</strong><small>{meta}</small></span>
        <button type="button" className="sk-ay-cite__open" aria-expanded={open} aria-label={t('swt.ayush.openSource', { title })} onClick={() => setOpen(!open)}>
          {open ? t('swt.ayush.closeSource') : t('swt.ayush.open')}
        </button>
      </div>
      {open ? <p className="sk-ay-cite__snippet">{snippet}…</p> : null}
      {stale ? <span className="sk-ay-stale">{t('assist.ayush.stale')}</span> : null}
    </div>
  );
}
