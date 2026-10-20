import React from 'react';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import './staff-camp-fast.css';

/**
 * StaffCampFast — the staff app's camp fast mode (design page 6, Tier 2,
 * phone board).
 *
 * The board is a scanner that checks a camp's students in one after another
 * (pass scan, live photo match, sample label) and syncs later. None of that is
 * connected: there is no staff-side camp check-in endpoint (POST
 * /camps/{id}/check-in is the student's own), no camp is assigned to a staff
 * device, and nothing is stored offline. So every count reads "—", the scanner
 * says it isn't connected, both buttons are unavailable, and the list of last
 * check-ins is empty — never sample students. The one working way to check a
 * student at the counter, Verify student, is offered instead.
 */
const STEPS = ['scan', 'photo', 'sample'] as const;
const TILES = ['stopped', 'manual', 'sync'] as const;

export function StaffCampFastScreen({ onNavigate }: { onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const t = useT();
  return (
    <div className="scf-root">
      <main className="sk-ds scf" aria-labelledby="scf-title">
        <header className="scf-head">
          <button type="button" className="scf-back" aria-label={t('pc.fast.back')} onClick={() => onNavigate('camp-intake')}>
            <Icon name="chevron-left" size={22} strokeWidth={2.2} />
          </button>
          <span className="scf-head__words">
            <h1 id="scf-title" className="scf-title">{t('pc.fast.title')}</h1>
            <span className="scf-sub">{t('pc.fast.noCamp')}</span>
          </span>
        </header>

        <section className="scf-count" aria-label={t('pc.fast.countLabel')}>
          <span className="scf-count__main">
            <span className="scf-count__value">—</span>
            <span className="scf-count__label">{t('pc.fast.checkedIn')}</span>
          </span>
          <span className="scf-count__side">
            <span className="scf-count__pace">—</span>
            <span className="scf-count__label">{t('pc.fast.perStudent')}</span>
          </span>
        </section>
        <span className="scf-track" aria-hidden="true" />

        <dl className="scf-tiles">
          {TILES.map((id) => (
            <div key={id} className="scf-tile">
              <dt className="scf-tile__label">{t(`pc.fast.tile.${id}`)}</dt>
              <dd className="scf-tile__value">—</dd>
            </div>
          ))}
        </dl>

        <div className="scf-scanner" role="status">
          <span className="scf-scanner__line" aria-hidden="true" />
          <span className="scf-scanner__pill">{t('pc.notConnected')}</span>
        </div>

        <ul className="scf-steps" aria-label={t('pc.camp.stepsLabel')}>
          {STEPS.map((step) => <li key={step}><Icon name="check" size={14} strokeWidth={2.6} />{t(`pc.camp.step.${step}`)}</li>)}
        </ul>

        <div className="scf-actions">
          <button type="button" className="scf-primary" disabled aria-describedby="scf-why">{t('pc.fast.scanNext')}</button>
          <button type="button" className="scf-stop" disabled aria-describedby="scf-why">{t('pc.fast.stopOne')}</button>
        </div>

        <section className="scf-last" aria-labelledby="scf-last-title">
          <h2 id="scf-last-title" className="scf-eyebrow">{t('pc.fast.last')}</h2>
          <p className="scf-empty">{t('pc.fast.lastEmpty')}</p>
        </section>

        <p id="scf-why" className="scf-foot">{t('pc.fast.why')}</p>
        <button type="button" className="scf-verify" onClick={() => onNavigate('scan-verify')}>{t('pc.fast.useVerify')}</button>
      </main>
    </div>
  );
}
