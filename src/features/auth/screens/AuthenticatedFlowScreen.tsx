import React, { useEffect } from 'react';
import { useLanguage, useT } from '@/i18n';
import { LanguageSetting } from '@/i18n/LanguageSetting';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { usePhoneFrame } from '@/design-system/navigation/usePhoneFrame';
import { AuthLayout } from '@/components/interface/AuthLayout';
import { PageTransition } from '@/components/interface/PageTransition';
import { Field, FormError, SubmitButton } from '@/components/interface/WorkflowUI';
import { useAuth } from '@/data/contexts/AuthContext';
import { isDev } from '@/core/env';
import { navigate } from '@/lib/utils/workflowRouting';
import { useLocation } from '@/core/navigation';
import { inviteCodeFromSearch } from '@/features/rewards/inviteCode';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import type { SessionResponse } from '@/data/types/workflowTypes';
import { CrisisLinks } from '@/design-system';
import { AuthViewModel } from '../viewmodel/AuthViewModel';
import { SignInView } from '../views/SignInView';
import { OtpVerifyView } from '../views/OtpVerifyView';
import { SignInFrame, TermsLine } from '../views/SignInFrame';
import { CreateAccountView } from '../views/CreateAccountView';
import { SignupConsent } from '../views/SignupConsent';

/** Sign-up steps drawn by AuthLayout's stepper; the consent screen is part of the last one. */
const SIGNUP_STEPS = 6;
/** The consent screen (OnboardingConsent): after campus details, before the account exists. */
const CONSENT_STEP = 8;

/**
 * /login and /signup (Tier 1 boards SignIn, WebSignIn, OtpVerify, OnboardingConsent;
 * approved 2026-10-21, plan tier1-canvas-wp03). Sign-in draws its own frame (phone
 * header or the web brand panel, no stepper); sign-up keeps AuthLayout, with the code
 * and consent steps drawn to their boards. The orchestration is AuthViewModel's.
 */
