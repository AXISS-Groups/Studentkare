import React from 'react';
import { color } from '../theme';

export interface CountdownRingProps {
  /** Seconds left in the current step. */
  secondsLeft: number;
  /** Length of one step in seconds (the server's rotation). */
  totalSeconds: number;
  /** Outer size in px. */
  size?: number;
  /** Ring width in px. */
  stroke?: number;
}

/** Fraction of the step still left, clamped to 0…1 (0 for a nonsense total). */
export function ringFraction(secondsLeft: number, totalSeconds: number): number {
  if (!Number.isFinite(secondsLeft) || !Number.isFinite(totalSeconds) || totalSeconds <= 0) return 0;
  return Math.max(0, Math.min(1, secondsLeft / totalSeconds));
}

/**
 * The check-in pass's "refreshes in" ring (canvas MyPass `chart-refreshes`,
 * WebPass `chart-refreshes-2`): a data-driven graphic, so a component, not an
 * icon. Decorative: the seconds are always written beside it, so it is hidden
 * from assistive tech. It does not animate between ticks (no motion on a
 * safety screen); it is redrawn once a second by its owner.
 */
export function CountdownRing({ secondsLeft, totalSeconds, size = 40, stroke = 3 }: CountdownRingProps): React.ReactElement {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const left = ringFraction(secondsLeft, totalSeconds);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden focusable="false" data-testid="countdown-ring" data-fraction={left.toFixed(2)}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color.surface3} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color.action}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={circumference * (1 - left)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
