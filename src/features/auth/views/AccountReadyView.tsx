import React from 'react';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { useT, type MessageKey } from '@/i18n';
import { useApiResource } from '@/hooks/api/useApiResource';
import './account-ready.css';

/** What `GET /campus/verification` answers. */
type VerificationStatus = 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

interface Verification {
  status: VerificationStatus;
  university: string;
  rollNumber: string;
}

interface Profile {
  fullName: string;
  hostelBlock: string;
}

/** Said plainly, and never ahead of the evidence. Text: `onboard.ready.note.<status>`. */
const VERIFICATION_TONE: Record<VerificationStatus, string> = {
  NOT_SUBMITTED: 'pending',
  PENDING: 'pending',
  VERIFIED: 'done',
  REJECTED: 'problem',
};

/** "24×7 crisis support" was not true of the campus; the helplines are what is always there. */
const UNLOCKED = [
  { icon: 'flask-2', tone: 'lab', key: 'onboard.ready.labs' },
  { icon: 'stethoscope', tone: 'care', key: 'onboard.ready.telehealth' },
  { icon: 'shield-2', tone: 'safety', key: 'onboard.ready.crisis' },
] as const satisfies readonly { icon: SkIconName; tone: string; key: MessageKey }[];

export interface AccountReadyViewProps {
  /** Go to the workspace. */
  onEnter: () => void;
  /** Open Help & support (the board's "Need a hand?" line). */
  onHelp?: () => void;
  /** Students, while passcodes are on: offer the optional passcode (founder, 2026-10-22). */
  onAddPasscode?: () => void;
}

/**
 * Shown once, straight after signup (design page 1, AccountReady, Tier 3).
 *
 * The design's headline is "You're verified. Workspace is ready." Half of that
 * is false at the moment it appears: signup writes isVerifiedStudent: false and
 * creates no CampusVerification row, so `GET /campus/verification` answers
 * NOT_SUBMITTED. Telling a student they are verified when the campus has not
 * been asked is the kind of claim guardrail 6 exists to stop — and it would be
 * the first thing the app ever told them. The workspace part is true, so that
 * is what the headline says, and the real verification state is shown beneath
 * it.
 *
 * The design also lists "10-min telehealth, from ₹199". The only telehealth
 * item in the catalogue is a 30-minute consult at ₹299, and it is demo seed
 * data explicitly marked as a concept. Both the duration and the price would
 * be invented, so the capability is named without a price.
 */
export function AccountReadyView({ onEnter, onHelp, onAddPasscode }: AccountReadyViewProps): React.ReactElement {
  const verification = useApiResource<Verification>('/campus/verification');
  const profile = useApiResource<Profile>('/profile');
  const t = useT();

  // An unknown status says nothing rather than guessing.
  const reported = verification.data?.status;
  const status = reported && reported in VERIFICATION_TONE ? reported : undefined;
  const university = verification.data?.university?.trim() ?? '';
  const block = profile.data?.hostelBlock?.trim() ?? '';
  const where = [university, block].filter(Boolean).join(' · ');

  return (
    <section className="sk-ready" aria-labelledby="sk-ready-title">
      {/* The account exists: that is the fact the tick marks. It says nothing about the body. */}
      <span className="sk-ready__tick">
        <span className="sk-ready__tick-inner">
          <Icon name="check" size={36} strokeWidth={2.6} />
        </span>
      </span>

      <h1 className="sk-ready__title" id="sk-ready-title">
        {t('onboard.ready.title')}
      </h1>

      {/* Only stated when the server actually returned somewhere. */}
      {where ? <p className="sk-ready__where">{t('onboard.ready.where', { where })}</p> : null}

      {status ? (
        <p className={`sk-ready__note sk-ready__note--${VERIFICATION_TONE[status]}`} role="status">
          {t(`onboard.ready.note.${status}`)}
        </p>
      ) : null}

      <span className="sk-ready__shield" aria-hidden="true">
        <Icon name="shield-2" size={52} strokeWidth={1.8} />
      </span>

      <h2 className="sk-ready__eyebrow">{t('onboard.ready.unlocked')}</h2>
      <ul className="sk-ready__list">
        {UNLOCKED.map(({ icon, tone, key }) => (
          <li className="sk-ready__row" key={key}>
            <span className={`sk-ready__row-icon sk-ready__row-icon--${tone}`}>
              <Icon name={icon} size={18} />
            </span>
            {t(key)}
          </li>
        ))}
      </ul>

      {onAddPasscode ? (
        <div className="sk-ready__passcode" data-testid="ready-passcode">
          <span className="sk-ready__passcode-icon"><Icon name="key" size={20} /></span>
          <span className="sk-ready__passcode-words">
            <strong>{t('authpc.ready.title')}</strong>
            <span>{t('authpc.ready.body')}</span>
          </span>
          <button type="button" className="sk-ready__passcode-cta" onClick={onAddPasscode}>{t('authpc.ready.cta')}</button>
        </div>
      ) : null}

      <button type="button" className="sk-ready__primary" onClick={onEnter}>
        {t('onboard.ready.enter')}
        <Icon name="arrow-right" size={18} strokeWidth={2.4} />
      </button>

      {onHelp ? (
        <button type="button" className="sk-ready__help" onClick={onHelp}>
          {t('launch.ready.help')}
        </button>
      ) : null}
    </section>
  );
}
