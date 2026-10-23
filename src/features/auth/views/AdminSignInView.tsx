import React, { useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { getSetting } from '@/data/services/config';
import { Navigate } from '@/core/navigation';
import { useAuth } from '@/data/contexts/AuthContext';
import { homeForRole } from '@/lib/utils/workflowRouting';
import type { SessionResponse } from '@/data/types/workflowTypes';
import { AuthViewModel, PASSWORD_MAX_LENGTH, STAFF_PIN_LENGTH } from '../viewmodel/AuthViewModel';
import type { StaffSignInMethod } from '../viewmodel/AuthViewModel';
import { OtpVerifyView } from './OtpVerifyView';
import { Wordmark } from './SignInFrame';
import './sign-in-frame.css';
import './admin-sign-in.css';

const HTTP_TOO_MANY = 429;

/**
 * Staff and admin sign-in (canvas AdminSignIn, Tier 1, approved 2026-10-21;
 * decision D3-9). Its own frame: no student marketing, no sign-up link.
 *
 * Same endpoints as the student page with audience STAFF, so the server sends a
 * code only to an active non-student account and answers a student's email
 * exactly as it answers an unknown one. The authenticator step is the server's
 * (requires2FA); a role held to two-step set-up goes to Security, as everywhere.
 * Lock length, tries and session length are the server's: its own messages are
 * shown, never the board's 15 min / 5 tries / 8 h. "Your admin has been told"
 * and new-device approval have no backend, so they are not drawn.
 *
 * Team accounts (founder decision 2026-10-22, an amendment to D3-9's "no shared
 * accounts"): a "Team PIN" option beside the emailed code, shown only while the
 * public setting auth.staff_pin_login_enabled is on (the server refuses it too
 * when off). It replaces the emailed code only: an account with an authenticator
 * still gets that step.
 *
 * Passwords (plan tier1-auth-password-2026-10-22): a "Password" option beside the
 * two, shown only while the public setting auth.password_login_enabled is on. Same
 * rules as the PIN: one answer for every failure, and the authenticator after it.
 */
export const AdminSignInView = observer(function AdminSignInView({ vm, onAccept, pinEnabled = getSetting('auth.staff_pin_login_enabled'), passwordEnabled = getSetting('auth.password_login_enabled') }: { vm: AuthViewModel; onAccept: (response: SessionResponse) => void; pinEnabled?: boolean; passwordEnabled?: boolean }) {
  const t = useT();
  const locked = vm.errorStatus === HTTP_TOO_MANY;
  const methods = METHODS.filter(entry => entry.method === 'CODE' || (entry.method === 'PIN' ? pinEnabled : passwordEnabled));
  const method = methods.some(entry => entry.method === vm.signInMethod) ? vm.signInMethod : 'CODE';
  return (
    <main className="sk-staff">
      <div className="sk-staff__card sk-signin">
        <div className="sk-staff__brand">
          <Wordmark />
          <span className="sk-staff__badge">{t('ident.staff.badge')}</span>
        </div>

        {vm.step === 1 ? (
          <div className="sk-signin__column">
            <h1 className="sk-staff__title">{t('ident.staff.title')}</h1>
            {methods.length > 1 ? <SignInMethodSwitch vm={vm} methods={methods} /> : null}
            {method === 'PIN' ? <PinForm vm={vm} onAccept={onAccept} /> : method === 'PASSWORD' ? <PasswordForm vm={vm} onAccept={onAccept} /> : (
              <form className="sk-signin__column" onSubmit={(e) => { e.preventDefault(); void vm.sendCode(); }}>
                <div className="sk-signin__field">
                  <label className="sk-staff__label" htmlFor="sk-staff-email">{t('ident.staff.email')}</label>
                  <div className="sk-signin__input" data-invalid={Boolean(vm.error)}>
                    <input
                      id="sk-staff-email"
                      type="email"
                      required
                      autoComplete="email"
                      maxLength={254}
                      value={vm.identifier}
                      aria-invalid={Boolean(vm.error)}
                      aria-describedby={vm.error ? 'sk-staff-error' : undefined}
                      onChange={(event) => vm.setIdentifier(event.target.value)}
                    />
                  </div>
                </div>
                {vm.error ? (
                  <div className="sk-otp__note sk-otp__note--error" role="alert" id="sk-staff-error">
                    <span className="sk-otp__note-icon"><Icon name="alert-circle-4" size={20} /></span>
                    <span>
                      {locked ? <strong>{t('ident.otp.tooManyTitle')}</strong> : null}
                      {vm.error}
                    </span>
                  </div>
                ) : null}
                <button type="submit" className="sk-staff__primary" disabled={vm.busy || !vm.identifier.includes('@')} aria-busy={vm.busy}>
                  {vm.busy ? t('auth.sending') : t('ident.staff.send')}
                </button>
                <p className="sk-staff__note">{t('ident.staff.note')}</p>
              </form>
            )}
            <a className="sk-signin__secondary" href="/login">{t('ident.staff.student')}</a>
          </div>
        ) : null}

        {vm.step === 3 ? (
          <form className="sk-signin__column" onSubmit={(e) => { e.preventDefault(); void vm.verify(onAccept); }}>
            <OtpVerifyView vm={vm} onEdit={() => vm.advance(1)} allowSwitch={false} />
          </form>
        ) : null}

        {vm.step === 7 ? (
          <form className="sk-signin__column" onSubmit={(e) => { e.preventDefault(); void vm.verify2FA(onAccept); }}>
            <h1 className="sk-staff__title">{t('auth.twofa.title')}</h1>
            <p className="sk-signin__lead">{t('auth.twofa.body')}</p>
            <div className="sk-signin__field">
              <label className="sk-staff__label" htmlFor="sk-staff-totp">{t('auth.twofa.label')}</label>
              <div className="sk-signin__input">
                <input
                  id="sk-staff-totp"
                  className="sk-staff__code"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={vm.twoFaCode}
                  onChange={(event) => vm.setTwoFaCode(event.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="sk-staff__primary" disabled={vm.busy || vm.twoFaCode.length !== 6} aria-busy={vm.busy}>
              <Icon name="check" size={18} />
              {t('auth.verifySignIn')}
            </button>
          </form>
        ) : null}

        {vm.twoFaRestart ? <p className="sk-staff__note" role="alert">{t(vm.twoFaRestart)}</p> : null}
      </div>
    </main>
  );
});

const METHODS: readonly { method: StaffSignInMethod; label: MessageKey; icon: SkIconName }[] = [
  { method: 'CODE', label: 'team.signin.methodCode', icon: 'mail-2' },
  { method: 'PIN', label: 'team.signin.methodPin', icon: 'key' },
  { method: 'PASSWORD', label: 'team.signin.methodPassword', icon: 'lock' },
];

/**
 * Emailed code, team PIN or password: a radio group drawn as pills, only the ones
 * switched on. Arrow keys move between them (one tab stop), as a native radio group does.
 */
const SignInMethodSwitch = observer(function SignInMethodSwitch({ vm, methods }: { vm: AuthViewModel; methods: typeof METHODS }) {
  const t = useT();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + methods.length) % methods.length;
    refs.current[next]?.focus();
    vm.setSignInMethod(methods[next].method);
  };
  return (
    <div className="sk-staff__methods" role="radiogroup" aria-label={t('team.signin.methodLabel')}>
      {methods.map((entry, index) => {
        const checked = vm.signInMethod === entry.method;
        return (
          <button
            key={entry.method}
            ref={(element) => { refs.current[index] = element; }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className="sk-staff__method"
            onClick={() => vm.setSignInMethod(entry.method)}
            onKeyDown={(event) => move(event, index)}
          >
            <Icon name={entry.icon} size={18} />
            {t(entry.label)}
          </button>
        );
      })}
    </div>
  );
});

/**
 * A team account's ID and 6-digit PIN (founder decision 2026-10-22). The server
 * gives one answer for an unknown ID, a wrong PIN and a locked account, and its
 * message carries the attempt and lock numbers; the page never guesses them.
 */
const PinForm = observer(function PinForm({ vm, onAccept }: { vm: AuthViewModel; onAccept: (response: SessionResponse) => void }) {
  const t = useT();
  const described = ['sk-staff-pin-hint', vm.error ? 'sk-staff-pin-error' : ''].filter(Boolean).join(' ');
  return (
    <form className="sk-signin__column" onSubmit={(e) => { e.preventDefault(); void vm.signInWithPin(onAccept); }}>
      <div className="sk-signin__field">
        <label className="sk-staff__label" htmlFor="sk-staff-pin-id">{t('team.signin.id')}</label>
        <div className="sk-signin__input" data-invalid={Boolean(vm.error)}>
          <input
            id="sk-staff-pin-id"
            type="email"
            required
            autoComplete="username"
            maxLength={254}
            value={vm.identifier}
            aria-invalid={Boolean(vm.error)}
            aria-describedby="sk-staff-pin-id-hint"
            onChange={(event) => vm.setIdentifier(event.target.value)}
          />
        </div>
        <p className="sk-staff__hint" id="sk-staff-pin-id-hint">{t('team.signin.idHint')}</p>
      </div>
      <div className="sk-signin__field">
        <label className="sk-staff__label" htmlFor="sk-staff-pin">{t('team.signin.pin')}</label>
        <div className="sk-signin__input" data-invalid={Boolean(vm.error)}>
          <input
            id="sk-staff-pin"
            className="sk-staff__code"
            type="password"
            required
            inputMode="numeric"
            autoComplete="off"
            pattern={`[0-9]{${STAFF_PIN_LENGTH}}`}
            maxLength={STAFF_PIN_LENGTH}
            value={vm.pin}
            aria-invalid={Boolean(vm.error)}
            aria-describedby={described}
            onChange={(event) => vm.setPin(event.target.value)}
          />
        </div>
        <p className="sk-staff__hint" id="sk-staff-pin-hint">{t('team.signin.pinHint')}</p>
      </div>
      {vm.error ? (
        <div className="sk-otp__note sk-otp__note--error" role="alert" id="sk-staff-pin-error">
          <span className="sk-otp__note-icon"><Icon name="alert-circle-4" size={20} /></span>
          <span>
            <strong>{vm.errorStatus === HTTP_TOO_MANY ? t('ident.otp.tooManyTitle') : t('team.signin.failedTitle')}</strong>
            {vm.error}
          </span>
        </div>
      ) : null}
      <button type="submit" className="sk-staff__primary" disabled={!vm.canSubmitPin} aria-busy={vm.busy}>
        {vm.busy ? t('team.signin.signingIn') : t('team.signin.submit')}
      </button>
      <p className="sk-staff__note">{t('team.signin.note')}</p>
    </form>
  );
});

/**
 * A team account's ID and password. Like the PIN form: the server's one answer for
 * every failure is shown as it is, and the field empties after each try. "Show"
 * is a text button (the icon kit has no eye-off, plan D-6).
 */
const PasswordForm = observer(function PasswordForm({ vm, onAccept }: { vm: AuthViewModel; onAccept: (response: SessionResponse) => void }) {
  const t = useT();
  const [shown, setShown] = useState(false);
  const described = ['sk-staff-password-hint', vm.error ? 'sk-staff-password-error' : ''].filter(Boolean).join(' ');
  return (
    <form className="sk-signin__column" onSubmit={(e) => { e.preventDefault(); setShown(false); void vm.signInWithPassword(onAccept); }}>
      <div className="sk-signin__field">
        <label className="sk-staff__label" htmlFor="sk-staff-password-id">{t('team.signin.id')}</label>
        <div className="sk-signin__input" data-invalid={Boolean(vm.error)}>
          <input
            id="sk-staff-password-id"
            type="email"
            required
            autoComplete="username"
            maxLength={254}
            value={vm.identifier}
            aria-invalid={Boolean(vm.error)}
            aria-describedby="sk-staff-password-id-hint"
            onChange={(event) => vm.setIdentifier(event.target.value)}
          />
        </div>
        <p className="sk-staff__hint" id="sk-staff-password-id-hint">{t('team.signin.idHint')}</p>
      </div>
      <div className="sk-signin__field">
        <label className="sk-staff__label" htmlFor="sk-staff-password">{t('team.signin.password')}</label>
        <div className="sk-signin__input" data-invalid={Boolean(vm.error)}>
          <input
            id="sk-staff-password"
            type={shown ? 'text' : 'password'}
            required
            autoComplete="current-password"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={PASSWORD_MAX_LENGTH}
            value={vm.password}
            aria-invalid={Boolean(vm.error)}
            aria-describedby={described}
            onChange={(event) => vm.setPassword(event.target.value)}
          />
          <button
            type="button"
            className="sk-staff__reveal"
            aria-pressed={shown}
            aria-label={t(shown ? 'team.signin.hideAria' : 'team.signin.showAria')}
            aria-controls="sk-staff-password"
            onClick={() => setShown(value => !value)}
          >
            {t(shown ? 'team.signin.hide' : 'team.signin.show')}
          </button>
        </div>
        <p className="sk-staff__hint" id="sk-staff-password-hint">{t('team.signin.passwordHint')}</p>
      </div>
      {vm.error ? (
        <div className="sk-otp__note sk-otp__note--error" role="alert" id="sk-staff-password-error">
          <span className="sk-otp__note-icon"><Icon name="alert-circle-4" size={20} /></span>
          <span>
            <strong>{vm.errorStatus === HTTP_TOO_MANY ? t('ident.otp.tooManyTitle') : t('team.signin.failedTitle')}</strong>
            {vm.error}
          </span>
        </div>
      ) : null}
      <button type="submit" className="sk-staff__primary" disabled={!vm.canSubmitPassword} aria-busy={vm.busy}>
        {vm.busy ? t('team.signin.signingIn') : t('team.signin.submit')}
      </button>
      <p className="sk-staff__note">{t('team.signin.note')}</p>
    </form>
  );
});

/** Route /staff-sign-in. Signed in already: straight to that role's home. */
export const AdminSignInScreen = observer(function AdminSignInScreen() {
  const auth = useAuth();
  const vm = useMemo(() => {
    const model = new AuthViewModel('login', null);
    model.setAudience('STAFF');
    return model;
  }, []);
  useEffect(() => {
    const update = () => vm.tick();
    update();
    if (vm.resendAt <= Date.now()) return;
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [vm, vm.resendAt]);
  useEffect(() => () => vm.dispose(), [vm]);
  if (auth.status === 'authenticated' && auth.user) return <Navigate to={`/${homeForRole(auth.user.role)}`} replace />;
  return <AdminSignInView vm={vm} onAccept={(response) => auth.acceptSession(response)} />;
});
