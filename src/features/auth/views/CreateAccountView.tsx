import React from 'react';
import { observer } from 'mobx-react-lite';
import { Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { Field, SubmitButton } from '@/components/interface/WorkflowUI';
import type { AuthViewModel } from '../viewmodel/AuthViewModel';
import { channelFieldCopy, channelIsDeliverable, signupProgress, type AuthChannel } from './channelCopy';
import './auth-form.css';

const CHANNELS: ReadonlyArray<{ id: AuthChannel; label: string; Icon: typeof Mail }> = [
  { id: 'EMAIL', label: 'Email', Icon: Mail },
  { id: 'WHATSAPP', label: 'WhatsApp', Icon: Smartphone },
];

/**
 * Create account — the contact step of signing up.
 *
 * Design: design/screens/screens/01-launch-onboarding/CreateAccount.jpg (Tier 3).
 * Binds to the existing AuthViewModel and adds no state or API calls of its own.
 *
 * Where it differs from the picture, and why:
 *
 *   - The design puts a campus email AND a WhatsApp number on one form. The
 *     API takes one: POST /auth/otp/send accepts a single `identifier` plus a
 *     `channel`. So this offers the same choice the server can honour rather
 *     than a second field that would be dropped on the floor.
 *
 *   - The design numbers this "1 of 6". It is shown at its real position in
 *     the implemented flow, which also has six steps but a different set of
 *     them. A progress bar that lies about where you are is worse than one
 *     that disagrees with a mock-up.
 *
 *   - Full name is collected here, as designed. The API wants it after
 *     verification, at POST /auth/signup, so it is held on the view model and
 *     the later step opens pre-filled. Nothing is sent early.
 */
export const CreateAccountView = observer(function CreateAccountView({ vm }: { vm: AuthViewModel }) {
  const copy = channelFieldCopy(vm.channel);
  const deliverable = channelIsDeliverable(vm.channel, vm.channels);
  const { position, total } = signupProgress(vm.step);
  // The design carries this promise on the WhatsApp field, where a student is
  // handing over a number and reasonably wonders what else it will be used for.
  const hint =
    vm.channel === 'EMAIL'
      ? 'Your institute email unlocks campus pricing and Edu ID perks.'
      : 'Used for order updates and consult reminders. No marketing.';

  return (
    <div className="sk-authform">
      <div className="sk-authform__progress">
        <div
          className="sk-authform__track"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={position}
          aria-label={`Step ${position} of ${total}`}
        >
          {Array.from({ length: total }, (_, index) => (
            <span key={index} data-done={index < position ? 'true' : 'false'} />
          ))}
        </div>
        <span className="sk-authform__step">
          {position} of {total}
        </span>
      </div>

      <div className="sk-authform__head">
        <h1 className="sk-authform__title">Create your account</h1>
        <p className="sk-authform__lead">
          One account holds your records, orders and consults — and moves with you after campus.
        </p>
      </div>

      <Field label="Full name" hint="As printed on your student ID.">
        <input
          required
          type="text"
          autoComplete="name"
          value={vm.fullName}
          onChange={(event) => vm.setField('fullName', event.target.value)}
          maxLength={120}
          placeholder="As printed on your student ID"
        />
      </Field>

      <div className="sk-authform__channels" role="group" aria-label="How we send your code">
        {CHANNELS.map(({ id, label, Icon }) => (
          <button key={id} type="button" aria-pressed={vm.channel === id} onClick={() => vm.setChannel(id)}>
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <Field label={copy.label} hint={hint}>
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

      <p className="sk-authform__assurance">
        <ShieldCheck size={18} aria-hidden="true" />
        Your health data is never sold, and never shown to your campus without your consent.
      </p>

      <SubmitButton busy={vm.busy} disabled={!deliverable}>
        {vm.busy ? 'Sending…' : 'Send verification code'}
      </SubmitButton>
    </div>
  );
});
