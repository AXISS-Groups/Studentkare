import React, { useState } from 'react';
import { Activity, CheckCircle2, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { useApiResource } from '../../hooks/api/useApiResource';
import { ApiError, apiRequest } from '../../data/services/http';
import { FormError, useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import { useT } from '../../i18n';
import type { MessageKey } from '../../i18n';
import '../../theme/workflows.css';

interface Job { key: string; name: string; enabled: boolean; intervalSeconds: number; lastRunAt: number | null; nextRunAt: number | null; lastStatus: string; lastError: string | null; }
interface HealthCheck { name: string; configured: boolean; reachable: boolean | null; status: string; detail: string; checked_at: number; }
interface HealthSummary { summary: { checked_at: number; interval_seconds: number; checks: HealthCheck[]; overall: string }; }
/** GET /ops/agent-eval. Only the metrics are read; a missing metric is shown as unknown, never 0. */
interface AgentEval { metrics: Partial<Record<'grounded_rate' | 'refusal_rate' | 'isolation_rate' | 'recovery_rate' | 'avg_latency_ms', number>> }
/** POST /ops/jobs/{key}/run — the scheduler's result; only its status is shown. */
interface JobRun { status?: string }

const EVAL_METRICS: { key: 'grounded_rate' | 'refusal_rate' | 'isolation_rate' | 'recovery_rate'; label: MessageKey }[] = [
  { key: 'grounded_rate', label: 'admin.telemetry.grounded' },
  { key: 'refusal_rate', label: 'admin.telemetry.refusal' },
  { key: 'isolation_rate', label: 'admin.telemetry.isolation' },
  { key: 'recovery_rate', label: 'admin.telemetry.recovery' },
];

export function TelemetryConsole() {
  const t = useT();
  const jobs = useApiResource<{ jobs: Job[] }>('/ops/jobs');
  const health = useApiResource<HealthSummary>('/ops/integration-health');
  const evalRes = useApiResource<AgentEval>('/ops/agent-eval');
  const mutation = useMutation();
  const [notice, setNotice] = useState('');

  // 409: another worker or replica holds the job's lease right now.
  const runJob = async (key: string): Promise<JobRun> => {
    try { return await apiRequest<JobRun>(`/ops/jobs/${key}/run`, { method: 'POST' }); }
    catch (reason) { throw reason instanceof ApiError && reason.status === 409 ? new Error(t('admin.jobs.alreadyRunning')) : reason; }
  };
  const runNow = (key: string) => mutation.run(() => runJob(key), (res) => {
    setNotice(res.status ? t('admin.telemetry.jobRan', { key, status: res.status }) : t('admin.telemetry.jobRanNoStatus', { key }));
    jobs.reload(); health.reload();
  });

  const overall = health.data?.summary.overall;
  const metrics = evalRes.data?.metrics;

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{t('admin.telemetry.eyebrow')}</span>
      <h2>{t('admin.telemetry.title')}</h2>
      <p>{t('admin.telemetry.intro')}</p>
    </div></div>

    <FormError message={mutation.error} />
    {notice && <div className="wf-notice" role="status" style={{ marginBottom: 16, background: 'var(--sk-color-positive-bg)', color: 'var(--sk-color-positive)', borderColor: 'var(--sk-color-positive)' }}><CheckCircle2 size={18} aria-hidden="true" />{notice}</div>}

    <div className="wf-record-grid" style={{ marginBottom: 24 }}>
      <article className="wf-card">
        <span className="wf-record-icon"><Activity size={24} aria-hidden="true" /></span>
        <h3>{t('admin.telemetry.health')}</h3>
        <p>{t('admin.telemetry.overall')} <strong>{overall || t('admin.telemetry.checking')}</strong></p>
        <span className={`wf-status ${overall === 'operational' ? 'status-accepted' : 'status-requested'}`}>{overall || t('admin.telemetry.unknown')}</span>
        <button type="button" className="health-button" style={{ minHeight: 44 }} disabled={mutation.busy} onClick={() => mutation.run(() => runJob('integration_health'), () => { setNotice(t('admin.telemetry.refreshed')); health.reload(); jobs.reload(); })}><RefreshCw size={16} aria-hidden="true" />{t('admin.telemetry.checkNow')}</button>
      </article>
      <article className="wf-card">
        <span className="wf-record-icon"><Server size={24} aria-hidden="true" /></span>
        <h3>{t('admin.telemetry.jobs')}</h3>
        {/* Unknown until the job list loads — never 0. Each job's own interval is listed below. */}
        <p>{jobs.data ? t('admin.telemetry.jobCount', { count: jobs.data.jobs.length }) : jobs.error ? t('admin.telemetry.jobCountError') : t('admin.telemetry.checking')}</p>
      </article>
    </div>

    <section className="wf-card wf-section-gap">
      <div className="wf-panel-heading"><div><span className="care-eyebrow">{t('admin.telemetry.jobsEyebrow')}</span><h3>{t('admin.telemetry.background')}</h3></div></div>
      <DataState {...jobs} retry={jobs.reload}>
        {jobs.data?.jobs.length ? <div className="wf-order-list">{jobs.data.jobs.map(job => <div className="wf-order-line" key={job.key}><div><strong>{job.name}</strong><small>{job.key} · {(job.intervalSeconds < 3600 ? t('admin.telemetry.everySeconds', { seconds: job.intervalSeconds }) : t('admin.telemetry.every', { hours: Math.round(job.intervalSeconds / 3600) }))} · {t('admin.telemetry.last', { when: job.lastRunAt ? new Date(job.lastRunAt * 1000).toLocaleString() : t('admin.telemetry.never') })}</small>{job.lastError && <small style={{ color: 'var(--sk-color-danger)' }}>{job.lastError}</small>}</div><div className="wf-row-actions"><span className={`wf-status ${job.lastStatus === 'SUCCESS' ? 'status-accepted' : job.lastStatus === 'FAILED' ? 'status-declined' : 'status-requested'}`}>{job.lastStatus || 'PENDING'}</span><button type="button" className="health-button" style={{ minHeight: 44 }} disabled={mutation.busy} aria-label={t('admin.telemetry.runNowFor', { name: job.name })} onClick={() => runNow(job.key)}><RefreshCw size={14} aria-hidden="true" />{t('admin.telemetry.runNow')}</button></div></div>)}</div> : <EmptyState title={t('admin.telemetry.noJobs')} description={t('admin.telemetry.noJobsBody')} />}
      </DataState>
    </section>

    <section className="wf-card wf-section-gap">
      <div className="wf-panel-heading"><div><span className="care-eyebrow">{t('admin.telemetry.servicesEyebrow')}</span><h3>{t('admin.telemetry.checks')}</h3></div></div>
      <DataState {...health} retry={health.reload}>
        {health.data?.summary.checks.length ? <div className="wf-record-grid">{health.data.summary.checks.map(check => <article className="wf-card" key={check.name}><span className="wf-record-icon"><ShieldCheck size={22} aria-hidden="true" /></span><h3>{check.name.replace(/_/g, ' ')}</h3><p>{check.detail}</p><span className={`wf-status ${check.status === 'online' ? 'status-accepted' : check.status === 'degraded' ? 'status-requested' : 'status-declined'}`}>{check.status}</span></article>)}</div> : <EmptyState title={t('admin.telemetry.noChecks')} description={t('admin.telemetry.noChecksBody')} animation="loop-chart-rings" />}
      </DataState>
    </section>

    <section className="wf-card wf-section-gap">
      <div className="wf-panel-heading"><div><span className="care-eyebrow">{t('admin.telemetry.evalEyebrow')}</span><h3>{t('admin.telemetry.evalTitle')}</h3></div></div>
      <DataState {...evalRes} retry={evalRes.reload}>
        {metrics ? <div className="wf-metric-grid">{EVAL_METRICS.map(({ key, label }) => {
          const value = metrics[key];
          return <article className="wf-metric-card" key={key}><span className="wf-metric-icon"><Activity size={18} aria-hidden="true" /></span><span>{t(label)}</span><strong>{typeof value === 'number' ? <>{Math.round(value * 100)}<small>%</small></> : '—'}</strong><small>{typeof metrics.avg_latency_ms === 'number' ? t('admin.telemetry.latency', { ms: metrics.avg_latency_ms }) : t('admin.stat.unreported')}</small></article>;
        })}</div> : <EmptyState title={t('admin.telemetry.noEval')} description={t('admin.telemetry.noEvalBody')} animation="loop-chart-line" />}
      </DataState>
    </section>
  </>;
}
