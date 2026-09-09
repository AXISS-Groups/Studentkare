import React, { useEffect, useReducer, useRef, useState } from 'react';
import { ArrowRight, Check, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { ExerciseRoutine, exercises, exerciseCategories } from '../../data/exerciseLibrary';
import { useExerciseStore } from '../../data/ExerciseStore';
import { createSession, sessionReducer, formatSessionTime } from '../../lib/exerciseSession';
import { ExerciseIllustration } from './ExerciseIllustration';

export function GuidedExerciseSession({ routine, onClose }: { routine: ExerciseRoutine; onClose: () => void }) {
  const [state, dispatch] = useReducer(sessionReducer, routine.steps.map(step => step.seconds), createSession);
  const [sessionId] = useState(() => crypto.randomUUID());
  const recorded = useRef(false);
  const { recordSession, savedSessionIds, sessionError, retrySession } = useExerciseStore();
  const step = routine.steps[state.index];
  const exercise = exercises.find(item => item.id === step.exerciseId)!;
  const theme = exerciseCategories.find(item => item.id === exercise.category)!;

  useEffect(() => {
    if (state.phase !== 'running') return;
    const timer = window.setInterval(() => dispatch({ type: 'tick', now: performance.now() }), 200);
    const pauseWhenHidden = () => {
      if (document.hidden) dispatch({ type: 'pause', now: performance.now() });
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', pauseWhenHidden);
    };
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== 'finished' || recorded.current) return;
    recorded.current = true;
    recordSession({ id: sessionId, routineName: routine.name, activeSeconds: Math.floor(state.activeMs / 1000), completedMoves: state.completedMoves, skippedMoves: state.skippedMoves, finishedAt: new Date().toISOString() });
  }, [state, routine.name, recordSession, sessionId]);

  if (state.phase === 'finished') return <div className="exercise-session-finish">
    <span className="exercise-finish-icon"><Check size={36} /></span>
    <span className="exercise-eyebrow">A LITTLE SPACE FOR YOURSELF</span>
    <h3>Your timer session is finished.</h3>
    <p>Go at your own pace. Rest is always an option.</p>
    <div className="exercise-finish-stats"><div><strong>{formatSessionTime(Math.floor(state.activeMs / 1000))}</strong><span>Timer time</span></div><div><strong>{state.completedMoves}</strong><span>Intervals completed</span></div><div><strong>{state.skippedMoves}</strong><span>Moves skipped</span></div></div>
    <p className="exercise-small">This is a record of your in-app timer, not verified physical activity. Your medical metrics have not been changed.</p>
    {savedSessionIds.includes(sessionId) ? <p role="status" className="exercise-small">Saved to your account.</p> : sessionError ? <div role="alert" className="wf-notice"><p>{sessionError}</p><button className="health-text-button" onClick={retrySession}>Retry saving session</button></div> : <p role="status" className="exercise-small">Saving session history…</p>}
    <button className="health-button health-button-primary" onClick={onClose}>Back to movement <ArrowRight size={16} /></button>
  </div>;

  const progress = 1 - state.remainingMs / (step.seconds * 1000);
  return <div className="exercise-session-layout">
    <div className="exercise-session-stage" style={{ '--exercise-accent': theme.color, '--exercise-tint': theme.background } as React.CSSProperties}>
      <span className="exercise-eyebrow">MOVE {state.index + 1} OF {routine.steps.length}</span>
      <ExerciseIllustration key={state.index} pose={exercise.pose} color={theme.color} label={`Illustrative pose for ${exercise.name}`} active={state.phase === 'running'} />
      <div className="exercise-timer">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="53" fill="none" stroke={theme.background} strokeWidth="4" /><circle cx="60" cy="60" r="53" fill="none" stroke={theme.color} strokeWidth="4" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} transform="rotate(-90 60 60)" strokeLinecap="round" /></svg>
        <span role="timer" aria-label="Time remaining" aria-live="off">{formatSessionTime(Math.ceil(state.remainingMs / 1000))}</span>
      </div>
      <p className="exercise-timer-status" role="status">{state.phase === 'step-complete' ? 'Interval finished. Continue when you are ready.' : state.phase === 'paused' ? 'Paused. Take your time.' : state.phase === 'running' ? 'Move comfortably. Rest whenever you need.' : 'Ready when you are.'}</p>
      <div className="exercise-session-controls">
        {state.phase !== 'step-complete' && <button className="health-button health-button-primary" onClick={() => dispatch({ type: state.phase === 'running' ? 'pause' : 'start', now: performance.now() })}>
          {state.phase === 'running' ? <Pause size={16} /> : <Play size={16} />}
          {state.phase === 'running' ? 'Pause timer' : state.phase === 'paused' ? 'Resume timer' : state.index === 0 ? 'Start session' : 'Start move'}
        </button>}
        <button className="health-button" onClick={() => dispatch({ type: 'next', now: performance.now() })}>{state.phase === 'step-complete' ? <ArrowRight size={16} /> : <SkipForward size={16} />}{state.phase === 'step-complete' ? state.index === routine.steps.length - 1 ? 'Finish session' : 'Next move' : 'Skip move'}</button>
      </div>
      <button className="health-text-button" onClick={() => dispatch({ type: 'reset' })}><RotateCcw size={13} />Reset session</button>
    </div>
    <div className="exercise-session-guidance">
      <span className="exercise-eyebrow">{step.label}</span><h3>{exercise.name}</h3><p>{exercise.description}</p>
      <ol className="exercise-instructions">{exercise.steps.map((instruction, index) => <li key={instruction}><span>{index + 1}</span>{instruction}</li>)}</ol>
      <div className="exercise-cue"><strong>Keep in mind</strong><p>{exercise.cue}</p></div>
      <div className="exercise-session-queue">{routine.steps.map((item, index) => <div key={`${item.exerciseId}-${index}`} aria-current={state.index === index ? 'step' : undefined}><span>{index + 1}</span><strong>{exercises.find(entry => entry.id === item.exerciseId)?.name}</strong><small>{formatSessionTime(item.seconds)}</small></div>)}</div>
      <p className="exercise-small">These intervals provide general pacing, not prescribed exercise doses. Pauses are automatic when this browser tab is hidden. Stop if you feel pain or dizziness.</p>
    </div>
  </div>;
}
