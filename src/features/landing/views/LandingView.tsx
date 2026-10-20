import React, { useEffect, useState } from 'react';
import { useApiResource } from '@/hooks/api/useApiResource';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon, Illustration, type SkIllustrationName } from '@/design-system/icons';
import { CanvasImage, CanvasVideo } from '@/design-system/art';
import { NewsletterBand, PublicSiteFooter, PublicSiteHeader } from '@/design-system/public-site';
import './landing.css';

interface CatalogItem {
  id: string;
  name: string;
  brand: string;
  kind: string;
  pack: string;
  pricePaise: number;
  mrpPaise: number;
}

interface Catalog {
  items: CatalogItem[];
  total: number;
}

type Token =
  | 'action' | 'action-soft' | 'on-action' | 'focus' | 'canvas' | 'surface' | 'surface-2' | 'surface-3' | 'rule' | 'rule-soft' | 'rule-strong'
  | 'text' | 'text-2' | 'text-3' | 'brand-navy' | 'on-hero' | 'sidebar-ink-2' | 'sidebar-ink-3'
  | 'positive' | 'positive-bg' | 'positive-fill' | 'attention' | 'attention-bg' | 'danger' | 'danger-bg' | 'danger-fill' | 'info';

/** A design token as a CSS variable (DESIGN.md §3: never raw hex). */
const v = (name: Token): string => `var(--sk-color-${name})`;

const GUTTER = 'clamp(16px, 3.5vw, 44px)';
const EYEBROW: React.CSSProperties = { fontSize: '11.5px', fontWeight: 800, color: v('action'), letterSpacing: '1.3px' };
const H2: React.CSSProperties = { margin: 0, fontSize: 'clamp(24px, 3vw, 33px)', fontWeight: 800, color: v('text'), letterSpacing: '-1.1px' };
/** Standalone text links still get a 44 px target (AGENTS.md guardrail 7). */
const LINK_44: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', minHeight: '44px', textDecoration: 'none' };

/** Catalogue kinds with a translated name; anything else is shown as sent. */
const KNOWN_KINDS = ['product', 'lab', 'consultation', 'vaccine', 'wellness'] as const;

