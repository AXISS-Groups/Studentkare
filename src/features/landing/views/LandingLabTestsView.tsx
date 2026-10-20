import React from 'react';
import { useApiResource } from '@/hooks/api/useApiResource';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon, type SkIconName } from '@/design-system/icons';
import { CanvasImage, CanvasVideo } from '@/design-system/art';
import { PublicSiteHeader, PublicSitePage } from '@/design-system/public-site';
import { rupees } from '../viewmodel/LandingViewModel';
import { LwBanner, LwFaq, LwHeading, LwIconTile, LwLabSearch, LwLoadState, LwRulesPanel, LwSteps, offPercent } from './landingWebKit';
import './landingWeb.css';

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

const L = 'landing.labtests.';
const k = (key: string): MessageKey => `${L}${key}` as MessageKey;

/** Category art: the illustration token families (DESIGN.md §3), named per canvas tile. */
type Tint = 'mint' | 'rose' | 'indigo' | 'sky' | 'peach';
const NEEDS: ReadonlyArray<{ key: string; icon: SkIconName; tint: Tint }> = [
  { key: 'need.fullBody', icon: 'person-badge', tint: 'mint' },
  { key: 'need.fever', icon: 'droplet-2', tint: 'rose' },
  { key: 'need.vitamin', icon: 'pill-2', tint: 'indigo' },
  { key: 'need.thyroid', icon: 'garment', tint: 'sky' },
  { key: 'need.anemia', icon: 'map-pin', tint: 'peach' },
  { key: 'need.xray', icon: 'drops', tint: 'sky' },
];
const CONCERNS: ReadonlyArray<{ key: string; icon: SkIconName; tint: Tint }> = [
  { key: 'concern.fever', icon: 'droplet-2', tint: 'peach' },
  { key: 'concern.vitamins', icon: 'pill-2', tint: 'indigo' },
  { key: 'concern.thyroid', icon: 'garment', tint: 'sky' },
  { key: 'concern.anemia', icon: 'map-pin', tint: 'peach' },
  { key: 'concern.liverKidney', icon: 'droplet-2', tint: 'mint' },
  { key: 'need.xray', icon: 'drops', tint: 'sky' },
];
const PROOF = ['proof.block', 'proof.handoff', 'proof.redo'] as const;
const RULES = [
  { key: 'rule.campusTold', on: false },
  { key: 'rule.ranking', on: false },
  { key: 'rule.critical', on: true },
  { key: 'rule.recollect', on: true },
] as const;
const STEPS = [1, 2, 3, 4, 5] as const;
const FAQS = [1, 2, 3, 4, 5, 6] as const;

/**
 * Lab tests (design board WebLabTests). Tests and prices come only from the
 * public catalogue; booking happens in the shop.
 *
 * Left out of the board because nothing proves them: "NABL labs" chips and
 * the "NABL labs only" / "Cold chain tracked" tiles, the named campus block,
 * and package report times and fasting rules (the catalogue publishes
 * neither). The app band's phones art is left out: it shows a report labelled
 * "Reviewed by a clinician", and no variant without that label exists.
 * WhatsApp booking is shown as not open: there is no line yet.
 */
