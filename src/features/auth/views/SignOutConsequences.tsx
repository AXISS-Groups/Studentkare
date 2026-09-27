import React from 'react';
import { Check, Info } from 'lucide-react';
import { useApiResource } from '@/hooks/api/useApiResource';
import './sign-out.css';

interface Share {
  id: string;
  active: boolean;
  expiresAt: number;
}

/**
 * What signing out actually does (design page 1, SignOut, Tier 3).
 *
 * The design lists four consequences. Two of them are not true of this app and
 * are not shown:
 *
 * - "The offline emergency card is removed." Signing out clears the session
 *   and nothing else — there is no offline card, and no local storage is
 *   touched. Promising a device wipe that does not happen is a security
 *   assurance we do not keep.
 * - "Dose reminders stop on this device." Reminders are delivered by WhatsApp
 *   and email, not to a device, so they keep arriving after sign-out. Saying
 *   otherwise would leave a student expecting silence and getting messages —
 *   so the opposite is said, with where to change it.
 */
export function SignOutConsequences(): React.ReactElement {
  const shares = useApiResource<{ items: Share[] }>('/records/shares');
  const active = shares.data?.items.filter((share) => share.active).length ?? 0;

  return (
    <div className="sk-signout">
      <p className="sk-signout__lede">This device is signed out. Nothing else changes.</p>
      <ul className="sk-signout__list">
        <li className="sk-signout__row">
          <span className="sk-signout__mark sk-signout__mark--keeps">
            <Check size={14} aria-hidden="true" />
          </span>
          <span>
            <strong>Your records stay where they are.</strong> Nothing in your vault is touched or
            deleted.
          </span>
        </li>

        {/* Only stated once the list has loaded; a count of zero is a claim too. */}
        {shares.data ? (
          <li className="sk-signout__row">
            <span className="sk-signout__mark sk-signout__mark--keeps">
              <Check size={14} aria-hidden="true" />
            </span>
            <span>
              <strong>
                {active === 0
                  ? 'No record shares are running.'
                  : `${active} record ${active === 1 ? 'share keeps' : 'shares keep'} running.`}
              </strong>{' '}
              {active === 0
                ? 'Signing out does not grant or end any.'
                : 'They continue until they expire, or until you revoke them in Records.'}
            </span>
          </li>
        ) : null}

        <li className="sk-signout__row">
          <span className="sk-signout__mark sk-signout__mark--note">
            <Info size={14} aria-hidden="true" />
          </span>
          <span>
            <strong>Reminders keep arriving.</strong> They are sent by WhatsApp and email, not to
            this device, so signing out does not stop them. Turn them off in Settings.
          </span>
        </li>
      </ul>
    </div>
  );
}
