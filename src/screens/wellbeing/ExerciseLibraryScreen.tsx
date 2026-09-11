import React, { useMemo, useRef, useState } from 'react';
import { ArrowRight, Bookmark, Check, ChevronRight, Clock3, ExternalLink, Heart, Play, RotateCcw, Search, ShieldCheck, Sparkles, Wind, X } from 'lucide-react';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { ExerciseIllustration } from '../../components/health/ExerciseIllustration';
import { GuidedExerciseSession } from '../../components/health/GuidedExerciseSession';
import { useExerciseStore } from '../../data/ExerciseStore';
import { canStartExerciseSession, Exercise, ExerciseCategory, ExerciseEquipment, ExerciseRoutine, exercises, exerciseCategories, filterExercises, routines, routineSeconds } from '../../data/exerciseLibrary';
import { PARQ_QUESTIONS, evaluateScreening } from '../../ai/wellbeing/screening';
import { formatSessionTime } from '../../lib/exerciseSession';
import '../../theme/exercise.css';
import { useScrollReveal } from '../../hooks/useScrollReveal';

type ExerciseModal = { kind: 'exercise'; exercise: Exercise } | { kind: 'readiness'; routine: ExerciseRoutine } | { kind: 'session'; routine: ExerciseRoutine } | null;

