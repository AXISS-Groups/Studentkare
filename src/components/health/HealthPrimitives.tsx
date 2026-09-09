import React, { useId } from 'react';
import { Activity, ArrowUpRight, HeartPulse, Moon, Footprints } from 'lucide-react';
import { getMetricSeries, healthMetrics, MetricId } from '../../data/healthExperience';
import '../../theme/health-experience.css';

export const metricIcons = { heart: HeartPulse, oxygen: Activity, sleep: Moon, steps: Footprints };

export function TrendChart({ values, color, label, compact = false, activeIndex }: {
  values: number[]; color: string; label: string; compact?: boolean; activeIndex?: number;
}) {
  const id = useId().replace(/:/g, '');
  const width = 600;
  const height = compact ? 90 : 200;
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const points = values.map((value, index) => [
    8 + index / Math.max(values.length - 1, 1) * (width - 16),
    height - 20 - ((value - min) / range) * (height - 45),
  ]);
  const line = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x},${y}`).join(' ');
  const activePoint = activeIndex === undefined ? undefined : points[Math.max(0, Math.min(activeIndex, points.length - 1))];
  return (
    <svg className={`health-trend ${compact ? 'is-compact' : ''}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} preserveAspectRatio="none">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".2" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {!compact && [35, 85, 135, 185].map(y => <line key={y} x1="0" y1={y} x2={width} y2={y} stroke="currentColor" strokeOpacity=".08" strokeDasharray="4 7" />)}
      <path d={`${line} L${width - 8},${height} L8,${height} Z`} fill={`url(#${id})`} />
      <path className="health-chart-line" d={line} fill="none" stroke={color} strokeWidth={compact ? 3 : 2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength="1" />
      {activePoint && <g aria-hidden="true"><line x1={activePoint[0]} x2={activePoint[0]} y1="8" y2={height - 2} stroke={color} strokeOpacity=".35" strokeDasharray="3 5" /><circle cx={activePoint[0]} cy={activePoint[1]} r="5" fill="white" stroke={color} strokeWidth="2" /></g>}
    </svg>
  );
}

export function MetricCards({ selected, onSelect }: { selected?: MetricId; onSelect?: (id: MetricId) => void }) {
  return (
    <div className="health-metric-grid">
      {healthMetrics.map((metric, index) => {
        const Icon = metricIcons[metric.id];
        const values = getMetricSeries(metric.id, 7).map(sample => sample.value);
        const content = <>
          <div className="health-row"><span className="health-icon" style={{ color: metric.color, background: `${metric.color}12` }}><Icon size={19} /></span>{onSelect && <ArrowUpRight size={15} className="health-muted" />}</div>
          <span className="health-metric-label">{metric.label}</span>
          <div className="health-metric-value">{values[values.length - 1].toLocaleString('en-IN')} <span>{metric.unit}</span></div>
          <TrendChart values={values} color={metric.color} label={`Sample ${metric.label} for 7 days`} compact />
          <span className="health-small health-muted">Sample · 7-day trend</span>
        </>;
        const style = { '--enter-delay': `${index * 65}ms` } as React.CSSProperties;
        return onSelect ? <button key={metric.id} style={style} className={`health-card health-metric health-enter ${selected === metric.id ? 'is-selected' : ''}`} onClick={() => onSelect(metric.id)} aria-pressed={selected === metric.id}>{content}</button>
          : <div key={metric.id} style={style} className="health-card health-metric health-enter">{content}</div>;
      })}
    </div>
  );
}

export function DemoNote({ children = 'Interactive demo · sample health and policy data' }: { children?: React.ReactNode }) {
  return <span className="health-demo"><span aria-hidden="true" />{children}</span>;
}
