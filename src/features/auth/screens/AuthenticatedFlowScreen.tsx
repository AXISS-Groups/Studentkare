import React, { useEffect } from 'react';
import { useLanguage, useT } from '@/i18n';
import { LanguageSetting } from '@/i18n/LanguageSetting';
import { observer } from 'mobx-react-lite';
import { ArrowLeft, Check, GraduationCap, Mail, ShieldCheck, Smartphone, Sparkles, Stethoscope, Building2, Store } from 'lucide-react';
import { AuthLayout } from '@/components/interface/AuthLayout';
import { PageTransition } from '@/components/interface/PageTransition';
import { Field, FormError, SubmitButton } from '@/components/interface/WorkflowUI';
import { useAuth } from '@/data/AuthContext';
import { isDev } from '@/core/env';
import { navigate } from '@/lib/workflowRouting';
import type { RoutePath } from '@/lib/workflowRouting';
import { CrisisLinks } from '@/design-system';
import { AuthViewModel } from '../viewmodel/AuthViewModel';
import { SignInView } from '../views/SignInView';
import { CreateAccountView } from '../views/CreateAccountView';
import { SignupConsent } from '../views/SignupConsent';

export const AuthenticatedFlowScreen = observer(function AuthenticatedFlowScreen({ mode, next }: { mode: 'login' | 'signup'; next: RoutePath | null }) {
  const auth = useAuth();
  const vm = React.useMemo(() => new AuthViewModel(mode, next), [mode, next]);
  const { lang } = useLanguage();
  useEffect(() => vm.setConsentLanguage(lang), [vm, lang]);
  const t = useT();

  useEffect(() => {
    void vm.loadOptions();
    return () => vm.dispose();
  }, [vm]);

  useEffect(() => {
    const update = () => vm.tick();
    update();
    if (vm.resendAt <= Date.now()) return;
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [vm, vm.resendAt]);

  const accept = (response: import('@/data/workflowTypes').SessionResponse) => auth.acceptSession(response);

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
          <summary><Sparkles size={16} />One-click demo logins — open any dashboard<span>OTP: 123456</span></summary>
          <div className="care-demo-account-grid">
            <button type="button" className="health-button" onClick={() => demoLogin('demo.student@studentkare.test', 'EMAIL')}><GraduationCap size={16} />Student</button>
            <button type="button" className="health-button" onClick={() => demoLogin('demo.admin@studentkare.test', 'EMAIL')}><ShieldCheck size={16} />Admin</button>
            <button type="button" className="health-button" onClick={() => demoLogin('demo.vendor@studentkare.test', 'EMAIL')}><Store size={16} />Vendor</button>
            <button type="button" className="health-button" onClick={() => demoLogin('demo.doctor@studentkare.test', 'EMAIL')}><Stethoscope size={16} />Clinician</button>
            <button type="button" className="health-button" onClick={() => demoLogin('demo.campus@studentkare.test', 'EMAIL')}><Building2 size={16} />Campus</button>
          </div>
        </details>
  );


  return (
    <AuthLayout mode={mode} step={vm.step}>
      <div className="wf-auth-card" data-ui="auth-card">
        <FormError message={vm.error} />
        <PageTransition key={vm.step}>
          {mode === 'signup' && vm.step === 1 && (
            <div className="wf-auth-form">
              <div className="care-auth-step-mark"><ShieldCheck size={24} /></div>
              <h2>{t('auth.intro.title')}</h2>
              <p>{t('auth.intro.body')}</p>
              <ul className="wf-benefits"><li><Check size={16} />{t('auth.intro.b1')}</li><li><Check size={16} />{t('auth.intro.b2')}</li><li><Check size={16} />{t('auth.intro.b3')}</li></ul>
              <button className="health-button health-button-primary wf-submit" onClick={() => vm.advance(2)}>{t('auth.intro.cta')}</button>
              <p className="wf-fineprint">{t('auth.intro.adults')}</p>
            </div>
          )}
          {mode === 'login' && vm.step === 1 && (
            <form className="wf-auth-form" onSubmit={(e) => { e.preventDefault(); vm.advance(2); }}><SignInView vm={vm} />{isDev() && demoLogins}</form>
          )}
          {mode === 'signup' && vm.step === 2 && (
            <form className="wf-auth-form" onSubmit={(e) => { e.preventDefault(); vm.sendCode(); }}><CreateAccountView vm={vm} /></form>
          )}
          {mode === 'login' && vm.step === 2 && (
            <form className="wf-auth-form" onSubmit={(e) => { e.preventDefault(); vm.sendCode(); }}>
              <button type="button" className="health-text-button" onClick={() => vm.advance(1)}><ArrowLeft size={14} />{t('auth.editContact')}</button>
              <h2>{t('auth.confirm.title')}</h2>
              <p>{t('auth.confirm.body')}</p>
              <div className="wf-contact-review">{vm.channel === 'EMAIL' ? <Mail size={22} /> : <Smartphone size={22} />}<div><strong>{t(vm.channel === 'EMAIL' ? 'auth.channel.EMAIL' : 'auth.channel.WHATSAPP')}</strong><span>{vm.identifier}</span></div></div>
              {vm.channel === 'WHATSAPP' && <Field label={t('auth.backupEmail')}><input type="email" autoComplete="email" value={vm.fallbackEmail} onChange={(e) => vm.setFallbackEmail(e.target.value)} maxLength={254} placeholder="you@university.edu" /></Field>}
              <SubmitButton busy={vm.busy}>{t('auth.sendCode')}</SubmitButton>
            </form>
          )}
          {vm.step === 3 && (
            <form className="wf-auth-form" onSubmit={(e) => { e.preventDefault(); vm.verify(accept); }}>
              <button type="button" className="health-text-button" disabled={vm.busy} onClick={() => vm.advance(mode === 'login' ? 1 : 2)}><ArrowLeft size={14} />{t('auth.changeContact')}</button>
              <h2>{t('auth.code.title')}</h2>
              <p>{t('auth.code.sentTo', { masked: vm.masked })}</p>
              {vm.fallbackNotice && <div className="wf-notice" role="status"><p>{vm.fallbackNotice}</p></div>}
              <Field label={t('auth.code.label')}><input className="wf-otp-input" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={vm.code} onChange={(e) => vm.setCode(e.target.value)} placeholder={t('auth.code.placeholder')} /></Field>
              <SubmitButton busy={vm.busy}>{t('auth.verifyContinue')}</SubmitButton>
              <button type="button" className="health-text-button" disabled={vm.seconds > 0 || vm.busy} onClick={() => vm.sendCode()}>{vm.seconds ? t('auth.resendIn', { seconds: vm.seconds }) : t('auth.resend')}</button>
            </form>
          )}
          {vm.step === 7 && (
            <form className="wf-auth-form" onSubmit={(e) => { e.preventDefault(); vm.verify2FA(accept); }}>
              <h2>{t('auth.twofa.title')}</h2>
              <p>{t('auth.twofa.body')}</p>
              <Field label={t('auth.twofa.label')}><input className="wf-otp-input" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={vm.twoFaCode} onChange={(e) => vm.setTwoFaCode(e.target.value)} placeholder={t('auth.code.placeholder')} /></Field>
              <SubmitButton busy={vm.busy}>{t('auth.verifySignIn')}</SubmitButton>
            </form>
          )}
          {mode === 'signup' && vm.step === 4 && (
            <form className="wf-auth-form" onSubmit={(e) => { e.preventDefault(); vm.advance(5); }}>
              <h2>{t('auth.details.title')}</h2>
              <p>{t('auth.details.body')}</p>
              <Field label={t('auth.fullName')}><input required minLength={2} maxLength={120} autoComplete="name" value={vm.fullName} onChange={(e) => vm.setField('fullName', e.target.value)} /></Field>
              <Field label={t('auth.dob')}><input type="date" required value={vm.dob} onChange={(e) => vm.setField('dob', e.target.value)} /></Field>
              <Field label={t('auth.bloodGroup')}><select value={vm.bloodGroup} onChange={(e) => vm.setField('bloodGroup', e.target.value)}><option value="">{t('auth.notRecorded')}</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => <option key={group}>{group}</option>)}</select></Field>
              <SubmitButton busy={false}>{t('auth.continue')}</SubmitButton>
            </form>
          )}
          {mode === 'signup' && vm.step === 5 && (
            <div className="wf-auth-form">
              <span className="wf-status">{t('auth.separate.badge')}</span>
              <h2>{t('auth.separate.title')}</h2>
              <p>{t('auth.separate.body')}</p>
              <div className="wf-notice">{t('auth.separate.note')}</div>
              <button className="health-button health-button-primary wf-submit" onClick={() => vm.advance(6)}>{t('auth.separate.cta')}</button>
              <button className="health-text-button" onClick={() => vm.advance(4)}>{t('auth.backToDetails')}</button>
            </div>
          )}
          {mode === 'signup' && vm.step === 6 && (
            <form className="wf-auth-form" onSubmit={(e) => { e.preventDefault(); vm.completeSignup(accept); }}>
              <h2>{t('auth.campus.title')}</h2>
              <Field label={t('auth.university')}><input required minLength={2} maxLength={160} value={vm.university} onChange={(e) => vm.setField('university', e.target.value)} /></Field>
              <Field label={t('auth.roll')}><input required maxLength={80} value={vm.rollNumber} onChange={(e) => vm.setField('rollNumber', e.target.value)} /></Field>
              <p>{t('auth.campus.note')}</p>
              <SignupConsent consent={vm.consent} />
              <SubmitButton busy={vm.busy} disabled={!vm.consent.complete}>
                {vm.consent.complete ? t('auth.complete') : t('member.consent.incomplete')}
              </SubmitButton>
              <button type="button" className="health-text-button" disabled={vm.busy} onClick={() => vm.advance(4)}>{t('auth.editDetails')}</button>
            </form>
          )}
        </PageTransition>
        <div className="wf-auth-switch"><span>{mode === 'login' ? t('auth.newTo') : t('auth.alreadyHave')}</span><button className="health-text-button" onClick={() => navigate(mode === 'login' ? 'signup' : 'login', next ?? undefined)}>{mode === 'login' ? t('auth.createAccount') : t('auth.signIn')}</button></div>
        <CrisisLinks titleKey="crisis.noAccount" testID="crisis-links" />
        <LanguageSetting />
      </div>
    </AuthLayout>
  );
});
