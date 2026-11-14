/** Shared ring contract; a distinct module name keeps Metro out of the native twin. */
export interface ProgressRingProps {
  /** 0 … 1. */
  value: number;
  /** Text in the middle, e.g. "2/3". */
  centre: string;
  size?: number;
  /** Arc colour on the navy card (`on-hero-positive`). */
  tone?: string;
  /** Track colour (`on-hero-track`). */
  track?: string;
  testID?: string;
}

export function clampRing(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}
