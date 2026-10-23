import React, { useEffect, useId, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { AuthViewModel } from '../viewmodel/AuthViewModel';
import { clock, expiryCopy } from './otpCopy';
import { ChannelFailureNote } from './ChannelChoice';
import './sign-in-frame.css';

const LENGTH = 6;
const HTTP_TOO_MANY = 429;

export { clock, expiryCopy } from './otpCopy';

export interface OtpVerifyViewProps {
  vm: AuthViewModel;
  /** Edit: back to the sign-in form with the address kept. */
  onEdit: () => void;
  /** Offer the other channel (from /auth/options). Off for staff, who sign in by work email only. */
  allowSwitch?: boolean;
}

/**
 * Enter your code (canvas OtpVerify, Tier 1, approved 2026-10-21).
 *
 * Six cells drawn over one real field, so paste, autofill (one-time-code) and
 * screen readers get a single input. The expiry comes from the server's
 * expiresInSeconds; the resend wait from the settings registry. A wrong,
 * expired or rate-limited code never opens a session: the server refuses it and
 * this screen only says so (AGENTS.md 2). Lives inside the parent <form>, whose
 * submit calls vm.verify.
 */
export const OtpVerifyView = observer(function OtpVerifyView({ vm, onEdit, allowSwitch = true }: OtpVerifyViewProps) {
  const t = useT();
  const field = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [focused, setFocused] = useState(false);
  // Say once, politely, when a new code can be asked for: not every second.
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(vm.seconds === 0 && vm.resendAt > 0); }, [vm.seconds, vm.resendAt]);

  const expiry = expiryCopy(vm.expiresInSeconds);
  const otherChannel = vm.channel === 'EMAIL' ? 'WHATSAPP' : 'EMAIL';
  const canSwitch = allowSwitch && vm.offeredChannels.includes(otherChannel);
  const tooMany = vm.errorStatus === HTTP_TOO_MANY;
  const digits = vm.code.split('');

  return (
    <>
      <div className="sk-signin__head">
        <h1 className="sk-signin__title">{t('ident.otp.title')}</h1>
        <p className="sk-signin__lead">{t(expiry.key, expiry.vars)}</p>
      </div>

      <div className="sk-otp__target">
        <Icon name="mail-2" size={20} />
        <div className="sk-otp__target-words">
          <span className="sk-otp__eyebrow">{t('ident.otp.sentTo')}</span>
          <span className="sk-otp__masked">{vm.masked}</span>
        </div>
        <button type="button" className="sk-signin__secondary" onClick={onEdit} disabled={vm.busy} aria-label={t('ident.otp.editSpoken')}>
          {t('ident.otp.edit')}
        </button>
      </div>

      {vm.fallbackNotice ? <p className="sk-signin__hint" role="status">{vm.fallbackNotice}</p> : null}

      <fieldset className="sk-otp__cells" data-invalid={Boolean(vm.error)}>
        <legend>{t('ident.otp.label')}</legend>
        <div className="sk-otp__row" onClick={() => field.current?.focus()}>
          {Array.from({ length: LENGTH }, (_, index) => (
            <span
              key={index}
              aria-hidden="true"
              className="sk-otp__cell"
              data-filled={index < digits.length}
              data-active={focused && index === Math.min(digits.length, LENGTH - 1)}
            >
              {digits[index] ?? ''}
            </span>
          ))}
        </div>
        <input
          ref={field}
          className="sk-sr-only"
          aria-label={t('ident.otp.label')}
          aria-invalid={Boolean(vm.error)}
          aria-describedby={vm.error ? errorId : undefined}
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={LENGTH}
          value={vm.code}
          autoFocus
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => vm.setCode(event.target.value)}
        />
      </fieldset>

      <div className="sk-otp__resend">
        {vm.seconds > 0 ? (
          <span>{t('ident.otp.resendIn')} <strong>{clock(vm.seconds)}</strong></span>
        ) : (
          <button type="button" className="sk-signin__secondary" disabled={vm.busy} onClick={() => void vm.sendCode()}>
            <Icon name="refresh" size={16} />
            {t('ident.otp.resend')}
          </button>
        )}
        {canSwitch && vm.seconds === 0 ? (
          <button
            type="button"
            className="sk-signin__secondary sk-otp__alt"
            disabled={vm.busy}
            onClick={onEdit}
          >
            <Icon name="refresh" size={16} />
            {t(otherChannel === 'WHATSAPP' ? 'ident.otp.useWhatsapp' : 'ident.otp.useEmail')}
          </button>
        ) : null}
      </div>
      <p className="sk-sr-only" role="status">{ready ? t('ident.otp.resendReady') : ''}</p>

      {vm.channelFailure ? <ChannelFailureNote vm={vm} id={errorId} /> : null}
      {vm.error && !vm.channelFailure ? (
        <div className="sk-otp__note sk-otp__note--error" role="alert" id={errorId}>
          <span className="sk-otp__note-icon"><Icon name="alert-circle-4" size={20} /></span>
          <span>
            <strong>{t(tooMany ? 'ident.otp.tooManyTitle' : 'ident.otp.wrongTitle')}</strong>
            {tooMany ? t('ident.otp.tooManyBody') : vm.error}
          </span>
        </div>
      ) : null}

      <button type="submit" className="sk-signin__primary" disabled={vm.busy || vm.code.length !== LENGTH || tooMany} aria-busy={vm.busy}>
        {t('auth.verifyContinue')}
      </button>

      <div className="sk-otp__note">
        <span className="sk-otp__note-icon"><Icon name="alert-circle-4" size={20} /></span>
        <span>
          <strong>{t('ident.otp.helpTitle')}</strong>
          {t(vm.channel === 'EMAIL' ? 'ident.otp.helpBody.EMAIL' : 'ident.otp.helpBody.WHATSAPP')}
        </span>
      </div>
      <p className="sk-otp__never">{t('ident.otp.never')}</p>
    </>
  );
});
