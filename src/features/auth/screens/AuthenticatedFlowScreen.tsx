import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { ArrowLeft, Check, GraduationCap, Mail, ShieldCheck, Smartphone, Sparkles, Stethoscope, Building2, Store } from 'lucide-react';
import { AuthLayout } from '@/components/interface/AuthLayout';
import { PageTransition } from '@/components/interface/PageTransition';
import { Field, FormError, SubmitButton } from '@/components/interface/WorkflowUI';
import { useAuth } from '@/data/AuthContext';
import { navigate } from '@/lib/workflowRouting';
import type { RoutePath } from '@/lib/workflowRouting';
import { AuthViewModel } from '../viewmodel/AuthViewModel';
import { SignInView } from '../views/SignInView';
import { CreateAccountView } from '../views/CreateAccountView';

export const AuthenticatedFlowScreen = observer(function AuthenticatedFlowScreen({ mode, next }: { mode: 'login' | 'signup'; next: RoutePath | null }) {
  const auth = useAuth();
  const vm = React.useMemo(() => new AuthViewModel(mode, next), [mode, next]);

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
              <h2>Your health, in one place.</h2>
              <p>Create an account to save your records, track your measurements, and request care from listed providers.</p>
              <ul className="wf-benefits"><li><Check size={16} />Verify a contact address you own</li><li><Check size={16} />Keep records attached to your account</li><li><Check size={16} />Follow actual requests and provider updates</li></ul>
              <button className="health-button health-button-primary wf-submit" onClick={() => vm.advance(2)}>Create my account</button>
              <p className="wf-fineprint">Registration is for adults aged 18 and over. Campus verification is a separate process.</p>
            </div>
          )}
          {mode === 'login' && vm.step === 1 && (
            <form className="wf-auth-form" onSubmit={(e) => { e.preventDefault(); vm.advance(2); }}><SignInView vm={vm} />{demoLogins}</form>
          )}
          {mode === 'signup' && vm.step === 2 && (
            <form className="wf-auth-form" onSubmit={(e) => { e.preventDefault(); vm.sendCode(); }}><CreateAccountView vm={vm} /></form>
          )}
          {mode === 'login' && vm.step === 2 && (
            <form className="wf-auth-form" onSubmit={(e) => { e.preventDefault(); vm.sendCode(); }}>
              <button type="button" className="health-text-button" onClick={() => vm.advance(1)}><ArrowLeft size={14} />Edit contact details</button>
              <h2>Confirm your code delivery.</h2>
              <p>Your code will be sent to the contact details you entered.</p>
              <div className="wf-contact-review">{vm.channel === 'EMAIL' ? <Mail size={22} /> : <Smartphone size={22} />}<div><strong>{vm.channel === 'EMAIL' ? 'Email' : 'WhatsApp'}</strong><span>{vm.identifier}</span></div></div>
              {vm.channel === 'WHATSAPP' && <Field label="Backup email (optional — used only if WhatsApp delivery fails)"><input type="email" autoComplete="email" value={vm.fallbackEmail} onChange={(e) => vm.setFallbackEmail(e.target.value)} maxLength={254} placeholder="you@university.edu" /></Field>}
              <SubmitButton busy={vm.busy}>Send verification code</SubmitButton>
            </form>
          )}
          {vm.step === 3 && (
            <form className="wf-auth-form" onSubmit={(e) => { e.preventDefault(); vm.verify(accept); }}>
              <button type="button" className="health-text-button" disabled={vm.busy} onClick={() => vm.advance(mode === 'login' ? 1 : 2)}><ArrowLeft size={14} />Change contact details</button>
              <h2>Enter your verification code.</h2>
              <p>Sent to {vm.masked}. Codes expire after five minutes.</p>
              {vm.fallbackNotice && <div className="wf-notice" role="status"><p>{vm.fallbackNotice}</p></div>}
              <Field label="Verification code"><input className="wf-otp-input" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={vm.code} onChange={(e) => vm.setCode(e.target.value)} placeholder="6-digit code" /></Field>
              <SubmitButton busy={vm.busy}>Verify and continue</SubmitButton>
              <button type="button" className="health-text-button" disabled={vm.seconds > 0 || vm.busy} onClick={() => vm.sendCode()}>{vm.seconds ? `Resend available in ${vm.seconds}s` : 'Send a new code'}</button>
            </form>
          )}
          {vm.step === 7 && (
            <form className="wf-auth-form" onSubmit={(e) => { e.preventDefault(); vm.verify2FA(accept); }}>
              <h2>Two-factor check.</h2>
              <p>Open your authenticator app and enter the 6-digit code for this account.</p>
              <Field label="Authenticator code"><input className="wf-otp-input" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={vm.twoFaCode} onChange={(e) => vm.setTwoFaCode(e.target.value)} placeholder="6-digit code" /></Field>
              <SubmitButton busy={vm.busy}>Verify and sign in</SubmitButton>
            </form>
          )}
          {mode === 'signup' && vm.step === 4 && (
            <form className="wf-auth-form" onSubmit={(e) => { e.preventDefault(); vm.advance(5); }}>
              <h2>A few details about you.</h2>
              <p>These details belong to your account. You are not marked clinically or institutionally verified by completing this form.</p>
              <Field label="Full name"><input required minLength={2} maxLength={120} autoComplete="name" value={vm.fullName} onChange={(e) => vm.setField('fullName', e.target.value)} /></Field>
              <Field label="Date of birth"><input type="date" required value={vm.dob} onChange={(e) => vm.setField('dob', e.target.value)} /></Field>
              <Field label="Blood group (optional)"><select value={vm.bloodGroup} onChange={(e) => vm.setField('bloodGroup', e.target.value)}><option value="">Not recorded</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => <option key={group}>{group}</option>)}</select></Field>
              <SubmitButton busy={false}>Continue</SubmitButton>
            </form>
          )}
          {mode === 'signup' && vm.step === 5 && (
            <div className="wf-auth-form">
              <span className="wf-status">Contact verified</span>
              <h2>Student verification is separate.</h2>
              <p>Your account starts with campus verification pending. Your campus team must confirm your affiliation before it is shown as verified.</p>
              <div className="wf-notice">No identity document has been uploaded or verified at this step.</div>
              <button className="health-button health-button-primary wf-submit" onClick={() => vm.advance(6)}>Add campus details</button>
              <button className="health-text-button" onClick={() => vm.advance(4)}>Back to your details</button>
            </div>
          )}
          {mode === 'signup' && vm.step === 6 && (
            <form className="wf-auth-form" onSubmit={(e) => { e.preventDefault(); vm.completeSignup(accept); }}>
              <h2>Your campus details.</h2>
              <Field label="University or institution"><input required minLength={2} maxLength={160} value={vm.university} onChange={(e) => vm.setField('university', e.target.value)} /></Field>
              <Field label="Student or roll number"><input required maxLength={80} value={vm.rollNumber} onChange={(e) => vm.setField('rollNumber', e.target.value)} /></Field>
              <p>Registration creates your account only. No ABHA account, insurance policy, or provider booking is created automatically.</p>
              <SubmitButton busy={vm.busy}>Complete registration</SubmitButton>
              <button type="button" className="health-text-button" disabled={vm.busy} onClick={() => vm.advance(4)}>Edit your details</button>
            </form>
          )}
        </PageTransition>
        <div className="wf-auth-switch"><span>{mode === 'login' ? 'New to Studentkare?' : 'Already have an account?'}</span><button className="health-text-button" onClick={() => navigate(mode === 'login' ? 'signup' : 'login', next ?? undefined)}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div>
      </div>
    </AuthLayout>
  );
});
