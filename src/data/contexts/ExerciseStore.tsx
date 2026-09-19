import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { apiRequest } from '../services/http';

export interface SessionRecord {
  id: string; routineName: string; activeSeconds: number; completedMoves: number; skippedMoves: number; finishedAt: string;
}
interface ExerciseContextValue {
  savedIds: string[];
  toggleSaved: (id: string) => void;
  answers: Record<string, boolean>;
  setAnswer: (id: string, answer: boolean) => void;
  sessions: SessionRecord[];
  recordSession: (record: SessionRecord) => void;
  loading: boolean;
  saving: boolean;
  error: string;
  sessionError: string;
  savedSessionIds: string[];
  retrySession: () => void;
  reload: () => void;
}
const ExerciseContext = createContext<ExerciseContextValue | null>(null);

export function ExerciseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [savedSessionIds, setSavedSessionIds] = useState<string[]>([]);
  const [version, setVersion] = useState(0);
  const pendingRecords = useRef(new Map<string, SessionRecord>());
  const savingRecords = useRef(new Set<string>());
  const savingPreferences = useRef(false);
  const completedTasks = useRef<string[]>([]);
  const alive = useRef(true);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    Promise.all([
      apiRequest<{ savedExercises: string[]; completedTasks: string[] }>('/health/preferences', { signal: controller.signal }),
      apiRequest<{ items: SessionRecord[] }>('/health/exercise-sessions', { signal: controller.signal }),
    ]).then(([preferences, history]) => {
      if (!controller.signal.aborted) { setSavedIds(preferences.savedExercises); completedTasks.current = preferences.completedTasks; setSessions(history.items); }
    }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.id, version]);

  const toggleSaved = (id: string) => {
    if (!user || loading || savingPreferences.current) return;
    const next = savedIds.includes(id) ? savedIds.filter(value => value !== id) : [...savedIds, id];
    savingPreferences.current = true; setSaving(true); setError('');
    apiRequest<{ savedExercises: string[] }>('/health/preferences', { method: 'PUT', body: JSON.stringify({ savedExercises: next, completedTasks: completedTasks.current }) })
      .then((response: { savedExercises: string[] }) => { if (alive.current) setSavedIds(response.savedExercises); })
      .catch((reason: Error) => { if (alive.current) setError(reason.message); })
      .finally(() => { savingPreferences.current = false; if (alive.current) setSaving(false); });
  };

  const recordSession = (record: SessionRecord) => {
    if (!user || savingRecords.current.has(record.id)) return;
    pendingRecords.current.set(record.id, record);
    savingRecords.current.add(record.id);
    setSessionError('');
    apiRequest<SessionRecord>('/health/exercise-sessions', { method: 'POST', body: JSON.stringify(record) })
      .then((response: SessionRecord) => {
        if (!alive.current) return;
        setSavedSessionIds(previous => [...new Set([...previous, record.id])]);
        setSessions(previous => [response, ...previous.filter(item => item.id !== response.id)].slice(0, 20));
        pendingRecords.current.delete(record.id);
        if (!pendingRecords.current.size) setSessionError('');
      }).catch((reason: Error) => { if (alive.current) setSessionError(reason.message); })
      .finally(() => { savingRecords.current.delete(record.id); });
  };
  return <ExerciseContext.Provider value={{ savedIds, toggleSaved, answers,
    setAnswer: (id, answer) => setAnswers(previous => ({ ...previous, [id]: answer })), sessions, recordSession,
    loading, saving, error, sessionError, savedSessionIds, retrySession: () => { for (const record of pendingRecords.current.values()) recordSession(record); },
    reload: () => setVersion(value => value + 1),
  }}>{children}</ExerciseContext.Provider>;
}

export function useExerciseStore() {
  const context = useContext(ExerciseContext);
  if (!context) throw new Error('useExerciseStore must be used within ExerciseProvider');
  return context;
}
