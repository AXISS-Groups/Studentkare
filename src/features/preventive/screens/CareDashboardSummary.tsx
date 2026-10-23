import React from 'react';
import { ArrowRight, CalendarDays, Check, Dumbbell, FileText, HeartPulse, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/data/contexts/AuthContext';
import { useApiResource } from '@/hooks/api/useApiResource';
import type { LiveDocument, LiveOrder } from '@/data/types/workflowTypes';
import { DataState } from '@/components/interface/WorkflowUI';
import { navigate } from '@/lib/utils/workflowRouting';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import './preventive.css';

const checklist: readonly { id: string; title: MessageKey; description: MessageKey }[] = [
  { id: 'movement', title: 'assist.dash.task.movement', description: 'assist.dash.task.movementBody' },
  { id: 'records', title: 'assist.dash.task.records', description: 'assist.dash.task.recordsBody' },
  { id: 'rest', title: 'assist.dash.task.rest', description: 'assist.dash.task.restBody' },
];

export function CareDashboardSummary({ completedTasks, onToggleTask }: { completedTasks: string[]; onToggleTask: (id: string) => void }) {
  const t = useT();
  const { user } = useAuth();
  const firstName = user?.fullName.split(' ')[0] ?? '';
  const documents = useApiResource<{ items: LiveDocument[] }>('/health/documents');
  const orders = useApiResource<{ items: LiveOrder[] }>('/orders');
  const completed = checklist.filter(item => completedTasks.includes(item.id)).length;
  const activeOrders = orders.data?.items.filter(order => order.lines.some(line => ['REQUESTED', 'ACCEPTED', 'DISPATCHED'].includes(line.status))) || [];
  return <section className="preventive-care" aria-label={t('assist.dash.label')}>
    <div className="wf-notice"><strong>{t('assist.dash.urgent')}</strong><a href="tel:112" aria-label={t('crisis.call112Spoken')}>{t('crisis.call112')}</a><span aria-hidden="true">·</span><a href="tel:14416" aria-label={t('crisis.callTeleManasSpoken')}>{t('crisis.callTeleManas')}</a></div>
    <div className="preventive-hero"><span className="care-eyebrow">{t('assist.dash.eyebrow')}</span><h2>{t('assist.dash.title')}</h2><p>{firstName ? t('assist.dash.introNamed', { name: firstName }) : t('assist.dash.intro')}</p><div className="wf-row-actions"><button type="button" className="health-button health-button-primary" onClick={() => navigate('care')}>{t('assist.exercise.findCare')}<ArrowRight size={16} aria-hidden="true" /></button><button type="button" className="health-button" onClick={() => navigate('preventive-care')}>{t('assist.dash.vaccinesReports')}<ShieldCheck size={16} aria-hidden="true" /></button></div></div>
    <DataState loading={documents.loading || orders.loading} error={documents.error || orders.error} retry={() => { documents.reload(); orders.reload(); }}>
      <div className="preventive-resource-grid">
        <button type="button" className="wf-navigation-card" onClick={() => navigate('records')}><FileText size={24} aria-hidden="true" /><strong>{t('assist.dash.records', { count: documents.data?.items.length ?? 0 })}</strong><span>{t('assist.dash.recordsBody')}</span><ArrowRight size={18} aria-hidden="true" /></button>
        <button type="button" className="wf-navigation-card" onClick={() => navigate('orders')}><CalendarDays size={24} aria-hidden="true" /><strong>{t('assist.dash.orders', { count: activeOrders.length })}</strong><span>{t('assist.dash.ordersBody')}</span><ArrowRight size={18} aria-hidden="true" /></button>
      </div>
    </DataState>
    <div className="preventive-resource-grid preventive-section"><section className="wf-card"><HeartPulse size={24} aria-hidden="true" /><h3>{t('assist.dash.checklistTitle')}</h3><p>{t('assist.dash.checklistBody')}</p><p aria-live="polite">{t('assist.dash.checklistDone', { done: completed, total: checklist.length })}</p><progress max={checklist.length} value={completed} aria-label={t('assist.dash.checklistLabel')} />{checklist.map(item => <label key={item.id} className="preventive-check preventive-section"><input type="checkbox" checked={completedTasks.includes(item.id)} onChange={() => onToggleTask(item.id)} /><span><strong>{t(item.title)}</strong><small>{t(item.description)}</small></span>{completedTasks.includes(item.id) && <Check size={18} aria-hidden="true" />}</label>)}<p className="wf-fineprint">{t('assist.dash.checklistNote')}</p><button type="button" className="health-button" onClick={() => navigate('preventive-care')}>{t('assist.dash.exploreWellbeing')}<ArrowRight size={16} aria-hidden="true" /></button></section>
      <section className="wf-card"><Dumbbell size={26} aria-hidden="true" /><h3>{t('assist.dash.moveTitle')}</h3><p>{t('assist.dash.moveBody')}</p><button type="button" className="health-button" onClick={() => navigate('movement')}>{t('assist.exercise.findMovement')}<ArrowRight size={16} aria-hidden="true" /></button><hr /><h3>{t('assist.dash.reportTitle')}</h3><p>{t('assist.dash.reportBody')}</p><button type="button" className="health-button" onClick={() => navigate('preventive-care')}>{t('assist.dash.openReports')}<ArrowRight size={16} aria-hidden="true" /></button></section>
    </div>
  </section>;
}
