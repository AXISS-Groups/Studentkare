import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Bookmark, Check, ChevronRight, Clock3, ExternalLink, Heart, Play, RotateCcw, Search, ShieldCheck, Sparkles, Wind, X } from 'lucide-react';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { ExerciseIllustration } from '../../components/health/ExerciseIllustration';
import { exerciseTheme, GuidedExerciseSession } from '../../components/health/GuidedExerciseSession';
import { useExerciseStore } from '../../data/contexts/ExerciseStore';
import { canStartExerciseSession, Exercise, ExerciseCategory, ExerciseEquipment, ExerciseRoutine, exercises, exerciseCategories, filterExercises, routines, routineSeconds } from '../../data/datasets/exerciseLibrary';
import { PARQ_QUESTIONS, evaluateScreening } from '../../ai/wellbeing/screening';
import { formatSessionTime } from '../../lib/utils/exerciseSession';
import '../../theme/exercise.css';
import { useScrollReveal } from '../../hooks/ui/useScrollReveal';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

const EQUIPMENT_LABEL: Record<ExerciseEquipment, MessageKey> = { none: 'assist.exercise.equip.none', chair: 'assist.exercise.equip.chair', wall: 'assist.exercise.equip.wall' };

type ExerciseModal = { kind: 'exercise'; exercise: Exercise } | { kind: 'readiness'; routine: ExerciseRoutine } | { kind: 'session'; routine: ExerciseRoutine } | null;

export interface ExerciseLibraryProps {
  onOpenMetrics: () => void;
  onFindCare: () => void;
  /** Opens this routine's readiness check / session straight away (the Movement phone board's guides). */
  startRoutineId?: string;
  /** Draws only that dialog, over the page that asked for it. */
  dialogOnly?: boolean;
  /** Called when the dialog closes. */
  onDialogClose?: () => void;
}

