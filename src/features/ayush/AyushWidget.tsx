import React, { useEffect, useId, useRef, useState } from 'react';
import { useT } from '@/i18n';
import { Glyph, Icon } from '@/design-system/icons';
import { useOnline } from '@/design-system';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { AyushAnswer } from './AyushAnswer';
import { AYUSH_MAX_QUESTION, AYUSH_STARTERS, useAyushConversation } from './useAyushConversation';
import './ayush.css';

/**
 * Pages the widget is never drawn on (D9-6): the crisis and SOS pages, the
 * emergency card, checkout and sign-in — and Ayush's own page.
 */
export const AYUSH_WIDGET_HIDDEN: ReadonlySet<RoutePath> = new Set<RoutePath>([
  'sos', 'emergency-card', 'checkout', 'login', 'signup', 'welcome', 'ayush', 'medical-incident',
]);

export function ayushWidgetShownOn(route: RoutePath): boolean {
  return !AYUSH_WIDGET_HIDDEN.has(route) && !String(route).startsWith('crisis');
}

/**
 * Ayush, floating (canvas 8, AyushWidget, Tier 1 — approved by Krishna
 * Chintakayala, 2026-10-21). A launcher in the corner and a 420 × 680 panel:
 * a non-modal dialog on wide screens (the page stays usable), a modal sheet on
 * narrow ones (D9-6). The emergency line is in the panel in every state.
 * Behaviour is the server's (useAyushConversation); this is the container.
 * The launcher sits bottom-right, clear of the shell's SOS button (top bar).
 */
export function AyushWidget() {
  const t = useT();
  const online = useOnline();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const { turns, busy, failed, ask, reset } = useAyushConversation();

  const close = () => { setOpen(false); launcher.current?.focus(); };

  useEffect(() => {
    if (!open) return undefined;
    input.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); launcher.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  useEffect(() => { body.current?.scrollTo?.({ top: body.current.scrollHeight }); }, [turns.length, busy]);

  const send = (text: string) => {
    if (!text.trim() || !online) return;
    setQuestion('');
    void ask(text);
  };

  return (
    <div className={`sk-ayw${open ? ' is-open' : ''}`} data-testid="ayush-widget">
      {open ? <div className="sk-ayw__scrim" aria-hidden="true" onClick={close} /> : null}
      {open ? (
        <section className="sk-ayw__panel" role="dialog" aria-modal="false" aria-labelledby={titleId}>
          <header className="sk-ayw__head">
            <Glyph name="ayush-orb-2" size={40} />
            <div className="sk-ayw__title">
              <h2 id={titleId}>{t('swt.ayw.title')} <span className="sk-ayw__beta">{t('swt.ayw.beta')}</span></h2>
              <span className="sk-ayw__status"><span className={`sk-ayw__dot${online ? '' : ' is-off'}`} aria-hidden="true" />{online ? t('swt.ayw.ready') : t('swt.ayw.offline')}</span>
            </div>
            <button type="button" className="sk-ayw__headbtn" onClick={() => { reset(); input.current?.focus(); }}>{t('swt.ayw.new')}</button>
            <button type="button" className="sk-ayw__headbtn" aria-label={t('swt.ayw.close')} onClick={close}><Icon name="x" size={18} /></button>
          </header>
          <p className="sk-ayw__intro">{t('swt.ayw.intro')}</p>
          <div className="sk-ayw__body" ref={body} aria-live="polite">
            <div className="sk-ayw__hello">
              <Glyph name="ayush-orb" size={26} />
              <div className="sk-ay-a"><p>{t('swt.ayw.hello')}</p></div>
            </div>
            {turns.length === 0 ? (
              <div className="sk-ayw__chips" role="group" aria-label={t('assist.ayush.examples')}>
                {AYUSH_STARTERS.map((starter) => (
                  <button key={starter} type="button" className="sk-ayw__chip" disabled={busy || !online} onClick={() => send(t(starter))}>{t(starter)}</button>
                ))}
              </div>
            ) : null}
            {turns.map((turn) => <AyushAnswer key={turn.id} turn={turn} onRoute={() => setOpen(false)} />)}
            {busy ? <p className="sk-ayw__state" role="status">{t('assist.ayush.asking')}</p> : null}
            {failed ? <p className="sk-ayw__state is-error" role="alert">{t('swt.ayush.failed')}</p> : null}
            {!online ? <p className="sk-ayw__state" role="status">{t('swt.ayush.offline')}</p> : null}
          </div>
          <form className="sk-ayw__form" onSubmit={(event) => { event.preventDefault(); send(question); }}>
            <label htmlFor={`${titleId}-q`} className="sk-visually-hidden">{t('assist.ayush.questionLabel')}</label>
            <input id={`${titleId}-q`} ref={input} value={question} maxLength={AYUSH_MAX_QUESTION} placeholder={t('swt.ayw.placeholder')} onChange={(event) => setQuestion(event.target.value)} />
            <button type="submit" className="sk-ayw__send" aria-label={t('assist.ayush.ask')} disabled={busy || !question.trim() || !online}><Icon name="arrow-up" size={19} /></button>
          </form>
          <p className="sk-ayw__emergency">
            {t('swt.ayw.emergency')} <a href="tel:112" aria-label={t('swt.crisis.call112')}>112</a>{' · '}{t('swt.crisis.telemanas')} <a href="tel:14416" aria-label={t('swt.crisis.callTelemanas')}>14416</a>{' · '}{t('swt.crisis.free')}
          </p>
        </section>
      ) : null}
      <button
        ref={launcher}
        type="button"
        className="sk-ayw__launcher"
        aria-label={open ? t('swt.ayw.close') : t('swt.ayw.open')}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? <Icon name="x" size={24} /> : <span className="sk-ayw__pulse"><Glyph name="ayush-orb-3" size={56} /></span>}
      </button>
    </div>
  );
}
