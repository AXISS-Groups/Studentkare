import React, { useState } from 'react';
import { Video, ShieldCheck } from 'lucide-react';
import { Field } from '../interface/WorkflowUI';
import { useT } from '@/i18n';
import '../../theme/workflows.css';

export function IntegratedTeleconsultSoapScribe() {
  const t = useT();
  // No consultation is wired to this scribe yet, so it opens empty: no patient,
  // no pre-written findings, and no signing (a random "Rx ID" is not a signed
  // prescription). Notes are signed from Encounter Notes.
  // There is no video call and no voice/AI scribe behind this page, so it no
  // longer offers a "Start AI Voice Scribe" toggle or calls itself one: every
  // word in these fields is typed by the clinician, and nothing is generated.
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  return (
    <div className="wf-card" style={{ padding: 24 }}>
      <div className="wf-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="care-eyebrow">{t('partner.core.soap.eyebrow')}</span>
          <h2>{t('partner.core.soap.title')}</h2>
          <p>{t('partner.core.soap.intro')}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Video pane: not connected */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            height: 240,
            background: 'var(--sk-color-brand-navy)',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 16,
            color: 'var(--sk-color-on-action)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12 }}>{t('partner.core.soap.noPatient')}</span>
            </div>

            <div style={{ textAlign: 'center' }} role="status">
              <Video size={48} color="var(--sk-color-on-action)" style={{ margin: '0 auto 8px' }} aria-hidden="true" />
              <strong style={{ fontSize: 14 }}>{t('partner.core.soap.noConsult')}</strong>
            </div>
            <div />
          </div>

          <div style={{ background: 'var(--sk-color-surface-2)', padding: 14, borderRadius: 10, fontSize: 12, color: 'var(--sk-color-text-2)' }}>
            {t('partner.core.soap.videoUnavailable')}
          </div>
        </div>

        {/* SOAP notes pane: typed by the clinician, never generated */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 12, color: 'var(--sk-color-text-2)', margin: 0 }}>{t('partner.core.soap.notSaved')}</p>

          <Field label={t('partner.core.soap.subjective')}>
            <textarea rows={2} value={subjective} onChange={e => setSubjective(e.target.value)} style={{ fontSize: 12 }} />
          </Field>

          <Field label={t('partner.core.soap.objective')}>
            <textarea rows={2} value={objective} onChange={e => setObjective(e.target.value)} style={{ fontSize: 12 }} />
          </Field>

          <Field label={t('partner.core.soap.assessment')}>
            <input type="text" value={assessment} onChange={e => setAssessment(e.target.value)} style={{ fontSize: 12 }} />
          </Field>

          <Field label={t('partner.core.soap.plan')}>
            <textarea rows={3} value={plan} onChange={e => setPlan(e.target.value)} style={{ fontSize: 12 }} />
          </Field>

          <button
            type="button"
            className="health-button health-button-primary"
            style={{ minHeight: 44, marginTop: 4 }}
            disabled
            aria-describedby="soap-scribe-sign-note"
          >
            <ShieldCheck size={16} aria-hidden="true" /> {t('partner.core.soap.sign')}
          </button>
          <p id="soap-scribe-sign-note" style={{ fontSize: 12, color: 'var(--sk-color-text-2)', margin: 0 }}>
            {t('partner.core.soap.signNote')}
          </p>
        </div>
      </div>
    </div>
  );
}
