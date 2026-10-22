import React, { useEffect, useId, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SessionResponse } from '@/data/types/workflowTypes';
import { PASSWORD_MAX_LENGTH } from '../viewmodel/AuthViewModel';
import type { AuthViewModel } from '../viewmodel/AuthViewModel';
import './sign-in-frame.css';

const CODE_LENGTH = 6;

/** A password field with the eye toggle the passcode field uses. Never pre-filled, never stored. */
export function PasswordInput({ id, label, value, onChange, autoComplete, invalid, describedBy, autoFocus = false }: {
  id: string; label: string; value: string; onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password'; invalid: boolean; describedBy?: string; autoFocus?: boolean;
}) {
  const t = useT();
  const [shown, setShown] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) field.current?.focus(); }, [autoFocus]);
  return (
    <div className="sk-signin__field">
      <label className="sk-signin__label" htmlFor={id}>{label}</label>
      <div className="sk-signin__input" data-invalid={invalid}>
        <Icon name="lock-keyhole" size={18} />
        <input
          ref={field}
          id={id}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={PASSWORD_MAX_LENGTH}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
        <button type="button" className="sk-passcode__show" aria-pressed={shown} aria-controls={id}
          aria-label={t(shown ? 'authpw.enter.hide' : 'authpw.enter.show')} onClick={() => setShown((v) => !v)}>
          <Icon name={shown ? 'eye-off' : 'eye'} size={20} />
        </button>
      </div>
    </div>
  );
}

/**
 * "Use my password" on sign in (students; plan tier1-auth-password-2026-10-22, D).
 * The email or number typed on the form, the password, Sign in, and the code path
 * always beside it: "Send a code instead" and "Forgot your password? Sign in with a
 * code" (which then opens Sign-in & security to set a new one). One answer from the
 * server for every failure, shown as it is.
 */
export const PasswordSignInView = observer(function PasswordSignInView({ vm, onAccept }: { vm: AuthViewModel; onAccept: (response: SessionResponse) => void }) {
  const t = useT();
  const hintId = useId();
  const errorId = useId();
  const problem = vm.passwordProblem;
  const note = problem === 'FAILED' || problem === 'OTHER' ? (
    <div className="sk-auth-note sk-auth-note--attention" role="alert" id={errorId}>
      <span className="sk-auth-note__icon"><Icon name="alert-circle-4" size={20} /></span>
      <span className="sk-auth-note__words">
        <strong>{t(problem === 'FAILED' ? 'authpw.enter.failedTitle' : 'authpw.enter.otherTitle')}</strong>
        {vm.passwordMessage}
      </span>
    </div>
  ) : problem === 'DISABLED' ? (
    <div className="sk-auth-note sk-auth-note--info" role="alert" id={errorId}>
      <span className="sk-auth-note__icon"><Icon name="info" size={20} /></span>
      <span className="sk-auth-note__words">{t('authpw.disabled')}</span>
    </div>
  ) : null;

  return (
    <form className="sk-signin__column" onSubmit={(event) => { event.preventDefault(); void vm.signInWithStudentPassword(onAccept); }}>
      <div className="sk-signin__head">
        <h1 className="sk-signin__title">{t('authpw.enter.title')}</h1>
        <p className="sk-signin__lead">{t('authpw.enter.lead', { id: vm.identifier.trim() })}</p>
      </div>
      <PasswordInput id="sk-student-password" label={t('authpw.enter.label')} value={vm.password} onChange={vm.setStudentPassword}
        autoComplete="current-password" invalid={problem === 'FAILED'} describedBy={note ? `${errorId} ${hintId}` : hintId} autoFocus />
      <p className="sk-signin__hint" id={hintId}>{t('authpw.enter.hint')}</p>
      {note}
      <button type="submit" className="sk-signin__primary" disabled={!vm.canSubmitStudentPassword} aria-busy={vm.busy}>
        {vm.busy ? t('authpw.enter.signingIn') : t('authpw.enter.submit')}
        {vm.busy ? null : <Icon name="arrow-right" size={20} />}
      </button>
      <div className="sk-remembered__links">
        <button type="button" className="sk-signin__secondary" disabled={vm.busy} onClick={() => { vm.leavePassword(); void vm.sendCode(); }}>
          <Icon name="message-circle-3" size={16} />
          {t('authpw.enter.useCode')}
        </button>
        <button type="button" className="sk-signin__secondary" disabled={vm.busy} onClick={() => void vm.forgotPassword()}>
          {t('authpw.enter.forgot')}
        </button>
        <button type="button" className="sk-signin__secondary" disabled={vm.busy} onClick={vm.leavePassword}>
          <Icon name="arrow-left" size={16} />
          {t('authpw.enter.back')}
        </button>
      </div>
    </form>
  );
});

/**
 * Sign-up: verify the other contact (D-2). Type it, send a code, type the code.
 * Only the server marks it verified; a value on another account is refused.
 */
