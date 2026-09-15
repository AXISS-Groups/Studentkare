/**
 * Movement session history (browser-local).
 *
 * Persists completed movement sessions to localStorage so users keep history
 * across sessions and page reloads — even without a native HealthKit/Health
 * Connect bridge. A native bridge (see nativeHealth.ts) can augment this with
 * OS-managed background history, but this provides a durable, honest, local
 * record of foreground sessions.
 */
import { useCallback, useEffect, useState } from 'react';

export interface MovementSession {
  id: string;
  steps: number;
  durationSeconds: number;
  endedAt: number;
  source: 'browser' | 'healthkit' | 'health_connect' | 'manual';
}

const KEY = 'studentkare-movement-history';

function load(): MovementSession[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MovementSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(sessions: MovementSession[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(sessions.slice(0, 100)));
  } catch { /* storage may be unavailable */ }
}

export function useMovementHistory() {
  const [sessions, setSessions] = useState<MovementSession[]>(() => load());

  useEffect(() => {
    const onStorage = () => setSessions(load());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const recordSession = useCallback((steps: number, durationSeconds: number, source: MovementSession['source'] = 'browser') => {
    setSessions(prev => {
      const next: MovementSession[] = [{ id: `mv_${Date.now()}`, steps, durationSeconds, endedAt: Date.now(), source }, ...prev].slice(0, 100);
      save(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSessions([]);
    save([]);
  }, []);

  return { sessions, recordSession, clearHistory };
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}
