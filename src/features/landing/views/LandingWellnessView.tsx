import React from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { ComprehensiveHealthCalculators } from '../../../components/clinical/ComprehensiveHealthCalculators';
import { SubpageFooter, SubpageHeader, TrustPillars } from './LandingProgramsView';
import './landing.css';

const CATEGORIES = ['gym', 'strength', 'yoga', 'mind', 'cardio', 'mobility'] as const;
const TRACKS = [
  { id: 'strength', weeks: 4 },
  { id: 'yoga', weeks: 3 },
  { id: 'sleep', weeks: 2 },
  { id: 'walk', weeks: 6 }
] as const;
const SAFETY = ['readiness', 'noWeight', 'noBoards', 'hurt'] as const;

/**
 * Campus wellness and training. No timetable is published yet, so the page
 * says that plainly. It used to carry a week of hard-coded dates, a "Book"
 * button that flipped to "Booked ✓" without sending anything, per-category
 * prices and venues, a "certified coaches" claim and a re-typed Premium
 * discount — none of it backed by data.
 */
export function LandingWellnessView(): React.ReactElement {
  const t = useT();

  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, background: 'var(--sk-color-canvas)', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
      <SubpageHeader current="training" />

      {/* Hero */}
      <section
        style={{
          margin: '22px clamp(16px, 3.5vw, 44px) 0',
          minHeight: '440px',
          borderRadius: '30px',
          background: 'var(--sk-color-surface)',
          border: '1px solid var(--sk-color-rule-soft)',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          position: 'relative',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 500px', maxWidth: '580px', padding: 'clamp(24px, 4vw, 56px)', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }}>
          <span style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '30px', padding: '0 12px', borderRadius: '999px', background: 'var(--sk-color-attention-bg)', fontSize: '12px', fontWeight: 800, color: 'var(--sk-color-attention)' }}>
            {t('landing.wellness.badgeNoTimetable')}
          </span>
          <h1 style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 46px)', lineHeight: 1.08, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-1.6px' }}>
            {t('landing.wellness.title')}
          </h1>
          <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.6, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
            {t('landing.wellness.lede')}
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '4px' }}>
            <a href="#timetable" style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 26px', borderRadius: '999px', background: 'var(--sk-color-action)', fontSize: '15px', fontWeight: 800, color: 'var(--sk-color-on-action)', textDecoration: 'none' }}>
              {t('landing.wellness.seeTimetable')}
            </a>
            <a href="#calculators" style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 24px', borderRadius: '999px', background: 'var(--sk-color-surface-3)', border: '1.5px solid var(--sk-color-rule)', fontSize: '15px', fontWeight: 800, color: 'var(--sk-color-action)', textDecoration: 'none' }}>
              {t('landing.wellness.calculatorsLink')}
            </a>
          </div>
        </div>

        <div style={{ flex: '1 1 360px', height: '440px', position: 'relative', overflow: 'hidden' }}>
          <video
            src="/assets/fabac8217d14af9d87dd5d5244554ee7.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </section>

      {/* Kinds of session */}
      <section aria-labelledby="wellness-kinds" style={{ padding: '56px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: 'var(--sk-color-action)' }}>{t('landing.wellness.kindsEyebrow')}</span>
            <h2 id="wellness-kinds" style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.8px' }}>{t('landing.wellness.kindsTitle')}</h2>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sk-color-text-3)' }}>{t('landing.wellness.kindsNote')}</span>
        </div>

        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {CATEGORIES.map((id) => (
            <li
              key={id}
              style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px', minHeight: '160px', boxSizing: 'border-box', borderRadius: '22px', background: 'var(--sk-color-surface)', border: '2px solid var(--sk-color-rule-soft)' }}
            >
              <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.3px' }}>{t(`landing.wellness.cat.${id}.label` as MessageKey)}</span>
              <span style={{ fontSize: '13px', lineHeight: 1.5, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>{t(`landing.wellness.cat.${id}.desc` as MessageKey)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Timetable — honest empty state */}
      <section
        id="timetable"
        aria-labelledby="wellness-timetable"
        style={{ margin: '48px clamp(16px, 3.5vw, 44px) 0', padding: 'clamp(20px, 3vw, 30px)', borderRadius: '26px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule-soft)', display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <h2 id="wellness-timetable" style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.5px' }}>{t('landing.wellness.timetableTitle')}</h2>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>{t('landing.wellness.timetableEmpty')}</p>
      </section>

      {/* Guided tracks */}
      <section aria-labelledby="wellness-tracks" style={{ padding: '56px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: 'var(--sk-color-action)' }}>{t('landing.wellness.tracksEyebrow')}</span>
          <h2 id="wellness-tracks" style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.8px' }}>{t('landing.wellness.tracksTitle')}</h2>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
          {TRACKS.map((track) => (
            <li key={track.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px', borderRadius: '22px', background: 'var(--sk-color-surface-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ minHeight: '28px', padding: '0 12px', borderRadius: '999px', background: 'var(--sk-color-surface)', display: 'flex', alignItems: 'center', fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: 'var(--sk-color-action)' }}>
                  {t('landing.wellness.weeks', { count: track.weeks })}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sk-color-text-3)' }}>{t('landing.wellness.notOpenYet')}</span>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.3px' }}>{t(`landing.wellness.track.${track.id}.name` as MessageKey)}</span>
              <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>{t(`landing.wellness.track.${track.id}.body` as MessageKey)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Mind banner */}
      <section
        aria-labelledby="wellness-mind"
        style={{ position: 'relative', margin: '56px clamp(16px, 3.5vw, 44px) 0', minHeight: '380px', borderRadius: '30px', background: 'var(--sk-color-brand-navy)', overflow: 'hidden', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}
      >
        <video
          src="/assets/2c18e6c6648794dd62440d6720ffc956.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          style={{ position: 'absolute', top: 0, right: 0, width: '70%', height: '100%', objectFit: 'cover' }}
        />
        <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, var(--sk-color-brand-navy) 0%, var(--sk-color-brand-navy) 34%, rgba(30,27,75,0.5) 56%, rgba(30,27,75,0) 80%)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '540px', padding: 'clamp(24px, 4vw, 56px)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: 1.4, color: 'var(--sk-color-sidebar-ink-2)' }}>{t('landing.wellness.mindEyebrow')}</span>
          <h2 id="wellness-mind" style={{ margin: 0, fontSize: 'clamp(26px, 3vw, 34px)', lineHeight: 1.15, fontWeight: 800, color: 'var(--sk-color-sidebar-ink)', letterSpacing: '-1px' }}>
            {t('landing.wellness.mindTitle')}
          </h2>
          <span style={{ fontSize: '14.5px', lineHeight: 1.6, fontWeight: 500, color: 'var(--sk-color-sidebar-ink-2)' }}>
            {t('landing.wellness.mindBody')}
          </span>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '6px' }}>
            <a href="#timetable" style={{ display: 'flex', alignItems: 'center', minHeight: '48px', padding: '0 22px', borderRadius: '999px', background: 'var(--sk-color-surface)', fontSize: '14px', fontWeight: 800, color: 'var(--sk-color-brand-navy)', textDecoration: 'none' }}>
              {t('landing.wellness.seeTimetable')}
            </a>
            <a href="/crisis" style={{ display: 'flex', alignItems: 'center', minHeight: '48px', padding: '0 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.35)', fontSize: '14px', fontWeight: 700, color: 'var(--sk-color-sidebar-ink)', textDecoration: 'none' }}>
              {t('landing.wellness.talkNow')}
            </a>
          </div>
        </div>
      </section>

      {/* Calculators */}
      <section id="calculators" aria-label={t('landing.wellness.calculatorsLabel')} style={{ padding: '56px clamp(16px, 3.5vw, 44px) 0', scrollMarginTop: '80px' }}>
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          <ComprehensiveHealthCalculators />
        </div>
      </section>

      {/* How sessions are meant to run */}
      <section aria-labelledby="wellness-safety" style={{ padding: '56px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: 'var(--sk-color-action)' }}>{t('landing.wellness.safetyEyebrow')}</span>
          <h2 id="wellness-safety" style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.8px' }}>{t('landing.wellness.safetyTitle')}</h2>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
          {SAFETY.map((id) => (
            <li key={id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '22px', borderRadius: '20px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule-soft)' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--sk-color-text)' }}>{t(`landing.wellness.safety.${id}.title` as MessageKey)}</span>
              <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>{t(`landing.wellness.safety.${id}.body` as MessageKey)}</span>
            </li>
          ))}
        </ul>
      </section>

      <TrustPillars marginTop="64px" />
      <SubpageFooter />
    </div>
  );
}
