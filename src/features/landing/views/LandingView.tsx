import React, { useEffect, useState } from 'react';
import { useApiResource } from '@/hooks/api/useApiResource';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon, Illustration, type SkIconName } from '@/design-system/icons';
import { CanvasImage, CanvasVideo } from '@/design-system/art';
import { PublicSiteHeader, PublicSitePage } from '@/design-system/public-site';
import { EMERGENCY_NUMBER } from '@/ai/core/crisisGate';
import { LwIconTile, offPercent } from './landingWebKit';
import './landingWeb.css';
import './landingHome.css';

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

/** Catalogue kinds with a translated name; anything else is shown as sent. */
const KNOWN_KINDS = ['product', 'lab', 'consultation', 'vaccine', 'wellness'] as const;

type Tone = 'action' | 'positive' | 'attention';
type Tint = 'indigo' | 'peach' | 'mint' | 'rose' | 'sky' | 'gold';

const TILES: ReadonlyArray<{ title: MessageKey; meta: MessageKey; href: string; icon: SkIconName; tone: Tone; warm?: boolean }> = [
  { title: 'landing.home.tile.wellness.title', meta: 'landing.home.tile.wellness.meta', href: '/shop', icon: 'pill-2', tone: 'action' },
  { title: 'landing.home.tile.lab.title', meta: 'landing.home.tile.lab.meta', href: '/lab-tests', icon: 'flask-2', tone: 'positive' },
  { title: 'landing.home.tile.doctor.title', meta: 'landing.home.tile.doctor.meta', href: '/consult', icon: 'doctor-2', tone: 'attention', warm: true },
  { title: 'landing.home.tile.cover.title', meta: 'landing.home.tile.cover.meta', href: '/plans', icon: 'shield-2', tone: 'action' },
];

const CONCERNS: ReadonlyArray<{ label: MessageKey; icon: SkIconName; tint: Tint }> = [
  { label: 'landing.home.concern.diabetes', icon: 'droplet-2', tint: 'indigo' },
  { label: 'landing.home.concern.heart', icon: 'map-pin', tint: 'peach' },
  { label: 'landing.home.concern.stomach', icon: 'bowl', tint: 'mint' },
  { label: 'landing.home.concern.liver', icon: 'droplet-2', tint: 'indigo' },
  { label: 'landing.home.concern.bone', icon: 'phone-call', tint: 'peach' },
  { label: 'landing.home.concern.kidney', icon: 'droplet-2', tint: 'mint' },
  { label: 'landing.home.concern.derma', icon: 'sparkle', tint: 'indigo' },
  { label: 'landing.home.concern.respiratory', icon: 'wind', tint: 'peach' },
  { label: 'landing.home.concern.eye', icon: 'eye-outline', tint: 'mint' },
  { label: 'landing.home.concern.vaccines', icon: 'pipette', tint: 'indigo' },
];

const ESSENTIALS: ReadonlyArray<{ title: MessageKey; meta: MessageKey; href: string; icon: SkIconName; tint: Tint }> = [
  { title: 'landing.home.ess.vitamins.title', meta: 'landing.home.ess.vitamins.meta', href: '/shop', icon: 'pill-3', tint: 'indigo' },
  { title: 'landing.home.ess.skin.title', meta: 'landing.home.ess.skin.meta', href: '/shop', icon: 'droplet-2', tint: 'peach' },
  { title: 'landing.home.ess.nutrition.title', meta: 'landing.home.ess.nutrition.meta', href: '/shop', icon: 'bowl', tint: 'mint' },
  { title: 'landing.home.ess.checks.title', meta: 'landing.home.ess.checks.meta', href: '/lab-tests', icon: 'flask-2', tint: 'sky' },
  { title: 'landing.home.ess.care.title', meta: 'landing.home.ess.care.meta', href: '/consult', icon: 'stethoscope-2', tint: 'gold' },
];

const SERVICES: ReadonlyArray<{ title: MessageKey; body: MessageKey; href: string }> = [
  { title: 'landing.home.svc.shop.title', body: 'landing.home.svc.shop.body', href: '/shop' },
  { title: 'landing.home.svc.lab.title', body: 'landing.home.svc.lab.body', href: '/lab-tests' },
  { title: 'landing.home.svc.consult.title', body: 'landing.home.svc.consult.body', href: '/consult' },
  { title: 'landing.home.svc.plans.title', body: 'landing.home.svc.plans.body', href: '/plans' },
];

