import React from 'react';
import { ConsolePageHeader } from '@/design-system/console/ConsoleTablePage';
import { StatRow } from '@/design-system/data/DataTable';
import type { Stat } from '@/design-system/data/DataTable';
import { Icon, Icon3d } from '@/design-system/icons';
import { useAuth } from '@/data/contexts/AuthContext';
import { useLanguage, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { CAMPUS_MIN_GROUP } from './boardKit';
import './campus-boards.css';

/** Category counts a campus is never sent, at any cohort size. */
const NEVER_REPORTED: readonly MessageKey[] = ['campusBoards.aggregate.never.mental', 'campusBoards.aggregate.never.sexual'];

/**
 * Campus health, in aggregate (design page 4, CampusAdminConsole; Tier 3).
 * No aggregate endpoint exists: seats, consults and lab bookings are not
 * counted per campus anywhere, so those tiles and the care-category bars are
 * "not connected" and the "what you can act on" insight is left out. Two parts
 * hold whatever is connected: crisis-line volume is never reported to a campus,
 * and mental and sexual health categories are never counted for one. The floor
 * shown is the console's k-anonymity floor (boardKit CAMPUS_MIN_GROUP).
 */
export function CampusAggregateScreen(): React.ReactElement {
  const t = useT();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const campus = user?.role === 'SUPER_ADMIN' ? t('campusShell.allCampuses') : user?.university.trim() || t('campusShell.noCampus');
  const month = new Date().toLocaleDateString(lang === 'en' ? 'en-IN' : `${lang}-IN`, { month: 'long', year: 'numeric' });

  const stats: Stat[] = [
    { label: t('campusBoards.aggregate.stat.seats'), value: null, meta: t('campusBoards.notConnectedShort') },
    { label: t('campusBoards.aggregate.stat.consults'), value: null, meta: t('campusBoards.notConnectedShort') },
    { label: t('campusBoards.aggregate.stat.labs'), value: null, meta: t('campusBoards.notConnectedShort') },
    { label: t('campusBoards.aggregate.stat.crisis'), value: null, meta: t('campusBoards.aggregate.stat.crisisMeta') },
  ];

  return (
    <div className="sk-ds cb-board">
      <ConsolePageHeader
        title={t('campusBoards.aggregate.title')}
        subtitle={t('campusBoards.aggregate.subtitle', { campus, month, floor: CAMPUS_MIN_GROUP })}
        actions={(
          <span className="cb-lock-chip">
            <Icon name="lock-4" size={15} strokeWidth={2} />
            {t('campusBoards.aggregate.noRecords')}
          </span>
        )}
      />
      <div className="cb-agg-stats"><StatRow stats={stats} /></div>
      <div className="cb-two">
        <section className="sk-card cb-bars" aria-labelledby="cb-bars-title">
          <span className="sk-card__titles">
            <h2 id="cb-bars-title" className="sk-card__title">{t('campusBoards.aggregate.bars.title')}</h2>
            <p className="sk-card__subtitle">{t('campusBoards.aggregate.bars.subtitle')}</p>
          </span>
          <div className="cb-bars__empty">
            <Icon3d name="chart-alt--p4" size={88} />
            <strong>{t('campusBoards.aggregate.bars.offTitle')}</strong>
            <span>{t('campusBoards.aggregate.bars.offBody')}</span>
          </div>
        </section>
        <div className="cb-stack">
          <section className="sk-card" aria-labelledby="cb-never-title">
            <h2 id="cb-never-title" className="cb-eyebrow">{t('campusBoards.aggregate.never.title')}</h2>
            <ul className="cb-locked">
              {NEVER_REPORTED.map((key) => (
                <li key={key}>
                  <span className="cb-locked__icon" aria-hidden="true"><Icon name="lock-4" size={14} strokeWidth={2} /></span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="cb-why" aria-labelledby="cb-why-title">
            <h2 id="cb-why-title" className="cb-eyebrow cb-eyebrow--action">{t('campusBoards.aggregate.why.title')}</h2>
            <p>{t('campusBoards.aggregate.why.body', { floor: CAMPUS_MIN_GROUP })}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
