import React from 'react';
import { ArrowRight, CalendarDays, Check, Dumbbell, FileText, HeartPulse, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/data/AuthContext';
import { useApiResource } from '@/hooks/useApiResource';
import type { LiveDocument, LiveOrder } from '@/data/workflowTypes';
import { DataState } from '@/components/interface/WorkflowUI';
import { navigate } from '@/lib/workflowRouting';
import './preventive.css';

const checklist = [
  { id: 'movement', title: 'Make room for a movement break', description: 'At your own pace and within any advice from your clinician.' },
  { id: 'records', title: 'Organise your latest reports', description: 'Keep the original document for your next consultation.' },
  { id: 'rest', title: 'Plan a little screen-free time', description: 'A small, practical step for your evening routine.' },
];

export function CareDashboardSummary({ completedTasks, onToggleTask }: { completedTasks: string[]; onToggleTask: (id: string) => void }) {
  const { user } = useAuth();
  const documents = useApiResource<{ items: LiveDocument[] }>('/health/documents');
  const orders = useApiResource<{ items: LiveOrder[] }>('/orders');
  const completed = checklist.filter(item => completedTasks.includes(item.id)).length;
  const activeOrders = orders.data?.items.filter(order => order.lines.some(line => ['REQUESTED', 'ACCEPTED', 'DISPATCHED'].includes(line.status))) || [];
  return <section className="preventive-care" aria-label="Personal care dashboard">
    <div className="wf-notice"><strong>Need urgent help?</strong><a href="tel:112">Call 112 for emergencies in India</a><span>·</span><a href="tel:14416">Tele-MANAS mental-health support: 14416</a></div>
    <div className="preventive-hero"><span className="care-eyebrow">YOUR HEALTH, AT A GLANCE</span><h2>Your next step, made clearer.</h2><p>{user?.fullName.split(' ')[0]}, keep your recorded measurements, care requests and clinician follow-ups together.</p><div className="wf-row-actions"><button className="health-button health-button-primary" onClick={() => navigate('care')}>Find care<ArrowRight size={16} /></button><button className="health-button" onClick={() => navigate('preventive-care')}>Vaccines & report follow-up<ShieldCheck size={16} /></button></div></div>
    <DataState loading={documents.loading || orders.loading} error={documents.error || orders.error} retry={() => { documents.reload(); orders.reload(); }}>
      <div className="preventive-resource-grid">
        <button className="wf-navigation-card" onClick={() => navigate('records')}><FileText size={24} /><strong>{documents.data?.items.length || 0} records in your health vault</strong><span>Uploaded to your account. Open, share or request a review.</span><ArrowRight size={18} /></button>
        <button className="wf-navigation-card" onClick={() => navigate('orders')}><CalendarDays size={24} /><strong>{activeOrders.length} active care requests</strong><span>Follow real provider updates. A request is not a confirmed booking.</span><ArrowRight size={18} /></button>
      </div>
    </DataState>
    <div className="preventive-resource-grid preventive-section"><section className="wf-card"><HeartPulse size={24} /><h3>Everyday wellbeing, at your pace.</h3><p>A personal checklist, not a prescribed treatment plan.</p><p aria-live="polite">{completed} of {checklist.length} complete</p><progress max={checklist.length} value={completed} aria-label="Everyday wellbeing checklist" />{checklist.map(item => <label key={item.id} className="preventive-check preventive-section"><input type="checkbox" checked={completedTasks.includes(item.id)} onChange={() => onToggleTask(item.id)} /><span><strong>{item.title}</strong><small>{item.description}</small></span>{completedTasks.includes(item.id) && <Check size={18} aria-hidden="true" />}</label>)}<p className="wf-fineprint">Checklist progress lasts for this session.</p><button className="health-button" onClick={() => navigate('preventive-care')}>Explore wellbeing<ArrowRight size={16} /></button></section>
      <section className="wf-card"><Dumbbell size={26} /><h3>Movement you can make your own.</h3><p>Browse source-linked exercise guides and record your activity. Advice about activity after illness or an abnormal report belongs in your clinician follow-up.</p><button className="health-button" onClick={() => navigate('movement')}>Find your movement<ArrowRight size={16} /></button><hr /><h3>Questions about a report?</h3><p>The preventive-care workspace keeps review requests and clinician-approved next steps visible, without inventing findings or prescribing from a file name.</p><button className="health-button" onClick={() => navigate('preventive-care')}>Open report follow-up<ArrowRight size={16} /></button></section>
    </div>
  </section>;
}
