import React from 'react';
import { Activity, ShieldCheck, Sparkles } from 'lucide-react';
import { useT } from '@/i18n';

export function ConsoleIntro({ title, description, eyebrow, variant = 'admin' }: {
  title: string; description: string; eyebrow: string; variant?: 'admin' | 'vendor';
}) {
  const t = useT();
  return <section className={`care-console-intro care-console-intro-${variant}`}>
    <div><span className="care-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p><span className="care-console-caption"><ShieldCheck size={13} aria-hidden="true" />{t('shopweb.console.caption1')} <span aria-hidden="true">·</span> {t('shopweb.console.caption2')}</span></div>
    <div className="care-console-illustration" aria-hidden="true"><span><Activity size={28} /></span><div><i /><i /><i /><i /><i /><i /><i /></div><span><Sparkles size={20} /></span></div>
  </section>;
}
