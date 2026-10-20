import React, { useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { observer } from 'mobx-react-lite';
import { Mail, Smartphone } from 'lucide-react';
import { SubmitButton } from '@/components/interface/WorkflowUI';
import { Banner, FormField } from '@/design-system';
import type { AuthViewModel } from '../viewmodel/AuthViewModel';
import { channelFieldCopy, channelIsDeliverable, type AuthChannel } from './channelCopy';
import './auth-form.css';

const CHANNELS: ReadonlyArray<{ id: AuthChannel; label: MessageKey; Icon: typeof Mail }> = [
  { id: 'EMAIL', label: 'auth.channel.EMAIL', Icon: Mail },
  { id: 'WHATSAPP', label: 'auth.channel.WHATSAPP', Icon: Smartphone },
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
  const t = useT();
  const copy = channelFieldCopy(vm.channel);
  const hint = t(vm.channel === 'EMAIL' ? 'auth.signin.hint.EMAIL' : 'auth.signin.hint.WHATSAPP');
  const deliverable = channelIsDeliverable(vm.channel, vm.channels);
  // Inline validation is presentation only: the browser's own constraint check
  // (required, type=email) still decides whether the form submits; this shows
  // its verdict on the field instead of a native bubble (board Feedback).
  const [invalid, setInvalid] = useState(false);

  return (
    <div className="sk-authform">
      <div className="sk-authform__head">
        <h1 className="sk-authform__title">{t('auth.signin.title')}</h1>
        <p className="sk-authform__lead">{t('auth.signin.lead')}</p>
      </div>

      <div className="sk-authform__channels" role="group" aria-label={t('auth.channels')}>
        {CHANNELS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={vm.channel === id}
            onClick={() => { vm.setChannel(id); setInvalid(false); }}
          >
            <Icon size={16} aria-hidden="true" />
            {t(label)}
          </button>
        ))}
      </div>

      <FormField
        label={t(copy.label)}
        hint={hint}
        status={invalid ? 'invalid' : 'idle'}
        message={t(vm.channel === 'EMAIL' ? 'auth.signin.invalid.EMAIL' : 'auth.signin.invalid.WHATSAPP')}
      >
        <input
          required
          type={copy.inputType}
          autoComplete={copy.autoComplete}
          value={vm.identifier}
          onChange={(event) => {
            vm.setIdentifier(event.target.value);
            if (invalid && event.target.validity.valid) setInvalid(false);
          }}
          onInvalid={(event) => { event.preventDefault(); setInvalid(true); event.currentTarget.focus(); }}
          maxLength={254}
          placeholder={copy.placeholder}
        />
      </FormField>

      {vm.optionsError ? (
        <Banner tone="attention" announce>{vm.optionsError}</Banner>
      ) : null}

      {!deliverable ? (
        <Banner tone="attention" announce>
          {t('auth.notConfigured', { channel: t(vm.channel === 'EMAIL' ? 'auth.channel.EMAIL' : 'auth.channel.WHATSAPP') })}
        </Banner>
      ) : null}

      {/* The design labels this "Send verification code", but in this flow step 1
          only advances to the delivery confirmation, where a WhatsApp user can add
          a backup email. Labelling it "Send" here would be a button that lies. */}
      <SubmitButton busy={vm.busy} disabled={!deliverable}>
        {t('auth.continue')}
      </SubmitButton>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
        <a href="/lost-phone" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sk-color-action)', textDecoration: 'none' }}>
          {t('auth.lostPhone')} →
        </a>
      </div>

      <p className="sk-authform__terms">
        {t('auth.terms')}
      </p>
    </div>
  );
});