const ACCOUNT: ReadonlyArray<{ title: MessageKey; meta: MessageKey; href: string; icon: SkIconName }> = [
  { title: 'landing.home.acct.records.title', meta: 'landing.home.acct.records.meta', href: '/records', icon: 'file' },
  { title: 'landing.home.acct.metrics.title', meta: 'landing.home.acct.metrics.meta', href: '/devices', icon: 'map-pin' },
  { title: 'landing.home.tile.cover.title', meta: 'landing.home.acct.cover.meta', href: '/plans', icon: 'shield-2' },
  { title: 'landing.home.acct.support.title', meta: 'landing.home.acct.support.meta', href: '/support', icon: 'doctor-2' },
];

const READS: ReadonlyArray<{ topic: MessageKey; icon: SkIconName; tint: Tint }> = [
  { topic: 'landing.home.reads.sleep', icon: 'moon-2', tint: 'indigo' },
  { topic: 'landing.home.reads.checkup', icon: 'map-pin', tint: 'mint' },
  { topic: 'landing.home.reads.skin', icon: 'sparkle', tint: 'peach' },
];

/** The canvas draws brand cards with one of three marks, in turn. */
const BRAND_MARKS: readonly SkIconName[] = ['leaf-2', 'droplet-2', 'pill-2'];

const SLIDES: ReadonlyArray<{ id: 0 | 1 | 2 | 3; tone: Tone; tint: Tint; href: string; dot: MessageKey }> = [
  { id: 0, tone: 'action', tint: 'indigo', href: '/shop', dot: 'landing.home.nav.wellness' },
  { id: 1, tone: 'positive', tint: 'mint', href: '/lab-tests', dot: 'landing.home.nav.labTests' },
  { id: 2, tone: 'attention', tint: 'peach', href: '/wellness', dot: 'landing.home.nav.training' },
  { id: 3, tone: 'action', tint: 'indigo', href: '/consult', dot: 'landing.home.slideDoctors' },
];
const SLIDE_MS = 6000;

/** Illustrative packaging for a catalogue row, read from its published pack text. */
function packIcon(pack: string): SkIconName {
  if (/tube|cream|lotion|gel/i.test(pack)) return 'cup';
  if (/jar|powder|mix/i.test(pack)) return 'jar';
  return 'bottle-2';
}

/**
 * The public front door (design board Landing). Every product, price, brand
 * and lab test on it comes from the public /catalog; a section with nothing
 * published is left out rather than filled in.
 *
 * Left out of the board, because nothing proves them: the "ABHA-linked" and
 * "portable" chips, "24x7" support, the "campus pharmacy is dispensing this
 * week" ordering, stock counts, the "Kare Labs" lab name, the health
 * perspectives articles (none is published, so the topics say so) and the
 * store badges and scan code (nothing is listed in either store).
 */
