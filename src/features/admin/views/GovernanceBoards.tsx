import React from 'react';
import { ConsoleTablePage } from '@/design-system';
import { useT } from '@/i18n';
import { BoardNote, boardEmpty, boardError } from './AdminBoard';
import { GovCard, ViewLink } from './GovBoard';

/**
 * Tier 1 governance boards with no data source behind them yet (WP-17): Surveillance
 * map, Consent policy, Casualty handover and Check-in audit. Each keeps the board's
 * header, figures ("—", never 0), columns and closing note, says plainly what is not
 * connected, and offers no action, because nothing behind them could change anything.
 * None of them shows a sample row.
 */

/**
 * Surveillance map (AdminSurveillance). No surveillance source exists. When one does,
 * suppression under the cohort floor and the exclusion of mental-health signals belong
 * in the query, server-side; the floor and the legal basis for telling a state health
 * authority are decisions not yet taken, so the board states neither as a fact.
 */
export function SurveillanceView() {
  const t = useT();
  const title = t('admin.surveillance.title');
  return <div className="sk-admin-page">
    <ConsoleTablePage
      status="unconnected"
      header={{ title, subtitle: t('admin.surveillance.description') }}
      note={<BoardNote icon="map">{t('gov.surveillance.note')}</BoardNote>}
      statLabels={[t('admin.surveillance.statFlagged'), t('admin.surveillance.statWatching'), t('admin.surveillance.statCohort'), t('admin.surveillance.statNamed')]}
      statsLabel={t('admin.surveillance.summary')}
      table={{
        caption: t('admin.surveillance.caption'),
        columns: [{ label: t('admin.surveillance.colCluster') }, { label: t('admin.flags.colCampuses') }, { label: t('admin.surveillance.colSignal'), width: '36%' }, { label: t('admin.surveillance.colCohort') }, { label: t('admin.col.state'), align: 'end' }],
        rows: [],
        footnote: t('admin.surveillance.note'),
      }}
      empty={boardEmpty(t, t('admin.surveillance.empty'))}
      unconnected={{ title: t('admin.surveillance.empty'), body: t('adminBoard.notConnectedBody') }}
      error={boardError(t, t('gov.surveillance.what'), 'AdminSurveillance', () => undefined)}
      loadingLabel={t('gov.surveillance.loading')}
    />
  </div>;
}

/**
 * Consent policy (AdminConsentPolicy). The board's rules (share durations, artefact and
 * transcript retention, the cohort floor) are not settings anywhere yet, so no row can be
 * read from an enforcing source and none is shown. The 18+ gate is enforced at sign-up
 * and on profile edits (DESIGN D4); it is a fact of the code, not a setting, and cannot
 * be loosened from any screen.
 */
export function ConsentPolicyView() {
  const t = useT();
  const title = t('admin.consentPolicy.title');
  return <div className="sk-admin-page">
    <ConsoleTablePage
      status="unconnected"
      header={{ title, subtitle: t('admin.consentPolicy.description') }}
      note={<BoardNote icon="book">{t('gov.consent.note')}</BoardNote>}
      statLabels={[t('admin.consentPolicy.statRules'), t('admin.consentPolicy.statLocked'), t('admin.consentPolicy.statOpen'), t('admin.consentPolicy.statLoosened')]}
      statsLabel={t('admin.summaryOf', { title })}
      table={{
        caption: title,
        columns: [{ label: t('admin.consentPolicy.colRule'), width: '44%' }, { label: t('admin.consentPolicy.colSetTo') }, { label: t('admin.consentPolicy.colChangeable') }, { label: t('admin.col.state'), align: 'end' }],
        rows: [],
        footnote: t('gov.consent.footnote'),
      }}
      empty={boardEmpty(t, t('admin.consentPolicy.empty'))}
      unconnected={{ title: t('admin.consentPolicy.empty'), body: t('gov.consent.unconnected') }}
      error={boardError(t, t('gov.consent.what'), 'AdminConsentPolicy', () => undefined)}
      loadingLabel={t('gov.consent.loading')}
    />
  </div>;
}

