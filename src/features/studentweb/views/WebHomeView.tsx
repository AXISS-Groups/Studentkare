import React, { useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { useNavigate } from '@/core/navigation';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { Eyebrow, StudentWebFooter } from './parts';

const TICKS: MessageKey[] = ['sw.home.tick.price', 'sw.home.tick.placement', 'sw.home.tick.records'];

/** Where the student can start, each a real page (no sample people or bookings). */
const STARTS: { icon: SkIconName; title: MessageKey; meta: MessageKey; to: RoutePath; tone: 'lab' | 'doctor' }[] = [
  { icon: 'flask-2', title: 'sw.home.start.lab', meta: 'sw.home.start.labMeta', to: 'lab-tests', tone: 'lab' },
  { icon: 'stethoscope', title: 'sw.home.start.doctor', meta: 'sw.home.start.doctorMeta', to: 'care', tone: 'doctor' },
];

const FEATURES: { icon: SkIconName; title: MessageKey; body: MessageKey; tone: 'pill' | 'lab' | 'doctor' | 'lock' }[] = [
  { icon: 'pill-2', title: 'sw.home.feat.pharmacy', body: 'sw.home.feat.pharmacyBody', tone: 'pill' },
  { icon: 'flask-2', title: 'sw.home.feat.labs', body: 'sw.home.feat.labsBody', tone: 'lab' },
  { icon: 'doctor-2', title: 'sw.home.feat.doctors', body: 'sw.home.feat.doctorsBody', tone: 'doctor' },
  { icon: 'lock-3', title: 'sw.home.feat.record', body: 'sw.home.feat.recordBody', tone: 'lock' },
];

/**
 * Home (canvas 3b, WebHome, Tier 2), the signed-in student's front page in the
 * student web shell (/home). Search goes to the shop's results.
 *
 * Made true: the board's "Live on 3 campuses", "NABL-accredited" and
 * "ABDM-linked" ticks are compliance or coverage claims nothing computes
 * (AGENTS.md guardrail 6), and its hero cards show a sample test, doctor and
 * Ayush reply. The ticks here state what the product does by design, and the
 * hero cards are the real places to start.
 */
export function WebHomeView() {
  const t = useT();
  const routerNavigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const campus = user?.university?.trim();
  const search = (event: React.FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    routerNavigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  };

  return (
    <div className="sk-sw-page sk-sw-home">
      <section className="sk-sw-hero" aria-labelledby="sk-sw-hero-title">
        <div className="sk-sw-hero__copy">
          <span className="sk-sw-badge"><span className="sk-sw-badge__dot" aria-hidden="true" />{campus ? t('sw.home.badgeCampus', { campus }) : t('sw.home.badge')}</span>
          <h1 id="sk-sw-hero-title" className="sk-sw-hero__title">{t('sw.home.title1')}<br />{t('sw.home.title2')}</h1>
          <p className="sk-sw-hero__lead">{t('sw.home.lead')}</p>
          <form className="sk-sw-search" role="search" onSubmit={search}>
            <Icon name="search-2" size={20} color="var(--sk-color-text-3)" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('sw.search.placeholder')} aria-label={t('sw.search.label')} />
            <button type="submit" className="sk-sw-btn sk-sw-btn--primary">{t('sw.search.submit')}</button>
          </form>
          <ul className="sk-sw-ticks">
            {TICKS.map((tick) => <li key={tick}><Icon name="check" size={15} color="var(--sk-color-positive)" />{t(tick)}</li>)}
          </ul>
        </div>
        <div className="sk-sw-hero__panel">
          {STARTS.map((start) => (
            <button key={start.title} type="button" className="sk-sw-hero__card" onClick={() => navigate(start.to)}>
              <span className={`sk-sw-tile-icon is-${start.tone}`} aria-hidden="true"><Icon name={start.icon} size={20} /></span>
              <span><strong>{t(start.title)}</strong><small>{t(start.meta)}</small></span>
            </button>
          ))}
          <button type="button" className="sk-sw-hero__ayush" onClick={() => navigate('ayush')}>
            <span className="sk-sw-hero__ayush-eyebrow"><Icon name="sparkle" size={14} />{t('sw.home.ayushEyebrow')}</span>
            <span>{t('sw.home.ayushBody')}</span>
          </button>
        </div>
      </section>

      <section className="sk-sw-features" aria-labelledby="sk-sw-feat-title">
        <div className="sk-sw-features__head">
          <div>
            <Eyebrow>{t('sw.home.whatEyebrow')}</Eyebrow>
            <h2 id="sk-sw-feat-title" className="sk-sw-h2">{t('sw.home.whatTitle')}</h2>
          </div>
          <button type="button" className="sk-sw-btn sk-sw-btn--outline" onClick={() => navigate('shop')}>{t('sw.home.browse')}</button>
        </div>
        <div className="sk-sw-features__grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="sk-sw-card sk-sw-feature">
              <span className={`sk-sw-tile-icon is-${feature.tone}`} aria-hidden="true"><Icon name={feature.icon} size={20} /></span>
              <h3>{t(feature.title)}</h3>
              <p>{t(feature.body)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sk-sw-campus" aria-labelledby="sk-sw-campus-title">
        <div>
          <span className="sk-sw-campus__eyebrow">{t('sw.home.campusEyebrow')}</span>
          <h2 id="sk-sw-campus-title">{t('sw.home.campusTitle')}</h2>
          <p>{t('sw.home.campusBody')}</p>
        </div>
        <button type="button" className="sk-sw-btn sk-sw-btn--light" onClick={() => navigate('campuses')}>{t('sw.home.campusCta')}</button>
      </section>

      <StudentWebFooter />
    </div>
  );
}
