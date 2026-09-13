import React, { useState } from 'react';
import { ArrowRight, CalendarDays, Camera, Check, ChevronRight, Dumbbell, FileText, Gamepad2, HeartPulse, Pill, ShieldCheck, Stethoscope, Sparkles, Volume2 } from 'lucide-react';
import { useAppStore } from '../../data/store';
import { useAuth } from '../../data/AuthContext';
import { MetricCards, TrendChart } from '../../components/health/HealthPrimitives';
import { demoPolicy, formatRupees, getMetricSeries, healthMetrics, MetricId, MetricPeriod } from '../../data/healthExperience';
import type { DashboardNavTab } from './StudentDashboardScreen';
import '../../theme/exercise.css';

import { EmergencyBar } from '../../components/health/EmergencyBar';
import { MedicationTrackerWidget } from '../../components/health/MedicationTrackerWidget';
import { CampusBloodDonorWidget } from '../../components/health/CampusBloodDonorWidget';
import { StudyPostureCoachWidget } from '../../components/health/StudyPostureCoachWidget';
import { TriageCouncilModal } from '../../components/health/TriageCouncilModal';
import { SOAPNotesGeneratorModal } from '../../components/health/SOAPNotesGeneratorModal';
import { CameraSkinAndVitalsScannerModal } from '../../components/health/CameraSkinAndVitalsScannerModal';
import { MentalHealthGameSuiteModal } from '../../components/health/MentalHealthGameSuiteModal';
import { ENTHearingVisionScannerModal } from '../../components/health/ENTHearingVisionScannerModal';
import { AIMedicationAndXrayScannerModal } from '../../components/health/AIMedicationAndXrayScannerModal';
import { SubscriptionPlansModal } from '../../components/health/SubscriptionPlansModal';
import { SUBSCRIPTION_PLANS } from '../../data/subscriptionPlans';

const careTasks = [
  { id: 'movement', title: 'Make time for a movement break', subtitle: 'A short walk or gentle stretch, at your own pace.' },
  { id: 'records', title: 'Organise your health records', subtitle: 'Keep your latest reports together for your next visit.' },
  { id: 'rest', title: 'Wind down for a restful night', subtitle: 'Give yourself a little screen-free time before bed.' },
];

