import React from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { getSetting } from '@/data/services/config';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { PageHead } from '@/features/studentweb/views/parts';
import { LegalText, useLegalDocument } from './LegalText';
import { privacyRepository } from './privacyRepository';
import type { LegalDocument, LegalKind } from './privacyRepository';
import './privacy.css';

interface Right { id: string; icon: SkIconName; title: MessageKey; body: MessageKey; actions: { label: MessageKey; route: RoutePath; icon: SkIconName; tone?: 'danger' }[] }

const RIGHTS: readonly Right[] = [
  { id: 'access', icon: 'download', title: 'privacy.rights.access.title', body: 'privacy.rights.access.body',
    actions: [{ label: 'privacy.rights.access.cta', route: 'data-export', icon: 'download' }] },
  { id: 'correct', icon: 'pencil', title: 'privacy.rights.correct.title', body: 'privacy.rights.correct.body',
    actions: [{ label: 'privacy.rights.correct.cta', route: 'profile', icon: 'pencil' }, { label: 'privacy.rights.correct.card', route: 'emergency-card', icon: 'file-text' }] },
  { id: 'erase', icon: 'trash', title: 'privacy.rights.erase.title', body: 'privacy.rights.erase.body',
    actions: [{ label: 'privacy.rights.erase.cta', route: 'delete-account', icon: 'trash', tone: 'danger' }] },
  { id: 'consent', icon: 'lock-4', title: 'privacy.rights.consent.title', body: 'privacy.rights.consent.body',
    actions: [{ label: 'privacy.rights.consent.cta', route: 'privacy-consent', icon: 'arrow-right' }] },
];

/**
 * Your data rights (audit H2): access (download), correction (edit details where
 * the student may), erasure (delete account), consent withdrawal, and grievance.
 * The grievance officer is shown only from the published GRIEVANCE_OFFICER
 * document (Super admin → Legal documents); until one is published the page
 * says "not published yet" and points to Help. No name is ever written here.
 */
export function DataRightsView({ loadLegal = privacyRepository.legal }: { loadLegal?: (kind: LegalKind) => Promise<LegalDocument> }): React.ReactElement {
  const t = useT();
  const grievance = useLegalDocument('GRIEVANCE_OFFICER', loadLegal);
  const graceDays = getSetting('privacy.deletion_grace_days');
  return (
    <div className="sk-sw-page sk-privacy">
      <PageHead id="sk-rights-title" title={t('privacy.rights.title')} sub={t('privacy.rights.sub')} />
      <div className="sk-privacy__rights">
        {RIGHTS.map((right) => (
          <section key={right.id} className="sk-sw-card sk-privacy__right" aria-labelledby={`sk-right-${right.id}`}>
            <div className="sk-privacy__right-head">
              <span className="sk-privacy__right-icon" aria-hidden="true"><Icon name={right.icon} size={20} /></span>
              <h2 id={`sk-right-${right.id}`} className="sk-sw-card__title">{t(right.title)}</h2>
            </div>
            <p className="sk-sw-muted">{t(right.body, { days: graceDays })}</p>
            <div className="sk-privacy__actions">
              {right.actions.map((action) => (
                <button key={action.route} type="button" onClick={() => navigate(action.route)}
                  className={`sk-sw-btn ${action.tone === 'danger' ? 'sk-sw-btn--danger-outline' : 'sk-sw-btn--outline'}`}>
                  <Icon name={action.icon} size={16} />{t(action.label)}
                </button>
              ))}
            </div>
          </section>
        ))}
        <section className="sk-sw-card sk-privacy__right" aria-labelledby="sk-right-grievance" aria-busy={grievance.status === 'loading'}>
          <div className="sk-privacy__right-head">
            <span className="sk-privacy__right-icon" aria-hidden="true"><Icon name="message-circle" size={20} /></span>
            <h2 id="sk-right-grievance" className="sk-sw-card__title">{t('privacy.rights.grievance.title')}</h2>
          </div>
          {grievance.status === 'loading' ? <p className="sk-sw-muted" role="status">{t('privacy.rights.grievance.loading')}</p>
            : grievance.status === 'error' ? (
              <>
                <p className="sk-sw-error" role="alert">{t('privacy.rights.grievance.error')}</p>
                <div className="sk-privacy__actions"><button type="button" className="sk-sw-btn sk-sw-btn--outline" onClick={grievance.retry}>{t('common.tryAgain')}</button></div>
              </>
            ) : grievance.doc.published ? <LegalText doc={grievance.doc} headingLevel={3} />
              : (
                <>
                  <p className="sk-sw-note" data-testid="grievance-unpublished">{t('privacy.rights.grievance.unpublished')}</p>
                  <p className="sk-sw-muted">{t('privacy.rights.grievance.meanwhile')}</p>
                </>
              )}
          <div className="sk-privacy__actions">
            <button type="button" className="sk-sw-btn sk-sw-btn--outline" onClick={() => navigate('support')}>
              <Icon name="help-circle" size={16} />{t('privacy.rights.grievance.help')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
