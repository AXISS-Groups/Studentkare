import React, { useMemo, useState } from 'react';
import { Activity, ArrowRight, Download, FileText, HeartPulse, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useApiResource } from '../../hooks/api/useApiResource';
import { apiFileUrl, apiRequest } from '../../data/services/http';
import { LiveDocument, LiveOrder, LivePolicy, LiveReading, MetricDefinition, ServiceHealth, SupportTicket, ReviewedBenefit, ClaimRequest, RecordShare, RequestStatus, displayDate, money } from '../../data/types/workflowTypes';
import { DataState, EmptyState, Field, FormError, Pagination, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { TrendChart } from '../../components/health/HealthPrimitives';
import { navigate } from '../../lib/utils/workflowRouting';
import { estimateCoverage } from '../../data/datasets/healthExperience';
import { say, useT } from '@/i18n';
import type { MessageKey, Said } from '@/i18n';

import { HITLApprovalConsole } from '../../components/health/HITLApprovalConsole';
import { CareDashboardSummary } from '../../features/preventive/screens/CareDashboardSummary';

const localNow = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const RECORD_CATEGORIES = ['LAB', 'PRESCRIPTION', 'VACCINE', 'CAMP_REPORT', 'DISCHARGE_SUMMARY', 'OTHER'] as const;
type RecordCategory = typeof RECORD_CATEGORIES[number];
const isRecordCategory = (value: string): value is RecordCategory => (RECORD_CATEGORIES as readonly string[]).includes(value);

const REQUEST_STATUSES: readonly RequestStatus[] = ['REQUESTED', 'ACCEPTED', 'DECLINED', 'DISPATCHED', 'COMPLETED', 'CANCELLED'];
const isRequestStatus = (value: string): value is RequestStatus => (REQUEST_STATUSES as readonly string[]).includes(value);

const attentionNotice: React.CSSProperties = { background: 'var(--sk-color-attention-bg)', color: 'var(--sk-color-text)', borderColor: 'var(--sk-color-attention)' };
const positiveNotice: React.CSSProperties = { background: 'var(--sk-color-positive-bg)', color: 'var(--sk-color-text)', borderColor: 'var(--sk-color-positive)' };

export function MemberOverview() {
  const t = useT();
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const readings = useApiResource<{ items: LiveReading[] }>('/health/readings?days=90');
  const definitions = useApiResource<{ items: MetricDefinition[] }>('/health/metrics');
  const [metric, setMetric] = useState('heart');
  const [period, setPeriod] = useState(7);
  const [readingIndex, setReadingIndex] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [formMetric, setFormMetric] = useState('heart');
  const [value, setValue] = useState('');
  const [recordedAt, setRecordedAt] = useState(localNow);
  const mutation = useMutation();
  const series = useMemo(() => (readings.data?.items || []).filter(item => item.metric === metric && new Date(item.recordedAt).getTime() >= Date.now() - period * 86400000), [readings.data, metric, period]);
  const definition = definitions.data?.items.find(item => item.id === metric);
  const formDefinition = definitions.data?.items.find(item => item.id === formMetric);
  const selectedIndex = Math.min(readingIndex ?? series.length - 1, series.length - 1);
  const point = series[selectedIndex];
  const sourceLabel = (source: string) => source === 'MANUAL' ? t('member.overview.sourceManual') : source;
  return <>
    {/* 1. Main Interactive Health & Exercise Overview Dashboard */}
    <CareDashboardSummary
      completedTasks={completedTasks}
      onToggleTask={(id) => setCompletedTasks(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])}
    />

    <section className="wf-card wf-section-gap"><div className="wf-panel-heading"><div><span className="care-eyebrow">{t('member.overview.nextEyebrow')}</span><h3>{t('member.overview.nextTitle')}</h3><p>{t('member.overview.nextBody')}</p></div><button type="button" className="health-button" onClick={() => navigate('preventive-care')}>{t('member.overview.nextAction')}<ArrowRight size={16} aria-hidden="true" /></button></div></section>

    {/* 2. Devices & Sensors — real camera/motion/voice/pulse tools with honest states */}
    <div style={{ marginTop: '24px' }}>
      <section className="wf-card">
        <div className="wf-panel-heading"><div><span className="care-eyebrow">{t('member.overview.devicesEyebrow')}</span><h3>{t('member.overview.devicesTitle')}</h3><p>{t('member.overview.devicesBody')}</p></div><button type="button" className="health-button" onClick={() => navigate('devices')}><Activity size={16} aria-hidden="true" />{t('member.overview.devicesAction')}</button></div>
      </section>
    </div>

    {/* 3. Recorded Readings & Manual Entry Section */}
    <div className="wf-panel-heading" style={{ marginTop: '32px' }}><div><span className="care-eyebrow">{t('member.overview.readingsEyebrow')}</span><h2>{t('member.overview.readingsTitle')}</h2><p>{t('member.overview.readingsBody')}</p></div><button type="button" className="health-button health-button-primary" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" />{t('member.overview.recordReading')}</button></div>
    <DataState loading={readings.loading || definitions.loading} error={readings.error || definitions.error} retry={() => { readings.reload(); definitions.reload(); }}>
      <div className="wf-metric-grid">{definitions.data?.items.slice(0, 4).map(item => {
        const latest = readings.data?.items.filter(reading => reading.metric === item.id).slice(-1)[0];
        return <button type="button" key={item.id} className={`wf-metric-card ${metric === item.id ? 'is-selected' : ''}`} aria-pressed={metric === item.id} onClick={() => { setMetric(item.id); setReadingIndex(null); }}><span className="wf-metric-icon" aria-hidden="true"><HeartPulse size={20} /></span><span>{item.label}</span><strong>{latest ? latest.value.toLocaleString('en-IN') : '—'} <small>{item.unit}</small></strong><small>{latest ? t('member.overview.recordedOn', { date: displayDate(latest.recordedAt) }) : t('member.overview.noMeasurement')}</small></button>;
      })}</div>
      <section className="wf-card wf-chart-card"><div className="wf-panel-heading"><Field label={t('member.overview.metric')}><select value={metric} onChange={event => { setMetric(event.target.value); setReadingIndex(null); }}>{definitions.data?.items.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field><div className="wf-choice-row" role="group" aria-label={t('member.overview.periodLabel')}>{[7, 30, 90].map(days => <button type="button" key={days} aria-pressed={period === days} onClick={() => { setPeriod(days); setReadingIndex(null); }}>{t('member.overview.days', { days })}</button>)}</div></div>
        {series.length ? <><div className="wf-chart-current"><strong>{point?.value.toLocaleString('en-IN')} <small>{definition?.unit}</small></strong><span>{point && displayDate(point.recordedAt)} · {point && sourceLabel(point.source)}</span></div>{series.length > 1 ? <TrendChart key={`${metric}-${period}`} values={series.map(item => item.value)} color="var(--sk-color-chart-categorical-1)" label={t('member.overview.chartLabel', { metric: definition?.label ?? '', count: series.length })} activeIndex={selectedIndex} /> : <p className="wf-notice">{t('member.overview.oneReading')}</p>}
          <input className="wf-reading-slider" type="range" aria-label={t('member.overview.exploreReadings')} aria-valuetext={point ? `${displayDate(point.recordedAt)}, ${point.value} ${point.unit}` : undefined} min={0} max={Math.max(0, series.length - 1)} value={Math.max(0, selectedIndex)} onChange={event => setReadingIndex(Number(event.target.value))} />
          <details className="wf-details"><summary>{t('member.overview.viewValues')}</summary><div className="wf-table-scroll"><table><thead><tr><th>{t('member.overview.colRecorded')}</th><th>{t('member.overview.colValue')}</th><th>{t('member.overview.colSource')}</th><th /></tr></thead><tbody>{series.map(item => <tr key={item.id}><td>{displayDate(item.recordedAt)}</td><td>{item.value} {item.unit}</td><td>{sourceLabel(item.source)}</td><td><button type="button" className="wf-icon-button" aria-label={t('member.overview.deleteReading', { date: displayDate(item.recordedAt) })} disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/health/readings/${item.id}`, { method: 'DELETE' }), readings.reload)}><Trash2 size={15} aria-hidden="true" /></button></td></tr>)}</tbody></table></div></details>
        </> : <EmptyState title={t('member.overview.emptyTitle')} description={t('member.overview.emptyBody')} action={t('member.overview.recordReading')} onAction={() => { setFormMetric(metric); setAdding(true); }} />}
        <FormError message={!adding ? mutation.error : ''} />
      </section>
      <section className="wf-movement-card"><Activity size={28} aria-hidden="true" /><div><h3>{t('member.overview.movementTitle')}</h3><p>{t('member.overview.movementBody')}</p></div><button type="button" className="health-button" onClick={() => navigate('movement')}>{t('member.overview.movementAction')} <ArrowRight size={15} aria-hidden="true" /></button></section>
      <div className="wf-two-column"><button type="button" className="wf-navigation-card" onClick={() => navigate('records')}><FileText size={24} aria-hidden="true" /><strong>{t('member.overview.recordsTitle')}</strong><span>{t('member.overview.recordsBody')}</span><ArrowRight size={18} aria-hidden="true" /></button><button type="button" className="wf-navigation-card wf-navigation-mint" onClick={() => navigate('insurance')}><ShieldCheck size={24} aria-hidden="true" /><strong>{t('member.overview.coverTitle')}</strong><span>{t('member.overview.coverBody')}</span><ArrowRight size={18} aria-hidden="true" /></button></div>
    </DataState>
    {adding && <ShopDialog title={t('member.overview.dialogTitle')} onClose={() => setAdding(false)}><form className="wf-form" onSubmit={event => { event.preventDefault(); mutation.run(() => apiRequest('/health/readings', { method: 'POST', body: JSON.stringify({ metric: formMetric, value: Number(value), recordedAt: new Date(recordedAt).toISOString() }) }), () => { setAdding(false); setValue(''); readings.reload(); }); }}><p>{t('member.overview.dialogBody')}</p><FormError message={mutation.error} /><Field label={t('member.overview.metric')}><select value={formMetric} onChange={event => { setFormMetric(event.target.value); setValue(''); }}>{definitions.data?.items.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field><Field label={t('member.overview.valueLabel', { unit: formDefinition?.unit || '' })}><input required type="number" step={formMetric === 'steps' ? '1' : 'any'} min={formDefinition?.min} max={formDefinition?.max} value={value} onChange={event => setValue(event.target.value)} /></Field><Field label={t('member.overview.measuredAt')}><input required type="datetime-local" value={recordedAt} onChange={event => setRecordedAt(event.target.value)} /></Field><SubmitButton busy={mutation.busy}>{t('member.overview.saveReading')}</SubmitButton></form></ShopDialog>}
  </>;
}

export function RecordsPanel() {
  const t = useT();
  const [page, setPage] = useState(0);
  const resource = useApiResource<{ items: LiveDocument[]; total?: number }>(`/health/documents?limit=12&offset=${page * 12}`);
  const shares = useApiResource<{ items: RecordShare[] }>('/records/shares');
  const [adding, setAdding] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareDoc, setShareDoc] = useState('');
  const [shareClinician, setShareClinician] = useState('');
  const [shareDays, setShareDays] = useState('7');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('LAB');
  const [file, setFile] = useState<File | null>(null);
  const mutation = useMutation();
  const shareMutation = useMutation();
  const exportMutation = useMutation();
  const categoryLabel = (value: string) => isRecordCategory(value) ? t(`member.records.category.${value}` as MessageKey) : value.replace(/_/g, ' ');
  const doExport = () => { exportMutation.run(async () => { const res = await apiRequest<unknown>('/records/export'); const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'studentkare-export.json'; a.click(); URL.revokeObjectURL(url); }); };
  return <>
    <section className="wf-card wf-section-gap"><div className="wf-panel-heading"><div><h3>{t('member.records.helpTitle')}</h3><p>{t('member.records.helpBody')}</p></div><button type="button" className="health-button" onClick={() => navigate('preventive-care')}>{t('member.records.helpAction')}<ArrowRight size={16} aria-hidden="true" /></button></div></section>
    <div className="wf-panel-heading"><div><span className="care-eyebrow">{t('member.records.eyebrow')}</span><h2>{t('member.records.title')}</h2><p>{t('member.records.body')}</p></div><button type="button" className="health-button health-button-primary" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" />{t('member.records.upload')}</button></div>
    <DataState {...resource} retry={resource.reload}>{resource.data?.items.length ? <><div className="wf-record-grid">{resource.data.items.map(item => <article className="wf-card" key={item.id}><span className="wf-record-icon" aria-hidden="true"><FileText size={24} /></span><span className="wf-status">{categoryLabel(item.category)}</span><h3>{item.title}</h3><p>{item.filename}</p><small>{t('member.records.uploadedOn', { date: displayDate(item.createdAt) })}</small><div className="wf-row-actions"><a className="health-button" href={apiFileUrl(item.id)} download><Download size={14} aria-hidden="true" />{t('member.records.download')}</a><button type="button" className="health-button" onClick={() => { setShareDoc(item.id); setShareOpen(true); }}><ShieldCheck size={14} aria-hidden="true" />{t('member.records.share')}</button><button type="button" className="wf-icon-button" disabled={mutation.busy} aria-label={t('member.records.deleteRecord', { title: item.title })} onClick={() => mutation.run(() => apiRequest(`/health/documents/${item.id}`, { method: 'DELETE' }), resource.reload)}><Trash2 size={16} aria-hidden="true" /></button></div></article>)}</div><Pagination page={page} total={resource.data?.total || resource.data.items.length} pageSize={12} onChange={setPage} /></> : <EmptyState title={t('member.records.emptyTitle')} description={t('member.records.emptyBody')} action={t('member.records.upload')} onAction={() => setAdding(true)} animation="anim-file-text" />}</DataState>
    <FormError message={!adding ? mutation.error : ''} />
    <section className="wf-card wf-section-gap"><div className="wf-panel-heading"><div><span className="care-eyebrow">{t('member.records.privacyEyebrow')}</span><h3>{t('member.records.privacyTitle')}</h3><p>{t('member.records.privacyBody')}</p></div><div className="wf-row-actions"><button type="button" className="health-button" disabled={exportMutation.busy} onClick={doExport}><Download size={16} aria-hidden="true" />{exportMutation.busy ? t('member.records.preparing') : t('member.records.export')}</button></div></div>
      <FormError message={exportMutation.error} />
      <DataState {...shares} retry={shares.reload}>{shares.data?.items.length ? <div className="wf-order-list">{shares.data.items.map(share => <div className="wf-order-line" key={share.id}><div><strong>{share.clinician}</strong><small>{share.document} · {share.active ? t('member.records.shareExpires', { date: displayDate(share.expiresAt) }) : share.revoked ? t('member.records.shareRevokedLower') : t('member.records.shareExpiredLower')}</small></div><span className={`wf-status ${share.active ? 'status-accepted' : 'status-declined'}`}>{share.active ? t('member.records.shareActive') : share.revoked ? t('member.records.shareRevoked') : t('member.records.shareExpired')}</span>{share.active && <button type="button" className="health-text-button" disabled={shareMutation.busy} onClick={() => shareMutation.run(() => apiRequest(`/records/shares/${share.id}/revoke`, { method: 'POST' }), shares.reload)}>{t('member.records.revoke')}</button>}</div>)}</div> : <EmptyState title={t('member.records.noSharesTitle')} description={t('member.records.noSharesBody')} />}</DataState>
      <FormError message={!shareOpen ? shareMutation.error : ''} />
      <div className="wf-two-column wf-section-gap"><div className="wf-notice"><ShieldCheck size={18} aria-hidden="true" />{t('member.records.shareNote')}</div><button type="button" className="health-button" onClick={() => navigate('delete-account')}>{t('member.records.deleteAccount')}</button></div>
    </section>
    {adding && <ShopDialog title={t('member.records.uploadDialogTitle')} onClose={() => setAdding(false)}><form className="wf-form" onSubmit={event => { event.preventDefault(); if (!file) return; const form = new FormData(); form.append('title', title); form.append('category', category); form.append('file', file); mutation.run(() => apiRequest('/health/documents', { method: 'POST', body: form }), () => { setAdding(false); setTitle(''); setFile(null); resource.reload(); }); }}><FormError message={mutation.error} /><Field label={t('member.records.recordTitle')}><input required maxLength={160} value={title} onChange={event => setTitle(event.target.value)} /></Field><Field label={t('member.records.recordCategory')}><select value={category} onChange={event => setCategory(event.target.value)}>{RECORD_CATEGORIES.map(value => <option key={value} value={value}>{categoryLabel(value)}</option>)}</select></Field><Field label={t('member.records.file')} hint={t('member.records.fileHint')}><input type="file" required accept="application/pdf,image/png,image/jpeg" onChange={event => setFile(event.target.files?.[0] || null)} /></Field><p className="wf-fineprint">{t('member.records.prescriptionNote')}</p><SubmitButton busy={mutation.busy}>{t('member.records.saveRecord')}</SubmitButton></form></ShopDialog>}
    {shareOpen && <ShopDialog title={t('member.records.shareDialogTitle')} onClose={() => setShareOpen(false)}><form className="wf-form" onSubmit={event => { event.preventDefault(); shareMutation.run(() => apiRequest('/records/shares', { method: 'POST', body: JSON.stringify({ documentId: shareDoc, clinicianEmail: shareClinician, expiresInDays: Number(shareDays) }) }), () => { setShareOpen(false); shares.reload(); }); }}><p>{t('member.records.shareDialogBody')}</p><FormError message={shareMutation.error} /><Field label={t('member.records.clinicianEmail')}><input required type="email" value={shareClinician} onChange={event => setShareClinician(event.target.value)} /></Field><Field label={t('member.records.expiresDays')}><input required type="number" min="1" max="90" value={shareDays} onChange={event => setShareDays(event.target.value)} /></Field><SubmitButton busy={shareMutation.busy}>{t('member.records.grantAccess')}</SubmitButton></form></ShopDialog>}
  </>;
}

export function OrdersPanel() {
  const t = useT();
  const [page, setPage] = useState(0);
  const resource = useApiResource<{ items: LiveOrder[]; total?: number }>(`/orders?limit=10&offset=${page * 10}`);
  const mutation = useMutation();
  const statusLabel = (status: string) => isRequestStatus(status) ? t(`member.orders.status.${status}` as MessageKey) : status.replace(/_/g, ' ');
  return <><div className="wf-panel-heading"><div><span className="care-eyebrow">{t('member.orders.eyebrow')}</span><h2>{t('member.orders.title')}</h2><p>{t('member.orders.body')}</p></div><button type="button" className="health-button" onClick={() => navigate('shop')}>{t('member.orders.explore')} <ArrowRight size={15} aria-hidden="true" /></button></div><FormError message={mutation.error} /><DataState {...resource} retry={resource.reload}>{resource.data?.items.length ? <><div className="wf-order-list">{resource.data.items.map(order => <article className="wf-card wf-order" key={order.id}><div className="wf-panel-heading"><div><span className="care-eyebrow">{t('member.orders.requestRef', { ref: order.id.slice(0, 8).toUpperCase() })}</span><h3>{displayDate(order.createdAt)}</h3></div><strong>{money(order.totalPaise)}</strong></div>{order.lines.map(line => <div className="wf-order-line" key={line.id}><div><strong>{line.name}</strong><small>{line.quantity} × {money(line.pricePaise)}</small></div><span className={`wf-status status-${line.status.toLowerCase()}`}>{statusLabel(line.status)}</span></div>)}<div className="wf-order-meta"><span>{order.delivery.mode === 'pickup' ? t('member.orders.pickup') : order.delivery.address} · {order.delivery.city}</span>{order.requestedSlot && <span>{t('member.orders.requestedTime', { time: displayDate(order.requestedSlot) })}</span>}<span>{t('member.orders.payment')} <strong>{order.paymentStatus === 'PAID' ? t('member.orders.paid') : t('member.orders.unpaid')}</strong></span><small>{t('member.orders.noOnlinePayment')}</small></div>{order.lines.every(line => line.status === 'REQUESTED') && <button type="button" className="health-text-button" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/orders/${order.id}/cancel`, { method: 'POST' }), resource.reload)}>{t('member.orders.cancel')}</button>}</article>)}</div><Pagination page={page} total={resource.data?.total || resource.data.items.length} pageSize={10} onChange={setPage} /></> : <EmptyState title={t('member.orders.emptyTitle')} description={t('member.orders.emptyBody')} animation="anim-package" />}</DataState></>;
}

