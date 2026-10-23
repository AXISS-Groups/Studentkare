import React, { useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { useOnline } from '@/design-system';
import { navigate } from '@/lib/utils/workflowRouting';
import { AyushAnswer } from '@/features/ayush/AyushAnswer';
import { AYUSH_MAX_QUESTION, AYUSH_STARTERS, useAyushConversation } from '@/features/ayush/useAyushConversation';
import { PageHead } from '../parts';
import { CrisisLine } from './shared';
import '../../studentweb.css';
import './t1web.css';

/** What the server refuses before or after retrieval (agent_ayush.py: scope guard, vault boundary, grounding floor). */
const LIMITS: ReadonlyArray<{ title: MessageKey; meta: MessageKey }> = [
  { title: 'swt.ayush.limit.diagnose', meta: 'swt.ayush.limit.diagnoseMeta' },
  { title: 'swt.ayush.limit.prescribe', meta: 'swt.ayush.limit.prescribeMeta' },
  { title: 'swt.ayush.limit.vault', meta: 'swt.ayush.limit.vaultMeta' },
  { title: 'swt.ayush.limit.source', meta: 'swt.ayush.limit.sourceMeta' },
];

/**
 * Ayush, full page (canvas 3b, WebAyush, Tier 1 — approved by Krishna
 * Chintakayala, 2026-10-21). Drawn without the sidebar, as on the board.
 * Answers, citations, the relevance floor, crisis interception and refusals
 * are the server's and unchanged (POST /agents/ayush/ask).
 *
 * Not drawn, on purpose: "Index current" (the index status is an ops-only
 * endpoint, D9-5) and citation relevance scores (a number students can't use,
 * D9-5). The transcript line says what the server really does: turns are kept
 * only when the student turned history on, and erasing the account erases them.
 */
export function WebAyushView() {
  const t = useT();
  const online = useOnline();
  const { turns, busy, failed, ask } = useAyushConversation();
  const [question, setQuestion] = useState('');
  const [lastAsked, setLastAsked] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (turns.length) end.current?.scrollIntoView?.({ block: 'end' }); }, [turns.length]);

  const send = (text: string) => {
    if (!text.trim() || !online) return;
    setLastAsked(text);
    setQuestion('');
    void ask(text);
  };

  return (
    <div className="sk-sw-page" data-testid="web-ayush">
      <div className="sk-swt-ayush">
        <div className="sk-swt-col">
          <PageHead title={t('swt.ayush.title')} sub={t('swt.ayush.sub')} />
          <section className="sk-sw-card sk-swt-chat" aria-label={t('assist.ayush.conversationLabel')}>
            <div className="sk-swt-thread" aria-live="polite">
              {turns.length === 0 ? <p className="sk-sw-muted">{t('swt.ayush.empty')}</p> : null}
              {turns.map((turn) => <AyushAnswer key={turn.id} turn={turn} />)}
              {busy ? <p className="sk-sw-muted" role="status">{t('assist.ayush.asking')}</p> : null}
              {failed ? (
                <p className="sk-sw-error" role="alert">
                  {t('swt.ayush.failed')}{' '}
                  <button type="button" className="sk-sw-link" onClick={() => send(lastAsked)}>{t('common.tryAgain')}</button>
                </p>
              ) : null}
              {!online ? <p className="sk-sw-note" role="status">{t('swt.ayush.offline')}</p> : null}
              <div ref={end} />
            </div>
            <span className="sk-sw-eyebrow">{t('swt.ayush.try')}</span>
            <div className="sk-sw-tabs" role="group" aria-label={t('assist.ayush.examples')}>
              {AYUSH_STARTERS.map((starter) => (
                <button key={starter} type="button" className="sk-sw-tab" disabled={busy || !online} onClick={() => send(t(starter))}>{t(starter)}</button>
              ))}
            </div>
            <form className="sk-swt-ask" onSubmit={(event) => { event.preventDefault(); send(question); }}>
              <label htmlFor="sk-swt-ayush-q" className="sk-visually-hidden">{t('assist.ayush.questionLabel')}</label>
              <input id="sk-swt-ayush-q" value={question} maxLength={AYUSH_MAX_QUESTION} placeholder={t('swt.ayush.placeholder')} onChange={(event) => setQuestion(event.target.value)} />
              <button type="submit" className="sk-swt-send" aria-label={t('assist.ayush.ask')} disabled={busy || !question.trim() || !online}>
                <Icon name="arrow-right" size={19} />
              </button>
            </form>
            <CrisisLine />
          </section>
        </div>
        <aside className="sk-swt-col" aria-label={t('swt.ayush.limitsTitle')}>
          <span className="sk-sw-eyebrow">{t('swt.ayush.limitsTitle')}</span>
          <ul className="sk-swt-limits">
            {LIMITS.map((limit) => (
              <li key={limit.title}>
                <span className="sk-swt-limits__icon" aria-hidden="true"><Icon name="lock-4" size={15} /></span>
                <span><strong>{t(limit.title)}</strong><small>{t(limit.meta)}</small></span>
              </li>
            ))}
          </ul>
          <section className="sk-swt-transcript" aria-labelledby="sk-swt-transcript-title">
            <span id="sk-swt-transcript-title" className="sk-sw-eyebrow">{t('swt.ayush.transcriptTitle')}</span>
            <p>{t('swt.ayush.transcriptBody')}</p>
            <button type="button" className="sk-sw-link" onClick={() => navigate('permissions')}>{t('swt.ayush.manage')}</button>
          </section>
          <section className="sk-sw-card sk-swt-side" aria-labelledby="sk-swt-talk-title">
            <h2 id="sk-swt-talk-title" className="sk-sw-card__title">{t('swt.ayush.personTitle')}</h2>
            <p className="sk-sw-muted">{t('swt.ayush.personBody')}</p>
            <a className="sk-sw-btn sk-sw-btn--outline" href="tel:14416" aria-label={t('swt.crisis.callTelemanas')}><Icon name="phone-2" size={17} />{t('swt.ayush.callTelemanas')}</a>
          </section>
        </aside>
      </div>
    </div>
  );
}