export function HealthOverview({ onNavigate, completedTasks, onToggleTask }: {
  onNavigate: (tab: DashboardNavTab) => void;
  completedTasks: string[];
  onToggleTask: (id: string) => void;
}) {
  const { records, fabricOrders, student } = useAppStore();
  const auth = useAuth();
  const token = auth.user ? 'authenticated' : null;
  const [metricId, setMetricId] = useState<MetricId>('heart');
  const [period, setPeriod] = useState<MetricPeriod>(7);
  const [readingIndex, setReadingIndex] = useState<number | null>(null);

  // New AI Modals & Membership Plans state
  const [triageOpen, setTriageOpen] = useState(false);
  const [soapOpen, setSoapOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);
  const [entOpen, setEntOpen] = useState(false);
  const [medScanOpen, setMedScanOpen] = useState(false);
  const [plansModalOpen, setPlansModalOpen] = useState(false);

  const activePlan = SUBSCRIPTION_PLANS.find(p => p.id === (student.subscriptionPlanId || 'FREE')) || SUBSCRIPTION_PLANS[0];

  const metric = healthMetrics.find(item => item.id === metricId)!;
  const samples = getMetricSeries(metricId, period);
  const average = samples.reduce((sum, item) => sum + item.value, 0) / samples.length;
  const myOrders = fabricOrders.filter(order => order.patientId === student.id);
  const completedCount = careTasks.filter(task => completedTasks.includes(task.id)).length;
  const selectedIndex = Math.min(readingIndex ?? samples.length - 1, samples.length - 1);
  const selectedReading = samples[selectedIndex];

  return <div className="health-experience health-workspace health-enter">
    <EmergencyBar compact />

    <section className="health-overview-welcome">
      <div>
        <span className="health-eyebrow">YOUR HEALTH, AT A GLANCE</span>
        <h2>A little clarity. A healthier you.</h2>
        <p>Keep your metrics, next steps, and care together.</p>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          className="health-button"
          onClick={() => setPlansModalOpen(true)}
          style={{ fontSize: '0.8rem', padding: '8px 14px', background: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}
        >
          <ShieldCheck size={15} /> 🛡️ Plan: {activePlan.name} (₹{activePlan.price})
        </button>
        <button
          className="health-button"
          onClick={() => setMedScanOpen(true)}
          style={{ fontSize: '0.8rem', padding: '8px 12px', background: '#ccfbf1', color: '#0f766e', borderColor: '#99f6e4', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Pill size={15} /> 💊 AI Pill & X-Ray Scribe
        </button>
        <button
          className="health-button"
          onClick={() => setEntOpen(true)}
          style={{ fontSize: '0.8rem', padding: '8px 12px', background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Volume2 size={15} /> 👂 ENT Hearing & Vision Checkup
        </button>
        <button
          className="health-button"
          onClick={() => setCameraOpen(true)}
          style={{ fontSize: '0.8rem', padding: '8px 12px', background: '#e0e7ff', color: '#3730a3', borderColor: '#c7d2fe', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Camera size={15} /> 📷 Camera & Skin Vitals Scan
        </button>
        <button
          className="health-button"
          onClick={() => setGameOpen(true)}
          style={{ fontSize: '0.8rem', padding: '8px 12px', background: '#fce7f3', color: '#9d174d', borderColor: '#fbcfe8', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Gamepad2 size={15} /> 🎮 Mental Health De-Stress Games
        </button>
        <button
          className="health-button health-button-primary"
          onClick={() => setTriageOpen(true)}
          style={{ fontSize: '0.8rem', padding: '8px 12px', background: '#7c3aed', borderColor: '#7c3aed', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Sparkles size={15} /> 🏛️ AI Medical Council Triage
        </button>
        <button
          className="health-button"
          onClick={() => setSoapOpen(true)}
          style={{ fontSize: '0.8rem', padding: '8px 12px', background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <FileText size={15} /> 📋 SOAP Scribe
        </button>
      </div>
    </section>

    {/* Connected Sensors, Telemetry & Wearables Quick Launch Banner */}
    <section className="health-movement-banner" style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#5b21b6', marginBlock: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ padding: 10, borderRadius: 12, background: '#ede9fe' }}>
          <Sparkles size={24} color="#7c3aed" />
        </div>
        <div>
          <h3 style={{ margin: 0, color: '#4c1d95', fontSize: '1rem', fontWeight: 800 }}>Connected Sensors & Live Wearable Telemetry</h3>
          <p style={{ margin: '2px 0 0', color: '#6d28d9', fontSize: '0.85rem' }}>Apple Watch, WearOS, BLE Hardware Scanners & Step Counter Sensors active</p>
        </div>
      </div>
      <button className="health-button" style={{ background: '#7c3aed', color: '#ffffff', borderColor: '#7c3aed' }} onClick={() => onNavigate('devices')}>
        Open Connected Devices <ArrowRight size={15} />
      </button>
    </section>

    {/* Daily Medication Tracker, Posture Coach & Campus Blood Donor Widgets */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBlock: 16 }}>
      <MedicationTrackerWidget />
      <StudyPostureCoachWidget />
      <CampusBloodDonorWidget />
    </div>

    <MetricCards selected={metricId} onSelect={id => { setMetricId(id); setReadingIndex(null); }} />
    <div className="health-overview-grid">
      <section className="health-card health-chart-card">
        <div className="health-row health-wrap"><div><span className="health-eyebrow">THE BIGGER PICTURE</span><h3>{metric.label}</h3></div><div className="health-segment" aria-label="Trend time range">{([7, 30, 90] as const).map(days => <button key={days} aria-pressed={period === days} onClick={() => setPeriod(days)}>{days} days</button>)}</div></div>
        <div className="health-chart-summary"><strong>{average.toLocaleString('en-IN', { maximumFractionDigits: metric.precision })}</strong><span>{metric.unit} average</span><span className="health-soft-badge">Sample history</span></div>
        <TrendChart key={`${metricId}-${period}`} activeIndex={selectedIndex} values={samples.map(item => item.value)} color={metric.color} label={`${metric.label}, ${period}-day sample trend. Minimum ${Math.min(...samples.map(item => item.value))}, maximum ${Math.max(...samples.map(item => item.value))} ${metric.unit}.`} />
        <div className="health-chart-dates"><span>{samples[0].date}</span><span>{samples[samples.length - 1].date}</span></div>
        <div className="health-chart-inspector"><span>{selectedReading.date}</span><strong>{selectedReading.value.toLocaleString('en-IN')} {metric.unit}</strong><input type="range" aria-label="Explore sample readings" aria-valuetext={`${selectedReading.date}: ${selectedReading.value} ${metric.unit}`} min={0} max={samples.length - 1} value={selectedIndex} onChange={event => setReadingIndex(Number(event.target.value))} /><small>Drag or use the arrow keys to explore a dated reading.</small></div>
        <p className="health-chart-description">{metric.description} These sample values are not a health assessment.</p>
        <details className="health-chart-table"><summary>View readings as a table</summary><div tabIndex={0} aria-label="Scrollable sample readings"><table><caption>{metric.label} · sample history</caption><thead><tr><th scope="col">Date</th><th scope="col">Value ({metric.unit})</th></tr></thead><tbody>{samples.map(sample => <tr key={sample.date}><td>{sample.date}</td><td>{sample.value.toLocaleString('en-IN')}</td></tr>)}</tbody></table></div></details>
      </section>
      <section className="health-card health-care-plan"><div className="health-row"><span className="health-icon health-icon-mint"><HeartPulse size={21} /></span><span className="health-small health-muted">TODAY'S LITTLE WINS</span></div><h3>Your everyday care plan</h3><p>Small steps, at your own pace.</p><div className="health-row health-small"><span>Daily checklist</span><strong aria-live="polite">{completedCount} of {careTasks.length} complete</strong></div><progress className="health-progress" max={careTasks.length} value={completedCount} aria-label="Daily care checklist completion" />
        <div className="health-task-list">{careTasks.map(task => <label key={task.id} className={`health-task ${completedTasks.includes(task.id) ? 'is-complete' : ''}`}><input type="checkbox" checked={completedTasks.includes(task.id)} onChange={() => onToggleTask(task.id)} /><span className="health-task-check" aria-hidden="true"><Check size={13} /></span><span><strong>{task.title}</strong><small>{task.subtitle}</small></span></label>)}</div>
        <button className="health-text-button" onClick={() => onNavigate('wellbeing')}>Explore wellbeing <ArrowRight size={15} /></button><span className="health-small health-muted">Checklist progress lasts for this session.</span>
      </section>
    </div>
    <section className="health-movement-banner"><Dumbbell size={25} /><div><h3>A little movement, at your own pace.</h3><p>Explore illustrated exercises, saved movements, and guided session previews.</p></div><button className="health-button" onClick={() => onNavigate('exercises')}>Find your movement <ArrowRight size={15} /></button></section>
    <div className="health-overview-grid">
      <section className="health-card"><div className="health-row"><div><span className="health-eyebrow">EVERYTHING IN ONE PLACE</span><h3>Your care activity</h3></div><CalendarDays size={21} className="health-muted" /></div><div className="health-activity-list">{myOrders.slice(0, 2).map(order => <button key={order.id} className="health-activity-item" onClick={() => onNavigate('care')}><span className="health-icon health-icon-brand"><Stethoscope size={19} /></span><span><strong>{order.serviceName}</strong><small>{order.createdAt.slice(0, 10)} · {order.state.replace(/_/g, ' ')}</small></span><ChevronRight size={17} /></button>)}{myOrders.length === 0 && <p>No care activity yet. Explore the directory to find support.</p>}<button className="health-activity-item" onClick={() => onNavigate('vault')}><span className="health-icon health-icon-mint"><FileText size={19} /></span><span><strong>{records.length} records in your health vault</strong><small>Reports, prescriptions, and your health history</small></span><ChevronRight size={17} /></button></div><button className="health-text-button" onClick={() => onNavigate('care')}>Find care & consultations <ArrowRight size={15} /></button></section>
      <section className="health-coverage-callout"><div className="health-row"><ShieldCheck size={29} /><span className="health-small">SAMPLE POLICY</span></div><h3>A little more peace of mind.</h3><p>{demoPolicy.name}</p><div className="health-coverage-number">{formatRupees(demoPolicy.sumInsured)}<span>annual sum insured</span></div><button className="health-button" onClick={() => onNavigate('insurance')}>Explore your insurance hub <ArrowRight size={16} /></button></section>
    </div>

    {/* AI Modals */}
    <TriageCouncilModal isOpen={triageOpen} onClose={() => setTriageOpen(false)} token={token} />
    <SOAPNotesGeneratorModal isOpen={soapOpen} onClose={() => setSoapOpen(false)} token={token} />
    <CameraSkinAndVitalsScannerModal isOpen={cameraOpen} onClose={() => setCameraOpen(false)} token={token} />
    <MentalHealthGameSuiteModal isOpen={gameOpen} onClose={() => setGameOpen(false)} token={token} />
    <ENTHearingVisionScannerModal isOpen={entOpen} onClose={() => setEntOpen(false)} token={token} />
    <AIMedicationAndXrayScannerModal isOpen={medScanOpen} onClose={() => setMedScanOpen(false)} token={token} />
    <SubscriptionPlansModal isOpen={plansModalOpen} onClose={() => setPlansModalOpen(false)} />
  </div>;
}
