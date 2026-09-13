import React, { useState } from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert, HeartPulse, Stethoscope, ChevronRight, X } from 'lucide-react';
import '../../theme/workflows.css';

export interface EmergencyContact {
  id: string;
  name: string;
  number: string;
  category: 'ambulance' | 'mental-health' | 'national' | 'campus' | 'poison';
  description: string;
  badge: string;
  available: string;
}

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'national-emergency',
    name: 'National Emergency Response',
    number: '112',
    category: 'national',
    description: 'All-in-one emergency service for Police, Fire, and Medical Ambulance.',
    badge: 'Immediate Toll-Free',
    available: '24x7 Available',
  },
  {
    id: 'ambulance-service',
    name: 'Medical Ambulance & Triage',
    number: '108',
    category: 'ambulance',
    description: 'Emergency medical transport and critical hospital triage.',
    badge: 'Emergency Transport',
    available: '24x7 Available',
  },
  {
    id: 'tele-manas',
    name: 'Tele-MANAS Mental Health Helpline',
    number: '1056',
    category: 'mental-health',
    description: 'Govt. of India 24x7 confidential mental health & crisis counselling.',
    badge: 'Free & Confidential',
    available: '24x7 Counselling',
  },
  {
    id: 'campus-sos',
    name: 'Campus Health Centre & SOS Line',
    number: '+91 1800-227-3767',
    category: 'campus',
    description: 'On-campus medical emergency team and university doctor on call.',
    badge: 'Campus Response',
    available: '24x7 Campus Line',
  },
  {
    id: 'poison-control',
    name: 'National Poison & Disaster Helpline',
    number: '1800-11-0031',
    category: 'poison',
    description: 'Emergency medical guidance for toxic or chemical exposure.',
    badge: 'Tox-Advice',
    available: '24x7 Helpline',
  },
];

export function EmergencyBar({ compact = false }: { compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [dialogContact, setDialogContact] = useState<EmergencyContact | null>(null);

  return (
    <div className={`wf-emergency-bar ${compact ? 'is-compact' : ''}`} data-ui="emergency-bar">
      <div className="wf-emergency-header">
        <div className="wf-emergency-tag">
          <ShieldAlert size={18} className="wf-emergency-pulse" />
          <span>24x7 Emergency & Crisis Support</span>
        </div>
        <div className="wf-emergency-actions">
          <a href="tel:112" className="wf-emergency-sos-button" aria-label="Call 112 National Emergency">
            <PhoneCall size={14} />
            <span>Call 112 SOS</span>
          </a>
          <button
            type="button"
            className="wf-emergency-toggle"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            <span>{expanded ? 'Hide directory' : 'All emergency helplines'}</span>
            <ChevronRight size={15} className={`wf-chevron ${expanded ? 'is-open' : ''}`} />
          </button>
        </div>
      </div>

      {(!compact || expanded) && <div className="wf-emergency-quick-strip">
        {EMERGENCY_CONTACTS.slice(0, compact ? 3 : 4).map(contact => (
          <button
            key={contact.id}
            type="button"
            className="wf-emergency-chip"
            onClick={() => setDialogContact(contact)}
          >
            {contact.category === 'ambulance' ? <HeartPulse size={14} /> : contact.category === 'mental-health' ? <Stethoscope size={14} /> : <AlertTriangle size={14} />}
            <strong>{contact.name}</strong>
            <span className="wf-chip-num">{contact.number}</span>
          </button>
        ))}
      </div>}

      {expanded && (
        <div className="wf-emergency-grid">
          {EMERGENCY_CONTACTS.map(contact => (
            <article className="wf-emergency-card" key={contact.id}>
              <div className="wf-card-top">
                <span className={`wf-badge badge-${contact.category}`}>{contact.badge}</span>
                <span className="wf-avail">{contact.available}</span>
              </div>
              <h4>{contact.name}</h4>
              <p>{contact.description}</p>
              <div className="wf-card-bottom">
                <strong className="wf-contact-number">{contact.number}</strong>
                <a href={`tel:${contact.number.replace(/[^\d+]/g, '')}`} className="health-button health-button-primary">
                  <PhoneCall size={13} /> Call now
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      {dialogContact && (
        <div className="wf-modal-backdrop" onClick={() => setDialogContact(null)}>
          <div className="wf-modal-card" onClick={e => e.stopPropagation()}>
            <button className="wf-modal-close" onClick={() => setDialogContact(null)} aria-label="Close dialog">
              <X size={18} />
            </button>
            <div className="wf-modal-header">
              <ShieldAlert size={28} color="#e53e3e" />
              <h3>{dialogContact.name}</h3>
            </div>
            <p className="wf-modal-body">{dialogContact.description}</p>
            <div className="wf-modal-meta">
              <span>{dialogContact.available}</span> · <strong>{dialogContact.badge}</strong>
            </div>
            <div className="wf-modal-cta">
              <a
                href={`tel:${dialogContact.number.replace(/[^\d+]/g, '')}`}
                className="health-button health-button-primary wf-modal-call"
              >
                <PhoneCall size={16} /> Dial {dialogContact.number}
              </a>
              <button className="health-button" onClick={() => setDialogContact(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
