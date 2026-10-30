import React, { useEffect, useId, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import { Glyph, Icon } from '@/design-system/icons';
import { EMERGENCY_NUMBER, TELE_MANAS_NUMBER, useOnline } from '@/design-system';
import { space } from '@/design-system/theme';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { navigate } from '@/lib/utils/workflowRouting';
import { AyushViewModel } from '@/features/chat/viewmodel/AyushViewModel';
import { AyushThread } from '@/features/chat/views/AyushThread';
import './ayush.css';

/**
 * Pages the widget is never drawn on (D9-6): the crisis and SOS pages, the
 * emergency card, checkout and sign-in — and Ayush's own page.
 */
const AYUSH_WIDGET_HIDDEN: ReadonlySet<RoutePath> = new Set<RoutePath>([
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
 * The launcher sits bottom-right, clear of the shell's SOS button (top bar).
 *
 * Inside the panel it draws the Ask Ayush conversation (AyushThread: bubbles,
 * the server's crisis card, chips, the Tele-MANAS strip) on the same
 * AyushViewModel as the Ask Ayush page, so a crisis reply looks the same in
 * both (Tier 1 parity plan 2026-10-24 §10).
 */
export const AyushWidget = observer(function AyushWidget() {
  const t = useT();
  const online = useOnline();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [vm] = useState(() => new AyushViewModel());
  const launcher = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);

  const close = () => { setOpen(false); launcher.current?.focus(); };
  // The question field is the thread's own input; focus it where it is drawn.
  const focusInput = () => body.current?.querySelector<HTMLInputElement>('input')?.focus();

  useEffect(() => {
    if (!open) return undefined;
    focusInput();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); launcher.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const turns = vm.thread.length;
  useEffect(() => { body.current?.scrollTo?.({ top: body.current.scrollHeight }); }, [turns, vm.sending]);

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
            <button type="button" className="sk-ayw__headbtn" onClick={() => { vm.newConversation(); focusInput(); }}>{t('swt.ayw.new')}</button>
            <button type="button" className="sk-ayw__headbtn" aria-label={t('swt.ayw.close')} onClick={close}><Icon name="x" size={18} /></button>
          </header>
          <p className="sk-ayw__intro"><Glyph name="ayush-orb" size={22} /><span>{t('swt.ayw.intro')}</span></p>
          <div className="sk-ayw__body" ref={body}>
            {!online ? <p className="sk-ayw__state" role="status">{t('swt.ayush.offline')}</p> : null}
            <AyushThread vm={vm} online={online} inset={space.s16} sendIcon="arrow-up" wide
              links={{ help: () => { setOpen(false); navigate('support'); }, book: () => { setOpen(false); navigate('care'); } }} />
          </div>
          <p className="sk-ayw__emergency">
            {t('swt.ayw.emergency')} <a href={`tel:${EMERGENCY_NUMBER}`} aria-label={t('swt.crisis.call112')}>{EMERGENCY_NUMBER}</a>{' · '}{t('swt.crisis.telemanas')} <a href={`tel:${TELE_MANAS_NUMBER}`} aria-label={t('swt.crisis.callTelemanas')}>{TELE_MANAS_NUMBER}</a>{' · '}{t('swt.crisis.free')}
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
});