/**
 * Casualty handover (AdminHandover). No transfer or countersign record exists, so there is
 * nothing to list; the countersign model and its window are decisions not yet taken. A
 * transfer's reason is clinical and, once connected, is for the super admin only.
 */
export function HandoverView() {
  const t = useT();
  const title = t('admin.handover.title');
  return <div className="sk-admin-page">
    <ConsoleTablePage
      status="unconnected"
      header={{ title, subtitle: t('admin.handover.description') }}
      note={<BoardNote icon="arrows-left-right">{t('gov.handover.note')}</BoardNote>}
      statLabels={[t('admin.handover.statTransfers'), t('admin.handover.statOverrides'), t('admin.handover.statCountersign'), t('admin.handover.statTold')]}
      statsLabel={t('admin.summaryOf', { title })}
      table={{
        caption: title,
        columns: [{ label: t('admin.handover.colCase') }, { label: t('admin.handover.colTransfer'), width: '34%' }, { label: t('admin.handover.colAuthorised') }, { label: t('admin.handover.colOpened') }, { label: t('admin.handover.colAudit'), align: 'end' }],
        rows: [],
        footnote: t('gov.handover.footnote'),
      }}
      empty={boardEmpty(t, t('admin.handover.empty'))}
      unconnected={{ title: t('admin.handover.empty'), body: t('adminBoard.notConnectedBody') }}
      error={boardError(t, t('gov.handover.what'), 'AdminHandover', () => undefined)}
      loadingLabel={t('gov.handover.loading')}
    >
      <ViewLink route="admin/break-glass-log" label={t('gov.handover.openBreakGlass')} />
    </ConsoleTablePage>
  </div>;
}

/**
 * Check-in audit (AdminCheckins). Pass scans are not recorded anywhere this board can
 * read as check-ins, so the table, figures and "providers to watch" are not connected.
 * What the page never shows (face photos, what was bought or tested, ID numbers) holds
 * by construction: no source behind it carries them.
 */
export function CheckinsView() {
  const t = useT();
  const title = t('admin.checkins.title');
  return <div className="sk-admin-page">
    <ConsoleTablePage
      status="unconnected"
      header={{ title, subtitle: t('admin.checkins.description') }}
      statLabels={[t('admin.checkins.statToday'), t('admin.checkins.statMatched'), t('admin.checkins.statStopped'), t('admin.checkins.statReports'), t('gov.checkins.statManual')]}
      statsLabel={t('admin.summaryOf', { title })}
      table={{
        caption: title,
        columns: [{ label: t('admin.checkins.colTime') }, { label: t('admin.checkins.colProvider') }, { label: t('admin.checkins.colVisit') }, { label: t('admin.checkins.colResult') }, { label: t('admin.checkins.colReason') }, { label: t('admin.checkins.colOutcome') }],
        rows: [],
      }}
      empty={boardEmpty(t, t('gov.checkins.empty'))}
      unconnected={{ title: t('gov.checkins.empty'), body: t('adminBoard.notConnectedBody') }}
      error={boardError(t, t('gov.checkins.what'), 'AdminCheckins', () => undefined)}
      loadingLabel={t('gov.checkins.loading')}
    >
      <div className="sk-gov-grid sk-gov-grid--split">
        <GovCard eyebrow={t('gov.checkins.watch')}>
          <p className="sk-gov-text">{t('gov.checkins.watchEmpty')}</p>
          <ViewLink route="admin/case" label={t('gov.checkins.openCase')} />
        </GovCard>
        <GovCard eyebrow={t('gov.checkins.never')} tone="soft">
          <ul className="sk-gov-bullets">
            <li>{t('gov.checkins.neverPhotos')}</li>
            <li>{t('gov.checkins.neverBought')}</li>
            <li>{t('gov.checkins.neverIds')}</li>
          </ul>
        </GovCard>
      </div>
    </ConsoleTablePage>
  </div>;
}
