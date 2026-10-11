import React, { useState } from 'react';
import { AlertTriangle, Check, FlaskConical, Pill, X } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { displayDate } from '../../data/workflowTypes';
import { DataState, EmptyState, Field, FormError, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { translate, useT } from '@/i18n';
import type { MessageKey, Vars } from '@/i18n';
import '../../theme/workflows.css';

interface CriticalResult {
  id: string; testPanel: string[]; sampleId: string; criticalNote: string;
  waitingSeconds: number; updatedAt: number;
}
interface AwaitingCollection {
  id: string; testPanel: string[]; patientId: string; slotStart: string;
  overdueReason: string; waitingSeconds: number; status: string;
}
interface Substitution {
  id: string; dispenseId: string; prescriptionItemId: string;
  proposedGeneric: string; proposedBrand: string; reason: string; createdAt: number;
}

type Translate = (key: MessageKey, vars?: Vars) => string;
const english: Translate = (key, vars) => translate('en', key, vars);

export function waited(seconds: number, t: Translate = english): string {
  if (seconds < 60) return t('partner.core.wait.seconds', { n: seconds });
  if (seconds < 3600) return t('partner.core.wait.minutes', { n: Math.floor(seconds / 60) });
  // Days matter here: an uncollected sample can sit for a week, and "168 hr"
  // is a number a reader has to stop and divide.
  if (seconds < 86400) return t('partner.core.wait.hoursMinutes', { h: Math.floor(seconds / 3600), m: Math.floor((seconds % 3600) / 60) });
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days === 1) return hours ? t('partner.core.wait.dayOneHours', { h: hours }) : t('partner.core.wait.dayOne');
  return hours ? t('partner.core.wait.daysHours', { n: days, h: hours }) : t('partner.core.wait.days', { n: days });
}

/** Why a sample is still uncollected, in words a clinician can act on. */
export function overdueReason(reason: string, t: Translate = english): string {
  return reason === 'no_slot_recorded'
    ? t('partner.core.review.noSlot')
    : t('partner.core.review.slotPassed');
}

