import React, { useId, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Banner } from '@/design-system';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import type { AuthViewModel } from '../viewmodel/AuthViewModel';
import { channelFieldCopy, channelIsDeliverable, type AuthChannel } from './channelCopy';
import './sign-in-frame.css';

/** The board's order: Email first, then WhatsApp. Icons from the brief (mail-2, message-circle-3). */
const CHANNELS: ReadonlyArray<{ id: AuthChannel; label: MessageKey; icon: SkIconName }> = [
  { id: 'EMAIL', label: 'auth.channel.EMAIL', icon: 'mail-2' },
  { id: 'WHATSAPP', label: 'auth.channel.WHATSAPP', icon: 'message-circle-3' },
];

/**
 * Sign in (canvas SignIn / WebSignIn, Tier 1, approved 2026-10-21).
 *
 * Binds to AuthViewModel and adds no API calls: "Send verification code" calls
 * the same POST /auth/otp/send as before (the old in-between confirmation step
 * only collected a backup email the server never uses: it sends a fallback only
 * to the account's own verified recovery address). The channels come from
 * GET /auth/options; one that cannot be delivered says so and the button stays off.
 *
 * "Continue with campus ID" is drawn switched off with the reason: there is no
 * single sign-on for any campus (decision D3-2).
 */
export const SignInView = observer(function SignInView({ vm }: { vm: AuthViewModel }) {
  const t = useT();
  const hintId = useId();
  const errorId = useId();
  const copy = channelFieldCopy(vm.channel);
  const deliverable = channelIsDeliverable(vm.channel, vm.channels);
  // Presentation only: the browser's own constraint check still decides
  // whether the form submits; this shows its verdict on the field.
  const [invalid, setInvalid] = useState(false);

  return (
    <>
      <div className="sk-signin__head">
        <h1 className="sk-signin__title">{t('auth.signin.title')}</h1>
        <p className="sk-signin__lead">{t('auth.signin.lead')}</p>
      </div>

      <div className="sk-signin__channels" role="group" aria-label={t('auth.channels')}>
        {CHANNELS.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={vm.channel === id}
            disabled={vm.busy}
            onClick={() => { vm.setChannel(id); setInvalid(false); }}
          >
            <Icon name={icon} size={16} />
            {t(label)}
          </button>
        ))}
      </div>

      <div className="sk-signin__field">
        <label className="sk-signin__label" htmlFor="sk-signin-identifier">{t(copy.label)}</label>
        <div className="sk-signin__input" data-invalid={invalid}>
          <Icon name={vm.channel === 'EMAIL' ? 'mail-2' : 'message-circle-3'} size={18} />
          <input
            id="sk-signin-identifier"
            required
            type={copy.inputType}
            autoComplete={copy.autoComplete}
            value={vm.identifier}
            aria-invalid={invalid}
            aria-describedby={invalid ? `${errorId} ${hintId}` : hintId}
            onChange={(event) => {
              vm.setIdentifier(event.target.value);
              if (invalid && event.target.validity.valid) setInvalid(false);
            }}
            onInvalid={(event) => { event.preventDefault(); setInvalid(true); event.currentTarget.focus(); }}
            maxLength={254}
            placeholder={copy.placeholder}
          />
        </div>
        {invalid ? (
          <p className="sk-signin__error" id={errorId} role="alert">
            {t(vm.channel === 'EMAIL' ? 'auth.signin.invalid.EMAIL' : 'auth.signin.invalid.WHATSAPP')}
          </p>
        ) : null}
        <p className="sk-signin__hint" id={hintId}>
          {t(vm.channel === 'EMAIL' ? 'auth.signin.hint.EMAIL' : 'auth.signin.hint.WHATSAPP')}
        </p>
      </div>

      {vm.optionsError ? <Banner tone="attention" announce>{vm.optionsError}</Banner> : null}
      {!deliverable && !vm.optionsLoading ? (
        <Banner tone="attention" announce>
          {t('auth.notConfigured', { channel: t(vm.channel === 'EMAIL' ? 'auth.channel.EMAIL' : 'auth.channel.WHATSAPP') })}
        </Banner>
      ) : null}

      <button type="submit" className="sk-signin__primary" disabled={!deliverable || vm.busy} aria-busy={vm.busy}>
        {vm.busy ? t('auth.sending') : t('ident.signin.send')}
      </button>

      <div className="sk-signin__or" aria-hidden="true">{t('ident.signin.or')}</div>

      <button type="button" className="sk-signin__sso" disabled aria-describedby="sk-signin-sso-off">
        <span className="sk-signin__sso-tile"><Icon name="graduation-cap" size={20} /></span>
        <span className="sk-signin__sso-words">
          <span className="sk-signin__sso-title">{t('ident.signin.campusId')}</span>
          <span className="sk-signin__sso-meta" id="sk-signin-sso-off">{t('ident.signin.campusIdOff')}</span>
        </span>
        <Icon name="chevron-right" size={18} />
      </button>
    </>
  );
});
