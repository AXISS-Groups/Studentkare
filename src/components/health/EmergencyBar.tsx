import React, { useState } from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert, HeartPulse, Stethoscope, ChevronRight } from 'lucide-react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '../../theme/workflows.css';

export interface EmergencyContact {
  id: string;
  number: string;
  category: 'ambulance' | 'mental-health' | 'national' | 'poison';
  name: MessageKey;
  description: MessageKey;
}

/**
 * The helplines shown across the web app. Numbers stay as written in every
 * language. The poison line matches the crisis gate (backend and client); this
 * list used to carry a different number, 1800-11-0031, that nothing else used.
 */
export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { id: 'national-emergency', number: '112', category: 'national', name: 'helpline.112.name', description: 'helpline.112.desc' },
  { id: 'ambulance-service', number: '108', category: 'ambulance', name: 'helpline.108.name', description: 'helpline.108.desc' },
  { id: 'tele-manas', number: '14416', category: 'mental-health', name: 'helpline.14416.name', description: 'helpline.14416.desc' },
  { id: 'poison-control', number: '1800-116-117', category: 'poison', name: 'helpline.poison.name', description: 'helpline.poison.desc' },
];

export const telHref = (number: string) => `tel:${number.replace(/[^\d+]/g, '')}`;

/**
 * Every helpline is one tap from a call. Tapping a helpline used to open a
 * dialog first, which put a step between a student and the call.
 */
export function EmergencyBar({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`wf-emergency-bar ${compact ? 'is-compact' : ''}`} data-ui="emergency-bar">
      <div className="wf-emergency-header">
        <div className="wf-emergency-tag">
          <ShieldAlert size={18} className="wf-emergency-pulse" aria-hidden="true" />
          <span>{t('ebar.title')}</span>
        </div>
        <div className="wf-emergency-actions">
          <a href="tel:112" className="wf-emergency-sos-button" aria-label={t('crisis.call112Spoken')}>
            <PhoneCall size={14} aria-hidden="true" />
            <span>{t('crisis.call112')}</span>
          </a>
          <button
            type="button"
            className="wf-emergency-toggle"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            <span>{expanded ? t('ebar.hideAll') : t('ebar.showAll')}</span>
            <ChevronRight size={15} className={`wf-chevron ${expanded ? 'is-open' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {!compact && !expanded && <div className="wf-emergency-quick-strip">
        {EMERGENCY_CONTACTS.map(contact => (
          <a
            key={contact.id}
            href={telHref(contact.number)}
            className="wf-emergency-chip"
            aria-label={t('ebar.callSpoken', { name: t(contact.name), number: contact.number })}
          >
            {contact.category === 'ambulance' ? <HeartPulse size={14} aria-hidden="true" /> : contact.category === 'mental-health' ? <Stethoscope size={14} aria-hidden="true" /> : <AlertTriangle size={14} aria-hidden="true" />}
            <strong>{t(contact.name)}</strong>
            <span className="wf-chip-num">{contact.number}</span>
          </a>
        ))}
      </div>}

      {expanded && (
        <div className="wf-emergency-grid">
          {EMERGENCY_CONTACTS.map(contact => (
            <article className="wf-emergency-card" key={contact.id}>
              <h4>{t(contact.name)}</h4>
              <p>{t(contact.description)}</p>
              <div className="wf-card-bottom">
                <strong className="wf-contact-number">{contact.number}</strong>
                <a
                  href={telHref(contact.number)}
                  className="health-button health-button-primary"
                  aria-label={t('ebar.callSpoken', { name: t(contact.name), number: contact.number })}
                >
                  <PhoneCall size={13} aria-hidden="true" /> {t('ebar.call')}
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
