import React from 'react';
import { observer } from 'mobx-react-lite';
import { Mail, Smartphone } from 'lucide-react';
import { Field, SubmitButton } from '@/components/interface/WorkflowUI';
import type { AuthViewModel } from '../viewmodel/AuthViewModel';
import './sign-in.css';

export type SignInChannel = 'EMAIL' | 'WHATSAPP';

export interface SignInFieldCopy {
  label: string;
  placeholder: string;
  hint: string;
  inputType: 'email' | 'tel';
  autoComplete: 'email' | 'tel';
}

/**
 * The copy that changes with the chosen channel.
 *
 * Pulled out of the view so it can be asserted directly: this repo has no DOM
 * testing library, so behaviour that lives only inside JSX is untestable.
 */
export function signInFieldCopy(channel: SignInChannel): SignInFieldCopy {
  return channel === 'EMAIL'
    ? {
        label: 'Campus email address',
        placeholder: 'you@campus.edu.in',
        hint: 'Use your institute email to unlock campus pricing and Edu ID perks.',
        inputType: 'email',
        autoComplete: 'email',
      }
    : {
        label: 'WhatsApp number',
        placeholder: '+91 00000 00000',
        hint: 'We send a 6-digit code on WhatsApp. Standard message rates apply.',
        inputType: 'tel',
        autoComplete: 'tel',
      };
}

/** True when the chosen channel is one the server said it can actually deliver on. */
export function channelIsDeliverable(channel: SignInChannel, configured: SignInChannel[]): boolean {
  return configured.length === 0 || configured.includes(channel);
}

const CHANNELS: ReadonlyArray<{ id: SignInChannel; label: string; Icon: typeof Mail }> = [
  { id: 'EMAIL', label: 'Email', Icon: Mail },
  { id: 'WHATSAPP', label: 'WhatsApp', Icon: Smartphone },
];

/**
 * Sign in — step 1 of the login flow.
 *
 * Design: design/screens/screens/01-launch-onboarding/SignIn.jpg (Tier 2).
 * Binds to the existing AuthViewModel; it adds no state and no API calls of
 * its own, so the OTP orchestration, CSRF handling and rate limiting are
 * unchanged.
 *
 * Three elements of the design are deliberately absent, because nothing backs
 * them and a control that does nothing is worse than an honest omission:
 *   - "Continue with campus ID" — there is no SSO endpoint in the backend.
 *   - the EN / తెలుగు / हिंदी switcher — the repo has no i18n library or locales.
 *   - "Lost your phone?" — that screen is Tier 1 and not built, so the link
 *     would dangle.
 */
export const SignInView = observer(function SignInView({ vm }: { vm: AuthViewModel }) {
  const copy = signInFieldCopy(vm.channel);
  const deliverable = channelIsDeliverable(vm.channel, vm.channels);

  return (
    <div className="sk-signin">
      <div className="sk-signin__head">
        <h1 className="sk-signin__title">Welcome back</h1>
        <p className="sk-signin__lead">Sign in to reach your records, consults and campus clinic.</p>
      </div>

      <div className="sk-signin__channels" role="group" aria-label="How we send your code">
        {CHANNELS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={vm.channel === id}
            onClick={() => vm.setChannel(id)}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <Field label={copy.label} hint={copy.hint}>
        <input
          required
          type={copy.inputType}
          autoComplete={copy.autoComplete}
          value={vm.identifier}
          onChange={(event) => vm.setIdentifier(event.target.value)}
          maxLength={254}
          placeholder={copy.placeholder}
        />
      </Field>

      {vm.optionsError && (
        <div className="wf-notice" role="status">
          {vm.optionsError}
        </div>
      )}

      {!deliverable && (
        <div className="wf-notice" role="status">
          {vm.channel === 'EMAIL' ? 'Email' : 'WhatsApp'} delivery is not configured. Choose the
          other option, or contact your administrator.
        </div>
      )}

      {/* The design labels this "Send verification code", but in this flow step 1
          only advances to the delivery confirmation, where a WhatsApp user can add
          a backup email. Labelling it "Send" here would be a button that lies. */}
      <SubmitButton busy={vm.busy} disabled={!deliverable}>
        Continue
      </SubmitButton>

      <p className="sk-signin__terms">
        By continuing you agree to the Student Kare Terms and Privacy Policy at studentkare.co.
      </p>
    </div>
  );
});