/** The clinician's decision queue: results nobody has read, and swaps awaiting an answer. */
export function ClinicalReviewPanel() {
  const t = useT();
  const critical = useApiResource<{ items: CriticalResult[]; total: number }>('/work/critical-results');
  const substitutions = useApiResource<{ items: Substitution[]; total: number }>('/work/substitutions');
  const uncollected = useApiResource<{ items: AwaitingCollection[]; total: number }>('/work/lab-orders/awaiting-collection');
  const mutation = useMutation();
  const [acknowledging, setAcknowledging] = useState<CriticalResult | null>(null);
  const [note, setNote] = useState('');

  const decide = (proposal: Substitution, approve: boolean) => mutation.run(
    () => apiRequest(`/substitutions/${proposal.id}/decide`, {
      method: 'POST', body: JSON.stringify({ approve, note: '' }),
    }),
    substitutions.reload,
  );

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{t('partner.core.review.eyebrow')}</span>
      <h2>{t('partner.core.review.title')}</h2>
      <p>{t('partner.core.review.intro')}</p>
    </div></div>

    <FormError message={mutation.error} />

    {/* Critical results first: a flagged value nobody has seen is the actual risk. */}
    <section className="wf-card wf-section-gap" style={critical.data?.total ? { border: '2px solid var(--emergency)' } : undefined}>
      <div className="wf-panel-heading"><div>
        <span className="care-eyebrow" style={{ color: 'var(--emergency)' }}>{t('partner.core.review.criticalEyebrow')}</span>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={20} aria-hidden="true" />{t('partner.core.review.criticalTitle')}
        </h3>
      </div></div>
      <DataState {...critical} retry={critical.reload}>
        {critical.data?.items.length ? <div className="wf-order-list" role="alert">
          {critical.data.items.map(result => <div className="wf-order-line" key={result.id}>
            <div>
              <strong>{result.testPanel.join(', ')}</strong>
              <small>{t('partner.core.review.sampleReported', { sample: result.sampleId, date: displayDate(new Date(result.updatedAt * 1000).toISOString()) })}</small>
              <small style={{ color: 'var(--emergency)' }}>{result.criticalNote}</small>
              <small>{t('partner.core.review.waiting', { time: waited(result.waitingSeconds, t) })}</small>
            </div>
            <button type="button" className="health-button health-button-primary" style={{ minHeight: 44 }}
              aria-label={t('partner.core.review.ackAria', { tests: result.testPanel.join(', ') })}
              onClick={() => { setAcknowledging(result); setNote(''); }}>
              <Check size={16} aria-hidden="true" />{t('partner.core.review.ack')}
            </button>
          </div>)}
        </div> : <EmptyState title={t('partner.core.review.criticalEmptyTitle')}
          description={t('partner.core.review.criticalEmptyBody')} />}
      </DataState>
    </section>

    {uncollected.data?.total ? (
      <section className="wf-card wf-section-gap">
        <div className="wf-panel-heading"><div>
          <h3><FlaskConical size={20} aria-hidden="true" />{t('partner.core.review.uncollectedTitle')}</h3>
          <p>{t('partner.core.review.uncollectedBody')}</p>
        </div></div>
        <div className="wf-order-list">
          {uncollected.data.items.map(order => (
            <div className="wf-order-line" key={order.id}>
              <div>
                <strong>{order.testPanel.join(', ') || t('partner.core.review.labOrder')}</strong>
                <small>{t('partner.core.review.overdueWaiting', { reason: overdueReason(order.overdueReason, t), time: waited(order.waitingSeconds, t) })}</small>
              </div>
              <span className="wf-status status-requested">{order.status.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </section>
    ) : null}

    <section className="wf-card">
      <div className="wf-panel-heading"><div>
        <span className="care-eyebrow">{t('partner.core.review.subsEyebrow')}</span>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pill size={20} aria-hidden="true" />{t('partner.core.review.subsTitle')}
        </h3>
        <p>{t('partner.core.review.subsBody')}</p>
      </div></div>
      <DataState {...substitutions} retry={substitutions.reload}>
        {substitutions.data?.items.length ? <div className="wf-order-list">
          {substitutions.data.items.map(proposal => <div className="wf-order-line" key={proposal.id}>
            <div>
              <strong>{proposal.proposedGeneric}{proposal.proposedBrand ? ` (${proposal.proposedBrand})` : ''}</strong>
              <small>{t('partner.core.review.reasonGiven', { reason: proposal.reason })}</small>
              <small>{t('partner.core.review.proposed', { date: displayDate(new Date(proposal.createdAt * 1000).toISOString()) })}</small>
            </div>
            <div className="wf-row-actions">
              <button type="button" className="health-button health-button-primary" disabled={mutation.busy} style={{ minHeight: 44 }}
                aria-label={t('partner.core.review.approveAria', { drug: proposal.proposedGeneric })}
                onClick={() => decide(proposal, true)}><Check size={16} aria-hidden="true" />{t('partner.core.review.approve')}</button>
              <button type="button" className="health-button" disabled={mutation.busy} style={{ minHeight: 44 }}
                aria-label={t('partner.core.review.refuseAria', { drug: proposal.proposedGeneric })}
                onClick={() => decide(proposal, false)}><X size={16} aria-hidden="true" />{t('partner.core.review.refuse')}</button>
            </div>
          </div>)}
        </div> : <EmptyState title={t('partner.core.review.subsEmptyTitle')}
          description={t('partner.core.review.subsEmptyBody')} />}
      </DataState>
    </section>

    {acknowledging && <ShopDialog title={t('partner.core.review.ackDialog')} onClose={() => setAcknowledging(null)}>
      <form className="wf-form" onSubmit={event => {
        event.preventDefault();
        mutation.run(
          () => apiRequest(`/lab-orders/${acknowledging.id}/acknowledge-critical`, {
            method: 'POST', body: JSON.stringify({ note }),
          }),
          () => { setAcknowledging(null); setNote(''); critical.reload(); },
        );
      }}>
        <div className="wf-notice" role="status" style={{ marginBottom: 12 }}>
          <FlaskConical size={18} aria-hidden="true" />
          {acknowledging.testPanel.join(', ')} · {acknowledging.criticalNote}
        </div>
        <p>{t('partner.core.review.ackIntro')}</p>
        <FormError message={mutation.error} />
        <Field label={t('partner.core.review.actionTaken')}>
          <textarea required minLength={3} maxLength={500} rows={3} value={note}
            onChange={event => setNote(event.target.value)}
            placeholder={t('partner.core.review.actionPh')} />
        </Field>
        <button className="health-button health-button-primary" type="submit"
          disabled={mutation.busy || note.trim().length < 3} style={{ minHeight: 44 }}>
          {mutation.busy ? t('partner.core.review.saving') : t('partner.core.review.ackSubmit')}
        </button>
      </form>
    </ShopDialog>}
  </>;
}