export function LandingLabTestsView(): React.ReactElement {
  const t = useT();
  const catalog = useApiResource<Catalog>('/catalog?kind=lab&limit=12');
  const items = catalog.data?.items ?? [];

  return (
    <PublicSitePage header={<PublicSiteHeader current="labTests" variant="compact" />} art="alternate" appPhones={false} footerNote={t(k('footerNote'))}>
      <LwBanner
        label={t(k('eyebrow'))}
        eyebrow={t(k('eyebrow'))}
        title={t(k('bannerTitle'))}
        chips={[t(k('pillBlock')), t(k('pillVault'))]}
        media={<CanvasVideo name="video-09075f.mp4" />}
      />

      <section className="lw-intro" aria-labelledby="lw-labtests-title">
        <div className="lw-intro__copy">
          <h1 className="lw-h1" id="lw-labtests-title">{t(k('heroTitle'))}</h1>
          <LwLabSearch href="/lab-tests/category" />

          <ul className="lw-quick">
            <li>
              <span className="lw-quick__link lw-quick__link--off" aria-disabled="true">
                <Icon name="message-circle-3" size={17} strokeWidth={1.9} className="lw-quick__icon lw-quick__icon--positive" />
                {t(k('quick.whatsapp'))}
                <span className="lw-quick__off">{t(k('quick.whatsappOff'))}</span>
              </span>
            </li>
            <li>
              <a className="lw-quick__link lw-quick__link--attention" href="/prescriptions">
                <Icon name="file" size={17} strokeWidth={1.9} className="lw-quick__icon lw-quick__icon--attention" />
                {t(k('quick.uploadRx'))}
              </a>
            </li>
            <li>
              <a className="lw-quick__link" href="/support">
                <Icon name="phone-2" size={17} strokeWidth={1.9} className="lw-quick__icon" />
                {t(k('quick.healthDesk'))}
              </a>
            </li>
          </ul>

          <div className="lw-panel">
            <span className="lw-panel__title">{t(k('needsTitle'))}</span>
            <ul className="lw-grid lw-needs">
              {NEEDS.map((n) => (
                <li key={n.key}>
                  <a className="lw-need" href="/lab-tests/category">
                    <span className="lw-need__label">{t(k(n.key))}</span>
                    <span className={`lw-art lw-art--${n.tint} lw-need__art`} aria-hidden="true">
                      <Icon name={n.icon} size={17} strokeWidth={1.8} />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lw-intro__side">
          <div className="lw-labart">
            <CanvasImage name="image-aa86cc.png" alt={t(k('illustrationAlt'))} />
          </div>
          <ul className="lw-grid lw-proof">
            {PROOF.map((p) => (
              <li key={p} className={`lw-proof__tile lw-proof__tile--${p.slice(6)}`}>
                <span className="lw-proof__title">{t(k(`${p}Title`))}</span>
                <span className="lw-proof__meta">{t(k(`${p}Meta`))}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="lw-section" aria-labelledby="lw-labtests-concerns">
        <h2 className="lw-h2" id="lw-labtests-concerns">{t(k('concernsTitle'))}</h2>
        <ul className="lw-grid lw-grid--6">
          {CONCERNS.map((c) => (
            <li key={c.key}>
              <a className="lw-concern" href="/lab-tests/category">
                <span className={`lw-art lw-art--${c.tint} lw-concern__art`} aria-hidden="true">
                  <Icon name={c.icon} size={30} strokeWidth={1.5} />
                </span>
                <span className="lw-concern__label">{t(k(c.key))}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="lw-section" aria-labelledby="lw-labtests-packages">
        <LwHeading
          id="lw-labtests-packages"
          title={t(k('packagesTitle'))}
          aside={
            <a className="lw-more" href="/lab-tests/category">
              {t(k('seeAll'))}
              <Icon name="arrow-right" size={15} />
            </a>
          }
        />
        <div aria-live="polite">
          <LwLoadState
            loading={catalog.loading}
            failed={Boolean(catalog.error)}
            empty={items.length === 0}
            onRetry={catalog.reload}
            text={{ loading: t(k('loading')), errorTitle: t(k('failed')), empty: t(k('empty')) }}
          />
          {!catalog.loading && !catalog.error && items.length > 0 ? (
            <ul className="lw-grid lw-grid--4">
              {items.map((p) => {
                const off = offPercent(p.mrpPaise, p.pricePaise);
                return (
                  <li key={p.id} className="lw-panel lw-test">
                    <div className="lw-test__top">
                      <LwIconTile icon="flask-2" size={34} />
                      {off > 0 ? <span className="lw-off">{t(k('offPct'), { pct: off })}</span> : null}
                    </div>
                    <span className="lw-panel__title">{p.name}</span>
                    {p.pack ? <span className="lw-test__pack">{p.pack}</span> : null}
                    <span className="lw-spacer" />
                    <div className="lw-price">
                      <div className="lw-price__amounts">
                        {off > 0 ? <span className="lw-price__was">{rupees(p.mrpPaise)}</span> : null}
                        <span className="lw-price__now">{rupees(p.pricePaise)}</span>
                      </div>
                      <a className="lw-btn lw-btn--primary" href="/shop?kind=lab" aria-label={t(k('bookSlotFor'), { name: p.name })}>
                        {t(k('bookSlot'))}
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </section>

      <LwSteps
        title={t(k('howTitle'))}
        lede={t(k('howLede'))}
        steps={STEPS.map((n) => ({ title: t(k(`step${n}Title`)), body: t(k(`step${n}Body`)) }))}
      />

      <LwRulesPanel
        eyebrow={t(k('resultsEyebrow'))}
        title={t(k('resultsTitle'))}
        lede={t(k('resultsLede'))}
        rules={RULES.map((r) => ({ label: t(k(r.key)), tone: r.on ? 'yes' : 'no', tag: t(k(r.on ? 'tagAlways' : 'tagNever')) }))}
      />

      <LwFaq title={t(k('faqTitle'))} items={FAQS.map((n) => ({ q: t(k(`faq${n}Q`)), a: t(k(`faq${n}A`)) }))} />
    </PublicSitePage>
  );
}
