import React, { useState } from 'react';
import { ConsolePageHeader } from '@/design-system/console/ConsoleTablePage';
import { Icon } from '@/design-system/icons';
import { SkButton } from '@/design-system/primitives';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { NotConnected, Unavailable } from '@/features/campus/boards/boardKit';
import '@/features/campus/boards/campus-boards.css';
import { EmergencyLines, OfflineNotice, SafetyCard, SafetyNotice } from './safetyKit';
import './campus-safety.css';

/**
 * Emergency access (design page 4, CampusBreakGlass; Tier 1, approved
 * 2026-10-21): break-glass to one student's emergency card when they cannot
 * consent.
 *
 * Nothing can open a card yet. The `break_glass_sessions` table exists but no
 * route records an opening, notifies the student or expires the session on
 * the server, and the access model (one campus admin for minutes vs dual
 * custody for hours) is undecided. So this board fails closed, visibly:
 * student search is disabled, "Open emergency card" is always disabled and
 * says why, and no card, countdown, audit ID or contact is ever drawn. The
 * reason chips and the free-text box stay usable (they hold nothing and send
 * nothing) so the layout is the one that will ship.
 *
 * The 108 link is a plain `tel:` link that works whatever the state of the
 * page, and it is the first action on it.
 */
export const BREAK_GLASS_REASONS: readonly MessageKey[] = [
  'campusSafety.breakGlass.reason.collapse',
  'campusSafety.breakGlass.reason.allergy',
  'campusSafety.breakGlass.reason.seizure',
  'campusSafety.breakGlass.reason.injury',
];

export function CampusBreakGlassScreen(): React.ReactElement {
  const t = useT();
  const [reason, setReason] = useState<MessageKey | null>(null);
  const [details, setDetails] = useState('');

  return (
    <div className="sk-ds cs-board">
      <ConsolePageHeader
        title={t('campusSafety.breakGlass.title')}
        subtitle={t('campusSafety.breakGlass.subtitle')}
        actions={<span className="cs-uses"><Icon name="eye" size={16} strokeWidth={2.2} />{t('campusSafety.breakGlass.uses')}</span>}
      />
      <SafetyNotice icon="alert-circle" tone="danger">{t('campusSafety.breakGlass.misuse')}</SafetyNotice>
      <OfflineNotice />

      <div className="cs-strip">
        <SafetyNotice icon="info" title={t('campusSafety.breakGlass.unconnectedTitle')}>{t('campusSafety.breakGlass.unconnectedBody')}</SafetyNotice>
        <EmergencyLines numbers={['108', '112']} />
      </div>

      <div className="cs-steps">
        <SafetyCard labelledBy="bg-step1" title={t('campusSafety.breakGlass.step1.title')} sub={t('campusSafety.breakGlass.step1.sub')}>
          <label className="cs-search is-disabled">
            <Icon name="search" size={18} />
            <input type="search" disabled aria-label={t('campusSafety.breakGlass.step1.sub')} placeholder={t('campusSafety.breakGlass.step1.placeholder')} />
          </label>
          <NotConnected icon="search" tile="chart-alt--p4" titleKey="campusSafety.notConnected" bodyKey="campusSafety.breakGlass.step1.unavailable" />
        </SafetyCard>

        <SafetyCard labelledBy="bg-step2" title={t('campusSafety.breakGlass.step2.title')} sub={t('campusSafety.breakGlass.step2.sub')}>
          <form className="cs-drawer" onSubmit={(event) => event.preventDefault()}>
            <fieldset className="cs-field">
              <legend className="sk-visually-hidden">{t('campusSafety.breakGlass.reasons')}</legend>
              <div className="cs-options">
                {BREAK_GLASS_REASONS.map((key) => (
                  <button key={key} type="button" className="cs-option cs-option--danger" aria-pressed={reason === key} onClick={() => setReason(key)}>{t(key)}</button>
                ))}
              </div>
            </fieldset>
            <div className="cs-field">
              <label className="cs-field__label" htmlFor="bg-details">{t('campusSafety.breakGlass.details')}</label>
              <textarea id="bg-details" className="cs-textarea" maxLength={500} value={details} onChange={(event) => setDetails(event.target.value)} aria-describedby="bg-details-hint" />
              <span id="bg-details-hint" className="cs-field__hint">{t('campusSafety.breakGlass.detailsHint')}</span>
            </div>
            {/* Fails closed: no route can open a card, so this never enables. */}
            <SkButton type="submit" variant="danger" className="cs-open" disabled><Icon name="heart-plus" size={17} />
              {t('campusSafety.breakGlass.open')}
              <Unavailable reason="campusSafety.breakGlass.openUnavailable" />
            </SkButton>
            <p className="cs-field__hint" role="status">{t('campusSafety.breakGlass.openUnavailable')}</p>
            <SafetyNotice icon="info">{t('campusSafety.breakGlass.only')}</SafetyNotice>
          </form>
        </SafetyCard>
      </div>

      <SafetyCard labelledBy="bg-how" title={t('campusSafety.breakGlass.how.title')}>
        <ul className="cs-list">
          <li><Icon name="clock" size={16} />{t('campusSafety.breakGlass.how.timer')}</li>
          <li><Icon name="eye" size={16} />{t('campusSafety.breakGlass.how.notify')}</li>
          <li><Icon name="shield-check" size={16} />{t('campusSafety.breakGlass.how.log')}</li>
        </ul>
      </SafetyCard>
    </div>
  );
}
