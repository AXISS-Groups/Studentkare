import React from 'react';
import { useT } from '@/i18n';
import { navigate } from '@/lib/workflowRouting';
import '../../theme/workflows.css';

/**
 * Family tab of the records hub.
 *
 * This used to let a student "grant" a parent emergency, records or full access
 * and then list the grant as ACTIVE with an expiry date. Nothing was sent to the
 * server, so no parent could ever see anything — a student could believe their
 * family could reach their records in an emergency when nobody could. There is
 * no family-share or Care Circle API, so this tab now says so and points to what
 * does work: the emergency card and clinician sharing.
 */
export function FamilyAccessShareScreen({ onOpenRecords }: { onOpenRecords: () => void }): React.ReactElement {
  const t = useT();
  return (
    <section className="wf-card" style={{ padding: 24, maxWidth: 640 }} aria-labelledby="family-share-heading">
      <h3 id="family-share-heading">{t('fam.title')}</h3>
      <p role="status">{t('fam.unavailable')}</p>
      <p>{t('fam.emergency')}</p>
      <button type="button" className="health-button health-button-primary" style={{ minHeight: 44 }} onClick={() => navigate('emergency-card')}>
        {t('fam.openCard')}
      </button>
      <p>{t('fam.clinician')}</p>
      <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={onOpenRecords}>
        {t('access.openRecords')}
      </button>
    </section>
  );
}
