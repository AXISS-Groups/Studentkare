import React from 'react';
import { Animated, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { EmptyState, ErrorState, Rise, Skeleton } from '@/design-system';
import {
  Gradient, LiftCard, M2Card, M2Heading, M2_NAV_CLEARANCE, RoundButton, SERVICE_HUES, floatTransform, heroStops, m2Text, useAmbientMotion, useLoop, useOwnPhoneChrome,
  M2HeaderSos,
  M2WideColumn,
} from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, motion, radius, size, space, webOnly } from '@/design-system/theme';
import { useT } from '@/i18n';
import { rupees, shortDate } from '@/features/phoneboards/format';
import { TileIcon } from '@/features/m2health/HealthParts';
import type { VaccineOffering } from '../models';
import { badgeOf } from '../viewmodel/VaccinesViewModel';
import type { VaccinesViewModel } from '../viewmodel/VaccinesViewModel';

/**
 * Mobile 2.0 Vaccines (canvas page 9 M2Vaccines), the booking half (Tier 2
 * content on a Tier 1 board; plan package A, approved by Krishna Chintakayala
 * 2026-10-21). See VaccinesViewModel for what is left out and why. The old
 * Preventive care board's links stay: the campus camp and the full preventive
 * tools (search by pincode, report reviews, reminders).
 */
export interface M2VaccinesLinks {
  back: () => void;
  /** My health, where "Your vaccine record" lives (D-M2-3). */
  myHealth: () => void;
  camp?: () => void;
  more?: () => void;
}

const AMBER = SERVICE_HUES.amber;