export function ExerciseLibraryScreen({ onOpenMetrics, onFindCare, startRoutineId, dialogOnly = false, onDialogClose }: ExerciseLibraryProps) {
  const t = useT();
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
  useEffect(() => {
    const routine = routines.find(item => item.id === startRoutineId);
    if (routine) setModal({ kind: ready ? 'session' : 'readiness', routine });
    // Opened once per request; answering the readiness check must not reopen it.
  }, [startRoutineId]);
  const closeModal = () => { setModal(null); onDialogClose?.(); };
  const dialog = modal && <ShopDialog title={modal.kind === 'exercise' ? t('assist.exercise.dialogGuide') : modal.kind === 'readiness' ? t('assist.exercise.dialogReadiness') : modal.routine.name} onClose={closeModal} wide={modal.kind !== 'readiness'}>
      <div className="exercise-space exercise-dialog-content">
        {modal.kind === 'exercise' && <div className="exercise-detail-grid">
          <div className="exercise-detail-visual"><ExerciseIllustration key={replay} pose={modal.exercise.pose} color={exerciseTheme(modal.exercise.category).color} label={t('assist.exercise.poseFor', { name: modal.exercise.name })} /><button type="button" className="health-text-button" onClick={() => setReplay(replay + 1)}><RotateCcw size={13} aria-hidden="true" />{t('assist.exercise.replay')}</button><span className="exercise-small">{t('assist.exercise.poseNote')}</span></div>
          <div><span className="exercise-eyebrow">{modal.exercise.focus}</span><h3>{modal.exercise.name}</h3><p>{modal.exercise.description}</p><ol className="exercise-instructions">{modal.exercise.steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol><div className="exercise-cue"><strong>{t('assist.exercise.cue')}</strong><p>{modal.exercise.cue}</p></div><div className="exercise-adaptation"><strong>{t('assist.exercise.adaptation')}</strong><p>{modal.exercise.adaptation}</p></div><a className="health-text-button" href={modal.exercise.source.url} target="_blank" rel="noreferrer">{modal.exercise.source.title}<ExternalLink size={13} aria-hidden="true" /></a><button type="button" className="health-button exercise-detail-save" aria-pressed={savedIds.includes(modal.exercise.id)} onClick={() => toggleSaved(modal.exercise.id)}><Bookmark size={15} aria-hidden="true" />{savedIds.includes(modal.exercise.id) ? t('assist.exercise.savedToLibrary') : t('assist.exercise.saveThis')}</button></div>
        </div>}
        {modal.kind === 'readiness' && <div className="exercise-readiness"><span className="exercise-eyebrow">{t('assist.exercise.readinessEyebrow')}</span><h3>{t('assist.exercise.readinessTitle')}</h3><p>{t('assist.exercise.readinessBody')}</p><span className="exercise-answer-count" aria-live="polite">{t('assist.exercise.answeredCount', { answered, total: PARQ_QUESTIONS.length })}</span><div>{PARQ_QUESTIONS.map((question, index) => <fieldset key={question.id}><legend>{index + 1}. {question.prompt}</legend><div>{[false, true].map(answer => <label key={String(answer)}><input type="radio" name={`exercise-${question.id}`} value={String(answer)} checked={answers[question.id] === answer} onChange={() => setAnswer(question.id, answer)} />{answer ? t('assist.exercise.yes') : t('assist.exercise.no')}</label>)}</div></fieldset>)}</div>{blocked && <div className="exercise-readiness-block" role="status"><ShieldCheck size={22} aria-hidden="true" /><p>{t('assist.exercise.readinessBlocked')}</p><button type="button" className="health-text-button" onClick={onFindCare}>{t('assist.exercise.findCare')} <ArrowRight size={14} aria-hidden="true" /></button></div>}<button type="button" className="health-button health-button-primary" disabled={!ready} onClick={() => setModal({ kind: 'session', routine: modal.routine })}>{t('assist.exercise.openPlayer')} <ArrowRight size={15} aria-hidden="true" /></button><p className="exercise-small">{t('assist.exercise.readinessNote')}</p></div>}
        {modal.kind === 'session' && ready && <GuidedExerciseSession routine={modal.routine} onClose={closeModal} />}
      </div>
    </ShopDialog>;
  if (dialogOnly) return <>{dialog}</>;
  const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: document.documentElement.dataset.uiMotion === 'reduced' ? 'auto' : 'smooth' });

  return <div ref={revealRoot} className="health-experience exercise-space">
    {error && <div className="wf-notice" role="alert">{error}<button type="button" className="health-text-button" onClick={reload}>{t('assist.exercise.reload')}</button></div>}
    {sessionError && <div className="wf-notice" role="alert">{t('assist.exercise.sessionNotSaved', { reason: sessionError })}<button type="button" className="health-text-button" onClick={retrySession}>{t('assist.exercise.retrySave')}</button></div>}
    {(loading || saving) && <p className="exercise-small" role="status">{loading ? t('assist.exercise.loadingSaved') : t('assist.exercise.saving')}</p>}
    <div className="exercise-topline"><span><span className="exercise-tiny-dot" aria-hidden="true" />{t('assist.exercise.topline')}</span><button type="button" className="health-text-button" onClick={onOpenMetrics}>{t('assist.exercise.backToMetrics')} <ArrowRight size={14} aria-hidden="true" /></button></div>
    <section className="exercise-hero">
      <div className="exercise-hero-copy"><span className="exercise-eyebrow">{t('assist.exercise.heroEyebrow')}</span><h2>{t('assist.exercise.heroTitle1')}<br /><em>{t('assist.exercise.heroTitle2')}</em></h2><p>{t('assist.exercise.heroBody')}</p><div className="exercise-hero-actions"><button type="button" className="health-button health-button-primary" onClick={() => scrollToSection('exercise-library')}>{t('assist.exercise.findMovement')} <ArrowRight size={16} aria-hidden="true" /></button><button type="button" className="health-text-button" onClick={() => scrollToSection('exercise-routines')}><Play size={14} aria-hidden="true" />{t('assist.exercise.exploreSessions')}</button></div><div className="exercise-hero-tags"><span><Check size={12} aria-hidden="true" />{t('assist.exercise.tagSourced')}</span><span><Heart size={12} aria-hidden="true" />{t('assist.exercise.tagNoScores')}</span></div></div>
      <div className="exercise-hero-visual"><div className="exercise-hero-orbit" /><ExerciseIllustration pose="open" label={t('assist.exercise.heroArt')} /><div className="exercise-floating-note"><Wind size={19} aria-hidden="true" /><span>{t('assist.exercise.note1')}</span></div><div className="exercise-floating-note note-bottom"><Sparkles size={17} aria-hidden="true" /><span>{t('assist.exercise.note2')}</span></div></div>
    </section>

    <div className="exercise-feature-strip"><div><strong>{exercises.length}</strong><span>{t('assist.exercise.statGuides')}</span></div><div><strong>{exerciseCategories.length}</strong><span>{t('assist.exercise.statWays')}</span></div><div><strong>{routines.length}</strong><span>{t('assist.exercise.statSessions')}</span></div><div><Bookmark size={19} aria-hidden="true" /><span>{t('assist.exercise.statSaved', { count: savedIds.length })}</span></div></div>

    <section id="exercise-routines" className="exercise-section">
      <div className="exercise-section-heading"><div><span className="exercise-eyebrow">{t('assist.exercise.routinesEyebrow')}</span><h3>{t('assist.exercise.routinesTitle')}</h3></div><span className="exercise-small">{t('assist.exercise.routinesNote')}</span></div>
      {blocked ? <div className="exercise-support-card"><ShieldCheck size={25} aria-hidden="true" /><div><h4>{t('assist.exercise.blockedTitle')}</h4><p>{t('assist.exercise.blockedBody')}</p></div><button type="button" className="health-button" onClick={onFindCare}>{t('assist.exercise.findCare')} <ArrowRight size={15} aria-hidden="true" /></button></div> : <div className="exercise-routine-grid">{routines.map(routine => {
        const theme = exerciseTheme(routine.category);
        return <button type="button" key={routine.id} className="exercise-routine-card" style={{ '--exercise-accent': theme.color, '--exercise-tint': theme.background } as React.CSSProperties} onClick={() => startRoutine(routine)}>
          <div className="exercise-routine-art"><ExerciseIllustration pose={routine.pose} color={theme.color} label={t('assist.exercise.routineArt', { name: routine.name })} /><span className="exercise-play-icon" aria-hidden="true"><Play size={17} fill="currentColor" /></span></div>
          <div className="exercise-routine-body"><span><Clock3 size={12} aria-hidden="true" />{t('assist.exercise.routineMeta', { minutes: routineSeconds(routine) / 60, moves: routine.steps.length })}</span><h4>{routine.name}</h4><p>{routine.description}</p><strong>{t('assist.exercise.exploreThis')} <ArrowRight size={14} aria-hidden="true" /></strong></div>
        </button>;
      })}</div>}
      <div className="exercise-readiness-link"><ShieldCheck size={14} aria-hidden="true" /><span>{t('assist.exercise.readinessLink')}</span><button type="button" onClick={() => setModal({ kind: 'readiness', routine: routines[0] })}>{answered ? t('assist.exercise.reviewAnswers') : t('assist.exercise.viewReadiness')}<ChevronRight size={12} aria-hidden="true" /></button></div>
    </section>

    <section id="exercise-library" className="exercise-section">
      <div className="exercise-section-heading"><div><span className="exercise-eyebrow">{t('assist.exercise.libraryEyebrow')}</span><h3>{t('assist.exercise.libraryTitle')}</h3></div><button type="button" className={`exercise-saved-filter ${savedOnly ? 'is-active' : ''}`} aria-pressed={savedOnly} onClick={() => setSavedOnly(!savedOnly)}><Bookmark size={15} fill={savedOnly ? 'currentColor' : 'none'} aria-hidden="true" />{t('assist.exercise.savedFilter', { count: savedIds.length })}</button></div>
      <div className="exercise-category-tabs" role="group" aria-label={t('assist.exercise.categories')}><button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>{t('assist.exercise.allMovement')}</button>{exerciseCategories.map(item => <button type="button" key={item.id} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}</div>
      <div className="exercise-search-row"><label className="exercise-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label={t('assist.exercise.searchLabel')} placeholder={t('assist.exercise.searchPlaceholder')} value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label={t('assist.exercise.clearSearch')} onClick={() => setQuery('')}><X size={16} aria-hidden="true" /></button>}</label><label className="exercise-equipment-filter">{t('assist.exercise.equipment')}<select aria-label={t('assist.exercise.equipmentLabel')} value={equipment} onChange={event => setEquipment(event.target.value as ExerciseEquipment | 'all')}><option value="all">{t('assist.exercise.equip.any')}</option><option value="none">{t('assist.exercise.equip.none')}</option><option value="chair">{t('assist.exercise.equip.chair')}</option><option value="wall">{t('assist.exercise.equip.wall')}</option></select></label></div>
      <p className="exercise-result-count" aria-live="polite">{t(savedOnly ? 'assist.exercise.resultCountSaved' : 'assist.exercise.resultCount', { count: matches.length })}</p>
      {matches.length ? <div className="exercise-library-grid" key={`${category}-${equipment}-${savedOnly}`}>
        {matches.map((exercise, index) => {
          const theme = exerciseTheme(exercise.category);
          return <article className="exercise-library-card" key={exercise.id} style={{ '--exercise-accent': theme.color, '--exercise-tint': theme.background, '--exercise-delay': `${Math.min(index, 5) * 45}ms` } as React.CSSProperties}>
            <div className="exercise-card-art"><button type="button" className="exercise-open-art" aria-label={t('assist.exercise.view', { name: exercise.name })} onClick={() => { setReplay(0); setModal({ kind: 'exercise', exercise }); }}><ExerciseIllustration pose={exercise.pose} color={theme.color} label={t('assist.exercise.poseFor', { name: exercise.name })} /></button><span className="exercise-category-label">{theme.label}</span><button type="button" className="exercise-save-button" aria-label={t(savedIds.includes(exercise.id) ? 'assist.exercise.unsave' : 'assist.exercise.save', { name: exercise.name })} aria-pressed={savedIds.includes(exercise.id)} onClick={() => toggleSaved(exercise.id)}><Bookmark size={17} fill={savedIds.includes(exercise.id) ? 'currentColor' : 'none'} aria-hidden="true" /></button></div>
            <div className="exercise-card-body"><span className="exercise-card-focus">{exercise.focus}</span><button type="button" className="exercise-title-button" onClick={() => setModal({ kind: 'exercise', exercise })}><h4>{exercise.name}</h4></button><p>{exercise.description}</p><div><span>{t(EQUIPMENT_LABEL[exercise.equipment])}</span><button type="button" onClick={() => setModal({ kind: 'exercise', exercise })} aria-label={t('assist.exercise.readGuide', { name: exercise.name })}>{t('assist.exercise.viewGuide')} <ArrowRight size={13} aria-hidden="true" /></button></div></div>
          </article>;
        })}
      </div> : <div className="exercise-empty"><Search size={30} aria-hidden="true" /><h4>{t('assist.exercise.emptyTitle')}</h4><p>{savedOnly ? t('assist.exercise.emptySaved') : t('assist.exercise.emptySearch')}</p><button type="button" className="health-button" onClick={() => { setQuery(''); setCategory('all'); setEquipment('all'); setSavedOnly(false); }}>{t('assist.exercise.showAll')}</button></div>}
    </section>

    <section className="exercise-bottom-grid">
      <div className="exercise-metrics-note"><span className="exercise-eyebrow">{t('assist.exercise.metricsEyebrow')}</span><h3>{t('assist.exercise.metricsTitle')}</h3><p>{t('assist.exercise.metricsBody')}</p><button type="button" className="health-button" onClick={onOpenMetrics}>{t('assist.exercise.metricsOpen')} <ArrowRight size={15} aria-hidden="true" /></button></div>
      <div className="exercise-history"><span className="exercise-eyebrow">{t('assist.exercise.historyEyebrow')}</span><h3>{t('assist.exercise.historyTitle')}</h3>{sessions.length ? <ul>{sessions.slice(0, 3).map(session => <li key={session.id}><span className="exercise-history-check" aria-hidden="true"><Check size={16} /></span><div><strong>{session.routineName}</strong><small>{t('assist.exercise.historyLine', { time: formatSessionTime(session.activeSeconds), done: session.completedMoves, skipped: session.skippedMoves })}</small></div></li>)}</ul> : <p>{loading ? t('assist.exercise.historyLoading') : t('assist.exercise.historyEmpty')}</p>}<span className="exercise-small">{t('assist.exercise.historyNote')}</span></div>
    </section>
    <div className="exercise-source-note"><Heart size={16} aria-hidden="true" /><p>{t('assist.exercise.sourceNote')}</p></div>

    {dialog}
  </div>;
}
