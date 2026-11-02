import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { Rise } from '@/design-system';
import { CanvasVideo } from '@/design-system/art';
import {
  Gradient, GradientHeroCard, HeroCarousel, LiftCard, M2Card, M2Grid, M2ListRow, M2Responsive, M2SectionHead, NAVY_STOPS, NotYetTile, SERVICE_HUES,
  SoftTileGrid, heroStops, m2Text, webAttrs,
} from '@/design-system/m2';
import type { HeroSlide } from '@/design-system/m2';
import { color, font, fontWeight, radius, shadow, shadowStyle, space } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
import { navigate } from '@/lib/utils/workflowRouting';
import { MEDICINE_CATEGORIES } from '@/features/m2store/data/storeArt';
import type { ShopFilter } from '@/features/m2store/data/storeArt';
import { orderLinePhone } from '@/features/m2store/data/orderLine';
import { GenericsCompare } from '@/features/m2store/views/GenericsCompare';
import { packageMeta } from '@/features/m2store/views/M2LabsView';
import { biggestPackage, useLabPackages } from '@/features/m2store/data/useLabPackages';

/**
 * The top of /shop above phone width in the Mobile 2.0 language: the campus
 * shop banner (with the board's video), the highlights carousel, the ways to
 * order, the generics card, the category tiles, refills and Kare points. Every
 * card is the shared Mobile 2.0 component the phone board draws (M2Medicines),
 * laid out wider by `<M2Responsive>`; only the banner and the bento grid are
 * this page's own (webshop.css).
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

  const labs = useLabPackages();
  const lab = labs.phase === 'ready' ? biggestPackage(labs.items) : null;
  const slides: HeroSlide[] = [
    // A lab package the catalogue really lists (the biggest), never a made-up offer (founder, 23 Oct 2026).
    ...(lab ? [{ key: 'check', eyebrow: t('m2.labs.heroEyebrow'), title: lab.name, body: t('m2.labs.heroMeta', { meta: packageMeta(lab, t), hours: lab.reportHours }), cta: t('m2.labs.bookSlot'), icon: 'lab' as const, stops: NAVY_STOPS, chipFill: color.brandNavy, ink: color.onHeroCurrent, onPress: () => onFilter({ kind: 'lab' }) }] : []),
    { key: 'rx', eyebrow: t('m2w.rxSlide.eyebrow'), title: t('m2w.rxSlide.title'), body: t('m2w.rxSlide.body'), cta: t('m2w.rxSlide.cta'), icon: 'doc-upload', stops: heroStops('orange'), chipFill: SERVICE_HUES.orange.end, ink: SERVICE_HUES.orange.deep, onPress: () => navigate('prescriptions') },
    { key: 'report', eyebrow: t('m2.home.s3.eyebrow'), title: t('m2.home.s3.title'), body: t('m2.home.s3.body'), cta: t('m2.home.s3.cta'), icon: 'doc-upload', stops: heroStops('violet'), chipFill: SERVICE_HUES.violet.end, ink: SERVICE_HUES.violet.deep, onPress: () => navigate('health/report-upload') },
  ];

  return (
    <M2Responsive style={styles.front} testID="m2w-front">
      <div className="sk-m2w-bento">
        <div className="sk-m2w-bannercell">
        <Rise style={styles.grow}>
          <section className="sk-m2w-banner" aria-labelledby="sk-m2w-banner-title">
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
        </Rise>
        </div>
        <div className="sk-m2w-carousel">
          {/* Its own region: the cell is narrow beside the banner, so one card at a time even on a desktop. */}
          <M2Responsive>
            <Rise index={1}>
              <HeroCarousel label={t('m2w.highlights')} slides={slides} dotLabel={(n) => t('m2.home.dot', { n })} testID="m2w-carousel" />
            </Rise>
          </M2Responsive>
        </div>
      </div>

      {/* The ways to order, as on M2Medicines: the same cards, five a row here. */}
      <Rise index={2}>
        <View accessibilityLabel={t('m2w.quick')} aria-label={t('m2w.quick')} {...webAttrs({ role: 'group' })}>
          <M2Grid columns={{ phone: 2, tablet: 3, desktop: 5 }}>
            <LiftCard label={t('m2.med.rx')} onPress={() => navigate('prescriptions')} fill testID="m2w-rx" style={styles.quick}>
              <Gradient colors={NAVY_STOPS} style={styles.rxCard}>
                <Icon name="doc-upload" size={22} color={color.onHero} strokeWidth={2.1} />
                <Text style={styles.rxText}>{t('m2.med.rx')}</Text>
              </Gradient>
            </LiftCard>
            {phone ? (
              <LiftCard label={t('m2.callOrderSpoken', { number: phone })} onPress={() => void Linking.openURL(`tel:${phone}`)} fill testID="m2w-call" style={[styles.quick, styles.whiteCard]}>
                <Icon name="phone" size={22} color={color.action} strokeWidth={2.1} />
                <Text style={styles.quickText}>{t('m2.callOrder')}</Text>
              </LiftCard>
            ) : (
              <NotYetTile icon="phone" title={t('m2.callOrder')} note={t('m2.notYet')} fill style={styles.quick} testID="m2w-call-unavailable" />
            )}
            <NotYetTile icon="message-circle" title={t('m2.med.chat')} note={t('m2.soon')} fill style={styles.quick} testID="m2w-chat" />
            <M2Card fill style={[styles.quick, styles.info]} testID="m2w-pickup">
              <Text style={[styles.infoEyebrow, { color: color.positive }]}>{t('m2.med.pickup')}</Text>
              <Text style={m2Text.cardTitle}>{t('m2.med.pickupBody')}</Text>
            </M2Card>
            <M2Card fill style={[styles.quick, styles.info]} testID="m2w-block">
              <Text style={[styles.infoEyebrow, { color: color.action }]}>{t('m2.med.block')}</Text>
              <Text style={m2Text.cardTitle}>{t('m2.med.blockBody')}</Text>
            </M2Card>
          </M2Grid>
        </View>
      </Rise>

      <div className="sk-m2w-bento sk-m2w-bento--cats">
        <div className="sk-m2w-generics">
          <Rise index={3}>
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
            height={CATS_ROW}
          />
          </Rise>
        </div>
        <div className="sk-m2w-cats">
          <Rise index={4}>
            <M2Card style={styles.catsCard} testID="m2w-cats">
              <M2SectionHead title={t('m2.med.cats')} />
              <SoftTileGrid testID="m2w-cat" columns={6} items={MEDICINE_CATEGORIES.map((c) => ({ key: c.key, label: t(c.label), icon: c.icon, hue: c.hue, neutral: c.neutral, onPress: () => onFilter(c.filter) }))} />
            </M2Card>
          </Rise>
        </div>
      </div>

      {signedIn ? (
        <Rise index={5}>
          <M2Grid columns={{ phone: 1, tablet: 2, desktop: 2 }}>
            <M2ListRow icon="refresh" hue="indigo" title={t('m2.med.refills')} meta={t('m2.med.refillsBody')} onPress={() => navigate('your-care')} fill testID="m2w-refills" />
            <M2ListRow icon="star" hue="amber" fill testID="m2w-points"
              title={points.data ? t('phone.shop.points', { count: points.data.balance }) : t('phone.shop.pointsTitle')}
              meta={points.error ? t('phone.shop.pointsUnavailable') : t('phone.shop.pointsNote')} onPress={() => navigate('rewards')} />
          </M2Grid>
        </Rise>
      ) : null}
    </M2Responsive>
  );
}

/** "Generic or branded: what is the same?": the M2Medicines card, shared with the phone board. */
export function GenericsTable() {
  return (
    <Rise index={2}>
      <GenericsCompare testID="m2w-compare" />
    </Rise>
  );
}

/** The categories row's height: the generics card matches the categories card beside it. */
const CATS_ROW = 230;

const styles = StyleSheet.create({
  front: { gap: space.s20 },
  grow: { flexGrow: 1 },
  quick: { minHeight: 86, borderRadius: radius.xl },
  rxCard: { flex: 1, borderRadius: radius.xl, padding: space.s12, gap: space.s8 },
  rxText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm + space.s4, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  whiteCard: { padding: space.s12, gap: space.s8, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  quickText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm + space.s4, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  info: { padding: space.s12, justifyContent: 'space-between', gap: space.s6 },
  infoEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 0.8, textTransform: 'uppercase' },
  catsCard: { padding: space.s20, minHeight: CATS_ROW },
});
