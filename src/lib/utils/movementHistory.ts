/**
 * Movement session history, held in memory for this page only.
 *
 * This used to persist step counts to localStorage. Step counts are health
 * data, and AGENTS.md guardrail 9 keeps health data out of client-side
 * storage, so nothing is written any more and any copy an earlier version
 * left behind is removed on first use. Saving to the account needs a server
 * endpoint; until then the history ends when the page closes.
 */
import { useCallback, useEffect, useState } from 'react';

export interface MovementSession {
  id: string;
  steps: number;
  durationSeconds: number;
  endedAt: number;
  source: 'browser' | 'healthkit' | 'health_connect' | 'manual';
}

const LEGACY_KEY = 'studentkare-movement-history';

function purgeLegacyCopy(): void {
  try { localStorage.removeItem(LEGACY_KEY); } catch { /* storage may be unavailable */ }
}

export function useMovementHistory() {
  const [sessions, setSessions] = useState<MovementSession[]>([]);

  useEffect(purgeLegacyCopy, []);

  const recordSession = useCallback((steps: number, durationSeconds: number, source: MovementSession['source'] = 'browser') => {
    setSessions(prev => {
      return [{ id: `mv_${Date.now()}`, steps, durationSeconds, endedAt: Date.now(), source }, ...prev].slice(0, 100);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSessions([]);
  }, []);

  return { sessions, recordSession, clearHistory };
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}
