import React, { ReactNode } from 'react';
import { Activity, Check, FileText, HeartPulse, ShieldCheck } from 'lucide-react';
import { StudentKareLogo } from '../StudentKareLogo';
import { navigate } from '../../lib/workflowRouting';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

const stepsByMode: Record<'login' | 'signup', MessageKey[]> = {
  login: ['shopweb.auth.step.account', 'shopweb.auth.step.code', 'shopweb.auth.step.verify'],
  signup: ['shopweb.auth.step.welcome', 'shopweb.auth.step.mobile', 'shopweb.auth.step.verify', 'shopweb.auth.step.details', 'shopweb.auth.step.proof', 'shopweb.auth.step.campus'],
};

export function AuthLayout({ mode, step, children }: { mode: 'login' | 'signup'; step: number; children: ReactNode }) {
  const t = useT();
  const steps = stepsByMode[mode].map(key => t(key));
  const login = mode === 'login';
  return <main className={`care-auth-layout care-auth-${mode}`}>
    <header className="care-auth-header"><StudentKareLogo size={33} showStrapline={false} onClick={() => navigate('shop')} /><span>{login ? t('shopweb.auth.loginTagline') : t('shopweb.auth.signupTagline')}</span></header>
    <div className="care-auth-grid">
      <aside className="care-auth-story">
        <span className="care-eyebrow">{t('shopweb.auth.eyebrow')}</span>
        <h1>{login ? t('shopweb.auth.loginLead') : t('shopweb.auth.signupLead')}<br /><em>{login ? t('shopweb.auth.loginAccent') : t('shopweb.auth.signupAccent')}</em></h1>
        <p>{t('shopweb.auth.body')}</p>
        <div className="care-auth-visual" aria-hidden="true"><div className="care-auth-orbit" /><div className="care-auth-record"><span><HeartPulse size={21} /><strong>{t('shopweb.auth.visualTitle')}</strong></span><svg viewBox="0 0 300 90"><path d="M0 50H65L80 50L91 29L102 68L116 15L132 66L147 40L164 50H300" fill="none" style={{ stroke: 'var(--sk-color-action)' }} strokeWidth="2.5" pathLength="1" /></svg><div><span><FileText size={17} />{t('shopweb.auth.visualRecords')}</span><span><Activity size={17} />{t('shopweb.auth.visualWellbeing')}</span></div></div><span className="care-auth-float"><ShieldCheck size={18} />{t('shopweb.auth.visualFloat')}</span></div>
        <div className="care-auth-promises"><span><Check size={13} aria-hidden="true" />{t('shopweb.auth.promise1')}</span><span><Check size={13} aria-hidden="true" />{t('shopweb.auth.promise2')}</span><span><Check size={13} aria-hidden="true" />{t('shopweb.auth.promise3')}</span></div>
      </aside>
      <section className="care-auth-form-region" aria-label={login ? t('shopweb.auth.loginForm') : t('shopweb.auth.signupForm')}>
        <div className="care-auth-progress"><span className="care-eyebrow">{login ? t('shopweb.auth.welcomeBack') : t('shopweb.auth.getStarted')}</span><span>{t('shopweb.auth.stepOf', { step, total: steps.length })}</span><ol aria-label={t('shopweb.auth.progress')}>{steps.map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={step > index ? 'is-reached' : ''}><span>{label}</span></li>)}</ol><strong key={step} className="care-page-enter">{steps[step - 1]}</strong></div>
        {children}
      </section>
    </div>
  </main>;
}
