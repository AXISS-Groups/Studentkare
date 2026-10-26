import React from 'react';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';

/** Epoch seconds to "20 Sep 2026". */
export const dayDate = (seconds: number): string =>
  new Date(seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

/** Epoch seconds to "21 Sep" (the canvas's short form). */
export const shortDate = (seconds: number): string =>
  new Date(seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** A note with an icon (info by default; attention or danger when it carries that meaning). */
function IconNote({ icon, tone = 'info', children, role }: { icon: SkIconName; tone?: 'info' | 'attention' | 'danger'; children: React.ReactNode; role?: 'status' | 'alert' }) {
  return (
    <p className={`sk-swt-note${tone === 'info' ? '' : ` is-${tone}`}`} role={role}>
      <Icon name={icon} size={18} />
      <span>{children}</span>
    </p>
  );
}

/**
 * Crisis help, one line (DESIGN.md §2.4): 112 and Tele-MANAS, always reachable,
 * never behind loading or an error. Red only because it is a crisis link.
 */
export function CrisisLine() {
  const t = useT();
  return (
    <p className="sk-swt-crisis">
      <span>
        {t('swt.crisis.lead')} <a href="tel:112" aria-label={t('swt.crisis.call112')}>112</a>
        {' · '}{t('swt.crisis.telemanas')} <a href="tel:14416" aria-label={t('swt.crisis.callTelemanas')}>14416</a>
        {' · '}{t('swt.crisis.free')}
      </span>
    </p>
  );
}