export function LandingView(): React.ReactElement {
  const t = useT();
  const catalog = useApiResource<Catalog>('/catalog?limit=6');
  const labCatalog = useApiResource<Catalog>('/catalog?kind=lab&limit=4');
  const items = catalog.data?.items ?? [];
  const labs = (labCatalog.data?.items ?? []).filter((i) => i.kind === 'lab');

  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(interval);
  }, [paused]);
  const current = SLIDES[slide] ?? SLIDES[0];

  const kindText = (kind: string): string =>
    (KNOWN_KINDS as readonly string[]).includes(kind) ? t(`landing.kit.kind.${kind}` as MessageKey) : kind;

  // The biggest published saving, and the brands the catalogue lists: both
  // derived from the rows above, never typed in.
  const promo = items.reduce<CatalogItem | null>((best, i) => (offPercent(i.mrpPaise, i.pricePaise) > (best ? offPercent(best.mrpPaise, best.pricePaise) : 0) ? i : best), null);
  const brands = Array.from(new Set(items.map((i) => i.brand.trim()).filter(Boolean)));

  return (
    <PublicSitePage header={<PublicSiteHeader current="discover" />} art="primary" footerNote={t('landing.home.unfinished')}>
      {/* Your health record */}
      <section className="lw-banner" aria-label={t('landing.home.recordAria')}>
        <div className="lw-banner__media">
          <CanvasVideo name="video-4486f2.mp4" />
        </div>
        <span className="lw-banner__veil" aria-hidden="true" />
        <div className="lw-banner__copy">
          <span className="lw-banner__eyebrow">{t('landing.home.recordEyebrow')}</span>
          <p className="lw-banner__title">{t('landing.home.recordTitle')}</p>
          <ul className="lw-chips">
            <li className="lw-chip">{t('landing.home.chip.owned')}</li>
            <li className="lw-chip">{t('landing.home.chip.campus')}</li>
            <li className="lw-chip">{t('landing.home.chip.private')}</li>
          </ul>
        </div>
      </section>

      {/* Emergency: no account, never behind a loading state. */}
      <aside className="lh-sos" aria-label={t('landing.home.sosAria')}>
        <Icon name="alert-circle-3" size={18} strokeWidth={2.2} className="lh-sos__icon" />
        <span className="lh-sos__title">{t('landing.kit.emergencyTitle')}</span>
        <span className="lh-sos__body">{t('landing.home.sosBody')}</span>
        <span className="lw-spacer" />
        <a className="lh-sos__call" href={`tel:${EMERGENCY_NUMBER}`}>
          <Icon name="phone-2" size={16} strokeWidth={2.2} />
          {t('landing.kit.callNumber', { number: EMERGENCY_NUMBER })}
        </a>
        <a className="lh-sos__all" href="/crisis">{t('landing.home.sosAll')}</a>
      </aside>

      {/* Hero: carousel and two side cards */}
      <section className="lh-hero">
        <div
          role="region"
          aria-label={t('landing.home.carouselAria')}
          className={`lh-carousel lh-carousel--${current.tint}`}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className="lh-carousel__copy">
            <span className={`lh-eyebrow lh-tone--${current.tone}`}>{t(`landing.home.slide${current.id}.eyebrow` as MessageKey)}</span>
            <h1 className="lh-carousel__title">
              {t(`landing.home.slide${current.id}.line1` as MessageKey)}
              <br />
              <span className={`lh-tone--${current.tone}`}>{t(`landing.home.slide${current.id}.line2` as MessageKey)}</span>
            </h1>
            <p className="lh-carousel__body">{t(`landing.home.slide${current.id}.body` as MessageKey)}</p>
            <a className={`lh-carousel__cta lh-fill--${current.tone}`} href={current.href}>
              {t(`landing.home.slide${current.id}.ctaLabel` as MessageKey)}
              <Icon name="arrow-right" size={17} />
            </a>
          </div>
          <div className="lh-carousel__art">
            {current.id === 0 ? <Illustration name="illustration-vitamin-jar" width={280} height={261} /> : null}
            {current.id === 1 ? <Illustration name="illustration-test-tubes" width={280} height={261} /> : null}
            {current.id === 2 ? <CanvasVideo name="video-fabac8.mp4" className="lh-carousel__video" /> : null}
            {current.id === 3 ? <CanvasImage name="a-friendly-doctor-waving-hello-b859fc.png" className="lh-carousel__img" /> : null}
          </div>
          <div className="lh-dots">
            {SLIDES.map((s, idx) => (
              <button
                key={s.dot}
                type="button"
                className="lh-dots__btn"
                onClick={() => setSlide(idx)}
                aria-label={t('landing.home.slideLabel', { name: t(s.dot) })}
                aria-pressed={idx === slide}
              >
                <span className={`lh-dots__bar${idx === slide ? ' lh-dots__bar--on' : ''}`} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <div className="lh-side">
          <a className="lh-side__card lh-side__card--check" href="/lab-tests">
            <span className="lh-eyebrow lh-tone--positive">{t('landing.home.check.eyebrow')}</span>
            <span className="lh-side__title">
              {t('landing.home.slide1.line1')}
              <br />
              {t('landing.home.check.line2')}
            </span>
            <span className="lw-spacer" />
            <span className="lh-side__cta lh-tone--positive">
              {t('landing.home.check.ctaLabel')}
              <Icon name="arrow-right" size={15} />
            </span>
          </a>
          <a className="lh-side__card lh-side__card--plans" href="/plans">
            <span className="lh-side__mark">
              <Icon name="shield-2" size={19} />
            </span>
            <span className="lh-eyebrow lh-side__eyebrow">{t('landing.home.plans.eyebrow')}</span>
            <span className="lh-side__title lh-side__title--hero">{t('landing.home.plans.title')}</span>
            <span className="lh-side__body">{t('landing.home.plans.body')}</span>
            <span className="lw-spacer" />
            <span className="lh-side__cta lh-side__cta--hero">
              {t('landing.home.plans.ctaLabel')}
              <Icon name="arrow-right" size={15} />
            </span>
          </a>
        </div>
      </section>

      {/* Four tiles */}
      <ul className="lh-tiles">
        {TILES.map((tile) => (
          <li key={tile.title}>
            <a className={`lh-tile${tile.warm ? ' lh-tile--warm' : ''}`} href={tile.href}>
              <span className={`lh-orb lh-orb--${tile.tone}`} aria-hidden="true">
                <Icon name={tile.icon} size={20} strokeWidth={1.9} />
              </span>
              <span className="lh-tile__text">
                <span className="lh-tile__title">{t(tile.title)}</span>
                <span className="lh-tile__meta">{t(tile.meta)}</span>
              </span>
              <Icon name="arrow-right" size={17} className="lh-tile__arrow" />
            </a>
          </li>
        ))}
      </ul>

      {/* Shop by health concern */}
      <section className="lw-section" aria-labelledby="lh-concerns">
        <div className="lw-heading__text">
          <span className="lw-eyebrow">{t('landing.home.concerns.eyebrow')}</span>
          <h2 className="lw-h2" id="lh-concerns">{t('landing.home.concerns.title')}</h2>
        </div>
        <ul className="lh-concerns">
          {CONCERNS.map((c) => (
            <li key={c.label}>
              <a className="lh-concern" href="/shop">
                <span className={`lh-concern__orb lw-art lw-art--${c.tint}`} aria-hidden="true">
                  <Icon name={c.icon} size={24} strokeWidth={1.8} />
                </span>
                <span className="lh-concern__label">{t(c.label)}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Everyday essentials */}
      <section className="lw-section" aria-labelledby="lh-essentials">
        <div className="lw-heading">
          <div className="lw-heading__text">
            <span className="lw-eyebrow">{t('landing.home.ess.eyebrow')}</span>
            <h2 className="lw-h2" id="lh-essentials">{t('landing.home.ess.title')}</h2>
          </div>
          <a className="lw-more" href="/shop">
            {t('landing.home.ess.moreLabel')}
            <Icon name="arrow-right" size={15} />
          </a>
        </div>
        <ul className="lw-grid lh-essentials">
          {ESSENTIALS.map((e) => (
            <li key={e.title}>
              <a className="lh-essential" href={e.href}>
                <span className={`lh-essential__art lw-art lw-art--${e.tint}`} aria-hidden="true">
                  <Icon name={e.icon} size={52} strokeWidth={1.6} />
                </span>
                <span className="lh-essential__text">
                  <span className="lh-tile__title">{t(e.title)}</span>
                  <span className="lh-tile__meta">{t(e.meta)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Health checks: published lab tests only */}
      {labs.length > 0 ? (
        <section className="lh-labs" aria-labelledby="lh-labs">
          <div className="lw-heading">
            <div className="lw-heading__text">
              <span className="lw-eyebrow">{t('landing.home.labs.eyebrow')}</span>
              <h2 className="lw-h2" id="lh-labs">{t('landing.home.labs.title')}</h2>
            </div>
            <a className="lw-more" href="/lab-tests">
              {t('landing.labtests.seeAll')}
              <Icon name="arrow-right" size={15} />
            </a>
          </div>
          <ul className="lw-grid lw-grid--4">
            {labs.map((lab) => {
              const off = offPercent(lab.mrpPaise, lab.pricePaise);
              return (
                <li key={lab.id} className="lw-panel lw-test">
                  <div className="lw-test__top">
                    <LwIconTile icon="flask-2" size={34} />
                    {off > 0 ? <span className="lw-off">{t('landing.labtests.offPct', { pct: off })}</span> : null}
                  </div>
                  <span className="lw-panel__title">{lab.name}</span>
                  {lab.pack ? <span className="lw-test__brand">{lab.pack}</span> : null}
                  {lab.brand ? <span className="lw-test__brand">{lab.brand}</span> : null}
                  <span className="lw-spacer" />
                  <div className="lw-price">
                    <div className="lw-price__amounts">
                      {off > 0 ? <span className="lw-price__was">{rupees(lab.mrpPaise)}</span> : null}
                      <span className="lw-price__now">{rupees(lab.pricePaise)}</span>
                    </div>
                    <a className="lw-btn lw-btn--secondary" href="/shop?kind=lab" aria-label={t('landing.lablist.bookAria', { name: lab.name })}>
                      {t('landing.lablist.book')}
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Published right now: the real catalogue */}
      {items.length > 0 ? (
        <section className="lw-section" aria-labelledby="sk-landing-catalog">
          <div className="lw-heading">
            <div className="lw-heading__text">
              <span className="lw-eyebrow">{t('landing.home.catalog.eyebrow')}</span>
              <h2 className="lw-h2" id="sk-landing-catalog">{t('landing.home.catalog.title')}</h2>
            </div>
            <a className="lw-more" href="/shop">
              {t('landing.kit.seeAll')}
              <Icon name="arrow-right" size={15} />
            </a>
          </div>
          <ul className="lw-grid lh-products">
            {items.map((item) => {
              const off = offPercent(item.mrpPaise, item.pricePaise);
              return (
                <li key={item.id} className="lh-product">
                  <span className="lh-product__thumb">
                    {off > 0 ? <span className="lw-off lh-product__off">{t('landing.labtests.offPct', { pct: off })}</span> : null}
                    <Icon name={packIcon(item.pack)} size={40} strokeWidth={1.5} />
                    <span className="lh-product__illus">{t('landing.home.catalog.illustrative')}</span>
                  </span>
                  <span className="lh-product__body">
                    <span className="lh-product__kind">{item.brand || kindText(item.kind)}</span>
                    <span className="lh-product__name">{item.name}</span>
                    {item.pack ? <span className="lh-product__pack">{item.pack}</span> : null}
                    <span className="lh-product__price">
                      {rupees(item.pricePaise)}
                      {off > 0 ? <del className="lh-product__mrp">{rupees(item.mrpPaise)}</del> : null}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="lw-note">{t('landing.home.catalog.note')}</p>
        </section>
      ) : null}

      {/* On offer: the biggest published saving */}
      {promo ? (
        <section className="lh-promo" aria-labelledby="lh-promo">
          <div className="lh-promo__copy">
            <span className="lw-eyebrow">{t('landing.home.promo.eyebrow')}</span>
            <h2 className="lh-promo__title" id="lh-promo">{t('landing.home.promo.title')}</h2>
            <span className="lh-promo__name">{promo.name}</span>
            <span className="lh-promo__meta">
              {promo.pack ? `${promo.pack} · ` : ''}
              <span className="lh-promo__off">{t('landing.home.promo.off', { pct: offPercent(promo.mrpPaise, promo.pricePaise) })}</span>
            </span>
            <span className="lh-promo__price">
              <del className="lh-product__mrp">{rupees(promo.mrpPaise)}</del>
              {rupees(promo.pricePaise)}
            </span>
            <a className="lw-btn lw-btn--primary lw-btn--lg lh-promo__cta" href="/shop">
              {t('landing.home.promo.cta')}
              <Icon name="arrow-right" size={17} />
            </a>
            <p className="lw-note">{t('landing.home.promo.note')}</p>
          </div>
          <span className="lh-promo__art lw-art lw-art--peach" aria-hidden="true">
            <Icon name="droplet-2" size={34} strokeWidth={1.6} />
          </span>
        </section>
      ) : null}

      {/* Brands the catalogue lists */}
      {brands.length > 0 ? (
        <section className="lw-section" aria-labelledby="lh-brands">
          <LwBrandHeading />
          <ul className="lw-grid lw-grid--3">
            {brands.map((brand, i) => (
              <li key={brand}>
                <a className={`lh-brand lh-brand--${i % 3}`} href="/shop">
                  <span className="lh-brand__mark" aria-hidden="true">
                    <Icon name={BRAND_MARKS[i % BRAND_MARKS.length] ?? 'leaf-2'} size={22} strokeWidth={1.8} />
                  </span>
                  <span className="lh-brand__name">{brand}</span>
                  <span className="lh-brand__cta">{t('landing.home.brands.cta')}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Records and care strips */}
      <div className="lh-strips">
        <a className="lh-strip" href="/records">
          <Icon name="file-2" size={30} strokeWidth={1.6} className="lh-strip__icon" />
          <span className="lh-strip__text">
            <span className="lh-strip__title">{t('landing.home.records.title')}</span>
            <span className="lh-tile__meta">{t('landing.home.records.body')}</span>
          </span>
          <span className="lh-strip__btn">
            {t('landing.home.records.ctaLabel')}
            <Icon name="arrow-right" size={15} />
          </span>
        </a>
        <a className="lh-strip" href="/shop">
          <Icon name="percent" size={30} strokeWidth={1.6} className="lh-strip__icon lh-tone--action" />
          <span className="lh-strip__text">
            <span className="lh-eyebrow lh-tone--action">{t('landing.home.care.eyebrow')}</span>
            <span className="lh-strip__title">{t('landing.home.care.title')}</span>
            <span className="lh-tile__meta">{t('landing.home.care.body')}</span>
          </span>
          <Icon name="arrow-right" size={20} className="lh-tone--action" />
        </a>
      </div>

      {/* Care services */}
      <section className="lw-card lh-services" aria-labelledby="lh-services">
        <div className="lw-heading__text">
          <span className="lw-eyebrow">{t('landing.home.svc.eyebrow')}</span>
          <h2 className="lw-h2" id="lh-services">{t('landing.home.svc.title')}</h2>
          <p className="lw-lede">{t('landing.home.svc.body')}</p>
        </div>
        <ul className="lw-grid lw-grid--2">
          {SERVICES.map((s) => (
            <li key={s.title}>
              <a className="lh-service" href={s.href}>
                <span className="lh-service__head">
                  <span className="lh-service__title">{t(s.title)}</span>
                  <Icon name="arrow-right" size={18} />
                </span>
                <span className="lh-tile__meta">{t(s.body)}</span>
                <span className="lh-service__open">
                  {t('landing.home.svc.openLabel')}
                  <Icon name="arrow-right" size={14} />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Preventive care and movement */}
      <section className="lh-prevent" aria-labelledby="lh-prevent">
        <span className="lh-prevent__text">
          <span className="lw-eyebrow">{t('landing.home.prev.eyebrow')}</span>
          <h2 className="lh-prevent__title" id="lh-prevent">{t('landing.home.prev.title')}</h2>
          <span className="lh-tile__meta">{t('landing.home.prev.body')}</span>
        </span>
        <a className="lw-btn lw-btn--secondary" href="/preventive-care">
          {t('landing.home.prev.ctaLabel')}
          <Icon name="arrow-right" size={15} />
        </a>
      </section>
      <section className="lh-move" aria-labelledby="lh-move">
        <span className="lh-move__mark" aria-hidden="true">
          <Icon name="activity" size={26} strokeWidth={1.8} />
        </span>
        <span className="lh-prevent__text">
          <span className="lh-eyebrow lh-tone--action">{t('landing.home.move.eyebrow')}</span>
          <h2 className="lh-prevent__title" id="lh-move">{t('landing.home.move.title')}</h2>
          <span className="lh-tile__meta">{t('landing.home.move.body')}</span>
        </span>
        <a className="lw-btn lw-btn--secondary" href="/movement">
          {t('landing.home.move.ctaLabel')}
          <Icon name="arrow-right" size={15} />
        </a>
      </section>

      {/* Account tiles */}
      <ul className="lh-account">
        {ACCOUNT.map((a) => (
          <li key={a.href}>
            <a className="lh-account__tile" href={a.href}>
              <Icon name={a.icon} size={22} strokeWidth={1.8} className="lh-tone--action" />
              <span className="lh-tile__title">{t(a.title)}</span>
              <span className="lh-tile__meta">{t(a.meta)}</span>
            </a>
          </li>
        ))}
      </ul>

      {/* Health perspectives: no article is published, so each topic says so. */}
      <section className="lw-section" aria-labelledby="lh-reads">
        <div className="lw-heading__text">
          <span className="lw-eyebrow">{t('landing.home.reads.eyebrow')}</span>
          <h2 className="lw-h2" id="lh-reads">{t('landing.home.reads.title')}</h2>
        </div>
        <ul className="lw-grid lw-grid--3">
          {READS.map((r) => (
            <li key={r.topic} className="lh-read">
              <span className={`lh-read__art lw-art lw-art--${r.tint}`} aria-hidden="true">
                <Icon name={r.icon} size={30} strokeWidth={1.6} />
              </span>
              <span className="lh-read__body">
                <span className="lw-panel__meta">{t(r.topic)}</span>
                <span className="lh-read__none">
                  <Icon name="clock" size={14} />
                  {t('landing.home.reads.none')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </PublicSitePage>
  );
}

function LwBrandHeading(): React.ReactElement {
  const t = useT();
  return (
    <div className="lw-heading">
      <div className="lw-heading__text">
        <span className="lw-eyebrow">{t('landing.home.brands.eyebrow')}</span>
        <h2 className="lw-h2" id="lh-brands">{t('landing.home.brands.title')}</h2>
      </div>
      <span className="lw-count">{t('landing.home.brands.note')}</span>
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
