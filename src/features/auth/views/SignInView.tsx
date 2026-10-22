import React, { useEffect, useId, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { AuthViewModel } from '../viewmodel/AuthViewModel';
import { channelFieldCopy, channelIsDeliverable } from './channelCopy';
import { ChannelFailureNote, ChannelSwitch, NoAccountNote, NoChannelState, SendErrorNote } from './ChannelChoice';
import './sign-in-frame.css';

/**
 * Sign in (canvas SignIn / WebSignIn, Tier 1, approved 2026-10-21).
 *
 * Binds to AuthViewModel and adds no API calls: "Send verification code" calls
 * POST /auth/otp/send. Only the channels GET /auth/options returned are drawn
 * (WhatsApp only while its session is connected); with one there is no
 * switcher, with none an honest "can't be sent right now" state replaces the
 * form. A send that fails on its channel says so next to the field and offers
 * the other channel in one tap. Errors sit by the field and are announced.
 *
 * "Continue with campus ID" is drawn switched off with the reason: there is no
 * single sign-on for any campus (decision D3-2).
 */
export const SignInView = observer(function SignInView({ vm, onCreateAccount }: { vm: AuthViewModel; onCreateAccount: () => void }) {
  const t = useT();
  const hintId = useId();
  const errorId = useId();
  const field = useRef<HTMLInputElement>(null);
  const copy = channelFieldCopy(vm.channel);
  const deliverable = channelIsDeliverable(vm.channel, vm.offeredChannels);
  // Presentation only: the browser's own constraint check still decides
  // whether the form submits; this shows its verdict on the field.
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    if (vm.focusContactRequest > 0) field.current?.focus();
  }, [vm.focusContactRequest]);

  const head = (
    <div className="sk-signin__head">
      <h1 className="sk-signin__title">{t('auth.signin.title')}</h1>
      <p className="sk-signin__lead">{t('auth.signin.lead')}</p>
    </div>
  );

  if (vm.noChannel) {
    return (
      <>
        {head}
        <NoChannelState vm={vm} />
      </>
    );
  }

  const sendError = vm.channelFailure
    ? <ChannelFailureNote vm={vm} id={errorId} />
    : vm.noAccount
      ? <NoAccountNote id={errorId} onCreate={onCreateAccount} />
      : vm.error
        ? <SendErrorNote id={errorId} message={vm.error} />
        : null;
  const describedBy = [invalid || sendError ? errorId : '', hintId].filter(Boolean).join(' ');
  // Red on the field only when what was typed is the problem (invalid, or no
  // account uses it); a channel that is down is on our side.
  const fieldInvalid = invalid || (Boolean(vm.error) && !vm.channelFailure);

  return (
    <>
      {head}

      <ChannelSwitch vm={vm} onPick={() => setInvalid(false)} />

      <div className="sk-signin__field">
        <label className="sk-signin__label" htmlFor="sk-signin-identifier">{t(copy.label)}</label>
        <div className="sk-signin__input" data-invalid={fieldInvalid}>
          {vm.channel === 'EMAIL'
            ? <Icon name="mail-2" size={18} />
            : <span className="sk-signin__prefix">{t('launch.create.countryCode')}</span>}
          <input
            ref={field}
            id="sk-signin-identifier"
            required
            type={copy.inputType}
            inputMode={vm.channel === 'EMAIL' ? 'email' : 'tel'}
            autoComplete={copy.autoComplete}
            value={vm.identifier}
            aria-invalid={fieldInvalid}
            aria-describedby={describedBy}
            onChange={(event) => {
              vm.setIdentifier(event.target.value);
              if (invalid && event.target.validity.valid) setInvalid(false);
            }}
            onInvalid={(event) => { event.preventDefault(); setInvalid(true); event.currentTarget.focus(); }}
            maxLength={254}
            placeholder={vm.channel === 'EMAIL' ? copy.placeholder : t('launch.create.phonePlaceholder')}
          />
        </div>
        {invalid ? (
          <p className="sk-signin__error" id={errorId} role="alert">
            <Icon name="alert-circle-4" size={16} />
            {t(vm.channel === 'EMAIL' ? 'auth.signin.invalid.EMAIL' : 'auth.signin.invalid.WHATSAPP')}
          </p>
        ) : null}
        <p className="sk-signin__hint" id={hintId}>
          {t(vm.channel === 'EMAIL' ? 'auth.signin.hint.EMAIL' : 'auth.signin.hint.WHATSAPP')}
        </p>
      </div>

      {invalid ? null : sendError}
      {vm.optionsError && !vm.optionsLoaded ? <p className="sk-signin__hint" role="status">{t('authch.optionsError')}</p> : null}
      {!deliverable && !vm.channelFailure ? (
        <p className="sk-signin__hint" role="status">
          {t('auth.notConfigured', { channel: t(vm.channel === 'EMAIL' ? 'auth.channel.EMAIL' : 'auth.channel.WHATSAPP') })}
        </p>
      ) : null}

      <button type="submit" className="sk-signin__primary" disabled={!deliverable || vm.busy} aria-busy={vm.busy}>
        {vm.busy ? t('auth.sending') : t('ident.signin.send')}
        {vm.busy ? null : <Icon name="arrow-right" size={20} />}
      </button>
      {/* Beside the code, never instead of it: the server accepts it only on a device that has signed in before. */}
      {vm.passcodeEnabled ? (
        <button type="button" className="sk-signin__ghost" disabled={vm.busy} onClick={vm.startPasscode} aria-describedby={vm.passcodeProblem === 'NEED_ID' ? 'sk-passcode-need-id' : undefined}>
          <Icon name="key" size={18} />
          {t('authpc.usePasscode')}
        </button>
      ) : null}
      {vm.passcodeProblem === 'NEED_ID' ? <p className="sk-signin__hint" id="sk-passcode-need-id" role="status">{t('authpc.needId')}</p> : null}
      {/* Plan tier1-auth-password-2026-10-22 (D): works on any device; the code always stays beside it. */}
      {vm.studentPasswordEnabled ? (
        <button type="button" className="sk-signin__ghost" disabled={vm.busy} onClick={vm.startPassword} aria-describedby={vm.passwordProblem === 'NEED_ID' ? 'sk-password-need-id' : undefined}>
          <Icon name="lock-keyhole" size={18} />
          {t('authpw.usePassword')}
        </button>
      ) : null}
      {vm.passwordProblem === 'NEED_ID' ? <p className="sk-signin__hint" id="sk-password-need-id" role="status">{t('authpw.needId')}</p> : null}

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
