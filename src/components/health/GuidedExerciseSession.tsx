import React, { useEffect, useReducer, useRef, useState } from 'react';
import { ArrowRight, Check, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { ExerciseRoutine, exercises, exerciseCategories } from '../../data/datasets/exerciseLibrary';
import { useExerciseStore } from '../../data/contexts/ExerciseStore';
import { createSession, sessionReducer, formatSessionTime } from '../../lib/utils/exerciseSession';
import { ExerciseIllustration } from './ExerciseIllustration';
import { useT } from '@/i18n';

export function GuidedExerciseSession({ routine, onClose }: { routine: ExerciseRoutine; onClose: () => void }) {
  const t = useT();
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
    <span className="exercise-finish-icon" aria-hidden="true"><Check size={36} /></span>
    <span className="exercise-eyebrow">{t('assist.session.finishEyebrow')}</span>
    <h3>{t('assist.session.finishTitle')}</h3>
    <p>{t('assist.session.finishBody')}</p>
    <div className="exercise-finish-stats"><div><strong>{formatSessionTime(Math.floor(state.activeMs / 1000))}</strong><span>{t('assist.session.timerTime')}</span></div><div><strong>{state.completedMoves}</strong><span>{t('assist.session.intervalsDone')}</span></div><div><strong>{state.skippedMoves}</strong><span>{t('assist.session.movesSkipped')}</span></div></div>
    <p className="exercise-small">{t('assist.session.finishNote')}</p>
    {savedSessionIds.includes(sessionId) ? <p role="status" className="exercise-small">{t('assist.session.saved')}</p> : sessionError ? <div role="alert" className="wf-notice"><p>{sessionError}</p><button type="button" className="health-text-button" onClick={retrySession}>{t('assist.exercise.retrySave')}</button></div> : <p role="status" className="exercise-small">{t('assist.session.saving')}</p>}
    <button type="button" className="health-button health-button-primary" onClick={onClose}>{t('assist.session.back')} <ArrowRight size={16} aria-hidden="true" /></button>
  </div>;

  const progress = 1 - state.remainingMs / (step.seconds * 1000);
  return <div className="exercise-session-layout">
    <div className="exercise-session-stage" style={{ '--exercise-accent': theme.color, '--exercise-tint': theme.background } as React.CSSProperties}>
      <span className="exercise-eyebrow">{t('assist.session.moveOf', { n: state.index + 1, total: routine.steps.length })}</span>
      <ExerciseIllustration key={state.index} pose={exercise.pose} color={theme.color} label={t('assist.exercise.poseFor', { name: exercise.name })} active={state.phase === 'running'} />
      <div className="exercise-timer">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="53" fill="none" stroke={theme.background} strokeWidth="4" /><circle cx="60" cy="60" r="53" fill="none" stroke={theme.color} strokeWidth="4" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} transform="rotate(-90 60 60)" strokeLinecap="round" /></svg>
        <span role="timer" aria-label={t('assist.session.timeLeft')} aria-live="off">{formatSessionTime(Math.ceil(state.remainingMs / 1000))}</span>
      </div>
      <p className="exercise-timer-status" role="status">{t(state.phase === 'step-complete' ? 'assist.session.status.stepDone' : state.phase === 'paused' ? 'assist.session.status.paused' : state.phase === 'running' ? 'assist.session.status.running' : 'assist.session.status.ready')}</p>
      <div className="exercise-session-controls">
        {state.phase !== 'step-complete' && <button type="button" className="health-button health-button-primary" onClick={() => dispatch({ type: state.phase === 'running' ? 'pause' : 'start', now: performance.now() })}>
          {state.phase === 'running' ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          {t(state.phase === 'running' ? 'assist.session.pause' : state.phase === 'paused' ? 'assist.session.resume' : state.index === 0 ? 'assist.session.start' : 'assist.session.startMove')}
        </button>}
        <button type="button" className="health-button" onClick={() => dispatch({ type: 'next', now: performance.now() })}>{state.phase === 'step-complete' ? <ArrowRight size={16} aria-hidden="true" /> : <SkipForward size={16} aria-hidden="true" />}{t(state.phase === 'step-complete' ? state.index === routine.steps.length - 1 ? 'assist.session.finish' : 'assist.session.next' : 'assist.session.skip')}</button>
      </div>
      <button type="button" className="health-text-button" onClick={() => dispatch({ type: 'reset' })}><RotateCcw size={13} aria-hidden="true" />{t('assist.session.reset')}</button>
    </div>
    <div className="exercise-session-guidance">
      <span className="exercise-eyebrow">{step.label}</span><h3>{exercise.name}</h3><p>{exercise.description}</p>
      <ol className="exercise-instructions">{exercise.steps.map((instruction, index) => <li key={instruction}><span>{index + 1}</span>{instruction}</li>)}</ol>
      <div className="exercise-cue"><strong>{t('assist.session.keepInMind')}</strong><p>{exercise.cue}</p></div>
      <div className="exercise-session-queue">{routine.steps.map((item, index) => <div key={`${item.exerciseId}-${index}`} aria-current={state.index === index ? 'step' : undefined}><span>{index + 1}</span><strong>{exercises.find(entry => entry.id === item.exerciseId)?.name}</strong><small>{formatSessionTime(item.seconds)}</small></div>)}</div>
      <p className="exercise-small">{t('assist.session.note')}</p>
    </div>
  </div>;
}
