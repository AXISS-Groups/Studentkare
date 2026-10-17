import React from 'react';
import { useT } from '@/i18n';
import { Checkbox } from '@/design-system';
import './sign-out.css';

/**
 * What signing out actually does (design page 1, SignOut, Tier 3), in one line.
 *
 * Signing out clears the session and nothing else, so nothing is promised about
 * the device being wiped. Reminders go by WhatsApp and email, not to the device,
 * so the line says they keep coming rather than leaving a student expecting
 * silence.
 */
export interface SignOutConsequencesProps {
  /** Opt-in, off by default: shared campus computers are common. */
  remember?: boolean;
  onRememberChange?: (remember: boolean) => void;
}

export function SignOutConsequences({ remember = false, onRememberChange }: SignOutConsequencesProps = {}): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-signout">
      <p className="sk-signout__lede">{t('onboard.signout.remindersTitle')}</p>
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
