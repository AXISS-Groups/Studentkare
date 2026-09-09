import React, { useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronRight, Dumbbell, FileText, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react';
import { useAppStore } from '../../data/store';
import { DemoNote, MetricCards, TrendChart } from '../../components/health/HealthPrimitives';
import { demoPolicy, formatRupees, getMetricSeries, healthMetrics, MetricId, MetricPeriod } from '../../data/healthExperience';
import type { DashboardNavTab } from './StudentDashboardScreen';
import '../../theme/exercise.css';

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
  const [metricId, setMetricId] = useState<MetricId>('heart');
  const [period, setPeriod] = useState<MetricPeriod>(7);
  const [readingIndex, setReadingIndex] = useState<number | null>(null);
  const metric = healthMetrics.find(item => item.id === metricId)!;
  const samples = getMetricSeries(metricId, period);
  const average = samples.reduce((sum, item) => sum + item.value, 0) / samples.length;
  const myOrders = fabricOrders.filter(order => order.patientId === student.id);
  const completedCount = careTasks.filter(task => completedTasks.includes(task.id)).length;
  const selectedIndex = Math.min(readingIndex ?? samples.length - 1, samples.length - 1);
  const selectedReading = samples[selectedIndex];

  return <div className="health-experience health-workspace health-enter">
    <section className="health-overview-welcome"><div><span className="health-eyebrow">YOUR HEALTH, AT A GLANCE</span><h2>A little clarity. A healthier you.</h2><p>Keep your metrics, next steps, and care together.</p></div><DemoNote /></section>
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
  </div>;
}
