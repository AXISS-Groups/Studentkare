export interface ExerciseSessionState {
  durations: number[];
  phase: 'ready' | 'running' | 'paused' | 'step-complete' | 'finished';
  index: number;
  remainingMs: number;
  activeMs: number;
  completedMoves: number;
  skippedMoves: number;
  lastTickAt: number | null;
}

export type SessionAction = { type: 'start' | 'pause' | 'tick' | 'next'; now: number } | { type: 'reset' };

export function createSession(durations: number[]): ExerciseSessionState {
  if (!durations.length || durations.some(seconds => !Number.isFinite(seconds) || seconds <= 0)) {
    throw new Error('A session needs positive move durations');
  }
  return { durations: [...durations], phase: 'ready', index: 0, remainingMs: durations[0] * 1000, activeMs: 0, completedMoves: 0, skippedMoves: 0, lastTickAt: null };
}

function tick(state: ExerciseSessionState, now: number): ExerciseSessionState {
  if (state.phase !== 'running' || state.lastTickAt === null || now < state.lastTickAt) return state;
  const elapsed = Math.min(now - state.lastTickAt, state.remainingMs);
  const remainingMs = state.remainingMs - elapsed;
  return { ...state, remainingMs, activeMs: state.activeMs + elapsed, lastTickAt: now, phase: remainingMs === 0 ? 'step-complete' : 'running' };
}

export function sessionReducer(state: ExerciseSessionState, action: SessionAction): ExerciseSessionState {
  if (action.type === 'reset') return createSession(state.durations);
  if (!Number.isFinite(action.now) || action.now < 0 || state.phase === 'finished') return state;
  switch (action.type) {
    case 'start': return state.phase === 'ready' || state.phase === 'paused' ? { ...state, phase: 'running', lastTickAt: action.now } : state;
    case 'tick': return tick(state, action.now);
    case 'pause': {
      const updated = tick(state, action.now);
      return updated.phase === 'running' ? { ...updated, phase: 'paused', lastTickAt: null } : updated;
    }
    case 'next': {
      const updated = tick(state, action.now);
      const completed = updated.phase === 'step-complete';
      const nextIndex = updated.index + 1;
      return {
        ...updated,
        completedMoves: updated.completedMoves + (completed ? 1 : 0),
        skippedMoves: updated.skippedMoves + (completed ? 0 : 1),
        index: nextIndex < updated.durations.length ? nextIndex : updated.index,
        remainingMs: nextIndex < updated.durations.length ? updated.durations[nextIndex] * 1000 : 0,
        phase: nextIndex < updated.durations.length ? 'ready' : 'finished',
        lastTickAt: null,
      };
    }
  }
}

export const formatSessionTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
