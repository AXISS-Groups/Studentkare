import React, { useEffect, useId, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SessionResponse } from '@/data/types/workflowTypes';
import type { AuthViewModel } from '../viewmodel/AuthViewModel';
import { PASSCODE_MAX_LENGTH } from '../viewmodel/passcodeRules';
import './sign-in-frame.css';

/**
 * "Continue as …" (the device remembers the last sign-in, email or phone,
 * masked). "Use my passcode" sits beside the code only when the remembered
 * account has one and passcodes are on. Not you? hides it for this visit;
 * Forget this device clears it on the server (and ends passcode use here).
 */
export const RememberedView = observer(function RememberedView({ vm }: { vm: AuthViewModel }) {
  const t = useT();
  const device = vm.remembered;
  if (!device) return null;
  const email = device.channel === 'EMAIL';
  return (
    <div className="sk-signin__column">
      <div className="sk-signin__head">
        <h1 className="sk-signin__title">{t('auth.signin.title')}</h1>
        <p className="sk-signin__lead">{t(vm.rememberedPasscode ? 'authpc.remembered.leadPasscode' : 'auth.remembered.lead')}</p>
      </div>
      <div className="sk-remembered" data-testid="remembered-account">
        <span className="sk-remembered__avatar" aria-hidden="true">
          <Icon name={email ? 'mail-2' : 'message-circle-3'} size={22} />
        </span>
        <span className="sk-remembered__words">
          <span className="sk-remembered__who">{t('authpc.remembered.who')}</span>
          <span className="sk-remembered__masked">{device.targetMasked}</span>
        </span>
      </div>
      <button type="button" className="sk-signin__primary" disabled={vm.busy} aria-busy={vm.busy} onClick={() => void vm.continueRemembered()}>
        {t('auth.remembered.continue', { masked: device.targetMasked })}
        <Icon name="arrow-right" size={20} />
      </button>
      {vm.rememberedPasscode ? (
        <button type="button" className="sk-signin__ghost" disabled={vm.busy} onClick={vm.startPasscode}>
          <Icon name="key" size={18} />
          {t('authpc.usePasscode')}
        </button>
      ) : null}
      <div className="sk-remembered__links">
        <button type="button" className="sk-signin__secondary" disabled={vm.busy} onClick={vm.useAnotherAccount}>{t('auth.remembered.notYou')}</button>
        <button type="button" className="sk-signin__secondary" disabled={vm.busy} onClick={() => void vm.forgetDevice()}>{t('auth.remembered.forget')}</button>
      </div>
    </div>
  );
});

/**
 * The passcode panel (students only). One password field (4, 6 or 8
 * characters, shown on request), Sign in, and the code path always beside it:
 * "Send a code instead" and "Forgot your passcode? Sign in with a code" (which
 * then goes on to set a new one). A device that hasn't signed in before is told
 * to use a code once, with the action to do it.
 */
export const PasscodeSignInView = observer(function PasscodeSignInView({ vm, onAccept }: { vm: AuthViewModel; onAccept: (response: SessionResponse) => void }) {
  const t = useT();
  const hintId = useId();
  const errorId = useId();
  const field = useRef<HTMLInputElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => { field.current?.focus(); }, []);
  const problem = vm.passcodeProblem;

  const note = problem === 'NEW_DEVICE' ? (
    <div className="sk-auth-note sk-auth-note--info" role="alert" id={errorId}>
      <span className="sk-auth-note__icon"><Icon name="devices" size={20} /></span>
      <span className="sk-auth-note__words">
        <strong>{t('authpc.newDevice.title')}</strong>
        {t('authpc.newDevice.body')}
        <button type="button" className="sk-auth-note__action" onClick={() => void vm.useCodeInstead()} disabled={vm.busy}>
          {t('authpc.newDevice.action')}
          <Icon name="arrow-right" size={16} />
        </button>
      </span>
    </div>
  ) : problem === 'FAILED' || problem === 'OTHER' ? (
    <div className="sk-auth-note sk-auth-note--attention" role="alert" id={errorId}>
      <span className="sk-auth-note__icon"><Icon name="alert-circle-4" size={20} /></span>
      <span className="sk-auth-note__words">
        <strong>{t(problem === 'FAILED' ? 'authpc.enter.failedTitle' : 'authpc.enter.otherTitle')}</strong>
        {vm.passcodeMessage}
      </span>
    </div>
  ) : problem === 'DISABLED' ? (
    <div className="sk-auth-note sk-auth-note--info" role="alert" id={errorId}>
      <span className="sk-auth-note__icon"><Icon name="info" size={20} /></span>
      <span className="sk-auth-note__words">{t('authpc.disabled')}</span>
    </div>
  ) : null;

  return (
    <form className="sk-signin__column" onSubmit={(event) => { event.preventDefault(); void vm.signInWithPasscode(onAccept); }}>
      <div className="sk-signin__head">
        <h1 className="sk-signin__title">{t('authpc.enter.title')}</h1>
        <p className="sk-signin__lead">
          {vm.remembered ? t('authpc.enter.lead', { masked: vm.remembered.targetMasked }) : t('authpc.enter.leadTyped')}
        </p>
      </div>

      <div className="sk-signin__field">
        <label className="sk-signin__label" htmlFor="sk-passcode">{t('authpc.enter.label')}</label>
        <div className="sk-signin__input" data-invalid={problem === 'FAILED'}>
          <Icon name="lock-keyhole" size={18} />
          <input
            ref={field}
            id="sk-passcode"
            type={shown ? 'text' : 'password'}
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={PASSCODE_MAX_LENGTH}
            value={vm.passcode}
            onChange={(event) => vm.setPasscode(event.target.value)}
            aria-invalid={problem === 'FAILED'}
            aria-describedby={note ? `${errorId} ${hintId}` : hintId}
          />
          <button type="button" className="sk-passcode__show" aria-pressed={shown} aria-label={t('authpc.enter.show')} onClick={() => setShown((value) => !value)}>
            <Icon name={shown ? 'eye-off' : 'eye'} size={20} />
          </button>
        </div>
        <p className="sk-signin__hint" id={hintId}>{t('authpc.enter.hint')}</p>
      </div>

      {note}

      <button type="submit" className="sk-signin__primary" disabled={!vm.canSubmitPasscode} aria-busy={vm.busy}>
        {vm.busy ? t('authpc.enter.signingIn') : t('authpc.enter.submit')}
        {vm.busy ? null : <Icon name="arrow-right" size={20} />}
      </button>
      <div className="sk-remembered__links">
        <button type="button" className="sk-signin__secondary" disabled={vm.busy} onClick={() => void vm.useCodeInstead()}>
          <Icon name="message-circle-3" size={16} />
          {t('authpc.enter.useCode')}
        </button>
        <button type="button" className="sk-signin__secondary" disabled={vm.busy} onClick={() => void vm.forgotPasscode()}>
          {t('authpc.enter.forgot')}
        </button>
        <button type="button" className="sk-signin__secondary" disabled={vm.busy} onClick={vm.leavePasscode}>
          <Icon name="arrow-left" size={16} />
          {t('authpc.enter.back')}
        </button>
      </div>
    </form>
  );
});
