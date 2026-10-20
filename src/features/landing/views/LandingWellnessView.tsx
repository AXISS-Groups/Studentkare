import React from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Glyph, type SkGlyphName, type SkIconName } from '@/design-system/icons';
import { CanvasVideo } from '@/design-system/art';
import { PublicSiteHeader, PublicSitePage } from '@/design-system/public-site';
import { ComprehensiveHealthCalculators } from '../../../components/clinical/ComprehensiveHealthCalculators';
import { LwHeading, LwIconTile } from './landingWebKit';
import './landingWeb.css';

/** The six kinds of session, each with its canvas 3D glyph. */
const CATEGORIES: ReadonlyArray<{ id: string; art: SkGlyphName }> = [
  { id: 'gym', art: 'dumbbell-3d' },
  { id: 'strength', art: 'kettlebell-3d' },
  { id: 'yoga', art: 'yoga-3d' },
  { id: 'mind', art: 'meditation-3d' },
  { id: 'cardio', art: 'running-shoe-3d' },
  { id: 'mobility', art: 'foam-roller-3d' },
];
const TRACKS: ReadonlyArray<{ id: string; weeks: number; art: SkGlyphName; tint: 'indigo' | 'mint' | 'rose' | 'peach' }> = [
  { id: 'strength', weeks: 4, art: 'kettlebell-3d', tint: 'indigo' },
  { id: 'yoga', weeks: 3, art: 'yoga-3d', tint: 'mint' },
  { id: 'sleep', weeks: 2, art: 'meditation-3d', tint: 'rose' },
  { id: 'walk', weeks: 6, art: 'running-shoe-3d', tint: 'peach' },
];
const SAFETY: ReadonlyArray<{ id: string; icon: SkIconName }> = [
  { id: 'readiness', icon: 'check-circle-2' },
  { id: 'noWeight', icon: 'image-off' },
  { id: 'noBoards', icon: 'lock-8' },
  { id: 'hurt', icon: 'heart-plus-3' },
];

const k = (key: string): MessageKey => `landing.wellness.${key}` as MessageKey;

/**
 * Campus wellness and training (design board WebWellness). No timetable is
 * published yet, so the page says that plainly.
 *
 * Left out of the board because no data backs them: the "12 sessions on
 * campus today" count, the week's timetable and its booking, per-session
 * prices and venues, the Premium discount and the "certified coaches" claim.
 * The guided tracks are shown as not open yet.
 */
export function LandingWellnessView(): React.ReactElement {
  const t = useT();

  return (
    <PublicSitePage header={<PublicSiteHeader current="training" variant="compact" />} art="primary">
      <section className="lw-move" aria-labelledby="lw-wellness-title">
        <div className="lw-move__copy">
          <span className="lw-badge lw-badge--attention">{t(k('badgeNoTimetable'))}</span>
          <h1 className="lw-h1" id="lw-wellness-title">{t(k('title'))}</h1>
          <p className="lw-lede">{t(k('lede'))}</p>
          <div className="lw-actions">
            <a className="lw-btn lw-btn--primary lw-btn--lg" href="#timetable">{t(k('seeTimetable'))}</a>
            <a className="lw-btn lw-btn--secondary lw-btn--lg" href="#calculators">{t(k('calculatorsLink'))}</a>
          </div>
        </div>
        <div className="lw-move__art">
          <CanvasVideo name="video-fabac8.mp4" />
        </div>
      </section>

      <section className="lw-section" aria-labelledby="lw-wellness-kinds">
        <LwHeading id="lw-wellness-kinds" eyebrow={t(k('kindsEyebrow'))} title={t(k('kindsTitle'))} aside={<span className="lw-count">{t(k('kindsNote'))}</span>} />
        <ul className="lw-grid lw-grid--6">
          {CATEGORIES.map((c) => (
            <li key={c.id} className="lw-panel lw-kind">
              <span className="lw-kind__art">
                <Glyph name={c.art} size={52} />
              </span>
              <span className="lw-panel__title">{t(k(`cat.${c.id}.label`))}</span>
              <span className="lw-panel__body">{t(k(`cat.${c.id}.desc`))}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="timetable" className="lw-card lw-timetable" aria-labelledby="lw-wellness-timetable">
        <h2 className="lw-h2" id="lw-wellness-timetable">{t(k('timetableTitle'))}</h2>
        <p className="lw-lede">{t(k('timetableEmpty'))}</p>
      </section>

      <section className="lw-section" aria-labelledby="lw-wellness-tracks">
        <LwHeading id="lw-wellness-tracks" eyebrow={t(k('tracksEyebrow'))} title={t(k('tracksTitle'))} />
        <ul className="lw-grid lw-grid--4">
          {TRACKS.map((track) => (
            <li key={track.id} className={`lw-track lw-track--${track.tint}`}>
              <div className="lw-track__top">
                <Glyph name={track.art} size={40} />
                <span className="lw-track__weeks">{t(k('weeks'), { count: track.weeks })}</span>
              </div>
              <span className="lw-panel__title">{t(k(`track.${track.id}.name`))}</span>
              <span className="lw-panel__body">{t(k(`track.${track.id}.body`))}</span>
              <span className="lw-track__off">{t(k('notOpenYet'))}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="lw-banner lw-mind" aria-labelledby="lw-wellness-mind">
        <div className="lw-banner__media">
          <CanvasVideo name="video-2c18e6.mp4" />
        </div>
        <span className="lw-banner__veil" aria-hidden="true" />
        <div className="lw-banner__copy lw-mind__copy">
          <span className="lw-banner__eyebrow">{t(k('mindEyebrow'))}</span>
          <h2 className="lw-banner__title" id="lw-wellness-mind">{t(k('mindTitle'))}</h2>
          <p className="lw-mind__body">{t(k('mindBody'))}</p>
          <div className="lw-actions">
            <a className="lw-btn lw-btn--lg lw-mind__primary" href="#timetable">{t(k('seeTimetable'))}</a>
            <a className="lw-btn lw-btn--lg lw-mind__ghost" href="/crisis">{t(k('talkNow'))}</a>
          </div>
        </div>
      </section>

      <section id="calculators" className="lw-section lw-calculators" aria-label={t(k('calculatorsLabel'))}>
        <div className="lw-calculators__inner">
          <ComprehensiveHealthCalculators />
        </div>
      </section>

      <section className="lw-section" aria-labelledby="lw-wellness-safety">
        <LwHeading id="lw-wellness-safety" eyebrow={t(k('safetyEyebrow'))} title={t(k('safetyTitle'))} />
        <ul className="lw-grid lw-grid--4">
          {SAFETY.map((s) => (
            <li key={s.id} className="lw-panel">
              <LwIconTile icon={s.icon} size={32} />
              <span className="lw-panel__title">{t(k(`safety.${s.id}.title`))}</span>
              <span className="lw-panel__body">{t(k(`safety.${s.id}.body`))}</span>
            </li>
          ))}
        </ul>
      </section>
    </PublicSitePage>
  );
}
