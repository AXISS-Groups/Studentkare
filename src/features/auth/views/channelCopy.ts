/**
 * Copy and rules shared by the two auth forms, Sign in and Create account.
 *
 * Kept out of the views because this repo has no DOM testing library, so
 * anything that lives only inside JSX cannot be asserted.
 */

export type AuthChannel = 'EMAIL' | 'WHATSAPP';

export interface ChannelFieldCopy {
  label: string;
  placeholder: string;
  inputType: 'email' | 'tel';
  autoComplete: 'email' | 'tel';
}

/**
 * The field copy that changes with the chosen delivery channel.
 *
 * The hint is deliberately NOT here. Sign in explains message rates; Create
 * account promises no marketing. Those say different things on purpose, and
 * sharing one string would flatten a real difference.
 */
export function channelFieldCopy(channel: AuthChannel): ChannelFieldCopy {
  return channel === 'EMAIL'
    ? {
        label: 'Campus email address',
        placeholder: 'you@campus.edu.in',
        inputType: 'email',
        autoComplete: 'email',
      }
    : {
        label: 'WhatsApp number',
        placeholder: '+91 00000 00000',
        inputType: 'tel',
        autoComplete: 'tel',
      };
}

/**
 * True when the chosen channel is one the server said it can deliver on.
 *
 * An empty list means options have not loaded yet, not that nothing works:
 * treating it as "nothing is deliverable" would disable sign-in on a slow
 * network, which is a worse failure than letting the send attempt answer.
 */
export function channelIsDeliverable(channel: AuthChannel, configured: AuthChannel[]): boolean {
  return configured.length === 0 || configured.includes(channel);
}

/**
 * Where the student is in signing up, for the "n of 6" progress device.
 *
 * The implemented flow really has six steps — intro, contact, code, name and
 * date of birth, a note that student verification is separate, then institution
 * and roll number — so the device is honest. It does not match the six steps in
 * the design pack, which are a different set entirely.
 */
export const SIGNUP_STEPS = 6;

export function signupProgress(step: number): { position: number; total: number } {
  return { position: Math.min(Math.max(step, 1), SIGNUP_STEPS), total: SIGNUP_STEPS };
}