export const AuthenticatedFlowScreen = observer(function AuthenticatedFlowScreen({ mode, next }: { mode: 'login' | 'signup'; next: RoutePath | null }) {
  const auth = useAuth();
  const vm = React.useMemo(() => new AuthViewModel(mode, next), [mode, next]);
  const { lang } = useLanguage();
  const phone = usePhoneFrame();
  useEffect(() => vm.setConsentLanguage(lang), [vm, lang]);
  const location = useLocation();
  // An invite link is /signup?ref=CODE: carry the code into registration.
  useEffect(() => {
    if (mode === 'signup') vm.setReferralCode(inviteCodeFromSearch(location.search));
  }, [vm, mode, location.search]);
  const t = useT();

  useEffect(() => {
    void vm.loadOptions();
    void vm.loadRemembered();
    return () => vm.dispose();
  }, [vm]);

  useEffect(() => {
    const update = () => vm.tick();
    update();
    if (vm.resendAt <= Date.now()) return;
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [vm, vm.resendAt]);

  const accept = (response: SessionResponse) => auth.acceptSession(response);

  // Development builds only (isDev): never in a production bundle's UI.
  const demoLogin = (demoId: string, demoChan: 'EMAIL' | 'WHATSAPP') => {
    vm.setChannel(demoChan);
    vm.setIdentifier(demoId);
    vm.setCode('123456');
    void vm.sendCode().then(() => {
      vm.setCode('123456');
      void vm.verify(accept);
    });
  };

  const demoLogins = (
        <details className="wf-demo-logins-card" open>
          <summary><Icon name="sparkle" size={16} />One-click demo logins — open any dashboard<span>OTP: 123456</span></summary>
          <div className="care-demo-account-grid">
            <button type="button" className="health-button" onClick={() => demoLogin('demo.student@studentkare.test', 'EMAIL')}><Icon name="graduation-cap" size={16} />Student</button>
            <button type="button" className="health-button" onClick={() => demoLogin('demo.admin@studentkare.test', 'EMAIL')}><Icon name="shield-check" size={16} />Admin</button>
            <button type="button" className="health-button" onClick={() => demoLogin('demo.vendor@studentkare.test', 'EMAIL')}><Icon name="shopping-bag" size={16} />Vendor</button>
            <button type="button" className="health-button" onClick={() => demoLogin('demo.doctor@studentkare.test', 'EMAIL')}><Icon name="stethoscope" size={16} />Clinician</button>
            <button type="button" className="health-button" onClick={() => demoLogin('demo.campus@studentkare.test', 'EMAIL')}><Icon name="building-columns" size={16} />Campus</button>
          </div>
        </details>
  );

  const codeStep = (
    <form className="sk-signin__column" onSubmit={(e) => { e.preventDefault(); void vm.verify(accept); }}>
      <OtpVerifyView vm={vm} onEdit={() => vm.advance(mode === 'login' ? 1 : 2)} />
    </form>
  );

  if (mode === 'login') {
    const footer = vm.step === 1 ? (
      <div className="sk-signin__links">
        <p>{t('auth.newTo')} <button type="button" className="sk-signin__secondary" onClick={() => navigate('signup', next ?? undefined)}>{t('auth.createAccount')}</button></p>
        <a className="sk-signin__secondary" href="/lost-phone">
          {t('ident.signin.lostPhone')}
          <Icon name="chevron-right" size={16} />
        </a>
        {!phone ? <a className="sk-signin__secondary" href="/staff-sign-in">{t('ident.signin.staff')}</a> : null}
        <TermsLine />
      </div>
    ) : null;
    return (
      <SignInFrame web={!phone} onBack={() => (vm.step === 1 ? navigate('welcome') : vm.advance(1))} footer={footer}>
        <FormError message={vm.step === 3 ? '' : vm.error} />
        {vm.twoFaRestart && <div className="wf-notice" role="alert"><p>{t(vm.twoFaRestart)}</p></div>}
        {vm.step === 1 && vm.remembered && (
          <div className="sk-signin__column">
            <div className="sk-signin__head">
              <h1 className="sk-signin__title">{t('auth.signin.title')}</h1>
              <p className="sk-signin__lead">{t('auth.remembered.lead')}</p>
            </div>
            <button type="button" className="sk-signin__primary" disabled={vm.busy} onClick={() => void vm.continueRemembered()}>
              <Icon name={vm.remembered.channel === 'EMAIL' ? 'mail-2' : 'message-circle-3'} size={18} />
              {t('auth.remembered.continue', { masked: vm.remembered.targetMasked })}
            </button>
            <button type="button" className="sk-signin__secondary" disabled={vm.busy} onClick={vm.useAnotherAccount}>{t('auth.remembered.notYou')}</button>
            <button type="button" className="sk-signin__secondary" disabled={vm.busy} onClick={() => void vm.forgetDevice()}>{t('auth.remembered.forget')}</button>
          </div>
        )}
        {vm.step === 1 && !vm.remembered && (
          <form className="sk-signin__column" onSubmit={(e) => { e.preventDefault(); void vm.sendCode(); }}>
            <SignInView vm={vm} />
            {isDev() && demoLogins}
          </form>
        )}
        {vm.step === 3 && codeStep}
        {vm.step === 7 && (
          <form className="sk-signin__column" onSubmit={(e) => { e.preventDefault(); void vm.verify2FA(accept); }}>
            <div className="sk-signin__head">
              <h1 className="sk-signin__title">{t('auth.twofa.title')}</h1>
              <p className="sk-signin__lead">{t('auth.twofa.body')}</p>
            </div>
            <Field label={t('auth.twofa.label')}><input className="wf-otp-input" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={vm.twoFaCode} onChange={(e) => vm.setTwoFaCode(e.target.value)} placeholder={t('auth.code.placeholder')} /></Field>
            <SubmitButton busy={vm.busy}>{t('auth.verifySignIn')}</SubmitButton>
          </form>
        )}
      </SignInFrame>
    );
  }

  const consent = (
    <form onSubmit={(e) => { e.preventDefault(); void vm.completeSignup(accept); }}>
      <FormError message={vm.error} />
      <SignupConsent
        consent={vm.consent}
        busy={vm.busy}
        onBack={() => vm.advance(6)}
        progress={{ position: SIGNUP_STEPS, total: SIGNUP_STEPS }}
      />
    </form>
  );
  // The consent board is a phone board: at phone width it is the whole screen.
  if (vm.step === CONSENT_STEP && phone) {
    return <main className="sk-signin sk-signin--phone">{consent}<CrisisLinks titleKey="crisis.noAccount" testID="crisis-links" /></main>;
  }

  return (
    <AuthLayout mode={mode} step={Math.min(vm.step, SIGNUP_STEPS)}>
      <div className="wf-auth-card" data-ui="auth-card">
        {vm.step !== CONSENT_STEP && vm.step !== 3 && <FormError message={vm.error} />}
        <PageTransition key={vm.step}>
          {vm.step === 1 && (
            <div className="wf-auth-form">
              <div className="care-auth-step-mark"><Icon name="shield-check" size={24} /></div>
              <h2>{t('auth.intro.title')}</h2>
              <p>{t('auth.intro.body')}</p>
              <ul className="wf-benefits"><li><Icon name="check" size={16} />{t('auth.intro.b1')}</li><li><Icon name="check" size={16} />{t('auth.intro.b2')}</li><li><Icon name="check" size={16} />{t('auth.intro.b3')}</li></ul>
              <button className="health-button health-button-primary wf-submit" onClick={() => vm.advance(2)}>{t('auth.intro.cta')}</button>
              <p className="wf-fineprint">{t('auth.intro.adults')}</p>
            </div>
          )}
          {vm.step === 2 && (
            <form className="wf-auth-form" onSubmit={(e) => { e.preventDefault(); void vm.sendCode(); }}><CreateAccountView vm={vm} /></form>
          )}
          {vm.step === 3 && <div className="sk-signin">{codeStep}</div>}
          {vm.step === 4 && (
            <form className="wf-auth-form" onSubmit={(e) => { e.preventDefault(); vm.advance(5); }}>
              <h2>{t('auth.details.title')}</h2>
              <p>{t('auth.details.body')}</p>
              <Field label={t('auth.fullName')}><input required minLength={2} maxLength={120} autoComplete="name" value={vm.fullName} onChange={(e) => vm.setField('fullName', e.target.value)} /></Field>
              <Field label={t('auth.dob')}><input type="date" required value={vm.dob} onChange={(e) => vm.setField('dob', e.target.value)} /></Field>
              <Field label={t('auth.bloodGroup')}><select value={vm.bloodGroup} onChange={(e) => vm.setField('bloodGroup', e.target.value)}><option value="">{t('auth.notRecorded')}</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => <option key={group}>{group}</option>)}</select></Field>
              <SubmitButton busy={false}>{t('auth.continue')}</SubmitButton>
            </form>
          )}
          {vm.step === 5 && (
            <div className="wf-auth-form">
              <span className="wf-status">{t('auth.separate.badge')}</span>
              <h2>{t('auth.separate.title')}</h2>
              <p>{t('auth.separate.body')}</p>
              <div className="wf-notice">{t('auth.separate.note')}</div>
              <button className="health-button health-button-primary wf-submit" onClick={() => vm.advance(6)}>{t('auth.separate.cta')}</button>
              <button className="health-text-button" onClick={() => vm.advance(4)}>{t('auth.backToDetails')}</button>
            </div>
          )}
          {vm.step === 6 && (
            <form className="wf-auth-form" onSubmit={(e) => { e.preventDefault(); vm.advance(CONSENT_STEP); }}>
              <h2>{t('auth.campus.title')}</h2>
              <Field label={t('auth.university')}><input required minLength={2} maxLength={160} value={vm.university} onChange={(e) => vm.setField('university', e.target.value)} /></Field>
              <Field label={t('auth.roll')}><input required maxLength={80} value={vm.rollNumber} onChange={(e) => vm.setField('rollNumber', e.target.value)} /></Field>
              <p>{t('auth.campus.note')}</p>
              <SubmitButton busy={false}>{t('auth.continue')}</SubmitButton>
              <button type="button" className="health-text-button" onClick={() => vm.advance(4)}>{t('auth.editDetails')}</button>
            </form>
          )}
          {vm.step === CONSENT_STEP && consent}
        </PageTransition>
        <div className="wf-auth-switch"><span>{t('auth.alreadyHave')}</span><button className="health-text-button" onClick={() => navigate('login', next ?? undefined)}>{t('auth.signIn')}</button></div>
        <CrisisLinks titleKey="crisis.noAccount" testID="crisis-links" />
        <LanguageSetting />
      </div>
    </AuthLayout>
  );
});
