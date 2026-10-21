import React from 'react';
import { ConsolePageHeader } from '@/design-system/console/ConsoleTablePage';
import { StatRow } from '@/design-system/data/DataTable';
import { Icon } from '@/design-system/icons';
import { SkButton } from '@/design-system/primitives';
import { useT } from '@/i18n';
import { CAMPUS_MIN_GROUP, NotConnected, Unavailable, goTo } from '@/features/campus/boards/boardKit';
import { OfflineNotice, SafetyCard } from './safetyKit';
import '@/features/campus/boards/campus-boards.css';
import './campus-safety.css';

/**
 * Health insights (design page 4, CampusInsights; Tier 1, approved 2026-10-21).
 *
 * Cohort aggregates only. No server endpoint returns them yet, so the board
 * draws its real layout with every figure as "—", each panel saying it is not
 * connected, and the export disabled. Never a sample share, band or count.
 *
 * When an endpoint exists it must suppress server-side: the client never
 * receives a group under the floor and never computes one. The floor shown
 * here is the console's one k-anonymity value (`CAMPUS_MIN_GROUP`), never the
 * picture's number. Band labels are not drawn until the band wording is
 * decided (see the plan's decisions): no "Obese" or "Stage 2" on screen.
 *
 * Only "Whole cohort" is offered: no year or branch cohort has a source.
 */
const BOARD_STATS = [
  'campusSafety.insights.stat.screened',
  'campusSafety.insights.stat.vaccinated',
  'campusSafety.insights.stat.bp',
  'campusSafety.insights.stat.eye',
] as const;

export function CampusInsightsScreen(): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-ds cs-board">
      <ConsolePageHeader
        title={t('campusSafety.insights.title')}
        subtitle={t('campusSafety.insights.subtitle')}
        actions={(
          <SkButton variant="secondary" disabled><Icon name="download-2" size={17} />
            {t('campusSafety.insights.export')}
            <Unavailable reason="campusSafety.insights.exportUnavailable" />
          </SkButton>
        )}
      />
      <OfflineNotice />

      <div className="cs-cohorts">
        <span className="cs-cohorts__label" id="insights-cohort">{t('campusSafety.insights.cohort')}</span>
        <div className="cb-chips" role="group" aria-labelledby="insights-cohort">
          <button type="button" className="cb-chip is-on" aria-pressed="true">{t('campusSafety.insights.cohortAll')}</button>
        </div>
        <span className="cs-cohorts__n">{t('campusSafety.insights.nUnknown')}</span>
      </div>
      <p className="cs-cohorts__note">{t('campusSafety.insights.cohortNote')}</p>

      <StatRow
        stats={BOARD_STATS.map((key) => ({ label: t(key), value: null }))}
      />

      <div className="cb-unconnected" role="note">
        <span className="cb-unconnected__icon" aria-hidden="true"><Icon name="bar-chart" size={20} strokeWidth={1.9} /></span>
        <span className="cb-unconnected__text">
          <strong>{t('campusSafety.insights.unconnectedTitle')}</strong>
          <span>{t('campusSafety.insights.unconnectedBody', { floor: CAMPUS_MIN_GROUP })}</span>
        </span>
      </div>

      <div className="cs-two">
        <SafetyCard labelledBy="insights-bp" title={t('campusSafety.insights.bp.title')} sub={t('campusSafety.insights.bp.sub')}>
          <p className="cs-field__hint">{t('campusSafety.notConnected')}</p>
        </SafetyCard>
        <SafetyCard labelledBy="insights-bmi" title={t('campusSafety.insights.bmi.title')} sub={t('campusSafety.insights.bmi.sub')}>
          <p className="cs-field__hint">{t('campusSafety.notConnected')}</p>
        </SafetyCard>
      </div>

      <div className="cs-two cs-two--wide-left">
        <SafetyCard labelledBy="insights-coverage" title={t('campusSafety.insights.coverage.title')} sub={t('campusSafety.insights.coverage.sub')}>
          <NotConnected icon="bar-chart-2" tile="chart-alt--p4" titleKey="campusSafety.notConnected" bodyKey="campusSafety.insights.coverage.unconnected" />
        </SafetyCard>
        <SafetyCard labelledBy="insights-never" title={t('campusSafety.insights.never.title')}>
          <ul className="cs-list">
            <li><Icon name="lock" size={16} />{t('campusSafety.insights.never.names')}</li>
            <li><Icon name="lock" size={16} />{t('campusSafety.insights.never.small', { floor: CAMPUS_MIN_GROUP })}</li>
            <li><Icon name="lock" size={16} />{t('campusSafety.insights.never.rank')}</li>
            <li><Icon name="lock" size={16} />{t('campusSafety.insights.never.counts')}</li>
          </ul>
          <div className="cs-notice cs-notice--attention" role="note">
            <span className="cs-notice__icon" aria-hidden="true"><Icon name="info" size={18} strokeWidth={2.1} /></span>
            <span className="cs-notice__text">
              <span>{t('campusSafety.insights.never.access')}</span>
              <a className="cs-link" href="/campus-access-requests" onClick={goTo('campus-access-requests')}>{t('campusSafety.insights.never.accessLink')}</a>
            </span>
          </div>
        </SafetyCard>
      </div>
    </div>
  );
}