export function ExerciseLibraryScreen({ onOpenMetrics, onFindCare }: { onOpenMetrics: () => void; onFindCare: () => void }) {
  const { savedIds, toggleSaved, answers, setAnswer, sessions, loading, saving, error, sessionError, retrySession, reload } = useExerciseStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all');
  const [equipment, setEquipment] = useState<ExerciseEquipment | 'all'>('all');
  const [savedOnly, setSavedOnly] = useState(false);
  const [modal, setModal] = useState<ExerciseModal>(null);
  const [replay, setReplay] = useState(0);
  const revealRoot = useRef<HTMLDivElement>(null);
  useScrollReveal(revealRoot);
  const matches = useMemo(() => filterExercises({ query, category, equipment, savedOnly, savedIds }), [query, category, equipment, savedOnly, savedIds]);
  const ready = canStartExerciseSession(answers);
  const blocked = evaluateScreening(answers).blocksStructuredContent;
  const answered = PARQ_QUESTIONS.filter(item => typeof answers[item.id] === 'boolean').length;
  const startRoutine = (routine: ExerciseRoutine) => setModal({ kind: ready ? 'session' : 'readiness', routine });
  const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: document.documentElement.dataset.uiMotion === 'reduced' ? 'auto' : 'smooth' });

  return <div ref={revealRoot} className="health-experience exercise-space">
    {error && <div className="wf-notice" role="alert">{error}<button className="health-text-button" onClick={reload}>Reload saved data</button></div>}
    {sessionError && <div className="wf-notice" role="alert">Your session could not be saved: {sessionError}<button className="health-text-button" onClick={retrySession}>Retry saving session</button></div>}
    {(loading || saving) && <p className="exercise-small" role="status">{loading ? 'Loading your saved movement information…' : 'Saving to your account…'}</p>}
    <div className="exercise-topline"><span><span className="exercise-tiny-dot" />MOVEMENT & EVERYDAY WELLBEING</span><button className="health-text-button" onClick={onOpenMetrics}>Back to health metrics <ArrowRight size={14} /></button></div>
    <section className="exercise-hero">
      <div className="exercise-hero-copy"><span className="exercise-eyebrow">MAKE A LITTLE ROOM FOR YOURSELF</span><h2>A little movement.<br /><em>A little more you.</em></h2><p>Stretch between classes. Find your balance. Take a quieter breath. Explore simple ways to move, at your own pace.</p><div className="exercise-hero-actions"><button className="health-button health-button-primary" onClick={() => scrollToSection('exercise-library')}>Find your movement <ArrowRight size={16} /></button><button className="health-text-button" onClick={() => scrollToSection('exercise-routines')}><Play size={14} />Explore guided sessions</button></div><div className="exercise-hero-tags"><span><Check size={12} />Source-linked guidance</span><span><Heart size={12} />No scores. No pressure.</span></div></div>
      <div className="exercise-hero-visual"><div className="exercise-hero-orbit" /><ExerciseIllustration pose="open" label="Illustration of a seated chest-opening movement" /><div className="exercise-floating-note"><Wind size={19} /><span>Pause. Stretch. Reset.</span></div><div className="exercise-floating-note note-bottom"><Sparkles size={17} /><span>A moment, just for you.</span></div></div>
    </section>

    <div className="exercise-feature-strip"><div><strong>{exercises.length}</strong><span>Movement guides</span></div><div><strong>{exerciseCategories.length}</strong><span>Ways to explore</span></div><div><strong>{routines.length}</strong><span>Guided sessions</span></div><div><Bookmark size={19} /><span>{savedIds.length} saved for later</span></div></div>

    <section id="exercise-routines" className="exercise-section">
      <div className="exercise-section-heading"><div><span className="exercise-eyebrow">A LITTLE STRUCTURE, AT YOUR OWN PACE</span><h3>Find a moment that fits.</h3></div><span className="exercise-small">General pacing · not a personalised prescription</span></div>
      {blocked ? <div className="exercise-support-card"><ShieldCheck size={25} /><div><h4>Let’s find the right support first.</h4><p>Your readiness answers indicate that a clinician should guide structured activity. The session player is unavailable for now.</p></div><button className="health-button" onClick={onFindCare}>Find care <ArrowRight size={15} /></button></div> : <div className="exercise-routine-grid">{routines.map(routine => {
        const theme = exerciseCategories.find(item => item.id === routine.category)!;
        return <button key={routine.id} className="exercise-routine-card" style={{ '--exercise-accent': theme.color, '--exercise-tint': theme.background } as React.CSSProperties} onClick={() => startRoutine(routine)}>
          <div className="exercise-routine-art"><ExerciseIllustration pose={routine.pose} color={theme.color} label={`Illustration for ${routine.name}`} /><span className="exercise-play-icon"><Play size={17} fill="currentColor" /></span></div>
          <div className="exercise-routine-body"><span><Clock3 size={12} />{routineSeconds(routine) / 60} min <span>·</span>{routine.steps.length} moves</span><h4>{routine.name}</h4><p>{routine.description}</p><strong>Explore this session <ArrowRight size={14} /></strong></div>
        </button>;
      })}</div>}
      <div className="exercise-readiness-link"><ShieldCheck size={14} /><span>Guided sessions use the app’s activity-readiness check.</span><button onClick={() => setModal({ kind: 'readiness', routine: routines[0] })}>{answered ? 'Review my answers' : 'View readiness check'}<ChevronRight size={12} /></button></div>
    </section>

    <section id="exercise-library" className="exercise-section">
      <div className="exercise-section-heading"><div><span className="exercise-eyebrow">THE EVERYDAY MOVEMENT LIBRARY</span><h3>Explore what feels right for you.</h3></div><button className={`exercise-saved-filter ${savedOnly ? 'is-active' : ''}`} aria-pressed={savedOnly} onClick={() => setSavedOnly(!savedOnly)}><Bookmark size={15} fill={savedOnly ? 'currentColor' : 'none'} />Saved ({savedIds.length})</button></div>
      <div className="exercise-category-tabs" aria-label="Movement categories"><button aria-pressed={category === 'all'} onClick={() => setCategory('all')}>All movement</button>{exerciseCategories.map(item => <button key={item.id} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}</div>
      <div className="exercise-search-row"><label className="exercise-search"><Search size={18} /><input type="search" aria-label="Search exercises" placeholder="Search movement, focus area, or equipment" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="Clear exercise search" onClick={() => setQuery('')}><X size={16} /></button>}</label><label className="exercise-equipment-filter">Equipment<select aria-label="Exercise equipment" value={equipment} onChange={event => setEquipment(event.target.value as ExerciseEquipment | 'all')}><option value="all">Any equipment</option><option value="none">No equipment</option><option value="chair">Stable chair</option><option value="wall">Wall support</option></select></label></div>
      <p className="exercise-result-count" aria-live="polite">{matches.length} {matches.length === 1 ? 'movement' : 'movements'} to explore{savedOnly ? ' from your saved list' : ''}</p>
      {matches.length ? <div className="exercise-library-grid" key={`${category}-${equipment}-${savedOnly}`}>
        {matches.map((exercise, index) => {
          const theme = exerciseCategories.find(item => item.id === exercise.category)!;
          return <article className="exercise-library-card" key={exercise.id} style={{ '--exercise-accent': theme.color, '--exercise-tint': theme.background, '--exercise-delay': `${Math.min(index, 5) * 45}ms` } as React.CSSProperties}>
            <div className="exercise-card-art"><button className="exercise-open-art" aria-label={`View ${exercise.name}`} onClick={() => { setReplay(0); setModal({ kind: 'exercise', exercise }); }}><ExerciseIllustration pose={exercise.pose} color={theme.color} label={`Illustrative pose for ${exercise.name}`} /></button><span className="exercise-category-label">{theme.label}</span><button className="exercise-save-button" aria-label={`${savedIds.includes(exercise.id) ? 'Unsave' : 'Save'} ${exercise.name}`} aria-pressed={savedIds.includes(exercise.id)} onClick={() => toggleSaved(exercise.id)}><Bookmark size={17} fill={savedIds.includes(exercise.id) ? 'currentColor' : 'none'} /></button></div>
            <div className="exercise-card-body"><span className="exercise-card-focus">{exercise.focus}</span><button className="exercise-title-button" onClick={() => setModal({ kind: 'exercise', exercise })}><h4>{exercise.name}</h4></button><p>{exercise.description}</p><div><span>{exercise.equipment === 'none' ? 'No equipment' : exercise.equipment === 'chair' ? 'Stable chair' : 'Wall support'}</span><button onClick={() => setModal({ kind: 'exercise', exercise })} aria-label={`Read guide for ${exercise.name}`}>View guide <ArrowRight size={13} /></button></div></div>
          </article>;
        })}
      </div> : <div className="exercise-empty"><Search size={30} /><h4>No movements here yet.</h4><p>{savedOnly ? 'Save a movement using its bookmark button, or explore all movements.' : 'Try a simpler search or a different equipment filter.'}</p><button className="health-button" onClick={() => { setQuery(''); setCategory('all'); setEquipment('all'); setSavedOnly(false); }}>Show all movements</button></div>}
    </section>

    <section className="exercise-bottom-grid">
      <div className="exercise-metrics-note"><span className="exercise-eyebrow">A CLEARER PICTURE, WITHOUT THE PRESSURE</span><h3>Your movement. Your metrics.</h3><p>Explore your recorded measurements alongside movement information. The app does not use those readings to prescribe your workout.</p><button className="health-button" onClick={onOpenMetrics}>Explore my metrics <ArrowRight size={15} /></button></div>
      <div className="exercise-history"><span className="exercise-eyebrow">YOUR TIME IN THIS SPACE</span><h3>Recent sessions</h3>{sessions.length ? <ul>{sessions.slice(0, 3).map(session => <li key={session.id}><span className="exercise-history-check"><Check size={16} /></span><div><strong>{session.routineName}</strong><small>{formatSessionTime(session.activeSeconds)} timer time · {session.completedMoves} complete · {session.skippedMoves} skipped</small></div></li>)}</ul> : <p>{loading ? 'Loading your session history…' : 'Completed timer sessions will appear here. No pressure to complete a routine.'}</p>}<span className="exercise-small">Saved to your account. Timer history is not verified physical activity.</span></div>
    </section>
    <div className="exercise-source-note"><Heart size={16} /><p>General exercise education, adapted from the linked NHS resources. Use a clear space and stable support. Stop if you feel pain, dizziness, or unusual breathlessness; seek appropriate care. Illustrations show a pose, not a full technique demonstration.</p></div>

    {modal && <ShopDialog title={modal.kind === 'exercise' ? 'Your movement guide' : modal.kind === 'readiness' ? 'Before a guided session' : modal.routine.name} onClose={() => setModal(null)} wide={modal.kind !== 'readiness'}>
      <div className="exercise-space exercise-dialog-content">
        {modal.kind === 'exercise' && <div className="exercise-detail-grid">
          <div className="exercise-detail-visual"><ExerciseIllustration key={replay} pose={modal.exercise.pose} color={exerciseCategories.find(item => item.id === modal.exercise.category)?.color} label={`Illustrative pose for ${modal.exercise.name}`} /><button className="health-text-button" onClick={() => setReplay(replay + 1)}><RotateCcw size={13} />Replay illustration</button><span className="exercise-small">Illustrative pose · read the guide before moving</span></div>
          <div><span className="exercise-eyebrow">{modal.exercise.focus}</span><h3>{modal.exercise.name}</h3><p>{modal.exercise.description}</p><ol className="exercise-instructions">{modal.exercise.steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol><div className="exercise-cue"><strong>A useful cue</strong><p>{modal.exercise.cue}</p></div><div className="exercise-adaptation"><strong>Make it comfortable</strong><p>{modal.exercise.adaptation}</p></div><a className="health-text-button" href={modal.exercise.source.url} target="_blank" rel="noreferrer">{modal.exercise.source.title}<ExternalLink size={13} /></a><button className="health-button exercise-detail-save" aria-pressed={savedIds.includes(modal.exercise.id)} onClick={() => toggleSaved(modal.exercise.id)}><Bookmark size={15} />{savedIds.includes(modal.exercise.id) ? 'Saved to your library' : 'Save this movement'}</button></div>
        </div>}
        {modal.kind === 'readiness' && <div className="exercise-readiness"><span className="exercise-eyebrow">ACTIVITY-READINESS CHECK</span><h3>A little context before you begin.</h3><p>Answer every question before opening a guided session. A “yes” answer routes you to a clinician. These answers stay in memory for this app session.</p><span className="exercise-answer-count" aria-live="polite">{answered} of {PARQ_QUESTIONS.length} answered</span><div>{PARQ_QUESTIONS.map((question, index) => <fieldset key={question.id}><legend>{index + 1}. {question.prompt}</legend><div>{[false, true].map(answer => <label key={String(answer)}><input type="radio" name={`exercise-${question.id}`} value={String(answer)} checked={answers[question.id] === answer} onChange={() => setAnswer(question.id, answer)} />{answer ? 'Yes' : 'No'}</label>)}</div></fieldset>)}</div>{blocked && <div className="exercise-readiness-block" role="status"><ShieldCheck size={22} /><p>Speak with a clinician before starting a structured session. Your answers do not diagnose a condition.</p><button className="health-text-button" onClick={onFindCare}>Find care <ArrowRight size={14} /></button></div>}<button className="health-button health-button-primary" disabled={!ready} onClick={() => setModal({ kind: 'session', routine: modal.routine })}>Open session player <ArrowRight size={15} /></button><p className="exercise-small">Completing this check is not medical clearance. Session durations provide general pacing.</p></div>}
        {modal.kind === 'session' && ready && <GuidedExerciseSession routine={modal.routine} onClose={() => setModal(null)} />}
      </div>
    </ShopDialog>}
  </div>;
}