export const SecondContactStep = observer(function SecondContactStep({ vm }: { vm: AuthViewModel }) {
  const t = useT();
  const errorId = useId();
  const hintId = useId();
  const whatsapp = vm.secondChannel === 'WHATSAPP';
  const problem = vm.secondProblem ? (
    <p className="sk-signin__error" id={errorId} role="alert"><Icon name="alert-circle-4" size={16} />{t(vm.secondProblem)}</p>
  ) : null;
  return (
    <form className="sk-signin__column sk-signup-step" onSubmit={(event) => {
      event.preventDefault();
      void (vm.secondSent ? vm.verifySecondCode() : vm.sendSecondCode());
    }}>
      <div className="sk-signin__head">
        <h1 className="sk-signin__title">{t(whatsapp ? 'authpw.second.title.WHATSAPP' : 'authpw.second.title.EMAIL')}</h1>
        <p className="sk-signin__lead">{t('authpw.second.lead')}</p>
      </div>
      {!vm.secondSent ? (
        <div className="sk-signin__field">
          <label className="sk-signin__label" htmlFor="sk-second-contact">{t(whatsapp ? 'contacts.phoneLabel' : 'contacts.emailLabel')}</label>
          <div className="sk-signin__input" data-invalid={Boolean(vm.secondProblem)}>
            {whatsapp ? <span className="sk-signin__prefix">{t('launch.create.countryCode')}</span> : <Icon name="mail-2" size={18} />}
            <input
              id="sk-second-contact"
              required
              type={whatsapp ? 'tel' : 'email'}
              inputMode={whatsapp ? 'tel' : 'email'}
              autoComplete={whatsapp ? 'tel-national' : 'email'}
              maxLength={254}
              value={vm.secondValue}
              onChange={(event) => vm.setSecondValue(event.target.value)}
              aria-invalid={Boolean(vm.secondProblem)}
              aria-describedby={vm.secondProblem ? errorId : undefined}
            />
          </div>
          {problem}
        </div>
      ) : (
        <div className="sk-signin__field">
          <label className="sk-signin__label" htmlFor="sk-second-code">{t('authpw.second.codeLabel')}</label>
          <div className="sk-signin__input" data-invalid={Boolean(vm.secondProblem)}>
            <input
              id="sk-second-code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern={`[0-9]{${CODE_LENGTH}}`}
              maxLength={CODE_LENGTH}
              value={vm.secondCode}
              onChange={(event) => vm.setSecondCode(event.target.value)}
              aria-invalid={Boolean(vm.secondProblem)}
              aria-describedby={vm.secondProblem ? `${errorId} ${hintId}` : hintId}
            />
          </div>
          <p className="sk-signin__hint" id={hintId}>{t('authpw.second.codeHint', { target: vm.secondMasked })}</p>
          {problem}
        </div>
      )}
      <button type="submit" className="sk-signin__primary" disabled={vm.busy || (vm.secondSent ? vm.secondCode.length !== CODE_LENGTH : !vm.secondValue.trim())} aria-busy={vm.busy}>
        {vm.busy ? t('authpw.second.sending') : t(vm.secondSent ? 'authpw.second.verify' : 'authpw.second.send')}
        {vm.busy ? null : <Icon name="arrow-right" size={20} />}
      </button>
      {vm.secondSent ? (
        <button type="button" className="sk-signin__secondary" disabled={vm.busy} onClick={vm.editSecond}>{t('authpw.second.edit')}</button>
      ) : null}
    </form>
  );
});

/** Sign-up: create a password (D-3), typed twice. Strength is the server's call when the account is made. */
export const CreatePasswordStep = observer(function CreatePasswordStep({ vm, next }: { vm: AuthViewModel; next: number }) {
  const t = useT();
  const hintId = useId();
  const errorId = useId();
  const min = vm.passwordMinLength;
  const described = vm.newPasswordProblem ? `${errorId} ${hintId}` : hintId;
  return (
    <form className="sk-signin__column sk-signup-step" onSubmit={(event) => { event.preventDefault(); vm.confirmNewPassword(next); }}>
      <div className="sk-signin__head">
        <h1 className="sk-signin__title">{t('authpw.create.title')}</h1>
        <p className="sk-signin__lead">{t('authpw.create.lead', { min })}</p>
      </div>
      <PasswordInput id="sk-new-password" label={t('authpw.create.label')} value={vm.password} onChange={vm.setNewPassword}
        autoComplete="new-password" invalid={Boolean(vm.newPasswordProblem)} describedBy={described} autoFocus />
      <PasswordInput id="sk-new-password-again" label={t('authpw.create.again')} value={vm.passwordAgain} onChange={vm.setPasswordAgain}
        autoComplete="new-password" invalid={vm.newPasswordProblem === 'authpw.mismatch'} describedBy={described} />
      <p className="sk-signin__hint" id={hintId}>{t('authpw.create.hint')}</p>
      {vm.newPasswordProblem ? (
        <p className="sk-signin__error" id={errorId} role="alert"><Icon name="alert-circle-4" size={16} />{t(vm.newPasswordProblem, { min })}</p>
      ) : null}
      <button type="submit" className="sk-signin__primary" disabled={vm.busy || !vm.password || !vm.passwordAgain}>
        {t('authpw.create.continue')}
        <Icon name="arrow-right" size={20} />
      </button>
    </form>
  );
});
