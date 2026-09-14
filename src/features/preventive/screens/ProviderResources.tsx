import React from 'react';
import { ExternalLink } from 'lucide-react';
import { providerResources } from '../providerResources';

export function ProviderResources() {
  return <section className="wf-card preventive-provider-hub" aria-labelledby="provider-hub-title">
    <span className="care-eyebrow">EXTERNAL PROVIDER DIRECTORY</span>
    <h3 id="provider-hub-title">Explore Tata 1mg services.</h3>
    <p>Medicine information, lab tests, consultations and offers on the provider’s website. These links are not a connected inventory or a partnership claim.</p>
    <div className="preventive-resource-grid">{providerResources.map(resource => <a key={resource.url} href={resource.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="preventive-resource">
      <strong>{resource.title}<ExternalLink size={16} aria-hidden="true" /></strong><span>{resource.description}</span><small>Open 1mg · external website</small>
    </a>)}</div>
    <p className="wf-fineprint">External links send no reports or medical query parameters. Confirm service area, current price, suitability and terms directly with the provider. Source: 1mg public homepage, checked 14 September 2026.</p>
  </section>;
}
