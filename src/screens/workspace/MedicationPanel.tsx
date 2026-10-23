import React, { useState } from 'react';
import { CheckCircle2, Pill, Plus, RotateCcw, ShieldCheck } from 'lucide-react';
import { useApiResource } from '../../hooks/api/useApiResource';
import { apiRequest } from '../../data/services/http';
import { Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { translate, useT, type MessageKey, type Vars } from '@/i18n';
import '../../theme/workflows.css';

interface Plan { id: string; name: string; dosage: string; frequency: string; source: string; active: boolean; }
interface Window { daysCovered: number; daysActive: number; rate: number | null; }
interface Adherence { windows: Record<string, Window>; missedDays: string[]; trackedSince: string | null; }
interface Schedule { user_id: string; plans: Plan[]; todays_taken: number; loop_status: string; adherence?: Adherence; }

type Translate = (key: MessageKey, vars?: Vars) => string;
const english: Translate = (key, vars) => translate('en', key, vars);

/** "2026-09-23" -> "23 Sep". Returns the input unchanged if it is not a date. */
export function shortDate(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * How consistently doses have been logged, said plainly.
 *
 * Deliberately not a streak or a score. A streak rewards the act of logging
 * rather than the act of taking, which gives a student a reason to tap
 * "taken" for a dose they missed — and that corrupts the only adherence data
 * there is. The server returns no streak and no score either (AGENTS.md
 * guardrail 4): only days covered, days missed and doses taken today.
 */
export function adherenceSummary(window: Window | undefined, days: number, t: Translate = english): string {
  if (!window || window.daysActive === 0) return '';
  if (window.daysActive < days) {
    const vars = { covered: window.daysCovered, active: window.daysActive };
    return t(window.daysActive === 1 ? 'care.meds.loggedTrackingOne' : 'care.meds.loggedTracking', vars);
  }
  return t('care.meds.loggedLast', { covered: window.daysCovered, days });
}

export function MedicationPanel() {
  const t = useT();
  const schedule = useApiResource<Schedule>('/meds/schedule');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [notice, setNotice] = useState<MessageKey | null>(null);
  const mutation = useMutation();

  const plans = schedule.data?.plans || [];
  const missedDays = schedule.data?.adherence?.missedDays ?? [];

  const logDose = (plan: Plan) => mutation.run(() => apiRequest('/meds/log-dose', { method: 'POST', body: JSON.stringify({ medId: plan.id }) }), () => { setNotice('care.meds.doseRecorded'); schedule.reload(); });
  const refill = (plan: Plan) => mutation.run(() => apiRequest<{ queued?: boolean }>('/meds/refill-reminder', { method: 'POST', body: JSON.stringify({ medId: plan.id, daysBefore: 3 }) }), (res) => setNotice(res?.queued === false ? 'care.meds.remindersOff' : 'care.meds.refillQueued'));

  return <>
    <div className="wf-panel-heading">
      <div>
        <span className="care-eyebrow">{t('care.meds.eyebrow')}</span>
        <h2>{t('care.meds.title')}</h2>
        <p>{t('care.meds.intro')}</p>
      </div>
      <button type="button" className="health-button health-button-primary" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" />{t('care.meds.add')}</button>
    </div>

    <FormError message={mutation.error} />
    {plans.length > 0 && schedule.data?.adherence && (
      <section className="wf-adherence" aria-label={t('care.meds.adherenceLabel')}>
        <p className="wf-adherence__line">{adherenceSummary(schedule.data.adherence.windows['7'], 7, t)}</p>
        <p className="wf-adherence__line wf-adherence__line--muted">{adherenceSummary(schedule.data.adherence.windows['30'], 30, t)}</p>
        {missedDays.length > 0 && (
          <p className="wf-adherence__missed">
            {missedDays.length > 3
              ? t('care.meds.missedMore', { dates: missedDays.slice(0, 3).map(shortDate).join(', '), more: missedDays.length - 3 })
              : t('care.meds.missed', { dates: missedDays.map(shortDate).join(', ') })}
          </p>
        )}
      </section>
    )}
    {notice && <div className="wf-notice wf-notice-positive" role="status"><CheckCircle2 size={18} aria-hidden="true" />{t(notice)}</div>}

    <DataState {...schedule} retry={schedule.reload}>
      {plans.length ? <div className="wf-record-grid">
        {plans.map(plan => <article className="wf-card" key={plan.id}>
          <span className="wf-record-icon" aria-hidden="true"><Pill size={24} /></span>
          <h3>{plan.name}</h3>
          <p>{plan.dosage ? `${plan.dosage} · ` : ''}{plan.frequency || t('care.meds.asAdvised')}</p>
          <span className="wf-status">{plan.source === 'USER' ? t('care.meds.addedByYou') : plan.source}</span>
          <div className="wf-row-actions">
            <button type="button" className="health-button" disabled={mutation.busy} onClick={() => logDose(plan)}><CheckCircle2 size={16} aria-hidden="true" />{t('care.meds.logDose')}</button>
            <button type="button" className="health-button" disabled={mutation.busy} onClick={() => refill(plan)}><RotateCcw size={16} aria-hidden="true" />{t('care.meds.refill')}</button>
          </div>
        </article>)}
      </div> : <EmptyState title={t('care.meds.emptyTitle')} description={t('care.meds.emptyBody')} action={t('care.meds.add')} onAction={() => setAdding(true)} animation="anim-clock" />}
      <div className="wf-notice" style={{ marginTop: 18 }}><ShieldCheck size={18} aria-hidden="true" />{t('care.meds.completion')}</div>
    </DataState>

    {adding && <ShopDialog title={t('care.meds.add')} onClose={() => setAdding(false)}><form className="wf-form" onSubmit={event => { event.preventDefault(); mutation.run(() => apiRequest('/meds/plans', { method: 'POST', body: JSON.stringify({ name, dosage, frequency }) }), () => { setAdding(false); setName(''); setDosage(''); setFrequency(''); schedule.reload(); }); }}><p>{t('care.meds.addIntro')}</p><FormError message={mutation.error} /><Field label={t('care.meds.name')}><input required minLength={2} maxLength={160} value={name} onChange={event => setName(event.target.value)} /></Field><Field label={t('care.meds.dosage')}><input maxLength={120} value={dosage} onChange={event => setDosage(event.target.value)} placeholder={t('care.meds.dosageExample')} /></Field><Field label={t('care.meds.frequency')}><input maxLength={120} value={frequency} onChange={event => setFrequency(event.target.value)} placeholder={t('care.meds.frequencyExample')} /></Field><SubmitButton busy={mutation.busy}>{t('care.meds.save')}</SubmitButton></form></ShopDialog>}
  </>;
}