export function InsurancePanel() {
  const t = useT();
  const resource = useApiResource<{ items: LivePolicy[] }>('/health/policies');
  const benefits = useApiResource<{ items: ReviewedBenefit[] }>('/insurance/benefits');
  const claims = useApiResource<{ items: ClaimRequest[] }>('/insurance/claims');
  const [adding, setAdding] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimPolicy, setClaimPolicy] = useState('');
  const [claimProvider, setClaimProvider] = useState('');
  const [claimService, setClaimService] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [claimNotice, setClaimNotice] = useState<Said | null>(null);
  const [eligibility, setEligibility] = useState<string>('');
  const [insurer, setInsurer] = useState('');
  const [number, setNumber] = useState('');
  const [sum, setSum] = useState('');
  const [until, setUntil] = useState('');
  const [bill, setBill] = useState('');
  const [excluded, setExcluded] = useState('');
  const [copay, setCopay] = useState('');
  const [remaining, setRemaining] = useState('');
  const mutation = useMutation();
  const claimMutation = useMutation();
  const estimate = [bill, excluded, copay, remaining].every(value => value.trim() !== '') ? estimateCoverage(Number(bill), Number(excluded), { remainingCover: Number(remaining), copayPercent: Number(copay) }) : null;
  const categories = Array.from(new Set(benefits.data?.items.map(b => b.category) || []));
  const calculatorFields: { key: string; label: string; value: string; set: (value: string) => void }[] = [
    { key: 'bill', label: t('member.insurance.calcBill'), value: bill, set: setBill },
    { key: 'excluded', label: t('member.insurance.calcExcluded'), value: excluded, set: setExcluded },
    { key: 'copay', label: t('member.insurance.calcCopay'), value: copay, set: setCopay },
    { key: 'remaining', label: t('member.insurance.calcRemaining'), value: remaining, set: setRemaining },
  ];
  return <><div className="wf-panel-heading"><div><span className="care-eyebrow">{t('member.insurance.eyebrow')}</span><h2>{t('member.insurance.title')}</h2><p>{t('member.insurance.body')}</p></div><div className="wf-row-actions"><button type="button" className="health-button" onClick={() => setClaiming(true)}>{t('member.insurance.prepareClaim')}</button><button type="button" className="health-button health-button-primary" onClick={() => setAdding(true)}><Plus size={15} aria-hidden="true" />{t('member.insurance.addPolicy')}</button></div></div>
  <div className="wf-record-grid" style={{ marginBottom: 24 }}>{categories.length ? categories.map(category => <section className="wf-card" key={category}><span className="care-eyebrow">{category.replace(/-/g, ' ')}</span>{benefits.data?.items.filter(b => b.category === category).map(b => <div key={b.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--sk-color-rule-soft)' }}><h3 style={{ fontSize: 14 }}>{b.title}</h3><p style={{ fontSize: 12 }}>{b.description}</p></div>)}</section>) : <EmptyState title={benefits.loading ? t('member.insurance.benefitsLoadingTitle') : t('member.insurance.benefitsEmptyTitle')} description={benefits.error ? t('member.insurance.benefitsErrorBody') : t('member.insurance.benefitsEmptyBody')} />}</div>
  <DataState {...resource} retry={resource.reload}>{resource.data?.items.length ? <div className="wf-record-grid">{resource.data.items.map(policy => <article className="wf-card wf-policy" key={policy.id}><ShieldCheck size={28} aria-hidden="true" /><span className="wf-status">{t('member.insurance.userRecorded')}</span><h3>{policy.insurer}</h3><p>{policy.policyNumber}</p><strong className="wf-large-value">{money(policy.sumInsured * 100)}</strong><small>{t('member.insurance.sumValidUntil', { date: policy.validUntil })}</small><div className="wf-row-actions"><button type="button" className="health-button" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest<{ configured: boolean; status: string; message: string }>(`/insurance/eligibility?policyId=${encodeURIComponent(policy.id)}`), (res) => setEligibility(res.message))}>{t('member.insurance.checkEligibility')}</button><button type="button" className="health-text-button" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/health/policies/${policy.id}`, { method: 'DELETE' }), resource.reload)}>{t('member.insurance.removePolicy')}</button></div>{eligibility && <div className="wf-notice" role="status" style={{ marginTop: 10, ...attentionNotice }}><ShieldCheck size={18} aria-hidden="true" />{eligibility}</div>}</article>)}</div> : <EmptyState title={t('member.insurance.noPolicyTitle')} description={t('member.insurance.noPolicyBody')} />}</DataState><FormError message={!adding ? mutation.error : ''} />
      <div className="wf-two-column wf-section-gap"><section className="wf-card"><span className="care-eyebrow">{t('member.insurance.calcEyebrow')}</span><h3>{t('member.insurance.calcTitle')}</h3><p>{t('member.insurance.calcBody')}</p><div className="wf-form-grid">{calculatorFields.map(field => <Field key={field.key} label={field.label}><input type="number" min="0" step="any" value={field.value} onChange={event => field.set(event.target.value)} /></Field>)}</div><div className="wf-calculator-result" aria-live="polite"><span>{t('member.insurance.insurerShare')}<strong>{estimate ? money(Math.round(estimate.covered * 100)) : '—'}</strong></span><span>{t('member.insurance.outOfPocket')}<strong>{estimate ? money(Math.round(estimate.outOfPocket * 100)) : '—'}</strong></span></div>{[bill, excluded, copay, remaining].every(Boolean) && !estimate && <p className="wf-form-message">{t('member.insurance.calcInvalid')}</p>}</section><section className="wf-card wf-integration-note"><ShieldCheck size={30} aria-hidden="true" /><h3>{t('member.insurance.notConnectedTitle')}</h3><p>{t('member.insurance.notConnectedBody')}</p><button type="button" className="health-button" onClick={() => navigate('support')}>{t('member.insurance.contactSupport')} <ArrowRight size={15} aria-hidden="true" /></button></section></div>
      <section className="wf-card wf-section-gap"><div className="wf-panel-heading"><div><span className="care-eyebrow">{t('member.insurance.claimsEyebrow')}</span><h3>{t('member.insurance.claimsTitle')}</h3><p>{t('member.insurance.claimsBody')}</p></div></div><FormError message={!claiming ? claimMutation.error : ''} /><DataState {...claims} retry={claims.reload}>{claims.data?.items.length ? <div className="wf-order-list">{claims.data.items.map(claim => <div className="wf-order-line" key={claim.id}><div><strong>{claim.service || t('member.insurance.claimFallback')}</strong><small>{claim.providerName || t('member.insurance.providerFallback')} · {money(claim.amountPaise)} · {displayDate(claim.createdAt)}</small></div><div className="wf-row-actions"><span className="wf-status status-requested">{claim.status}</span>{claim.status === 'DRAFT' && <button type="button" className="health-button" disabled={claimMutation.busy} onClick={() => claimMutation.run(() => apiRequest<{ submitted: boolean; message?: string }>(`/insurance/claims/${claim.id}/submit`, { method: 'POST' }), (res) => { setClaimNotice(res.submitted ? { key: 'member.insurance.claimSubmitted' } : res.message ? { raw: res.message } : { key: 'member.insurance.claimNotSubmitted' }); claims.reload(); })}>{t('member.insurance.submitToInsurer')}</button>}</div></div>)}</div> : <EmptyState title={t('member.insurance.noClaimsTitle')} description={t('member.insurance.noClaimsBody')} action={t('member.insurance.prepareClaim')} onAction={() => setClaiming(true)} />}</DataState>{claimNotice && <div className="wf-notice" role="status" style={{ marginTop: 12, ...attentionNotice }}><ShieldCheck size={18} aria-hidden="true" />{say(t, claimNotice)}</div>}</section>
      {adding && <ShopDialog title={t('member.insurance.policyDialogTitle')} onClose={() => setAdding(false)}><form className="wf-form" onSubmit={event => { event.preventDefault(); mutation.run(() => apiRequest('/health/policies', { method: 'POST', body: JSON.stringify({ insurer, policyNumber: number, sumInsured: Number(sum), validUntil: until }) }), () => { setAdding(false); resource.reload(); }); }}><FormError message={mutation.error} /><Field label={t('member.insurance.insurer')}><input required minLength={2} maxLength={100} value={insurer} onChange={event => setInsurer(event.target.value)} /></Field><Field label={t('member.insurance.policyNumber')}><input required minLength={2} maxLength={100} value={number} onChange={event => setNumber(event.target.value)} /></Field><Field label={t('member.insurance.sumInsured')}><input required type="number" min="1" max="100000000" value={sum} onChange={event => setSum(event.target.value)} /></Field><Field label={t('member.insurance.validUntil')}><input required type="date" value={until} onChange={event => setUntil(event.target.value)} /></Field><SubmitButton busy={mutation.busy}>{t('member.insurance.savePolicy')}</SubmitButton></form></ShopDialog>}
      {claiming && <ShopDialog title={t('member.insurance.prepareClaim')} onClose={() => setClaiming(false)}><form className="wf-form" onSubmit={event => { event.preventDefault(); claimMutation.run(() => apiRequest('/insurance/claims', { method: 'POST', body: JSON.stringify({ policyId: claimPolicy, providerName: claimProvider, service: claimService, amountPaise: Math.round(Number(claimAmount) * 100) }) }), () => { setClaiming(false); claims.reload(); }); }}><p>{t('member.insurance.claimDialogBody')}</p><FormError message={claimMutation.error} /><Field label={t('member.insurance.policy')}><select required value={claimPolicy} onChange={event => setClaimPolicy(event.target.value)}><option value="">{t('member.insurance.choosePolicy')}</option>{resource.data?.items.map(policy => <option key={policy.id} value={policy.id}>{policy.insurer} · {policy.policyNumber}</option>)}</select></Field><Field label={t('member.insurance.provider')}><input value={claimProvider} maxLength={160} onChange={event => setClaimProvider(event.target.value)} /></Field><Field label={t('member.insurance.service')}><input value={claimService} maxLength={160} onChange={event => setClaimService(event.target.value)} /></Field><Field label={t('member.insurance.amount')}><input required type="number" min="1" step="any" value={claimAmount} onChange={event => setClaimAmount(event.target.value)} /></Field><SubmitButton busy={claimMutation.busy}>{t('member.insurance.saveClaim')}</SubmitButton></form></ShopDialog>}
  </>;
}

export function SupportPanel({ staff = false }: { staff?: boolean }) {
  const t = useT();
  const resource = useApiResource<{ items: SupportTicket[] }>('/support');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const mutation = useMutation();
  return <><div className="wf-panel-heading"><div><span className="care-eyebrow">{t('member.support.eyebrow')}</span><h2>{staff ? t('member.support.staffTitle') : t('member.support.title')}</h2><p>{staff ? t('member.support.staffBody') : t('member.support.body')}</p></div></div>
  <FormError message={mutation.error} />
  {sent && <div className="wf-notice" role="status" style={{ ...positiveNotice, marginBottom: '16px' }}>{t('member.support.sent')}</div>}
  {!staff && <form className="wf-card wf-form" onSubmit={event => { event.preventDefault(); setSent(false); mutation.run(() => apiRequest('/support', { method: 'POST', body: JSON.stringify({ subject, message }) }), () => { setSent(true); setSubject(''); setMessage(''); resource.reload(); }); }}><Field label={t('member.support.subject')}><input required minLength={3} maxLength={160} value={subject} onChange={event => setSubject(event.target.value)} /></Field><Field label={t('member.support.message')}><textarea required minLength={10} maxLength={2000} rows={4} value={message} onChange={event => setMessage(event.target.value)} /></Field><SubmitButton busy={mutation.busy}>{t('member.support.send')}</SubmitButton></form>}
  <DataState {...resource} retry={resource.reload}>{resource.data?.items.length ? <div className="wf-order-list wf-section-gap">{resource.data.items.map(ticket => <article className="wf-card" key={ticket.id}><div className="wf-panel-heading"><div><h3>{ticket.subject}</h3></div><span className="wf-status">{ticket.status}</span></div><p>{ticket.message}</p><small>{displayDate(ticket.createdAt)}</small>{staff && ticket.status === 'OPEN' && <button type="button" className="health-button" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/ops/support/${ticket.id}`, { method: 'PATCH' }), resource.reload)}>{t('member.support.markResolved')}</button>}</article>)}</div> : <EmptyState title={t('member.support.emptyTitle')} description={t('member.support.emptyBody')} animation="anim-message" />}</DataState></>;
}

