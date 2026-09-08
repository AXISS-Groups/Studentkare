/**
 * Disordered-eating risk-signal detection.
 *
 * Per Part 2 of the spec, repeated weight-related queries, restriction
 * language, compensatory-behaviour language, or excessive activity logging
 * must route to support AND SUPPRESS the numeric surfaces for that student
 * rather than continuing to serve them.
 *
 * This module only DETECTS and ROUTES. It never scores, diagnoses, or counts.
 */
import type { RiskSignal } from './types';

const RESTRICTION = [
  /skip\w* (my )?(meal|meals|lunch|dinner|breakfast)/i,
  /not eating/i,
  /stop\w* eating/i,
  /cut\w* (out|back) (carbs|food|meals)/i,
  /fasting/i,
  /hardly eating/i,
  /barely eat/i,
  /not hungry/i,
];

const COMPENSATORY = [
  /burn (it|off|the|those)/i,
  /make up for (eating|the food|it)/i,
  /purg\w*/i,
  /vomit\w*/i,
  /laxative/i,
  /work\w* (it|those) off/i,
  /compensat/i,
];

const WEIGHT_QUERY = [
  /how (do|to|can i) (lose|drop|shed) (weight|kg|kgs|fat)/i,
  /want to (lose|drop|shed) .*(kg|kgs|weight|fat)/i,
  /target weight/i,
  /ideal weight/i,
  /weigh\w* (myself|in) every day/i,
  /am i (too )?fat/i,
  /need to lose (weight|fat)/i,
];

const EXCESSIVE_ACTIVITY = [
  /work\w* out (twice|two times|every day|daily)/i,
  /can't? skip (the )?(gym|workout)/i,
  /double (session|workout)/i,
  /exercise (to|just) to (eat|burn)/i,
  /compulsive exercise/i,
];

function scan(text: string, patterns: RegExp[], kind: RiskSignal['kind']): RiskSignal[] {
  const hits: RiskSignal[] = [];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      hits.push({ kind, matched: m[0], severity: kind === 'RESTRICTION' || kind === 'COMPENSATORY' ? 'HIGH' : 'MEDIUM' });
    }
  }
  return hits;
}

/** Detect risk signals in free text. Empty array = clear. */
export function detectRiskSignals(text: string): RiskSignal[] {
  const t = text.trim();
  if (!t) return [];
  return [
    ...scan(t, RESTRICTION, 'RESTRICTION'),
    ...scan(t, COMPENSATORY, 'COMPENSATORY'),
    ...scan(t, WEIGHT_QUERY, 'WEIGHT_QUERY'),
    ...scan(t, EXCESSIVE_ACTIVITY, 'EXCESSIVE_ACTIVITY'),
  ];
}

/** True when numeric body-metric surfaces should be suppressed for this student. */
export function shouldSuppressNumericSurfaces(signals: RiskSignal[]): boolean {
  return signals.length > 0;
}

export interface SupportRouting {
  primary: string;
  secondary: string;
  teleManas: string;
}

/** Route to support. Always uses live Tele-MANAS — never the disconnected NEDA helpline. */
export function getSupportRouting(signals: RiskSignal[]): SupportRouting {
  return {
    primary: 'Campus health warden & counsellor',
    secondary: 'Reach out to someone you trust today',
    teleManas: 'Tele-MANAS: 14416 / 1800 891 4416 (24/7, English · Hindi · Telugu)',
  };
}
