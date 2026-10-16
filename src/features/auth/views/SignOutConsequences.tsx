import React from 'react';
import './sign-out.css';

/**
 * What signing out actually does (design page 1, SignOut, Tier 3), in one line.
 *
 * Signing out clears the session and nothing else, so nothing is promised about
 * the device being wiped. Reminders go by WhatsApp and email, not to the device,
 * so the line says they keep coming rather than leaving a student expecting
 * silence.
 */
export function SignOutConsequences(): React.ReactElement {
  return (
    <p className="sk-signout__lede">
      WhatsApp and email reminders keep arriving.
    </p>
  );
}