export function LandingView(): React.ReactElement {
  const t = useT();
  const catalog = useApiResource<Catalog>('/catalog?limit=6');
  const items = catalog.data?.items ?? [];

  // Hero carousel state
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setSlide((s) => (s + 1) % 4);
    }, 6000);
    return () => clearInterval(interval);
  }, [paused]);

  const kindText = (kind: string): string =>
    (KNOWN_KINDS as readonly string[]).includes(kind) ? t(`landing.kit.kind.${kind}` as MessageKey) : kind;

  // Vector SVG Paths
  const dropPath = 'M12 3c3 3.5 5 6.2 5 9a5 5 0 0 1-10 0c0-2.8 2-5.5 5-9z';
  const heartPath = 'M12 20c4-2.5 6-5.6 6-9a6 6 0 0 0-12 0c0 3.4 2 6.5 6 9z';
  const bowlPath = 'M4 12h16a8 8 0 0 1-16 0zM8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3';
  const bonePath = 'M8 8a2.5 2.5 0 1 0-3-3 2.5 2.5 0 0 0-1 4l8 8a2.5 2.5 0 0 0 4 1 2.5 2.5 0 1 0-3-3';
  const sparkPath = 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z';
  const windPath = 'M3 9h10a3 3 0 1 0-3-3M3 14h13a3 3 0 1 1-3 3';
  const eyePath = 'M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z';
  const syringePath = 'M14 4l6 6M17 7l-9 9-3 1 1-3 9-9M11 9l4 4';
  const flaskPath = 'M9 3h6v5l3.5 8.2A3 3 0 0 1 15.7 21H8.3a3 3 0 0 1-2.8-4.8L9 8z';
  const stethoPath = 'M6 4v6a6 6 0 0 0 12 0V4';
  const pillPath = 'M8.5 15.5l7-7a4 4 0 0 0-5.7-5.7l-7 7a4 4 0 0 0 5.7 5.7z';
  const shieldPath = 'M12 3l7.5 3v5.6c0 4.3-3 8.2-7.5 9.4-4.5-1.2-7.5-5.1-7.5-9.4V6z';
  const docPath = 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5';

  const fourTiles: ReadonlyArray<{ title: MessageKey; meta: MessageKey; href: string; path: string; tint: Token; ink: Token }> = [
    { title: 'landing.home.tile.wellness.title', meta: 'landing.home.tile.wellness.meta', href: '/shop', path: pillPath, tint: 'surface-3', ink: 'action' },
    { title: 'landing.home.tile.lab.title', meta: 'landing.home.tile.lab.meta', href: '/lab-tests', path: flaskPath, tint: 'positive-bg', ink: 'positive' },
    { title: 'landing.home.tile.doctor.title', meta: 'landing.home.tile.doctor.meta', href: '/consult', path: stethoPath, tint: 'attention-bg', ink: 'attention' },
    { title: 'landing.home.tile.cover.title', meta: 'landing.home.tile.cover.meta', href: '/plans', path: shieldPath, tint: 'surface-3', ink: 'action' },
  ];

  const healthConcerns: ReadonlyArray<{ label: MessageKey; path: string; tint: Token; ink: Token }> = [
    { label: 'landing.home.concern.diabetes', path: dropPath, tint: 'surface-3', ink: 'action' },
    { label: 'landing.home.concern.heart', path: heartPath, tint: 'attention-bg', ink: 'attention' },
    { label: 'landing.home.concern.stomach', path: bowlPath, tint: 'positive-bg', ink: 'positive' },
    { label: 'landing.home.concern.liver', path: dropPath, tint: 'surface-3', ink: 'action' },
    { label: 'landing.home.concern.bone', path: bonePath, tint: 'attention-bg', ink: 'attention' },
    { label: 'landing.home.concern.kidney', path: dropPath, tint: 'positive-bg', ink: 'positive' },
    { label: 'landing.home.concern.derma', path: sparkPath, tint: 'surface-3', ink: 'action' },
    { label: 'landing.home.concern.respiratory', path: windPath, tint: 'attention-bg', ink: 'attention' },
    { label: 'landing.home.concern.eye', path: eyePath, tint: 'positive-bg', ink: 'positive' },
    { label: 'landing.home.concern.vaccines', path: syringePath, tint: 'surface-3', ink: 'action' },
  ];

  const essentials: ReadonlyArray<{ title: MessageKey; meta: MessageKey; href: string; path: string; tint: Token; ink: Token }> = [
    { title: 'landing.home.ess.vitamins.title', meta: 'landing.home.ess.vitamins.meta', href: '/shop', path: 'M8.5 15.5l7-7a4 4 0 0 0-5.7-5.7l-7 7a4 4 0 0 0 5.7 5.7zM6 6l6 6', tint: 'surface-3', ink: 'action' },
    { title: 'landing.home.ess.skin.title', meta: 'landing.home.ess.skin.meta', href: '/shop', path: dropPath, tint: 'attention-bg', ink: 'attention' },
    { title: 'landing.home.ess.nutrition.title', meta: 'landing.home.ess.nutrition.meta', href: '/shop', path: bowlPath, tint: 'positive-bg', ink: 'positive' },
    { title: 'landing.home.ess.checks.title', meta: 'landing.home.ess.checks.meta', href: '/lab-tests', path: flaskPath, tint: 'surface-2', ink: 'action' },
    { title: 'landing.home.ess.care.title', meta: 'landing.home.ess.care.meta', href: '/consult', path: 'M6 4v6a6 6 0 0 0 12 0V4M18 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', tint: 'surface-2', ink: 'text-3' },
  ];

  const careServices: ReadonlyArray<{ title: MessageKey; body: MessageKey; href: string }> = [
    { title: 'landing.home.svc.shop.title', body: 'landing.home.svc.shop.body', href: '/shop' },
    { title: 'landing.home.svc.lab.title', body: 'landing.home.svc.lab.body', href: '/lab-tests' },
    { title: 'landing.home.svc.consult.title', body: 'landing.home.svc.consult.body', href: '/consult' },
    { title: 'landing.home.svc.plans.title', body: 'landing.home.svc.plans.body', href: '/plans' },
  ];

  const accountTiles: ReadonlyArray<{ title: MessageKey; meta: MessageKey; href: string; path: string }> = [
    { title: 'landing.home.acct.records.title', meta: 'landing.home.acct.records.meta', href: '/records', path: docPath },
    { title: 'landing.home.acct.metrics.title', meta: 'landing.home.acct.metrics.meta', href: '/devices', path: heartPath },
    { title: 'landing.home.tile.cover.title', meta: 'landing.home.acct.cover.meta', href: '/plans', path: shieldPath },
    { title: 'landing.home.acct.support.title', meta: 'landing.home.acct.support.meta', href: '/support', path: stethoPath },
  ];

  // Same four promises as the native page, so web and app never disagree.
  const promises: ReadonlyArray<{ title: MessageKey; body: MessageKey; art: SkIllustrationName }> = [
    { title: 'landing.home.promise.private.title', body: 'landing.home.promise.private.body', art: 'illustration-lock-shield' },
    { title: 'landing.home.promise.price.title', body: 'landing.home.promise.price.body', art: 'illustration-rupee-receipt' },
    { title: 'landing.home.promise.collection.title', body: 'landing.home.promise.collection.body', art: 'illustration-hostel-pin' },
    { title: 'landing.home.promise.review.title', body: 'landing.home.promise.review.body', art: 'illustration-verified-badge' },
  ];

  const slides: ReadonlyArray<{ eyebrow: MessageKey; line1: MessageKey; line2: MessageKey; body: MessageKey; cta: MessageKey; href: string; ink: Token; tint: Token; dot: MessageKey }> = [
    { eyebrow: 'landing.home.slide0.eyebrow', line1: 'landing.home.slide0.line1', line2: 'landing.home.slide0.line2', body: 'landing.home.slide0.body', cta: 'landing.home.slide0.cta', href: '/shop', ink: 'action', tint: 'surface-3', dot: 'landing.home.nav.wellness' },
    { eyebrow: 'landing.home.slide1.eyebrow', line1: 'landing.home.slide1.line1', line2: 'landing.home.slide1.line2', body: 'landing.home.slide1.body', cta: 'landing.home.slide1.cta', href: '/lab-tests', ink: 'positive', tint: 'positive-bg', dot: 'landing.home.nav.labTests' },
    { eyebrow: 'landing.home.slide2.eyebrow', line1: 'landing.home.slide2.line1', line2: 'landing.home.slide2.line2', body: 'landing.home.slide2.body', cta: 'landing.home.slide2.cta', href: '/wellness', ink: 'attention', tint: 'attention-bg', dot: 'landing.home.nav.training' },
    { eyebrow: 'landing.home.slide3.eyebrow', line1: 'landing.home.slide3.line1', line2: 'landing.home.slide3.line2', body: 'landing.home.slide3.body', cta: 'landing.home.slide3.cta', href: '/consult', ink: 'action', tint: 'surface-3', dot: 'landing.home.slideDoctors' },
  ];
  const current = slides[slide] ?? slides[0];

  const chip: React.CSSProperties = { height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: v('sidebar-ink-2') };

  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, background: v('canvas'), display: 'flex', flexDirection: 'column' }}>
      {/* 1–2. Utility bar and header: the shared public-site chrome. */}
      <PublicSiteHeader current="discover" />

      {/* 3. Your Health Record Video Banner */}
      <section aria-label={t('landing.home.recordAria')} style={{ position: 'relative', margin: `22px ${GUTTER} 0`, height: '240px', borderRadius: '28px', background: v('brand-navy'), display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <CanvasVideo name="video-4486f2.mp4" style={{ position: 'absolute', top: 0, right: 0, width: '72%', height: '100%', objectFit: 'cover' }} />
        <span style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${v('brand-navy')} 0%, ${v('brand-navy')} 32%, rgba(6,5,26,0.6) 55%, rgba(6,5,26,0) 80%)` }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', padding: '0 0 0 clamp(20px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: v('sidebar-ink-2') }}>{t('landing.home.recordEyebrow')}</span>
          <span style={{ fontSize: 'clamp(24px, 3vw, 28px)', lineHeight: 1.2, fontWeight: 800, color: v('on-hero'), letterSpacing: '-0.7px' }}>
            {t('landing.home.recordTitle')}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={chip}>{t('landing.home.chip.owned')}</span>
            <span style={chip}>{t('landing.home.chip.campus')}</span>
            <span style={chip}>{t('landing.home.chip.private')}</span>
          </div>
        </div>
      </section>

      {/* 4. SOS Emergency Banner */}
      <aside aria-label={t('landing.home.sosAria')} style={{ margin: `18px ${GUTTER} 0`, padding: '14px 20px', borderRadius: '14px', background: v('surface'), border: `1px solid ${v('danger-bg')}`, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={v('danger')} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6M12 16.5h.01" />
        </svg>
        <span style={{ fontSize: '14px', fontWeight: 800, color: v('danger') }}>{t('landing.kit.emergencyTitle')}</span>
        <span style={{ fontSize: '13px', fontWeight: 500, color: v('text-2') }}>
          {t('landing.home.sosBody')}
        </span>
        <span style={{ flexGrow: 1 }} />
        <a href="tel:112" style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px', padding: '0 20px', borderRadius: '999px', background: v('danger'), fontSize: '13.5px', fontWeight: 800, color: v('on-action'), textDecoration: 'none' }}>
          {t('landing.kit.callNumber', { number: '112' })}
        </a>
        <a href="/crisis" style={{ ...LINK_44, fontSize: '13.5px', fontWeight: 600, color: v('text-2') }}>
          {t('landing.home.sosAll')}
        </a>
      </aside>

      {/* 5. Main Hero Section: Interactive Carousel + Right Feature Cards */}
      <section style={{ padding: `20px ${GUTTER} 0`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
        {/* Carousel Box */}
        <div
          role="region"
          aria-label={t('landing.home.carouselAria')}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          style={{ position: 'relative', minHeight: '470px', borderRadius: '20px', overflow: 'hidden', padding: '40px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: `linear-gradient(120deg, ${v(current.tint)} 0%, ${v('surface')} 100%)` }}
        >
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: v(current.ink), letterSpacing: '1.2px' }}>{t(current.eyebrow)}</span>
            <h1 style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 46px)', lineHeight: 1.08, fontWeight: 800, letterSpacing: '-1.7px', color: v('text') }}>
              {t(current.line1)}<br /><span style={{ color: v(current.ink) }}>{t(current.line2)}</span>
            </h1>
            <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, fontWeight: 500, color: v('text-2') }}>
              {t(current.body)}
            </p>
            <a href={current.href} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '10px', height: '52px', padding: '0 26px', borderRadius: '12px', background: v(current.ink), fontSize: '15px', fontWeight: 800, color: v('on-action'), textDecoration: 'none' }}>
              {t(current.cta)}
            </a>
          </div>

          {/* Right graphic inside carousel */}
          <div style={{ position: 'absolute', right: '20px', bottom: '20px', width: '320px', height: '320px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', pointerEvents: 'none' }}>
            {slide === 0 && <Illustration name="illustration-vitamin-jar" width={280} height={261} />}
            {slide === 1 && <Illustration name="illustration-test-tubes" width={280} height={261} />}
            {slide === 2 && (
              <CanvasVideo name="video-fabac8.mp4" style={{ width: '280px', height: '260px', objectFit: 'cover', borderRadius: '24px' }} />
            )}
            {slide === 3 && <CanvasImage name="a-friendly-doctor-waving-hello-b859fc.png" style={{ height: '280px', width: 'auto' }} />}
          </div>

          <span style={{ flexGrow: 1 }} />

          {/* Dots Indicator: a 44 px target around a small visible bar. */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '2px', paddingTop: '20px' }}>
            {slides.map((s, idx) => (
              <button
                key={s.dot}
                type="button"
                onClick={() => setSlide(idx)}
                aria-label={t('landing.home.slideLabel', { name: t(s.dot) })}
                aria-pressed={idx === slide}
                style={{ minWidth: '44px', height: '44px', padding: '0 4px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'block',
                    height: '6px',
                    borderRadius: '999px',
                    transition: 'all .3s ease',
                    background: idx === slide ? v('action') : v('action-soft'),
                    width: idx === slide ? '44px' : '14px',
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right Feature Side Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <a href="/lab-tests" style={{ flexGrow: 1, borderRadius: '20px', background: `linear-gradient(140deg, ${v('positive-bg')} 0%, ${v('surface')} 100%)`, padding: '30px', display: 'flex', flexDirection: 'column', gap: '12px', textDecoration: 'none' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: v('positive'), letterSpacing: '1.2px' }}>{t('landing.home.check.eyebrow')}</span>
            <span style={{ fontSize: '27px', lineHeight: 1.18, fontWeight: 800, color: v('text'), letterSpacing: '-0.9px' }}>
              {t('landing.home.slide1.line1')}<br />{t('landing.home.check.line2')}
            </span>
            <span style={{ flexGrow: 1 }} />
            <span style={{ fontSize: '14px', fontWeight: 800, color: v('positive') }}>{t('landing.home.check.cta')}</span>
          </a>

          <a href="/plans" style={{ flexGrow: 1, borderRadius: '20px', background: v('brand-navy'), padding: '30px', display: 'flex', flexDirection: 'column', gap: '12px', textDecoration: 'none' }}>
            <span style={{ width: '40px', height: '40px', borderRadius: '13px', background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={v('on-hero')} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l7.5 3v5.6c0 4.3-3 8.2-7.5 9.4-4.5-1.2-7.5-5.1-7.5-9.4V6z" />
              </svg>
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: v('sidebar-ink-3'), letterSpacing: '1.2px' }}>{t('landing.home.plans.eyebrow')}</span>
            <span style={{ fontSize: '26px', fontWeight: 800, color: v('on-hero'), letterSpacing: '-0.8px' }}>{t('landing.home.plans.title')}</span>
            <span style={{ fontSize: '13.5px', fontWeight: 500, color: v('sidebar-ink-3') }}>{t('landing.home.plans.body')}</span>
            <span style={{ flexGrow: 1 }} />
            <span style={{ fontSize: '14px', fontWeight: 800, color: v('on-hero') }}>{t('landing.home.plans.cta')}</span>
          </a>
        </div>
      </section>

      {/* 6. Four Tiles */}
      <section style={{ padding: `18px ${GUTTER} 0`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        {fourTiles.map((tile) => (
          <a key={tile.title} href={tile.href} style={{ padding: '20px', borderRadius: '16px', background: v('surface'), display: 'flex', alignItems: 'center', gap: '14px', border: `1px solid ${v('rule-soft')}`, textDecoration: 'none' }}>
            <span style={{ width: '46px', height: '46px', borderRadius: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: v(tile.tint), color: v(tile.ink) }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={tile.path} />
              </svg>
            </span>
            <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: v('text') }}>{t(tile.title)}</span>
              <span style={{ fontSize: '12.5px', fontWeight: 500, color: v('text-3') }}>{t(tile.meta)}</span>
            </span>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={v('rule-strong')} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        ))}
      </section>

      {/* 7. Shop by Health Concern */}
      <section style={{ padding: `46px ${GUTTER} 0`, display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={EYEBROW}>{t('landing.home.concerns.eyebrow')}</span>
          <h2 style={H2}>{t('landing.home.concerns.title')}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '16px' }}>
          {healthConcerns.map((c) => (
            <a key={c.label} href="/shop" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '11px', textDecoration: 'none' }}>
              <span style={{ width: '72px', height: '72px', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: v(c.tint) }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={v(c.ink)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={c.path} />
                </svg>
              </span>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: v('text'), textAlign: 'center' }}>{t(c.label)}</span>
            </a>
          ))}
        </div>
      </section>

      {/* 8. Everyday Essentials */}
      <section style={{ padding: `44px ${GUTTER} 0`, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={EYEBROW}>{t('landing.home.ess.eyebrow')}</span>
            <h2 style={H2}>{t('landing.home.ess.title')}</h2>
          </div>
          <a href="/shop" style={{ ...LINK_44, fontSize: '13.5px', fontWeight: 600, color: v('text-2') }}>
            {t('landing.home.ess.more')}
          </a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
          {essentials.map((e) => (
            <a key={e.title} href={e.href} style={{ borderRadius: '16px', background: v('surface'), overflow: 'hidden', display: 'flex', flexDirection: 'column', textDecoration: 'none', border: `1px solid ${v('rule-soft')}` }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '152px', background: v(e.tint) }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={v(e.ink)} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={e.path} />
                </svg>
              </span>
              <span style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: v('text') }}>{t(e.title)}</span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: v('text-3') }}>{t(e.meta)}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* 9. Published right now (Real live catalog endpoint) */}
      {items.length > 0 && (
        <section className="sk-landing__catalog" aria-labelledby="sk-landing-catalog" style={{ padding: `44px ${GUTTER} 0` }}>
          <div className="sk-landing__catalog-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={EYEBROW}>{t('landing.home.catalog.eyebrow')}</span>
              <h2 className="sk-landing__heading" id="sk-landing-catalog" style={{ ...H2, margin: '4px 0 0' }}>
                {t('landing.home.catalog.title')}
              </h2>
            </div>
            <a className="sk-landing__more" href="/shop" style={{ ...LINK_44, fontSize: '14px', fontWeight: 800, color: v('action'), gap: '6px' }}>
              {t('landing.kit.seeAll')}
              <Icon name="arrow-right" size={15} />
            </a>
          </div>
          <ul className="sk-landing__grid" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            {items.map((item) => (
              <li className="sk-landing__item" key={item.id} style={{ borderRadius: '15px', background: v('surface'), border: `1px solid ${v('rule-soft')}`, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className="sk-landing__item-kind" style={{ fontSize: '10px', fontWeight: 800, color: v('action'), textTransform: 'uppercase' }}>
                  {kindText(item.kind)}
                </span>
                <p className="sk-landing__item-name" style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: v('text'), lineHeight: 1.3 }}>
                  {item.name}
                </p>
                {item.brand || item.pack ? (
                  <p className="sk-landing__item-meta" style={{ margin: 0, fontSize: '11px', color: v('text-3') }}>
                    {[item.brand, item.pack].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
                <p className="sk-landing__item-price" style={{ margin: 'auto 0 0', fontSize: '17px', fontWeight: 800, color: v('text'), display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {rupees(item.pricePaise)}
                  {item.mrpPaise > item.pricePaise ? (
                    <del style={{ fontSize: '12px', fontWeight: 500, color: v('text-3') }}>{rupees(item.mrpPaise)}</del>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The "featured promotion" (a named moisturiser and a "campus special")
          and "featured brands" (three brand names) that stood here were not
          from the catalog, though they said they were. The "health
          perspectives" articles had reading times but no articles. All three
          are gone; real rows are in the section above. */}

      {/* 12. Records + Care Strip */}
      <section style={{ padding: `32px ${GUTTER} 0`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
        <a href="/records" style={{ padding: '26px 28px', borderRadius: '18px', background: v('surface-3'), display: 'flex', alignItems: 'center', gap: '18px', textDecoration: 'none', flexWrap: 'wrap' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={v('text-3')} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5" />
          </svg>
          <span style={{ flexGrow: 1, flexBasis: '180px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: v('text'), letterSpacing: '-0.4px' }}>{t('landing.home.records.title')}</span>
            <span style={{ fontSize: '13.5px', fontWeight: 500, color: v('text-2') }}>{t('landing.home.records.body')}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', height: '46px', padding: '0 20px', borderRadius: '12px', background: v('surface'), fontSize: '13.5px', fontWeight: 800, color: v('action') }}>
            {t('landing.home.records.cta')}
          </span>
        </a>
        <a href="/shop" style={{ padding: '26px 28px', borderRadius: '18px', background: v('surface-3'), display: 'flex', alignItems: 'center', gap: '18px', textDecoration: 'none' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={v('action')} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 15l6-6M9.5 9.5h.01M14.5 14.5h.01" />
          </svg>
          <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: v('action'), letterSpacing: '1.2px' }}>{t('landing.home.care.eyebrow')}</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: v('text'), letterSpacing: '-0.4px' }}>{t('landing.home.care.title')}</span>
            <span style={{ fontSize: '13.5px', fontWeight: 500, color: v('text-2') }}>{t('landing.home.care.body')}</span>
          </span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={v('action')} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </section>

      {/* 13. Services Grid */}
      <section style={{ margin: `32px ${GUTTER} 0`, padding: '34px', borderRadius: '22px', background: v('surface'), display: 'flex', flexDirection: 'column', gap: '20px', border: `1px solid ${v('rule-soft')}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          <span style={EYEBROW}>{t('landing.home.svc.eyebrow')}</span>
          <h2 style={{ ...H2, fontSize: 'clamp(24px, 3vw, 30px)', letterSpacing: '-1px' }}>{t('landing.home.svc.title')}</h2>
          <p style={{ margin: 0, maxWidth: '780px', fontSize: '14.5px', lineHeight: 1.6, fontWeight: 500, color: v('text-2') }}>
            {t('landing.home.svc.body')}
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          {careServices.map((s) => (
            <a key={s.title} href={s.href} style={{ padding: '22px', borderRadius: '16px', border: `1px solid ${v('rule-soft')}`, display: 'flex', flexDirection: 'column', gap: '9px', textDecoration: 'none' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ flexGrow: 1, fontSize: '17px', fontWeight: 800, color: v('text'), letterSpacing: '-0.3px' }}>{t(s.title)}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={v('text')} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
              <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: v('text-2') }}>{t(s.body)}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: v('action') }}>{t('landing.home.svc.open')}</span>
            </a>
          ))}
        </div>
      </section>

      {/* 14. Preventive Care & Movement */}
      <section style={{ padding: `26px ${GUTTER} 0`, display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ padding: '30px 34px', borderRadius: '20px', background: v('surface'), display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', border: `1px solid ${v('rule-soft')}` }}>
          <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <span style={EYEBROW}>{t('landing.home.prev.eyebrow')}</span>
            <span style={{ fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 800, color: v('text'), letterSpacing: '-0.8px' }}>
              {t('landing.home.prev.title')}
            </span>
            <span style={{ maxWidth: '640px', fontSize: '13.5px', lineHeight: 1.6, fontWeight: 500, color: v('text-2') }}>
              {t('landing.home.prev.body')}
            </span>
          </span>
          <a href="/preventive-care" style={{ display: 'flex', alignItems: 'center', height: '48px', padding: '0 22px', borderRadius: '12px', border: `1px solid ${v('rule')}`, fontSize: '13.5px', fontWeight: 800, color: v('action'), textDecoration: 'none' }}>
            {t('landing.home.prev.cta')}
          </a>
        </div>
        <div style={{ padding: '26px 34px', borderRadius: '20px', background: v('surface-3'), display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
          <span style={{ width: '62px', height: '62px', borderRadius: '16px', background: v('surface'), display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={v('action')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12h4l2-6 3 12 2-6h7" />
            </svg>
          </span>
          <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: v('action'), letterSpacing: '1.2px' }}>{t('landing.home.move.eyebrow')}</span>
            <span style={{ fontSize: 'clamp(20px, 2.5vw, 24px)', fontWeight: 800, color: v('text'), letterSpacing: '-0.7px' }}>
              {t('landing.home.move.title')}
            </span>
            <span style={{ fontSize: '13.5px', fontWeight: 500, color: v('text-2') }}>
              {t('landing.home.move.body')}
            </span>
          </span>
          <a href="/movement" style={{ display: 'flex', alignItems: 'center', height: '48px', padding: '0 22px', borderRadius: '12px', background: v('surface'), fontSize: '13.5px', fontWeight: 800, color: v('action'), textDecoration: 'none' }}>
            {t('landing.home.move.cta')}
          </a>
        </div>
      </section>

      {/* 15. Account Cards */}
      <section style={{ padding: `26px ${GUTTER} 0`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        {accountTiles.map((a) => (
          <a key={a.href} href={a.href} style={{ padding: '22px', borderRadius: '16px', background: v('surface-3'), display: 'flex', flexDirection: 'column', gap: '12px', textDecoration: 'none' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={v('action')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={a.path} />
            </svg>
            <span style={{ fontSize: '15.5px', fontWeight: 700, color: v('text') }}>{t(a.title)}</span>
            <span style={{ fontSize: '12.5px', fontWeight: 500, color: v('text-3') }}>{t(a.meta)}</span>
          </a>
        ))}
      </section>

      {/* 17. What we promise (same promises as the native page) */}
      <section aria-label={t('landing.home.promisesTitle')} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', margin: `64px ${GUTTER} 0`, padding: '40px 24px', borderRadius: '28px', background: v('surface'), border: `1px solid ${v('rule-soft')}` }}>
        {promises.map((p) => (
          <div key={p.title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
            <Illustration name={p.art} size={84} />
            <span style={{ fontSize: '18px', fontWeight: 800, color: v('text'), letterSpacing: '-0.3px' }}>{t(p.title)}</span>
            <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: v('text-2') }}>
              {t(p.body)}
            </span>
          </div>
        ))}
      </section>

      {/* 18. Get the web app */}
      <section aria-label={t('landing.home.app.aria')} style={{ display: 'flex', alignItems: 'center', gap: '40px', margin: `40px ${GUTTER} 64px`, padding: '0 clamp(16px, 3vw, 40px) 0 clamp(20px, 4vw, 56px)', minHeight: '400px', borderRadius: '28px', background: `linear-gradient(135deg, ${v('surface-3')} 0%, ${v('rule')} 100%)`, overflow: 'hidden', flexWrap: 'wrap' }}>
        <div style={{ flexGrow: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '40px 0' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: v('action') }}>{t('landing.home.app.eyebrow')}</span>
          <span style={{ fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.2, fontWeight: 800, color: v('text'), letterSpacing: '-0.9px', maxWidth: '520px' }}>
            {t('landing.home.app.title')}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {([
              ['landing.home.app.collection', <><circle key="a" cx="12" cy="10" r="3" /><path key="b" d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /></>],
              ['landing.home.app.card', <><rect key="a" x="4" y="5" width="16" height="14" rx="3" /><path key="b" d="M12 9v6M9 12h6" /></>],
              ['landing.home.app.review', <path key="a" d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" />],
            ] as const).map(([key, glyph]) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', fontWeight: 700, color: v('text') }}>
                <span style={{ width: '34px', height: '34px', borderRadius: '11px', background: v('surface'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={v('action')} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {glyph}
                  </svg>
                </span>
                {t(key)}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '8px', flexWrap: 'wrap' }}>
            <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '52px', padding: '0 24px', borderRadius: '14px', background: v('text'), color: v('surface'), textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
              {t('landing.home.app.open')}
            </a>
            <a href="/calculators" style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '52px', padding: '0 24px', borderRadius: '14px', background: v('surface'), color: v('action'), textDecoration: 'none', fontWeight: 800, fontSize: '14px', border: `1.5px solid ${v('rule')}` }}>
              {t('landing.home.app.calculators')}
            </a>
          </div>
        </div>

        <div style={{ alignSelf: 'flex-end', flexShrink: 0, paddingBottom: '10px' }}>
          <Illustration name="illustration-phones-dashboard" width={280} height={255} />
        </div>
      </section>

      {/* 19. Footer, with the Kare Letter band. No service receives sign-ups yet,
          so the band says so and collects nothing. */}
      <PublicSiteFooter band={<NewsletterBand />} note={t('landing.home.unfinished')} />
    </div>
  );
}

/** Paise to rupees. Integer paise in, no floating-point money arithmetic. */
export function rupees(paise: number): string {
  const whole = Math.trunc(paise / 100);
  const remainder = Math.abs(paise % 100);
  const grouped = whole.toLocaleString('en-IN');
  return remainder === 0 ? `₹${grouped}` : `₹${grouped}.${String(remainder).padStart(2, '0')}`;
}

/** English kind name (kept for callers and tests); the page itself renders the translated `landing.kit.kind.*`. */
export function kindLabel(kind: string): string {
  const labels: Record<string, string> = {
    product: 'Medicine',
    lab: 'Lab test',
    consultation: 'Consultation',
    vaccine: 'Vaccine',
  };
  return labels[kind] ?? kind;
}
