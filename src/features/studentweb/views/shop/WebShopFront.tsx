import React from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { CanvasVideo } from '@/design-system/art';
import { GradientHeroCard, HeroCarousel, NAVY_STOPS, SERVICE_HUES, heroStops } from '@/design-system/m2';
import type { HeroSlide } from '@/design-system/m2';
import { color } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
import { navigate } from '@/lib/utils/workflowRouting';
import { MEDICINE_CATEGORIES } from '@/features/m2store/data/storeArt';
import type { ShopFilter } from '@/features/m2store/data/storeArt';
import { orderLinePhone } from '@/features/m2store/data/orderLine';
import { NotYetCard, SoftIcon, hueStyle, rise } from './m2WebParts';

const COMPARE: readonly { key: string; label: MessageKey; generic: MessageKey; branded: MessageKey }[] = [
  { key: 'ingredient', label: 'm2.med.cmp.ingredient', generic: 'm2.med.cmp.same', branded: 'm2.med.cmp.same' },
  { key: 'strength', label: 'm2.med.cmp.strength', generic: 'm2.med.cmp.same', branded: 'm2.med.cmp.same' },
  { key: 'quality', label: 'm2.med.cmp.quality', generic: 'm2.med.cmp.same', branded: 'm2.med.cmp.same' },
  { key: 'price', label: 'm2.med.cmp.price', generic: 'm2.med.cmp.lower', branded: 'm2.med.cmp.higher' },
];

/**
 * The top of /shop above phone width in the Mobile 2.0 language: the campus
 * shop banner (with the board's video), the highlights carousel, the ways to
 * order, the generics card, the category tiles, refills and Kare points.
 *
 * Honest gaps, as on M2Medicines: "Call to order" is not available until an
 * order line is configured (`shop.order_line_phone`); "Chat to order" is
 * coming soon; pickup and delivery times are chosen at checkout (no estimate
 * API). Refills and points are the signed-in student's own and only appear
 * for them; refills open My health and carry nothing into the shop (Rule L).
 */
