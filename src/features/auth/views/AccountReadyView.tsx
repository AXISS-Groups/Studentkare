import React from 'react';
import { ArrowRight, CheckCircle2, FlaskConical, LifeBuoy, Stethoscope, type LucideIcon } from 'lucide-react';
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
  { icon: FlaskConical, key: 'onboard.ready.labs' },
  { icon: Stethoscope, key: 'onboard.ready.telehealth' },
  { icon: LifeBuoy, key: 'onboard.ready.crisis' },
] as const satisfies readonly { icon: LucideIcon; key: MessageKey }[];

export interface AccountReadyViewProps {
  /** Go to the workspace. */
  onEnter: () => void;
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
export function AccountReadyView({ onEnter }: AccountReadyViewProps): React.ReactElement {
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
      <span className="sk-ready__tick">
        <CheckCircle2 size={40} aria-hidden="true" />
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

      <h2 className="sk-ready__eyebrow">{t('onboard.ready.unlocked')}</h2>
      <ul className="sk-ready__list">
        {UNLOCKED.map(({ icon: Icon, key }) => (
          <li className="sk-ready__row" key={key}>
            <span className="sk-ready__row-icon">
              <Icon size={18} aria-hidden="true" />
            </span>
            {t(key)}
          </li>
        ))}
      </ul>

      <button type="button" className="sk-ready__primary" onClick={onEnter}>
        {t('onboard.ready.enter')}
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </section>
  );
}
