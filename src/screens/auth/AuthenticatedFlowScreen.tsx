import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { AuthLayout } from '../../components/interface/AuthLayout';
import { PageTransition } from '../../components/interface/PageTransition';
import { Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { useAuth } from '../../data/AuthContext';
import { apiRequest, setCsrfToken } from '../../data/http';
import { SessionResponse } from '../../data/workflowTypes';
import { canAccessRoute, homeForRole, navigate, RoutePath } from '../../lib/workflowRouting';
import { useApiResource } from '../../hooks/useApiResource';

export function AuthenticatedFlowScreen({ mode, next }: { mode: 'login' | 'signup'; next: RoutePath | null }) {
  const auth = useAuth();
  const options = useApiResource<{ channels: string[] }>('/auth/options');
  const [step, setStep] = useState(1);
  const [channel, setChannel] = useState<'EMAIL' | 'WHATSAPP'>('WHATSAPP');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [masked, setMasked] = useState('');
  const [fallbackEmail, setFallbackEmail] = useState('');
  const [fallbackNotice, setFallbackNotice] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [university, setUniversity] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const mutation = useMutation();

  useEffect(() => {
    if (options.data?.channels.length === 1) setChannel(options.data.channels[0] as 'EMAIL' | 'WHATSAPP');
  }, [options.data]);
  useEffect(() => {
    const update = () => setSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    if (resendAt <= Date.now()) return;
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [resendAt]);

  const accept = (response: SessionResponse) => {
    if (!response.user) throw new Error('The server did not establish a signed-in session.');
    auth.acceptSession(response);
    navigate(next && canAccessRoute(next, response.user.role) ? next : homeForRole(response.user.role));
  };

  const sendCode = () => mutation.run(() => apiRequest<{ targetMasked: string; fallbackSent?: boolean; fallbackTargetMasked?: string; message?: string }>('/auth/otp/send', {
    method: 'POST', body: JSON.stringify({ identifier, channel, intent: mode === 'login' ? 'LOGIN' : 'SIGNUP', fallbackEmail: channel === 'WHATSAPP' && fallbackEmail.includes('@') ? fallbackEmail : undefined }),
  }), response => {
    setMasked(response.targetMasked); setResendAt(Date.now() + 45000); setCode(''); setStep(3);
    setFallbackNotice(response.fallbackSent ? (response.message || `WhatsApp was not reachable — the same code was also sent to email ${response.fallbackTargetMasked || 'your backup address'}.`) : '');
  });

  const verify = () => mutation.run(() => apiRequest<SessionResponse>('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ otp: code }) }), response => {
    if (response.requires2FA && response.tempToken) { setTempToken(response.tempToken); setTwoFaCode(''); setStep(7); return; }
    if (mode === 'signup' && response.requiresSignup) { setCsrfToken(response.csrfToken); setStep(4); }
    else accept(response);
  });

  const verify2FA = () => mutation.run(() => apiRequest<SessionResponse>('/auth/2fa/challenge', { method: 'POST', body: JSON.stringify({ tempToken, token: twoFaCode }) }), accept);

  const advance = (value: number) => { mutation.setError(''); setStep(value); };
  const contactForm = <>
    <div className="care-auth-step-mark">{channel === 'EMAIL' ? <Mail size={23} /> : <Smartphone size={23} />}</div>
    <h2>{mode === 'login' ? 'Welcome back' : 'Your contact details'}</h2>
    <p>Use a contact address you can access. We’ll send a one-time verification code.</p>
    <div className="wf-choice-row" aria-label="Verification channel"><button type="button" aria-pressed={channel === 'EMAIL'} onClick={() => { setChannel('EMAIL'); setIdentifier(''); }}><Mail size={15} />Email</button><button type="button" aria-pressed={channel === 'WHATSAPP'} onClick={() => { setChannel('WHATSAPP'); setIdentifier(''); }}><Smartphone size={15} />WhatsApp</button></div>
    <Field label={channel === 'EMAIL' ? 'Email address' : 'Mobile number'}><input required type={channel === 'EMAIL' ? 'email' : 'tel'} autoComplete={channel === 'EMAIL' ? 'email' : 'tel'} value={identifier} onChange={event => setIdentifier(event.target.value)} maxLength={254} placeholder={channel === 'EMAIL' ? 'you@university.edu' : '10-digit Indian mobile number'} /></Field>
    {options.error && <div className="wf-notice"><p>{options.error}</p><button type="button" className="health-text-button" onClick={options.reload}>Check connection again</button></div>}
    {options.data && !options.data.channels.includes(channel) && <p className="wf-notice">{channel === 'EMAIL' ? 'Email' : 'WhatsApp'} delivery is not configured. Contact your administrator{options.data.channels.length ? ' or choose the configured channel' : ''}.</p>}
    <SubmitButton busy={mutation.busy}>{mode === 'login' ? 'Continue' : 'Send verification code'}</SubmitButton>
  </>;

  return <AuthLayout mode={mode} step={step}>
    <div className="wf-auth-card" data-ui="auth-card"><FormError message={mutation.error} /><PageTransition key={step}>
      {mode === 'signup' && step === 1 && <div className="wf-auth-form"><div className="care-auth-step-mark"><ShieldCheck size={24} /></div><h2>Your health, in one place.</h2><p>Create an account to save your records, track your measurements, and request care from listed providers.</p><ul className="wf-benefits"><li><Check size={16} />Verify a contact address you own</li><li><Check size={16} />Keep records attached to your account</li><li><Check size={16} />Follow actual requests and provider updates</li></ul><button className="health-button health-button-primary wf-submit" onClick={() => advance(2)}>Create my account</button><p className="wf-fineprint">Registration is for adults aged 18 and over. Campus verification is a separate process.</p></div>}
      {((mode === 'login' && step === 1) || (mode === 'signup' && step === 2)) && <form className="wf-auth-form" onSubmit={event => { event.preventDefault(); mode === 'login' ? advance(2) : sendCode(); }}>{contactForm}</form>}
      {mode === 'login' && step === 2 && <form className="wf-auth-form" onSubmit={event => { event.preventDefault(); sendCode(); }}><button type="button" className="health-text-button" onClick={() => advance(1)}><ArrowLeft size={14} />Edit contact details</button><h2>Confirm your code delivery.</h2><p>Your code will be sent to the contact details you entered.</p><div className="wf-contact-review">{channel === 'EMAIL' ? <Mail size={22} /> : <Smartphone size={22} />}<div><strong>{channel === 'EMAIL' ? 'Email' : 'WhatsApp'}</strong><span>{identifier}</span></div></div>{channel === 'WHATSAPP' && <Field label="Backup email (optional — used only if WhatsApp delivery fails)"><input type="email" autoComplete="email" value={fallbackEmail} onChange={event => setFallbackEmail(event.target.value)} maxLength={254} placeholder="you@university.edu" /></Field>}<SubmitButton busy={mutation.busy}>Send verification code</SubmitButton></form>}
      {step === 3 && <form className="wf-auth-form" onSubmit={event => { event.preventDefault(); verify(); }}><button type="button" className="health-text-button" disabled={mutation.busy} onClick={() => advance(mode === 'login' ? 1 : 2)}><ArrowLeft size={14} />Change contact details</button><h2>Enter your verification code.</h2><p>Sent to {masked}. Codes expire after five minutes.</p>{fallbackNotice && <div className="wf-notice" role="status"><p>{fallbackNotice}</p></div>}<Field label="Verification code"><input className="wf-otp-input" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" /></Field><SubmitButton busy={mutation.busy}>Verify and continue</SubmitButton><button type="button" className="health-text-button" disabled={seconds > 0 || mutation.busy} onClick={sendCode}>{seconds ? `Resend available in ${seconds}s` : 'Send a new code'}</button></form>}
      {step === 7 && <form className="wf-auth-form" onSubmit={event => { event.preventDefault(); verify2FA(); }}><h2>Two-factor check.</h2><p>Open your authenticator app and enter the 6-digit code for this account.</p><Field label="Authenticator code"><input className="wf-otp-input" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={twoFaCode} onChange={event => setTwoFaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" /></Field><SubmitButton busy={mutation.busy}>Verify and sign in</SubmitButton></form>}
      {mode === 'signup' && step === 4 && <form className="wf-auth-form" onSubmit={event => { event.preventDefault(); advance(5); }}><h2>A few details about you.</h2><p>These details belong to your account. You are not marked clinically or institutionally verified by completing this form.</p><Field label="Full name"><input required minLength={2} maxLength={120} autoComplete="name" value={fullName} onChange={event => setFullName(event.target.value)} /></Field><Field label="Date of birth"><input type="date" required value={dob} onChange={event => setDob(event.target.value)} /></Field><Field label="Blood group (optional)"><select value={bloodGroup} onChange={event => setBloodGroup(event.target.value)}><option value="">Not recorded</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => <option key={group}>{group}</option>)}</select></Field><SubmitButton busy={false}>Continue</SubmitButton></form>}
      {mode === 'signup' && step === 5 && <div className="wf-auth-form"><span className="wf-status">Contact verified</span><h2>Student verification is separate.</h2><p>Your account starts with campus verification pending. Your campus team must confirm your affiliation before it is shown as verified.</p><div className="wf-notice">No identity document has been uploaded or verified at this step.</div><button className="health-button health-button-primary wf-submit" onClick={() => advance(6)}>Add campus details</button><button className="health-text-button" onClick={() => advance(4)}>Back to your details</button></div>}
      {mode === 'signup' && step === 6 && <form className="wf-auth-form" onSubmit={event => { event.preventDefault(); mutation.run(() => apiRequest<SessionResponse>('/auth/signup', { method: 'POST', body: JSON.stringify({ fullName, dob, university, rollNumber, bloodGroup }) }), accept); }}><h2>Your campus details.</h2><Field label="University or institution"><input required minLength={2} maxLength={160} value={university} onChange={event => setUniversity(event.target.value)} /></Field><Field label="Student or roll number"><input required maxLength={80} value={rollNumber} onChange={event => setRollNumber(event.target.value)} /></Field><p>Registration creates your account only. No ABHA account, insurance policy, or provider booking is created automatically.</p><SubmitButton busy={mutation.busy}>Complete registration</SubmitButton><button type="button" className="health-text-button" disabled={mutation.busy} onClick={() => advance(4)}>Edit your details</button></form>}
    </PageTransition><div className="wf-auth-switch"><span>{mode === 'login' ? 'New to Studentkare?' : 'Already have an account?'}</span><button className="health-text-button" onClick={() => navigate(mode === 'login' ? 'signup' : 'login', next ?? undefined)}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div></div>
  </AuthLayout>;
}
