import React, { useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { Navigate } from '@/core/navigation';
import { useAuth } from '@/data/contexts/AuthContext';
import { homeForRole } from '@/lib/utils/workflowRouting';
import type { SessionResponse } from '@/data/types/workflowTypes';
import { AuthViewModel } from '../viewmodel/AuthViewModel';
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
 */
export const AdminSignInView = observer(function AdminSignInView({ vm, onAccept }: { vm: AuthViewModel; onAccept: (response: SessionResponse) => void }) {
  const t = useT();
  const locked = vm.errorStatus === HTTP_TOO_MANY;
  return (
    <main className="sk-staff">
      <div className="sk-staff__card sk-signin">
        <div className="sk-staff__brand">
          <Wordmark />
          <span className="sk-staff__badge">{t('ident.staff.badge')}</span>
        </div>

        {vm.step === 1 ? (
          <form className="sk-signin__column" onSubmit={(e) => { e.preventDefault(); void vm.sendCode(); }}>
            <h1 className="sk-staff__title">{t('ident.staff.title')}</h1>
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
            <a className="sk-signin__secondary" href="/login">{t('ident.staff.student')}</a>
          </form>
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
