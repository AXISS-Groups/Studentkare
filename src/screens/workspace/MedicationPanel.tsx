import React, { useState } from 'react';
import { CheckCircle2, Pill, Plus, RotateCcw, ShieldCheck } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import '../../theme/workflows.css';

interface Plan { id: string; name: string; dosage: string; frequency: string; source: string; active: boolean; }
interface Window { daysCovered: number; daysActive: number; rate: number | null; }
interface Adherence { windows: Record<string, Window>; currentStreak: number; missedDays: string[]; trackedSince: string | null; }
interface Schedule { user_id: string; plans: Plan[]; daily_completion_rate: number; todays_taken: number; loop_status: string; adherence?: Adherence; }

/**
 * How consistently doses have been logged, said plainly.
 *
 * Deliberately not a streak or a score. A streak rewards the act of logging
 * rather than the act of taking, which gives a student a reason to tap
 * "taken" for a dose they missed — and that corrupts the only adherence data
 * there is. The server does compute a streak, because a clinician asking "how
 * consistent have you been?" is a fair use of it; it is not shown here as
 * something to keep alive.
 */
/** "2026-09-23" -> "23 Sep". Returns the input unchanged if it is not a date. */
export function shortDate(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function adherenceSummary(window: Window | undefined, days: number): string {
  if (!window || window.daysActive === 0) return '';
  if (window.daysActive < days) {
    return `Logged on ${window.daysCovered} of the ${window.daysActive} day${window.daysActive === 1 ? '' : 's'} you have been tracking.`;
  }
  return `Logged on ${window.daysCovered} of the last ${days} days.`;
}

export function MedicationPanel() {
  const schedule = useApiResource<Schedule>('/meds/schedule');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [notice, setNotice] = useState('');
  const mutation = useMutation();

  const plans = schedule.data?.plans || [];
  const rate = schedule.data?.daily_completion_rate ?? 0;

  const logDose = (plan: Plan) => mutation.run(() => apiRequest('/meds/log-dose', { method: 'POST', body: JSON.stringify({ medId: plan.id }) }), () => { setNotice('Dose recorded for today.'); schedule.reload(); });
  const refill = (plan: Plan) => mutation.run(() => apiRequest('/meds/refill-reminder', { method: 'POST', body: JSON.stringify({ medId: plan.id, daysBefore: 3 }) }), (res) => setNotice((res as any)?.queued === false ? 'Reminders are disabled in your preferences.' : 'Refill reminder queued.'));

  return <>
    <div className="wf-panel-heading">
      <div>
        <span className="care-eyebrow">YOUR MEDICATION PLAN</span>
        <h2>Medications & reminders.</h2>
        <p>Track what you take, log doses, and set refill reminders. Plans are yours and account-specific.</p>
      </div>
      <button className="health-button health-button-primary" onClick={() => setAdding(true)}><Plus size={16} />Add a medication</button>
    </div>

    <FormError message={mutation.error} />
    {plans.length > 0 && schedule.data?.adherence && (
      <section className="wf-adherence" aria-label="How consistently you have logged doses">
        <p className="wf-adherence__line">{adherenceSummary(schedule.data.adherence.windows['7'], 7)}</p>
        <p className="wf-adherence__line wf-adherence__line--muted">{adherenceSummary(schedule.data.adherence.windows['30'], 30)}</p>
        {schedule.data.adherence.missedDays.length > 0 && (
          <p className="wf-adherence__missed">
            No dose logged on {schedule.data.adherence.missedDays.slice(0, 3).map(shortDate).join(', ')}
            {schedule.data.adherence.missedDays.length > 3 ? ` and ${schedule.data.adherence.missedDays.length - 3} more` : ''}.
          </p>
        )}
      </section>
    )}
    {notice && <div className="wf-notice wf-notice-positive" role="status"><CheckCircle2 size={18} />{notice}</div>}

    <DataState {...schedule} retry={schedule.reload}>
      {plans.length ? <div className="wf-record-grid">
        {plans.map(plan => <article className="wf-card" key={plan.id}>
          <span className="wf-record-icon"><Pill size={24} /></span>
          <h3>{plan.name}</h3>
          <p>{plan.dosage ? `${plan.dosage} · ` : ''}{plan.frequency || 'as advised'}</p>
          <span className="wf-status">{plan.source === 'USER' ? 'User-recorded' : plan.source}</span>
          <div className="wf-row-actions">
            <button className="health-button" disabled={mutation.busy} onClick={() => logDose(plan)}><CheckCircle2 size={16} />Log today's dose</button>
            <button className="health-button" disabled={mutation.busy} onClick={() => refill(plan)}><RotateCcw size={16} />Refill reminder</button>
          </div>
        </article>)}
      </div> : <EmptyState title="No medications tracked." description="Add a medication you take regularly to log doses and set refill reminders. This does not provide prescribing advice." action="Add a medication" onAction={() => setAdding(true)} />}
      <div className="wf-notice" style={{ marginTop: 18 }}><ShieldCheck size={18} />Daily completion {rate}%. A reminder never implies a dose was taken — only your own log records it.</div>
    </DataState>

    {adding && <ShopDialog title="Add a medication" onClose={() => setAdding(false)}><form className="wf-form" onSubmit={event => { event.preventDefault(); mutation.run(() => apiRequest('/meds/plans', { method: 'POST', body: JSON.stringify({ name, dosage, frequency }) }), () => { setAdding(false); setName(''); setDosage(''); setFrequency(''); schedule.reload(); }); }}><p>Record a medication you take. Add from your clinician's advice — this is not prescribing advice.</p><FormError message={mutation.error} /><Field label="Medication name"><input required minLength={2} maxLength={160} value={name} onChange={event => setName(event.target.value)} /></Field><Field label="Dosage"><input maxLength={120} value={dosage} onChange={event => setDosage(event.target.value)} placeholder="e.g. 1 tablet" /></Field><Field label="Frequency"><input maxLength={120} value={frequency} onChange={event => setFrequency(event.target.value)} placeholder="e.g. twice daily" /></Field><SubmitButton busy={mutation.busy}>Save medication</SubmitButton></form></ShopDialog>}
  </>;
}
