import React from 'react';
import { ArrowRight } from 'lucide-react';
import { navigate } from '@/lib/utils/workflowRouting';
import { careServices } from '../providerResources';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

/** Translations for the shared service list, keyed by its English title. A title not
 *  listed here (a later addition) is shown as written. */
const SERVICE_TEXT: Readonly<Record<string, { title: MessageKey; description: MessageKey }>> = {
  'Medicines & health products': { title: 'assist.services.medicines', description: 'assist.services.medicinesBody' },
  'Lab tests & packages': { title: 'assist.services.labs', description: 'assist.services.labsBody' },
  'Doctor consultations': { title: 'assist.services.consults', description: 'assist.services.consultsBody' },
  'Current offers': { title: 'assist.services.offers', description: 'assist.services.offersBody' },
};

export function ProviderResources() {
  const t = useT();
  return <section className="wf-card preventive-provider-hub" aria-labelledby="provider-hub-title">
    <span className="care-eyebrow">{t('assist.services.eyebrow')}</span>
    <h3 id="provider-hub-title">{t('assist.services.title')}</h3>
    <p>{t('assist.services.intro')}</p>
    <div className="preventive-resource-grid">{careServices.map(service => {
      const text = SERVICE_TEXT[service.title];
      return <button key={service.title} type="button" onClick={() => navigate(service.route)} className="preventive-resource">
        <strong>{text ? t(text.title) : service.title}<ArrowRight size={16} aria-hidden="true" /></strong><span>{text ? t(text.description) : service.description}</span><small>{t('assist.services.open')}</small>
      </button>;
    })}</div>
    <p className="wf-fineprint">{t('assist.services.fineprint')}</p>
  </section>;
}