export function IntegrationsPanel() {
  const t = useT();
  const resource = useApiResource<ServiceHealth>('/health');
  // Each detail follows the reported state: the old copy said "not connected"
  // even when the server reported the integration as configured.
  const items = (health: ServiceHealth): { id: string; name: string; available: boolean; detail: string }[] => [
    { id: 'otp', name: t('member.integrations.otpName'), available: health.integrations.otpChannels.length > 0, detail: health.integrations.otpChannels.join(', ') || t('member.integrations.otpOff') },
    { id: 'storage', name: t('member.integrations.storageName'), available: health.persistent, detail: health.persistent ? t('member.integrations.storageOn') : t('member.integrations.storageOff') },
    { id: 'payments', name: t('member.integrations.paymentsName'), available: health.integrations.payments, detail: health.integrations.payments ? t('member.integrations.paymentsOn') : t('member.integrations.paymentsOff') },
    { id: 'insurer', name: t('member.integrations.insurerName'), available: health.integrations.insurer, detail: health.integrations.insurer ? t('member.integrations.insurerOn') : t('member.integrations.insurerOff') },
    { id: 'device', name: t('member.integrations.deviceName'), available: health.integrations.deviceSync, detail: health.integrations.deviceSync ? t('member.integrations.deviceOn') : t('member.integrations.deviceOff') },
    { id: 'rx', name: t('member.integrations.rxName'), available: health.integrations.prescriptionReview, detail: health.integrations.prescriptionReview ? t('member.integrations.rxOn') : t('member.integrations.rxOff') },
  ];
  return <><div className="wf-panel-heading"><div><span className="care-eyebrow">{t('member.integrations.eyebrow')}</span><h2>{t('member.integrations.title')}</h2><p>{t('member.integrations.body')}</p></div></div>
  <div style={{ marginBottom: 20 }}>
    <HITLApprovalConsole />
  </div>
  <DataState {...resource} retry={resource.reload}><div className="wf-record-grid">{resource.data && items(resource.data).map(item => <article key={item.id} className="wf-card"><span className={`wf-status ${item.available ? 'status-completed' : ''}`}>{item.available ? t('member.integrations.configured') : t('member.integrations.notConnected')}</span><h3>{item.name}</h3><p>{item.detail}</p></article>)}</div></DataState></>;
}