export function WebShopFront({ signedIn, onFilter }: { signedIn: boolean; onFilter: (filter: ShopFilter | { kind: 'product' | 'lab' }) => void }) {
  const t = useT();
  const phone = orderLinePhone();
  const points = useApiResource<{ balance: number }>(signedIn ? '/points/me' : null);

  const slides: HeroSlide[] = [
    { key: 'check', eyebrow: t('m2.home.s1.eyebrow'), title: t('m2.home.s1.title'), body: t('m2.home.s1.body'), cta: t('m2.home.s1.cta'), icon: 'lab', stops: NAVY_STOPS, chipFill: color.brandNavy, ink: color.onHeroCurrent, onPress: () => onFilter({ kind: 'lab' }) },
    { key: 'rx', eyebrow: t('m2w.rxSlide.eyebrow'), title: t('m2w.rxSlide.title'), body: t('m2w.rxSlide.body'), cta: t('m2w.rxSlide.cta'), icon: 'doc-upload', stops: heroStops('orange'), chipFill: SERVICE_HUES.orange.end, ink: SERVICE_HUES.orange.deep, onPress: () => navigate('prescriptions') },
    { key: 'report', eyebrow: t('m2.home.s3.eyebrow'), title: t('m2.home.s3.title'), body: t('m2.home.s3.body'), cta: t('m2.home.s3.cta'), icon: 'doc-upload', stops: heroStops('violet'), chipFill: SERVICE_HUES.violet.end, ink: SERVICE_HUES.violet.deep, onPress: () => navigate('health/report-upload') },
  ];

  return (
    <div className="sk-m2w-front">
      <div className="sk-m2w-bento">
        <section className="sk-m2w-banner sk-m2w-rise" style={rise(0)} aria-labelledby="sk-m2w-banner-title">
          <CanvasVideo name="video-93a060.mp4" className="sk-m2w-banner__video" />
          <span className="sk-m2w-banner__ring" aria-hidden="true" />
          <div className="sk-m2w-banner__copy">
            <span className="sk-m2w-banner__eyebrow">{t('shopweb.front.eyebrow')}</span>
            <h1 id="sk-m2w-banner-title">{t('shopweb.front.title')}</h1>
            <ul className="sk-m2w-banner__chips" aria-label={t('shopweb.front.chipsLabel')}>
              <li>{t('shopweb.front.chipPrice')}</li>
              <li>{t('shopweb.front.chipTiming')}</li>
              <li>{t('shopweb.front.chipPlacement')}</li>
            </ul>
          </div>
        </section>
        <div className="sk-m2w-carousel sk-m2w-rise" style={rise(1)}>
          <HeroCarousel label={t('m2w.highlights')} slides={slides} dotLabel={(n) => t('m2.home.dot', { n })} testID="m2w-carousel" />
        </div>
      </div>

      <section className="sk-m2w-quick sk-m2w-rise" style={rise(2)} aria-label={t('m2w.quick')}>
        <button type="button" className="sk-m2w-qcard sk-m2w-qcard--navy sk-m2w-lift" onClick={() => navigate('prescriptions')}>
          <Icon name="doc-upload" size={22} />
          <strong>{t('m2.med.rx')}</strong>
        </button>
        {phone ? (
          <a className="sk-m2w-qcard sk-m2w-lift" href={`tel:${phone}`} aria-label={t('m2.callOrderSpoken', { number: phone })}>
            <Icon name="phone" size={22} color="var(--sk-color-action)" />
            <strong>{t('m2.callOrder')}</strong>
          </a>
        ) : (
          <NotYetCard icon="phone" title={t('m2.callOrder')} note={t('m2.notYet')} testID="m2w-call-unavailable" />
        )}
        <NotYetCard icon="message-circle" title={t('m2.med.chat')} note={t('m2.soon')} testID="m2w-chat" />
        <div className="sk-m2w-qcard sk-m2w-qcard--info">
          <span className="sk-m2w-info-eyebrow is-positive">{t('m2.med.pickup')}</span>
          <strong>{t('m2.med.pickupBody')}</strong>
        </div>
        <div className="sk-m2w-qcard sk-m2w-qcard--info">
          <span className="sk-m2w-info-eyebrow">{t('m2.med.block')}</span>
          <strong>{t('m2.med.blockBody')}</strong>
        </div>
      </section>

      <div className="sk-m2w-bento sk-m2w-bento--cats">
        <div className="sk-m2w-generics sk-m2w-rise" style={rise(3)}>
          <GradientHeroCard
            testID="m2w-generics"
            stops={heroStops('green')}
            chipFill={SERVICE_HUES.green.end}
            eyebrow={t('m2.med.genericsEyebrow')}
            title={t('m2.med.genericsTitle')}
            body={t('m2.home.s2.body')}
            cta={{ label: t('m2.med.genericsCta'), ink: SERVICE_HUES.green.end }}
            icon="plus-slash"
            onPress={() => onFilter({ category: 'medicines' })}
            label={`${t('m2.med.genericsTitle')}. ${t('m2.med.genericsCta')}`}
          />
        </div>
        <section className="sk-m2w-panel sk-m2w-cats sk-m2w-rise" style={rise(4)} aria-labelledby="sk-m2w-cats-title">
          <h2 id="sk-m2w-cats-title" className="sk-m2w-h2">{t('m2.med.cats')}</h2>
          <ul className="sk-m2w-softgrid">
            {MEDICINE_CATEGORIES.map((c) => (
              <li key={c.key}>
                <button type="button" className="sk-m2w-softtile sk-m2w-lift" onClick={() => onFilter(c.filter)}>
                  <span className={`sk-m2w-soft sk-m2w-soft--md${c.neutral ? ' is-neutral' : ''}`} style={hueStyle(c.hue)} aria-hidden="true"><Icon name={c.icon} size={24} /></span>
                  <span>{t(c.label)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {signedIn ? (
        <div className="sk-m2w-links sk-m2w-rise" style={rise(5)}>
          <button type="button" className="sk-m2w-linkcard sk-m2w-lift" onClick={() => navigate('your-care')}>
            <SoftIcon icon="refresh" hue="indigo" />
            <span><strong>{t('m2.med.refills')}</strong><small>{t('m2.med.refillsBody')}</small></span>
            <Icon name="chevron-right" size={18} color="var(--sk-color-text-3)" />
          </button>
          <button type="button" className="sk-m2w-linkcard sk-m2w-lift" onClick={() => navigate('rewards')} data-testid="m2w-points">
            <SoftIcon icon="star" hue="amber" />
            <span>
              <strong>{points.data ? t('phone.shop.points', { count: points.data.balance }) : t('phone.shop.pointsTitle')}</strong>
              <small>{points.error ? t('phone.shop.pointsUnavailable') : t('phone.shop.pointsNote')}</small>
            </span>
            <Icon name="chevron-right" size={18} color="var(--sk-color-text-3)" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** "Generic or branded: what is the same?" (M2Medicines), as a real table. */
export function GenericsTable() {
  const t = useT();
  return (
    <section className="sk-m2w-panel sk-m2w-compare sk-m2w-rise" style={rise(2)} aria-labelledby="sk-m2w-compare-title">
      <h2 id="sk-m2w-compare-title" className="sk-m2w-h3">{t('m2.med.cmpTitle')}</h2>
      <table>
        <thead>
          <tr><td /><th scope="col" className="is-generic">{t('m2.med.cmpGeneric')}</th><th scope="col">{t('m2.med.cmpBranded')}</th></tr>
        </thead>
        <tbody>
          {COMPARE.map((row) => (
            <tr key={row.key}><th scope="row">{t(row.label)}</th><td className="is-generic">{t(row.generic)}</td><td>{t(row.branded)}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="sk-m2w-meta">{t('m2.med.cmpNote')}</p>
    </section>
  );
}
