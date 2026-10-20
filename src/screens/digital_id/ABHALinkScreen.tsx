import React from 'react';
import { Icon } from '@/design-system/icons';
import { useT, type MessageKey } from '@/i18n';
import './abha-link.css';

/** What a link would be checked against (canvas "What was checked"), shown as what will be checked. */
const CHECKS: readonly { label: MessageKey; against: MessageKey }[] = [
  { label: 'launch.abha.check.number', against: 'launch.abha.check.number.against' },
  { label: 'launch.abha.check.name', against: 'launch.abha.check.name.against' },
  { label: 'launch.abha.check.year', against: 'launch.abha.check.year.against' },
  { label: 'launch.abha.check.mobile', against: 'launch.abha.check.mobile.against' },
];

const NEVER: readonly MessageKey[] = ['launch.abha.never.government', 'launch.abha.never.hospital', 'launch.abha.never.campus'];

/**
 * Link ABHA (design page 1, AbhaLink), in the board's structure but honest.
 *
 * ABHA linking is not built: there is no ABDM/ABHA route, model or column in
 * the backend. The board shows a linked account (a number, a name, a year of
 * birth, a matched mobile and an "Unlink" button); every one of those would be
 * invented, and guardrail 6 forbids asserting an integration state that is not
 * backed by evidence. So the card says "Not linked", the checks are listed as
 * what will be checked when linking opens (neutral ticks, not passed ones),
 * the "does not do" promises stay, and there is no Unlink. Nothing is collected.
 */
export const ABHALinkScreen: React.FC = () => {
  const t = useT();
  return (
    <section className="sk-abha" aria-labelledby="sk-abha-title">
      <div className="sk-abha__head">
        <h2 className="sk-abha__title" id="sk-abha-title">{t('member.abha.title')}</h2>
        <p className="sk-abha__lede">{t('launch.abha.lede')}</p>
      </div>

      <div className="sk-abha__card" role="status">
        <span className="sk-abha__eyebrow">{t('launch.abha.card.eyebrow')}</span>
        <span className="sk-abha__state">{t('member.abha.status')}</span>
        <span className="sk-abha__meta">{t('member.abha.body')}</span>
      </div>

      <h3 className="sk-abha__section">{t('launch.abha.checks.title')}</h3>
      <ul className="sk-abha__checks">
        {CHECKS.map((check) => (
          <li key={check.label} className="sk-abha__check">
            <span className="sk-abha__mark"><Icon name="check" size={14} strokeWidth={2.6} /></span>
            <span className="sk-abha__check-label">{t(check.label)}</span>
            <span className="sk-abha__check-against">{t(check.against)}</span>
          </li>
        ))}
      </ul>

      <h3 className="sk-abha__section">{t('launch.abha.never.title')}</h3>
      <ul className="sk-abha__never">
        {NEVER.map((key) => (
          <li key={key} className="sk-abha__never-row">
            <span className="sk-abha__dot" aria-hidden="true" />
            {t(key)}
          </li>
        ))}
      </ul>
    </section>
  );
};
