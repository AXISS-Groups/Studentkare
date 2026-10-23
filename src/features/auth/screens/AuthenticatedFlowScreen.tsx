import React, { useEffect } from 'react';
import { useLanguage, useT } from '@/i18n';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { usePhoneFrame } from '@/design-system/navigation/usePhoneFrame';
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
import { AuthViewModel, PASSWORD_STEP, SECOND_CONTACT_STEP } from '../viewmodel/AuthViewModel';
import { CreatePasswordStep, PasswordSignInView, SecondContactStep } from '../views/StudentPasswordViews';
import { SignInView } from '../views/SignInView';
import { OtpVerifyView } from '../views/OtpVerifyView';
import { SignInFrame, TermsLine, type AuthTab } from '../views/SignInFrame';
import { PasscodeSignInView, RememberedView } from '../views/PasscodeSignInView';
import { CreateAccountView } from '../views/CreateAccountView';
import { SignupConsent } from '../views/SignupConsent';

/** Sign-up steps ("n of 6"); the consent screen is part of the last one. */
const SIGNUP_STEPS = 6;
/** The consent screen (OnboardingConsent): after campus details, before the account exists. */
const CONSENT_STEP = 8;

/**
 * /login and /signup (Tier 1 boards SignIn, WebSignIn, OtpVerify, OnboardingConsent;
 * approved 2026-10-21, plan tier1-canvas-wp03). Sign in and create account share one
 * Mobile 2.0 frame (SignInFrame: the navy gradient hero on web, a compact header on
 * the phone, the emergency strip always in view). The orchestration is AuthViewModel's.
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
  const toSignup = () => navigate('signup', next ?? undefined);
  // The Sign in / Create account tabs: the page in view is highlighted.
  const tabs = {
    current: (mode === 'login' ? 'signIn' : 'create') as AuthTab,
    onPick: (tab: AuthTab) => (tab === 'create' ? toSignup() : navigate('login', next ?? undefined)),
  };

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
    const footer = vm.step === 1 && !vm.passcodeEntry && !vm.passwordEntry ? (
      <div className="sk-signin__links">
        <p>{t('auth.newTo')} <button type="button" className="sk-signin__secondary" onClick={toSignup}>{t('auth.createAccount')}</button></p>
        <a className="sk-signin__secondary" href="/lost-phone">
          {t('ident.signin.lostPhone')}
          <Icon name="chevron-right" size={16} />
        </a>
        {!phone ? <a className="sk-signin__secondary" href="/staff-sign-in">{t('ident.signin.staff')}</a> : null}
        <TermsLine />
      </div>
    ) : null;
    return (
      <SignInFrame
        web={!phone}
        onBack={() => {
          if (vm.passcodeEntry) vm.leavePasscode();
          else if (vm.passwordEntry) vm.leavePassword();
          else if (vm.step === 1) navigate('welcome');
          else vm.advance(1);
        }}
        tabs={vm.step === 1 ? tabs : undefined}
        footer={footer}
      >
        {/* Step 1 and the code step show their errors by the field; these steps have none. */}
        <FormError message={vm.step === 7 || (vm.step === 1 && vm.remembered && !vm.passcodeEntry) ? vm.error : ''} />
        {vm.twoFaRestart && <div className="wf-notice" role="alert"><p>{t(vm.twoFaRestart)}</p></div>}
        {vm.step === 1 && vm.passcodeEntry && <PasscodeSignInView vm={vm} onAccept={accept} />}
        {vm.step === 1 && vm.passwordEntry && <PasswordSignInView vm={vm} onAccept={accept} />}
        {vm.step === 1 && !vm.passcodeEntry && !vm.passwordEntry && vm.remembered && <RememberedView vm={vm} />}
        {vm.step === 1 && !vm.passcodeEntry && !vm.passwordEntry && !vm.remembered && (
          <form className="sk-signin__column" onSubmit={(e) => { e.preventDefault(); void vm.sendCode(); }}>
            <SignInView vm={vm} onCreateAccount={toSignup} />
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
        onBack={() => vm.advance(PASSWORD_STEP)}
        progress={{ position: SIGNUP_STEPS, total: SIGNUP_STEPS }}
      />
    </form>
  );
  // The consent board is a phone board: at phone width it is the whole screen.
  if (vm.step === CONSENT_STEP && phone) {
    return <main className="sk-signin sk-signin--phone">{consent}<div className="sk-auth__crisis"><CrisisLinks titleKey="crisis.noAccount" testID="crisis-links" /></div></main>;
  }

  // The contact step draws its own back button beside the "n of 6" progress.
  const signupBack = vm.step === 2 ? undefined : () => {
    if (vm.step === 1) navigate('welcome');
    else if (vm.step === 3) vm.advance(2);
    else if (vm.step === SECOND_CONTACT_STEP) vm.advance(2);
    else if (vm.step === 4) vm.advance(vm.secondRequired ? SECOND_CONTACT_STEP : 2);
    else if (vm.step === PASSWORD_STEP) vm.advance(6);
    else if (vm.step === CONSENT_STEP) vm.advance(PASSWORD_STEP);
    else vm.advance(vm.step - 1);
  };
  const signupFooter = (
    <div className="sk-signin__links">
      <p>{t('auth.alreadyHave')} <button type="button" className="sk-signin__secondary" onClick={() => navigate('login', next ?? undefined)}>{t('auth.signIn')}</button></p>
      {vm.step === 2 ? <TermsLine /> : null}
    </div>
  );

  return (
    <SignInFrame web={!phone} onBack={signupBack} regionLabel="auth.signup.title" tabs={vm.step <= 2 ? tabs : undefined} footer={signupFooter}>
      {vm.step !== CONSENT_STEP && vm.step !== 2 && vm.step !== 3 && vm.step !== SECOND_CONTACT_STEP && vm.step !== PASSWORD_STEP && <FormError message={vm.error} />}
      <PageTransition key={vm.step}>
        {vm.step === 1 && (
          <div className="wf-auth-form sk-signup-step">
            <div className="care-auth-step-mark"><Icon name="shield-check" size={24} /></div>
            <h1 className="sk-signin__title">{t('auth.intro.title')}</h1>
            <p className="sk-signin__lead">{t('auth.intro.body')}</p>
            <ul className="wf-benefits"><li><Icon name="check" size={16} />{t('auth.intro.b1')}</li><li><Icon name="check" size={16} />{t('auth.intro.b2')}</li><li><Icon name="check" size={16} />{t('auth.intro.b3')}</li></ul>
            <button type="button" className="sk-signin__primary" onClick={() => vm.advance(2)}>{t('auth.intro.cta')}<Icon name="arrow-right" size={20} /></button>
            <p className="wf-fineprint">{t('auth.intro.adults')}</p>
          </div>
        )}
        {vm.step === 2 && (
          <form className="sk-signin__column" onSubmit={(e) => { e.preventDefault(); void vm.sendCode(); }}><CreateAccountView vm={vm} /></form>
        )}
        {vm.step === 3 && codeStep}
        {vm.step === 4 && (
          <form className="wf-auth-form sk-signup-step" onSubmit={(e) => { e.preventDefault(); vm.advance(5); }}>
            <h1 className="sk-signin__title">{t('auth.details.title')}</h1>
            <p className="sk-signin__lead">{t('auth.details.body')}</p>
            <Field label={t('auth.fullName')}><input required minLength={2} maxLength={120} autoComplete="name" value={vm.fullName} onChange={(e) => vm.setField('fullName', e.target.value)} /></Field>
            <Field label={t('auth.dob')}><input type="date" required value={vm.dob} onChange={(e) => vm.setField('dob', e.target.value)} /></Field>
            <Field label={t('auth.bloodGroup')}><select value={vm.bloodGroup} onChange={(e) => vm.setField('bloodGroup', e.target.value)}><option value="">{t('auth.notRecorded')}</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => <option key={group}>{group}</option>)}</select></Field>
            <button type="submit" className="sk-signin__primary">{t('auth.continue')}</button>
          </form>
        )}
        {vm.step === 5 && (
          <div className="wf-auth-form sk-signup-step">
            <span className="wf-status">{t('auth.separate.badge')}</span>
            <h1 className="sk-signin__title">{t('auth.separate.title')}</h1>
            <p className="sk-signin__lead">{t('auth.separate.body')}</p>
            <div className="wf-notice">{t('auth.separate.note')}</div>
            <button type="button" className="sk-signin__primary" onClick={() => vm.advance(6)}>{t('auth.separate.cta')}</button>
            <button type="button" className="sk-signin__secondary" onClick={() => vm.advance(4)}>{t('auth.backToDetails')}</button>
          </div>
        )}
        {vm.step === 6 && (
          <form className="wf-auth-form sk-signup-step" onSubmit={(e) => { e.preventDefault(); vm.advance(PASSWORD_STEP); }}>
            <h1 className="sk-signin__title">{t('auth.campus.title')}</h1>
            <Field label={t('auth.university')}><input required minLength={2} maxLength={160} value={vm.university} onChange={(e) => vm.setField('university', e.target.value)} /></Field>
            <Field label={t('auth.roll')}><input required maxLength={80} value={vm.rollNumber} onChange={(e) => vm.setField('rollNumber', e.target.value)} /></Field>
            <p className="sk-signin__lead">{t('auth.campus.note')}</p>
            <button type="submit" className="sk-signin__primary">{t('auth.continue')}</button>
            <button type="button" className="sk-signin__secondary" onClick={() => vm.advance(4)}>{t('auth.editDetails')}</button>
          </form>
        )}
        {vm.step === SECOND_CONTACT_STEP && <SecondContactStep vm={vm} />}
        {vm.step === PASSWORD_STEP && <CreatePasswordStep vm={vm} next={CONSENT_STEP} />}
        {vm.step === CONSENT_STEP && consent}
      </PageTransition>
    </SignInFrame>
  );
});