function Art() {
  const ambient = useAmbientMotion();
  const float = useLoop(ambient, motion.duration.ambient);
  return (
    <Animated.View pointerEvents="none" style={[styles.art, { transform: floatTransform(float, space.s8) }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Icon name="syringe" size={54} color={color.onHero} strokeWidth={1.6} />
    </Animated.View>
  );
}

function Offering({ o }: { o: VaccineOffering }) {
  const t = useT();
  const confirmed = o.availability === 'CONFIRMED';
  const checked = o.lastVerifiedAt ? t('m2.vac.checked', { date: shortDate(o.lastVerifiedAt) }) : '';
  const url = o.bookingUrl ?? o.sourceUrl;
  return (
    <View style={styles.offering} testID={`m2-vac-offer-${o.id}`}>
      <View style={styles.offerHead}>
        <View style={styles.grow}>
          <Text style={m2Text.cardTitle}>{o.providerName}</Text>
          {o.region ? <Text style={m2Text.meta}>{o.region}</Text> : null}
        </View>
        <Text style={styles.price}>{o.pricePaise === null ? t('m2.vac.noPrice') : rupees(o.pricePaise)}</Text>
      </View>
      <View style={styles.availability}>
        {confirmed ? <Icon name="check" size={14} color={color.positive} strokeWidth={2.8} /> : null}
        <Text style={[styles.availText, confirmed ? styles.availOn : null]}>{[confirmed ? t('pb.prev.available') : t('pb.prev.checkFirst'), checked].filter(Boolean).join(' · ')}</Text>
      </View>
      {url ? (
        <Text accessibilityRole="link" onPress={() => void Linking.openURL(url)} style={[m2Text.link, styles.offerLink]}>
          {o.bookingUrl ? t('pb.prev.book') : t('pb.prev.source')}
        </Text>
      ) : null}
    </View>
  );
}

export const M2VaccinesView = observer(function M2VaccinesView({ vm, links, wide = false }: { vm: VaccinesViewModel; links: M2VaccinesLinks; /** Laid out wide in the desktop web shell (parity phase 2). */ wide?: boolean }) {
  const t = useT();
  useOwnPhoneChrome();
  const res = vm.offerings;
  const selected = vm.selected;
  // Wide, the shell's page column gives the gutter (parity phase 2).
  const gutter = wide ? undefined : styles.gutter;
  const board = (
    <>
      <Rise>
        <Gradient colors={heroStops('amber')} angle={160} style={[styles.hero, wide ? styles.heroWide : null]}>
          <View pointerEvents="none" style={styles.heroRing} />
          <View style={styles.heroHead}>
            <RoundButton icon="arrow-left" label={t('m2.backHome')} onPress={links.back} onHero testID="m2-vac-back" />
            <Text style={styles.heroEyebrow}>{t('m2.vac.eyebrow')}</Text>
            <M2HeaderSos push />
          </View>
          <Art />
          <M2Heading level={1} style={styles.heroTitle}>{t('m2.vac.title')}</M2Heading>
          <Text style={styles.heroBody}>{t('m2.vac.body')}</Text>
        </Gradient>
      </Rise>

      <Rise index={1} style={gutter}>
        <LiftCard label={`${t('m2.vac.record')}. ${t('m2.vac.recordBody')}`} onPress={links.myHealth} testID="m2-vac-record" style={styles.record}>
          <TileIcon icon="heart-3" fill={color.serviceRoseSoft} ink={color.serviceRoseInk} />
          <View style={styles.grow}>
            <Text style={m2Text.cardTitle}>{t('m2.vac.record')}</Text>
            <Text style={m2Text.meta}>{t('m2.vac.recordBody')}</Text>
          </View>
          <Icon name="chevron-right" size={16} color={color.text3} strokeWidth={2.4} />
        </LiftCard>
      </Rise>

      <Rise index={2}>
        <M2Heading style={[m2Text.section, styles.gutter, styles.sectionTitle]}>{t('m2.vac.book')}</M2Heading>
        <View style={gutter}>
          {res.phase === 'loading' ? <Skeleton label={t('pb.prev.loading')} lines={['100%', '80%', '100%']} /> : null}
          {res.phase === 'error' ? <ErrorState title={t('pb.prev.failedTitle')} body={t('pb.yc.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void res.load()} /> : null}
          {res.phase === 'ready' && vm.names.length === 0 ? <EmptyState title={t('m2.vac.emptyTitle')} body={t('pb.prev.emptyBody')} /> : null}
        </View>
        {vm.names.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} testID="m2-vac-picker">
            <View role="tablist" accessibilityRole="tablist" accessibilityLabel={t('m2.vac.book')} aria-label={t('m2.vac.book')} style={styles.tabs}>
              {vm.names.map((name) => {
                const on = name === selected;
                return (
                  <Pressable key={name} role="tab" accessibilityRole="tab" aria-selected={on} accessibilityState={{ selected: on }} accessibilityLabel={name} aria-label={name}
                    onPress={() => vm.pick(name)} testID={`m2-vac-pick-${badgeOf(name)}`}
                    style={({ focused }: PressState) => [styles.pick, on ? styles.pickOn : null, focused ? focusRing : null]}>
                    {on ? (
                      <Gradient colors={heroStops('amber')} style={styles.badge}><Text style={[styles.badgeText, styles.badgeTextOn]}>{badgeOf(name)}</Text></Gradient>
                    ) : (
                      <View style={[styles.badge, { backgroundColor: AMBER.soft }]}><Text style={[styles.badgeText, { color: AMBER.ink }]}>{badgeOf(name)}</Text></View>
                    )}
                    <Text style={[styles.pickText, on ? styles.pickTextOn : null]}>{name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : null}
        {selected ? (
          <View style={gutter}>
            <M2Card style={styles.detail} testID="m2-vac-detail">
              <M2Heading style={styles.detailTitle}>{selected}</M2Heading>
              <Text style={m2Text.meta}>{t('m2.vac.atClinic')}</Text>
              <View aria-live="polite">
                {vm.selectedOfferings.map((o) => <Offering key={o.id} o={o} />)}
              </View>
              <View style={styles.slotRow}>
                <Text style={[m2Text.meta, styles.grow]} testID="m2-vac-slot-reason">{t('m2.vac.slotReason')}</Text>
                <View role="button" accessibilityRole="button" aria-disabled accessibilityState={{ disabled: true }} accessibilityLabel={`${t('m2.vac.pickSlot')}, ${t('m2.notYet')}`}
                  aria-label={`${t('m2.vac.pickSlot')}, ${t('m2.notYet')}`} style={styles.slot} testID="m2-vac-slot">
                  <Text style={styles.slotText}>{t('m2.vac.pickSlot')}</Text>
                </View>
              </View>
            </M2Card>
          </View>
        ) : null}
      </Rise>

      <Rise index={3} style={gutter}>
        <Text style={[m2Text.meta, styles.privacy]}>{t('pb.prev.privacy')}</Text>
        {links.camp ? (
          <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('pb.prev.camp')} aria-label={t('pb.prev.camp')} onPress={links.camp} testID="m2-vac-camp"
            style={({ focused }: PressState) => [styles.textLink, focused ? focusRing : null]}>
            <Text style={m2Text.link}>{t('pb.prev.camp')}</Text>
          </Pressable>
        ) : null}
        {links.more ? (
          <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('pb.prev.more')} aria-label={t('pb.prev.more')} onPress={links.more} testID="m2-vac-more"
            style={({ focused }: PressState) => [styles.textLink, focused ? focusRing : null]}>
            <Text style={m2Text.link}>{t('pb.prev.more')}</Text>
          </Pressable>
        ) : null}
      </Rise>
    </>
  );
  if (wide) return <M2WideColumn testID="m2-vaccines">{board}</M2WideColumn>;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-vaccines">{board}</ScrollView>;
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center', overflow: 'hidden' },
  gutter: { paddingHorizontal: space.gutterPhone },
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  heroWide: { borderRadius: 36, paddingHorizontal: space.s32 },
  hero: { paddingTop: space.s16, paddingHorizontal: space.gutterPhone, paddingBottom: space.s24, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden' },
  heroRing: { position: 'absolute', left: -60, bottom: -90, width: 240, height: 240, borderRadius: radius.full, borderWidth: 30, borderColor: color.onHeroRule },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  heroEyebrow: { fontFamily: font.family.sans, fontSize: 13, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  art: { position: 'absolute', right: 18, top: 72, width: 96, height: 96, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil },
  heroTitle: { marginTop: space.s16, maxWidth: 230, fontFamily: font.family.sans, fontSize: 27, lineHeight: 32, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.8, color: color.onHero },
  heroBody: { marginTop: space.s6, maxWidth: 230, fontFamily: font.family.sans, fontSize: 13.5, lineHeight: 20, fontWeight: fontWeight(font.weight.strong), color: color.onHero },
  record: { borderRadius: 26, padding: space.s16, flexDirection: 'row', alignItems: 'center', gap: space.s12, backgroundColor: color.surface },
  sectionTitle: { marginBottom: space.s12 },
  rail: { paddingHorizontal: space.gutterPhone, paddingBottom: space.s6 },
  tabs: { flexDirection: 'row', gap: space.s10 },
  pick: {
    minHeight: 46, paddingLeft: space.s6, paddingRight: space.s14, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: space.s8,
    borderWidth: 1.5, borderColor: color.rule, backgroundColor: color.surface,
    ...webOnly({ transitionProperty: 'background-color, border-color', transitionDuration: `${motion.duration.fast}ms` }),
  },
  pickOn: { borderColor: color.text, backgroundColor: color.text },
  badge: { width: 34, height: 34, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: font.family.sans, fontSize: 11, fontWeight: fontWeight(font.weight.heavy) },
  badgeTextOn: { color: color.onHero },
  pickText: { fontFamily: font.family.sans, fontSize: 13, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  pickTextOn: { color: color.canvas },
  detail: { marginTop: space.s12, borderRadius: 26, padding: space.s16, gap: space.s6 },
  detailTitle: { fontFamily: font.family.sans, fontSize: 19, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.4, color: color.text },
  offering: { paddingVertical: space.s12, gap: space.s4, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  offerHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12 },
  price: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text, fontVariant: ['tabular-nums'] },
  availability: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  availText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  availOn: { color: color.positive },
  offerLink: { minHeight: size.touchTarget, paddingTop: space.s12 },
  slotRow: { marginTop: space.s8, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  slot: { minHeight: 48, paddingHorizontal: space.s20, borderRadius: radius.full, justifyContent: 'center', backgroundColor: color.neutralBg },
  slotText: { fontFamily: font.family.sans, fontSize: 14, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  privacy: { lineHeight: 17 },
  textLink: { minHeight: size.touchTarget, justifyContent: 'center' },
});
