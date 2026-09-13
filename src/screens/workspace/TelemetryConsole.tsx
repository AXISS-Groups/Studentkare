import React, { useState } from 'react';
import { Activity, CheckCircle2, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { FormError, useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface Job { key: string; name: string; enabled: boolean; intervalSeconds: number; lastRunAt: number | null; nextRunAt: number | null; lastStatus: string; lastError: string | null; }
interface HealthCheck { name: string; configured: boolean; reachable: boolean | null; status: string; detail: string; checked_at: number; }
interface HealthSummary { summary: { checked_at: number; interval_seconds: number; checks: HealthCheck[]; overall: string }; }

export function TelemetryConsole() {
  const jobs = useApiResource<{ jobs: Job[] }>('/ops/jobs');
  const health = useApiResource<HealthSummary>('/ops/integration-health');
  const evalRes = useApiResource<{ metrics: Record<string, number>; cases: any[] }>('/ops/agent-eval');
  const mutation = useMutation();
  const [notice, setNotice] = useState('');

  const runNow = (key: string) => mutation.run(() => apiRequest(`/ops/jobs/${key}/run`, { method: 'POST' }), (res) => { setNotice(`Job "${key}" ran: ${(res as any)?.status}.`); jobs.reload(); health.reload(); });

  const overall = health.data?.summary.overall;

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">PLATFORM TELEMETRY</span>
      <h2>Services, jobs & agent status.</h2>
      <p>Real status derived from persisted schedules and live probes — never hard-coded.</p>
    </div></div>

    <FormError message={mutation.error} />
    {notice && <div className="wf-notice" role="status" style={{ marginBottom: 16, background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}><CheckCircle2 size={18} />{notice}</div>}

    <div className="wf-record-grid" style={{ marginBottom: 24 }}>
      <article className="wf-card">
        <span className="wf-record-icon"><Activity size={24} /></span>
        <h3>Integration health</h3>
        <p>Overall: <strong>{overall || 'Checking…'}</strong></p>
        <span className={`wf-status ${overall === 'operational' ? 'status-accepted' : 'status-requested'}`}>{overall || 'Unknown'}</span>
        <button className="health-button" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest('/ops/jobs/integration_health/run', { method: 'POST' }), () => { setNotice('Integration health refreshed.'); health.reload(); jobs.reload(); })}><RefreshCw size={16} />Check now</button>
      </article>
      <article className="wf-card">
        <span className="wf-record-icon"><Server size={24} /></span>
        <h3>Scheduled jobs</h3>
        <p>{jobs.data?.jobs.length || 0} periodic jobs on the 2-hour cycle</p>
        <span className="wf-status status-accepted">2h cadence</span>
      </article>
    </div>

    <section className="wf-card wf-section-gap">
      <div className="wf-panel-heading"><div><span className="care-eyebrow">SCHEDULED JOBS</span><h3>Background operations</h3></div></div>
      <DataState {...jobs} retry={jobs.reload}>
        {jobs.data?.jobs.length ? <div className="wf-order-list">{jobs.data.jobs.map(job => <div className="wf-order-line" key={job.key}><div><strong>{job.name}</strong><small>{job.key} · every {Math.round(job.intervalSeconds / 3600)}h · last {job.lastRunAt ? new Date(job.lastRunAt * 1000).toLocaleString() : 'never'}</small>{job.lastError && <small style={{ color: '#b3241a' }}>{job.lastError}</small>}</div><div className="wf-row-actions"><span className={`wf-status ${job.lastStatus === 'SUCCESS' ? 'status-accepted' : job.lastStatus === 'FAILED' ? 'status-declined' : 'status-requested'}`}>{job.lastStatus || 'PENDING'}</span><button className="health-button" disabled={mutation.busy} onClick={() => runNow(job.key)}><RefreshCw size={14} />Run now</button></div></div>)}</div> : <EmptyState title="No scheduled jobs." description="Periodic jobs appear here once the scheduler is active." />}
      </DataState>
    </section>

    <section className="wf-card wf-section-gap">
      <div className="wf-panel-heading"><div><span className="care-eyebrow">CONNECTED SERVICES</span><h3>Integration health checks</h3></div></div>
      <DataState {...health} retry={health.reload}>
        {health.data?.summary.checks.length ? <div className="wf-record-grid">{health.data.summary.checks.map(check => <article className="wf-card" key={check.name}><span className="wf-record-icon"><ShieldCheck size={22} /></span><h3>{check.name.replace(/_/g, ' ')}</h3><p>{check.detail}</p><span className={`wf-status ${check.status === 'online' ? 'status-accepted' : check.status === 'degraded' ? 'status-requested' : 'status-declined'}`}>{check.status}</span></article>)}</div> : <EmptyState title="No checks yet." description="Use Check now to probe configured services." />}
      </DataState>
    </section>

    <section className="wf-card wf-section-gap">
      <div className="wf-panel-heading"><div><span className="care-eyebrow">AGENT EVALUATION</span><h3>Navigator quality metrics</h3></div></div>
      <DataState {...evalRes} retry={evalRes.reload}>
        {evalRes.data?.metrics ? (() => {
          const m = evalRes.data!.metrics;
          const items = [['Grounded', m.grounded_rate], ['Refusal', m.refusal_rate], ['Isolation', m.isolation_rate], ['Recovery', m.recovery_rate]] as const;
          return <div className="wf-metric-grid">{items.map(([label, value]) => <article className="wf-metric-card" key={label}><span className="wf-metric-icon"><Activity size={18} /></span><span>{label}</span><strong>{Math.round(value * 100)}<small>%</small></strong><small>Avg latency {m.avg_latency_ms}ms</small></article>)}</div>;
        })() : <EmptyState title="No evaluation run." description="The read-only navigator is evaluated for grounding, refusal, isolation, and recovery." />}
      </DataState>
    </section>
  </>;
}
