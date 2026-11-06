import React, { useState } from 'react';
import { Icon } from '@/design-system/icons';
import { useApiResource } from '@/hooks/api/useApiResource';
import { DataState, EmptyState, Field } from '@/components/interface/WorkflowUI';
import { useT } from '@/i18n';
import '@/theme/workflows.css';

/**
 * Nearby-provider lookup by pincode (pharmacies or labs), shown from the
 * vault's "who can see" / directory tab. Moved out of
 * screens/workspace/FulfilmentQueuePanel.tsx (architecture guardrail, phase
 * 3): it is a standalone lookup, not part of the fulfilment queue, so it does
 * not need to live alongside PharmacyQueuePanel/LabQueuePanel in screens/.
 */
export function ProviderDirectoryPanel({ kind }: { kind: 'PHARMACY' | 'LAB' }) {
  const t = useT();
  const [pincode, setPincode] = useState('');
  const [submitted, setSubmitted] = useState('');
  const providers = useApiResource<{ items: Array<{
    id: string; legalName: string; address: string; pincode: string; openHours: string;
    licenceValid: boolean; accreditation: string; homeCollection: boolean; inPincode: boolean;
  }>; total: number; rankedBy: string }>(submitted ? `/providers/nearby?pincode=${submitted}&kind=${kind}` : null);

  return <section className="wf-card wf-section-gap">
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{kind === 'PHARMACY' ? t('admin.fulfil.nearbyPharmacies') : t('admin.fulfil.nearbyLabs')}</span>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {kind === 'PHARMACY' ? <Icon name="pill" size={20} /> : <Icon name="flask" size={20} />}
        {t('admin.fulfil.findNear')}
      </h3>
    </div></div>
    <form className="wf-form" style={{ maxWidth: 360 }} onSubmit={event => { event.preventDefault(); setSubmitted(pincode); }}>
      <Field label={t('admin.fulfil.pincode')}>
        <input inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={pincode}
          onChange={event => setPincode(event.target.value.replace(/\D/g, ''))} placeholder="500001" />
      </Field>
      <button className="health-button health-button-primary" type="submit"
        disabled={!/^[1-9][0-9]{5}$/.test(pincode)} style={{ minHeight: 44 }}>
        <Icon name="box" size={16} />{t('admin.audit.search')}
      </button>
    </form>

    {submitted && <DataState {...providers} retry={providers.reload}>
      {providers.data?.items.length ? <>
        <div className="wf-order-list">
          {providers.data.items.map(provider => <div className="wf-order-line" key={provider.id}>
            <div>
              <strong>{provider.legalName}</strong>
              <small>{provider.address || provider.pincode}{provider.openHours ? ` · ${provider.openHours}` : ''}</small>
              <small>
                {provider.inPincode ? t('admin.fulfil.inPincode') : t('admin.fulfil.servesPincode')}
                {provider.accreditation ? ` · ${provider.accreditation}` : ''}
                {provider.homeCollection ? ` · ${t('admin.fulfil.homeLower')}` : ''}
              </small>
              {!provider.licenceValid && <small style={{ color: 'var(--attention)' }}>
                <Icon name="alert-triangle" size={13} /> {t('admin.fulfil.licence')}
              </small>}
            </div>
          </div>)}
        </div>
        {/* Stated plainly so a student can see the ordering is not bought. */}
        <p className="wf-fineprint">{t('admin.fulfil.rankedBy', { by: providers.data.rankedBy })}</p>
      </> : <EmptyState title={t('admin.fulfil.noneTitle')}
        description={t('admin.fulfil.noneBody')} />}
    </DataState>}
  </section>;
}
