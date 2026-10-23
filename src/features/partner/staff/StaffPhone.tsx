import React from 'react';
import { Icon } from '@/design-system/icons';
import { SkButton } from '@/design-system/primitives';
import { useT } from '@/i18n';
import type { CounterVerification } from '@/features/partner/work/counterSession';
import { clockTime, initials } from '@/features/partner/work/workCopy';
import './staff-app.css';

/**
 * The staff app's phone frame (WP-15 phone boards: ScanVerify, StaffHandover,
 * StaffCollect), drawn as a web phone route at ≤ 430 px. There is no Expo staff
 * app yet (approved decision 12.1): staff sign in to the partner console and
 * open these routes on their phone.
 */
export function StaffPhone({ title, subtitle, onBack, backLabel, headerExtra, footer, children, labelledBy = 'sa-title' }: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel: string;
  headerExtra?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  labelledBy?: string;
}): React.ReactElement {
  return (
    <div className="sa-root">
      <div className="sk-ds sa-phone">
        <header className="sa-head">
          <div className="sa-head__row">
            <button type="button" className="sa-back" aria-label={backLabel} onClick={onBack}>
              <Icon name="chevron-left" size={22} strokeWidth={2.2} />
            </button>
            <span className="sa-head__words">
              <h1 id={labelledBy} className="sa-title">{title}</h1>
              {subtitle ? <span className="sa-sub">{subtitle}</span> : null}
            </span>
          </div>
          {headerExtra}
        </header>
        <main className="sa-body" aria-labelledby={labelledBy}>{children}</main>
        {footer ? <footer className="sa-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

/** "Verified 4:12 pm · matched by you", with Re-check; or the way to verify first. */
export function VerifiedBanner({ current, onRecheck }: { current: CounterVerification | null; onRecheck: () => void }): React.ReactElement {
  const t = useT();
  if (!current) {
    return (
      <section className="sa-verified is-missing" aria-labelledby="sa-verified-title">
        <span className="sa-verified__words">
          <span id="sa-verified-title" className="sa-verified__name">{t('pt.sa.notVerified')}</span>
          <span className="sa-verified__meta">{t('pt.sa.notVerifiedBody')}</span>
        </span>
        <SkButton onClick={onRecheck}>{t('pt.sa.verifyFirst')}</SkButton>
      </section>
    );
  }
  return (
    <section className="sa-verified" aria-labelledby="sa-verified-title">
      <span className="sa-verified__avatar" aria-hidden="true">
        {initials(current.fullName)}
        <span className="sa-verified__tick"><Icon name="check" size={11} strokeWidth={3} /></span>
      </span>
      <span className="sa-verified__words">
        <span id="sa-verified-title" className="sa-verified__name">{current.fullName}</span>
        <span className="sa-verified__meta"><Icon name="check" size={13} strokeWidth={2.6} />{t('pt.sa.verifiedAt', { time: clockTime(current.verifiedAt, 'ms') })}</span>
      </span>
      <button type="button" className="sa-recheck" onClick={onRecheck}>{t('pt.sa.recheck')}</button>
    </section>
  );
}
