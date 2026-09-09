import { describe, expect, it } from 'vitest';
import { exercises, filterExercises, routines, canStartExerciseSession } from '../data/exerciseLibrary';
import { PARQ_QUESTIONS } from '../ai/wellbeing/screening';
import { createSession, sessionReducer } from './exerciseSession';

describe('Exercise discovery and readiness', () => {
  it('searches names and equipment and combines filters', () => {
    expect(filterExercises({ query: '  NECK ' }).map(item => item.id)).toContain('neck');
    expect(filterExercises({ category: 'strength', equipment: 'chair' }).map(item => item.id)).toContain('sit-stand');
    expect(filterExercises({ query: 'no-such-movement' })).toEqual([]);
    expect(filterExercises({ savedOnly: true, savedIds: ['neck', 'walk'] }).map(item => item.id)).toEqual(['neck', 'walk']);
  });

  it('keeps routines tied to real, sourced library items and bounded pacing', () => {
    for (const routine of routines) {
      expect(routine.steps.length).toBeGreaterThan(1);
      for (const step of routine.steps) {
        const item = exercises.find(exercise => exercise.id === step.exerciseId);
        expect(item?.source.url).toMatch(/^https:\/\/www.nhs.uk\//);
        expect(step.seconds).toBeGreaterThanOrEqual(30);
        expect(step.seconds).toBeLessThanOrEqual(120);
      }
    }
  });

  it('requires every screening question to be explicitly answered', () => {
    expect(canStartExerciseSession({})).toBe(false);
    expect(canStartExerciseSession({ q1: false })).toBe(false);
    const answers = Object.fromEntries(PARQ_QUESTIONS.map(question => [question.id, false]));
    expect(canStartExerciseSession(answers)).toBe(true);
    for (const question of PARQ_QUESTIONS) {
      expect(canStartExerciseSession({ ...answers, [question.id]: true })).toBe(false);
    }
  });
});

describe('Guided session timer', () => {
  it('uses elapsed time rather than counting interval ticks', () => {
    const start = sessionReducer(createSession([30, 60]), { type: 'start', now: 1000 });
    const ticked = sessionReducer(start, { type: 'tick', now: 7500 });
    expect(ticked.remainingMs).toBe(23500);
    expect(ticked.activeMs).toBe(6500);
  });

  it('pauses, resumes without counting paused time, and resets cleanly', () => {
    let state = sessionReducer(createSession([30]), { type: 'start', now: 0 });
    state = sessionReducer(state, { type: 'pause', now: 7000 });
    expect(state.phase).toBe('paused');
    state = sessionReducer(state, { type: 'tick', now: 90000 });
    expect(state.remainingMs).toBe(23000);
    state = sessionReducer(state, { type: 'start', now: 90000 });
    state = sessionReducer(state, { type: 'tick', now: 95000 });
    expect(state.remainingMs).toBe(18000);
    expect(state.activeMs).toBe(12000);
    expect(sessionReducer(state, { type: 'reset' })).toEqual(createSession([30]));
  });

  it('does not auto-advance or count unattended time past a move', () => {
    let state = sessionReducer(createSession([30, 60]), { type: 'start', now: 0 });
    state = sessionReducer(state, { type: 'tick', now: 120000 });
    expect(state.phase).toBe('step-complete');
    expect(state.index).toBe(0);
    expect(state.activeMs).toBe(30000);
    state = sessionReducer(state, { type: 'next', now: 120000 });
    expect(state.phase).toBe('ready');
    expect(state.index).toBe(1);
    expect(state.remainingMs).toBe(60000);
    expect(state.completedMoves).toBe(1);
  });

  it('distinguishes skipped moves from completed timer intervals', () => {
    let state = createSession([30, 30]);
    state = sessionReducer(state, { type: 'next', now: 0 });
    state = sessionReducer(state, { type: 'next', now: 0 });
    expect(state.phase).toBe('finished');
    expect(state.skippedMoves).toBe(2);
    expect(state.completedMoves).toBe(0);
    expect(state.activeMs).toBe(0);
    expect(sessionReducer(state, { type: 'next', now: 999 })).toEqual(state);
  });

  it('ignores invalid timestamps and prevents negative time', () => {
    const state = sessionReducer(createSession([30]), { type: 'start', now: 100 });
    expect(sessionReducer(state, { type: 'tick', now: NaN })).toEqual(state);
    expect(sessionReducer(state, { type: 'tick', now: -100 })).toEqual(state);
    expect(() => createSession([])).toThrow();
    expect(() => createSession([0])).toThrow();
  });
});
