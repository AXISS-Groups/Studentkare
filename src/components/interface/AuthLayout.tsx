import React, { ReactNode } from 'react';
import { Activity, Check, FileText, HeartPulse, ShieldCheck } from 'lucide-react';
import { StudentKareLogo } from '../StudentKareLogo';
import { navigate } from '../../lib/workflowRouting';

const stepsByMode = {
  login: ['Your account', 'Code delivery', 'Verification'],
  signup: ['Welcome', 'Your mobile', 'Verification', 'Your details', 'Student proof', 'Your campus'],
};

export function AuthLayout({ mode, step, children }: { mode: 'login' | 'signup'; step: number; children: ReactNode }) {
  const steps = stepsByMode[mode];
  return <main className={`care-auth-layout care-auth-${mode}`}>
    <header className="care-auth-header"><StudentKareLogo size={33} showStrapline={false} onClick={() => navigate('shop')} /><span>{mode === 'login' ? 'A little care, right where you left it.' : 'Your healthier chapter starts here.'}</span></header>
    <div className="care-auth-grid">
      <aside className="care-auth-story">
        <span className="care-eyebrow">EVERY PART OF YOUR HEALTH, CONNECTED</span>
        <h1>{mode === 'login' ? <>Good to have<br />you <em>back.</em></> : <>A little care.<br /><em>A clearer tomorrow.</em></>}</h1>
        <p>Your health records, everyday wellbeing, care, and cover. Together in a space that feels like yours.</p>
        <div className="care-auth-visual" aria-hidden="true"><div className="care-auth-orbit" /><div className="care-auth-record"><span><HeartPulse size={21} /><strong>Your care, connected</strong></span><svg viewBox="0 0 300 90"><path d="M0 50H65L80 50L91 29L102 68L116 15L132 66L147 40L164 50H300" fill="none" stroke="#9c86bf" strokeWidth="2.5" pathLength="1" /></svg><div><span><FileText size={17} />Health records</span><span><Activity size={17} />Wellbeing</span></div></div><span className="care-auth-float"><ShieldCheck size={18} />A place for your health story</span></div>
        <div className="care-auth-promises"><span><Check size={13} />Records that stay together</span><span><Check size={13} />Care for everyday life</span><span><Check size={13} />A little more clarity</span></div>
      </aside>
      <section className="care-auth-form-region" aria-label={mode === 'login' ? 'Login form' : 'Signup form'}>
        <div className="care-auth-progress"><span className="care-eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'LET’S GET YOU STARTED'}</span><span>Step {step} of {steps.length}</span><ol aria-label="Account setup progress">{steps.map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={step > index ? 'is-reached' : ''}><span>{label}</span></li>)}</ol><strong key={step} className="care-page-enter">{steps[step - 1]}</strong></div>
        {children}
      </section>
    </div>
  </main>;
}
