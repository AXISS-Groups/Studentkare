import React from 'react';
import { useT, type MessageKey } from '@/i18n';
import { Checkbox } from '@/design-system';
import { Icon } from '@/design-system/icons';
import './sign-out.css';

/**
 * What signing out actually does (design page 1, SignOut; WebSignOut), shown
 * inside the shared ConfirmDialog.
 *
 * Signing out ends this session and nothing else, so nothing is promised about
 * the device being wiped: the boards' "offline emergency card is removed" and
 * "dose reminders stop on this device" are not true here (no card is cached on
 * the device; reminders go by WhatsApp and email). The list says what does
 * happen, with the boards' tick for what stays and cross for what ends.
 */
export interface SignOutConsequencesProps {
  /** Opt-in, off by default: shared campus computers are common. */
  remember?: boolean;
  onRememberChange?: (remember: boolean) => void;
  /**
   * Draw the board's list ("What signing out does") for this device (phone
   * board) or this browser (web board). Without it, only the one-line note.
   */
  where?: 'device' | 'browser';
  /** "Signed in as": the account's name and a masked contact. */
  account?: { name: string; contact?: string };
}

interface Effect {
  keeps: boolean;
  label: MessageKey;
  meta: MessageKey;
}

const EFFECTS: Record<'device' | 'browser', readonly Effect[]> = {
  device: [
    { keeps: true, label: 'launch.signout.records', meta: 'onboard.signout.recordsBody' },
    { keeps: true, label: 'launch.signout.shares', meta: 'onboard.signout.sharesBody' },
    { keeps: false, label: 'launch.signout.session.device', meta: 'launch.signout.session.meta' },
    { keeps: true, label: 'launch.signout.reminders', meta: 'onboard.signout.remindersBody' },
  ],
  browser: [
    { keeps: true, label: 'launch.signout.records', meta: 'onboard.signout.recordsBody' },
    { keeps: true, label: 'launch.signout.shares', meta: 'onboard.signout.sharesBody' },
    { keeps: false, label: 'launch.signout.session.browser', meta: 'launch.signout.session.meta' },
    { keeps: true, label: 'launch.signout.downloads', meta: 'launch.signout.downloads.meta' },
  ],
};

/** "asha@vnrvjiet.in" becomes "a•••••@vnrvjiet.in"; a phone number keeps its last four digits. */
function maskContact(contact: string): string {
  const value = contact.trim();
  const at = value.indexOf('@');
  if (at > 0) return `${value[0]}•••••${value.slice(at)}`;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : '';
}

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export function SignOutConsequences({ remember = false, onRememberChange, where, account }: SignOutConsequencesProps = {}): React.ReactElement {
  const t = useT();
  const masked = account?.contact ? maskContact(account.contact) : '';
  return (
    <div className="sk-signout">
      {account ? (
        <div className="sk-signout__who">
          <span className="sk-signout__avatar" aria-hidden="true">{initialsOf(account.name)}</span>
          <span className="sk-signout__who-words">
            <span className="sk-signout__who-name">{t('launch.signout.signedInAs', { name: account.name })}</span>
            {masked ? <span className="sk-signout__who-meta">{masked}</span> : null}
          </span>
        </div>
      ) : null}
      {where ? (
        <>
          <h3 className="sk-signout__eyebrow">{t('launch.signout.whatItDoes')}</h3>
          <ul className="sk-signout__list">
            {EFFECTS[where].map((effect) => (
              <li className="sk-signout__row" key={effect.label}>
                <span className={`sk-signout__mark sk-signout__mark--${effect.keeps ? 'keeps' : 'ends'}`}>
                  <Icon name={effect.keeps ? 'check' : 'x'} size={14} strokeWidth={2.6} label={t(effect.keeps ? 'launch.signout.stays' : 'launch.signout.ends')} />
                </span>
                <span className="sk-signout__row-words">
                  <strong>{t(effect.label)}</strong>
                  <span>{t(effect.meta)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="sk-signout__note">{t('launch.signout.neverDeletes')}</p>
        </>
      ) : (
        <p className="sk-signout__lede">{t('onboard.signout.remindersTitle')}</p>
      )}
      {onRememberChange ? (
        <Checkbox
          label={t('onboard.signout.rememberLabel')}
          detail={t('onboard.signout.rememberDetail')}
          checked={remember}
          onChange={onRememberChange}
        />
      ) : null}
    </div>
  );
}
