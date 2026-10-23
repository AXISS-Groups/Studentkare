import React, { useEffect, useState } from 'react';
import { Icon } from '@/design-system/icons';
import { useAuth } from '@/data/contexts/AuthContext';
import { useT } from '@/i18n';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { bindCounter, useCounterSession } from '@/features/partner/work/counterSession';
import type { VisitContext } from '@/features/partner/work/counterSession';
import { CONTEXT_COPY, VISIT_CONTEXTS, VerifyFlow } from '@/features/partner/work/VerifyFlow';
import type { VerifyCall } from '@/features/partner/work/VerifyFlow';
import { clockTime } from '@/features/partner/work/workCopy';
import '@/features/partner/work/verify-flow.css';

/**
 * WebScanVerify — the counter / reception check (design page 6, Tier 1, approved 2026-10-21).
 *
 * The counter tablet layout of the shared check (VerifyFlow): navy header with
 * the visit type, the check on the left, and on the right this session's
 * checks on this device and the rules at the counter. "Today at this counter"
 * needs a per-counter verify log the server does not keep, so the list is this
 * tab's session only and says so. After a match, "continue" opens the page
 * where the next step happens (handover, run sheet, clinic, camp).
 */

const NEXT: Record<VisitContext, RoutePath> = { pharmacy: 'handover', lab: 'run-sheet', clinic: 'vendor', camp: 'camp-intake' };

export interface WebScanVerifyScreenProps {
  verify?: VerifyCall;
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export function WebScanVerifyScreen({ verify, onNavigate }: WebScanVerifyScreenProps) {
  const t = useT();
  const { user } = useAuth();
  const session = useCounterSession();
  const [context, setContext] = useState<VisitContext>('pharmacy');
  useEffect(() => { bindCounter(user?.id ?? ''); }, [user?.id]);
  const go = (route: RoutePath) => (onNavigate ? onNavigate(route) : navigate(route));

  return (
    <div className="sk-ds vf-page">
      <header className="vf-page__bar">
        <span className="vf-page__words">
          <h1 className="vf-page__title">{t('partner.vsub.scan.title')}</h1>
          <span className="vf-page__sub">{user?.fullName ? t('partner.vsub.scan.counterFor', { name: user.fullName }) : t('partner.vsub.scan.counter')}</span>
        </span>
        <ContextPills value={context} onChange={setContext} />
      </header>
      <main className="vf-page__grid">
        <section className="vf-page__main" aria-label={t('pt.vf.checkLabel')}>
          <VerifyFlow layout="counter" context={context} verify={verify} onContinue={(chosen) => go(NEXT[chosen])} />
        </section>
        <aside className="vf-page__side" aria-label={t('pt.vf.sideLabel')}>
          <section className="vf-log" aria-labelledby="vf-log-title">
            <h2 id="vf-log-title" className="vf-side__title">{t('partner.vsub.scan.log.title')}</h2>
            {session.log.length === 0 ? <p className="vf-hint">{t('partner.vsub.scan.log.empty')}</p> : (
              <ul className="vf-log__list">
                {session.log.map((entry) => (
                  <li key={entry.id} className="vf-log__row">
                    <span className="vf-log__name">{entry.name}</span>
                    <span className="vf-log__time sk-mono">{clockTime(entry.at, 'ms')}</span>
                    <span className={`vf-log__chip vf-log__chip--${entry.outcome}`}>{entry.outcome === 'verified' ? t('partner.vsub.scan.log.verified') : t('partner.vsub.scan.log.stopped')}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="vf-hint">{t('pt.vf.logNote')}</p>
          </section>
          <section className="vf-rules" aria-labelledby="vf-rules-title">
            <h2 id="vf-rules-title" className="vf-side__title">{t('partner.vsub.scan.rules.title')}</h2>
            <ul className="vf-rules__list">
              <li><Icon name="check" size={14} strokeWidth={2.6} />{t('partner.vsub.scan.rules.noMatch')}</li>
              <li><Icon name="check" size={14} strokeWidth={2.6} />{t('partner.vsub.scan.rules.noScreenshot')}</li>
              <li><Icon name="check" size={14} strokeWidth={2.6} />{t('pt.vf.rule.noPhoto')}</li>
              <li><Icon name="check" size={14} strokeWidth={2.6} />{t('pt.vf.rule.noPhone')}</li>
            </ul>
          </section>
        </aside>
      </main>
    </div>
  );
}

/** The visit type: Pharmacy, Lab, Clinic, Camp / van (a radio group of pills). */
export function ContextPills({ value, onChange }: { value: VisitContext; onChange: (next: VisitContext) => void }) {
  const t = useT();
  return (
    <div className="vf-pills" role="radiogroup" aria-label={t('partner.vsub.scan.visitType')}>
      {VISIT_CONTEXTS.map((key) => (
        <button key={key} type="button" role="radio" aria-checked={value === key} className={`vf-pill${value === key ? ' is-on' : ''}`} onClick={() => onChange(key)}>
          {t(CONTEXT_COPY[key].pill)}
        </button>
      ))}
    </div>
  );
}
