import React from 'react';
import { ArrowRight, CheckCircle2, FlaskConical, LifeBuoy, Stethoscope } from 'lucide-react';
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

/** Said plainly, and never ahead of the evidence. */
const VERIFICATION_NOTE: Record<VerificationStatus, { tone: string; text: string }> = {
  NOT_SUBMITTED: {
    tone: 'pending',
    text: 'Your campus membership is not verified yet. Verify it to use campus-paid plans and health camps.',
  },
  PENDING: {
    tone: 'pending',
    text: 'Your campus is checking your enrolment. Everything below works while you wait.',
  },
  VERIFIED: {
    tone: 'done',
    text: 'Your campus has confirmed your enrolment.',
  },
  REJECTED: {
    tone: 'problem',
    text: 'Your campus could not confirm your enrolment. Check your roll number and submit again.',
  },
};

const UNLOCKED = [
  { icon: FlaskConical, text: 'NABL lab tests with dorm sample pickup' },
  { icon: Stethoscope, text: 'Telehealth consultations with a registered doctor' },
  { icon: LifeBuoy, text: '24×7 crisis support and campus SOS' },
] as const;

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

  const note = verification.data ? VERIFICATION_NOTE[verification.data.status] : null;
  const university = verification.data?.university?.trim() ?? '';
  const block = profile.data?.hostelBlock?.trim() ?? '';
  const where = [university, block].filter(Boolean).join(' · ');

  return (
    <section className="sk-ready" aria-labelledby="sk-ready-title">
      <span className="sk-ready__tick">
        <CheckCircle2 size={40} aria-hidden="true" />
      </span>

      <h1 className="sk-ready__title" id="sk-ready-title">
        Your workspace is ready.
      </h1>

      {/* Only stated when the server actually returned somewhere. */}
      {where ? <p className="sk-ready__where">Your account is linked to {where}.</p> : null}

      {note ? (
        <p className={`sk-ready__note sk-ready__note--${note.tone}`} role="status">
          {note.text}
        </p>
      ) : null}

      <h2 className="sk-ready__eyebrow">What&rsquo;s unlocked</h2>
      <ul className="sk-ready__list">
        {UNLOCKED.map(({ icon: Icon, text }) => (
          <li className="sk-ready__row" key={text}>
            <span className="sk-ready__row-icon">
              <Icon size={18} aria-hidden="true" />
            </span>
            {text}
          </li>
        ))}
      </ul>

      <button type="button" className="sk-ready__primary" onClick={onEnter}>
        Enter Studentkare
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </section>
  );
}
