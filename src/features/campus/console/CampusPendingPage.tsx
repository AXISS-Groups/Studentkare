import React from 'react';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { useAuth } from '@/data/contexts/AuthContext';
import { canAccessRoute, navigate } from '@/lib/utils/workflowRouting';

interface PendingProps {
  title: MessageKey;
  icon: SkIconName;
}

/**
 * A board with no screen or data source yet. It says so plainly: no sample
 * data, and nothing that could read as "all clear".
 */
export function CampusPendingPage({ title, icon }: PendingProps): React.ReactElement {
  const t = useT();
  return (
    <section className="sk-cpending" aria-labelledby="campus-pending-title">
      <span className="sk-cpending__badge" aria-hidden="true"><Icon name={icon} size={26} strokeWidth={1.9} /></span>
      <span className="sk-cpending__eyebrow">{t('campusShell.pending.eyebrow')}</span>
      <h1 id="campus-pending-title" className="sk-cpending__title">{t(title)}</h1>
      <p className="sk-cpending__body">{t('campusShell.pending.body')}</p>
      <a
        className="sk-btn sk-btn--secondary"
        href="/campus"
        onClick={(event) => { event.preventDefault(); navigate('campus'); }}
      >
        {t('campusShell.pending.back')}
      </a>
    </section>
  );
}

/**
 * The counsellor queue carries students' names and contacts, so it stays on the
 * counsellor's own home (/counsellor). A campus admin sees why, not the queue.
 */
export function CampusCounsellorOnlyPage(): React.ReactElement {
  const t = useT();
  const { user } = useAuth();
  const canOpen = canAccessRoute('counsellor', user?.role ?? null);
  return (
    <section className="sk-cpending" aria-labelledby="campus-counsellor-title">
      <span className="sk-cpending__badge" aria-hidden="true"><Icon name="message-dots" size={26} strokeWidth={1.9} /></span>
      <span className="sk-cpending__eyebrow">{t('campusShell.counsellor.eyebrow')}</span>
      <h1 id="campus-counsellor-title" className="sk-cpending__title">{t('campusShell.nav.counsellor')}</h1>
      <p className="sk-cpending__body">{t('campusShell.counsellor.body')}</p>
      {canOpen ? (
        <a className="sk-btn sk-btn--primary" href="/counsellor" onClick={(event) => { event.preventDefault(); navigate('counsellor'); }}>
          {t('campusShell.counsellor.open')}
        </a>
      ) : (
        <a className="sk-btn sk-btn--secondary" href="/campus" onClick={(event) => { event.preventDefault(); navigate('campus'); }}>
          {t('campusShell.pending.back')}
        </a>
      )}
    </section>
  );
}
