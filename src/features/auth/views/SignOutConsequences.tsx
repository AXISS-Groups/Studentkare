import React from 'react';
import { Check, Info } from 'lucide-react';
import { useApiResource } from '@/hooks/api/useApiResource';
import { useT } from '@/i18n';
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
  const t = useT();

  return (
    <div className="sk-signout">
      <p className="sk-signout__lede">{t('onboard.signout.lede')}</p>
      <ul className="sk-signout__list">
        <li className="sk-signout__row">
          <span className="sk-signout__mark sk-signout__mark--keeps">
            <Check size={14} aria-hidden="true" />
          </span>
          <span>
            <strong>{t('onboard.signout.recordsTitle')}</strong> {t('onboard.signout.recordsBody')}
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
                  ? t('onboard.signout.sharesNone')
                  : active === 1
                    ? t('onboard.signout.sharesOne')
                    : t('onboard.signout.sharesOther', { count: active })}
              </strong>{' '}
              {active === 0
                ? t('onboard.signout.sharesNoneBody')
                : t('onboard.signout.sharesBody')}
            </span>
          </li>
        ) : null}

        <li className="sk-signout__row">
          <span className="sk-signout__mark sk-signout__mark--note">
            <Info size={14} aria-hidden="true" />
          </span>
          <span>
            <strong>{t('onboard.signout.remindersTitle')}</strong> {t('onboard.signout.remindersBody')}
          </span>
        </li>
      </ul>
    </div>
  );
}
