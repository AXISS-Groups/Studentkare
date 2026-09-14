import React from 'react';
import { ArrowRight } from 'lucide-react';
import { navigate } from '@/lib/workflowRouting';
import { careServices } from '../providerResources';

export function ProviderResources() {
  return <section className="wf-card preventive-provider-hub" aria-labelledby="provider-hub-title">
    <span className="care-eyebrow">STUDENTKARE CARE SERVICES</span>
    <h3 id="provider-hub-title">Explore Studentkare services.</h3>
    <p>Medicine information, lab tests, consultations and offers inside Studentkare. These are in-app destinations, not a connected inventory or a partnership claim.</p>
    <div className="preventive-resource-grid">{careServices.map(service => <button key={service.title} type="button" onClick={() => navigate(service.route)} className="preventive-resource">
      <strong>{service.title}<ArrowRight size={16} aria-hidden="true" /></strong><span>{service.description}</span><small>Open in Studentkare</small>
    </button>)}</div>
    <p className="wf-fineprint">Confirm service area, current price and suitability with Studentkare before booking. Availability is shown at the point of care.</p>
  </section>;
}
