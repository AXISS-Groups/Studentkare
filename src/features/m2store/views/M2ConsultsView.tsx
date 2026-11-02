import React, { useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { AnimatedIllustration, Icon } from '@/design-system/icons';
import { CrisisLinks, ErrorState, Rise, Skeleton } from '@/design-system';
import {
  Gradient, LiftCard, M2Card, M2Heading, M2SectionHead, M2_NAV_CLEARANCE, NotYetTile, RoundButton, SERVICE_HUES, SoftIcon, floatTransform, heroStops,
  m2Text, useAmbientMotion, useLift, useLoop, useOwnPhoneChrome,
  M2HeaderSos, M2Grid, M2WideColumn,
} from '@/design-system/m2';
import type { PressState, ServiceHue } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, motion, radius, shadow, shadowStyle, size, space, webOnly } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { money } from '@/data/types/workflowTypes';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { getSetting } from '@/data/services/config';
import { clockLabel, dayLabel, isToday } from '@/features/phoneboards/format';
import { initials } from './M2HomeView';
import type { ConsultOption, ConsultsViewModel } from '../viewmodel/ConsultsViewModel';

/**
 * Mobile 2.0 Doctor consults (canvas page 9 M2Consults, Tier 2; replaces
 * DoctorResults on the phone). The consultations in the catalogue, each with
 * its next open slot, and booking through the existing appointment flow.
 *
 * Tier 1 part: picking Stress or anxiety, Sleep trouble or Low mood shows the
 * counsellor note with the reviewed crisis lines (CrisisLinks: 112 and
 * Tele-MANAS; numbers never live in copy).
 *
 * Honest gaps: "doctors online" became the number of consultations with a
 * slot today; audio and chat are not verified, so the board says video;
 * "Free follow-up" is shown as not available yet; registration numbers, years
 * and languages are not in the catalogue and are left out; the concern chips
 * do not match a doctor (no backend), so the line under them does not say so.
 */
export interface M2ConsultsLinks {
  back: () => void;
  /** Book this consultation (the booking flow, this service picked). */
  book: (service: LiveCatalogItem) => void;
  /** Student Plus: what it includes and its price (left out where there is no plan screen). */
  plus?: () => void;
}

const CHIPS: readonly { key: string; label: MessageKey; mind?: boolean }[] = [
  { key: 'fever', label: 'm2.doc.chip.fever' },
  { key: 'cold', label: 'm2.doc.chip.cold' },
  { key: 'stomach', label: 'm2.doc.chip.stomach' },
  { key: 'headache', label: 'm2.doc.chip.headache' },
  { key: 'skin', label: 'm2.doc.chip.skin' },
  { key: 'hair', label: 'm2.doc.chip.hair' },
  { key: 'period', label: 'm2.doc.chip.period' },
  { key: 'sexual', label: 'm2.doc.chip.sexual' },
  { key: 'sports', label: 'm2.doc.chip.sports' },
  { key: 'stress', label: 'm2.doc.chip.stress', mind: true },
  { key: 'sleep', label: 'm2.doc.chip.sleep', mind: true },
  { key: 'mood', label: 'm2.doc.chip.mood', mind: true },
];

const FAQ: readonly { key: string; q: MessageKey; a: MessageKey }[] = [
  { key: 'soon', q: 'm2.doc.faq1q', a: 'm2.doc.faq1a' },
  { key: 'private', q: 'm2.doc.faq2q', a: 'm2.doc.faq2a' },
  { key: 'next', q: 'm2.doc.faq3q', a: 'm2.doc.faq3a' },
  { key: 'unhappy', q: 'm2.doc.faq4q', a: 'm2.doc.faq4a' },
];

const AVATAR_HUES: readonly ServiceHue[] = ['blue', 'rose', 'green', 'violet', 'amber', 'teal'];

function Wave() {
  const ambient = useAmbientMotion();
  const float = useLoop(ambient, motion.duration.ambient);
  const beat = useLoop(ambient, motion.duration.ambient / 4);
  const bars = [30, 42, 24, 36];
  return (
    <Animated.View pointerEvents="none" style={[styles.wave, { transform: floatTransform(float, space.s6) }]}>
      {bars.map((h, i) => (
        <Animated.View key={h} style={[styles.bar, { height: h }, ambient ? {
          transform: [{ scaleY: beat.interpolate({ inputRange: [0, 0.5, 1], outputRange: i % 2 ? [1, 0.4, 1] : [0.4, 1, 0.4] }) }],
        } : null]} />
      ))}
    </Animated.View>
  );
}

function LiveDot() {
  const ambient = useAmbientMotion();
  const pulse = useLoop(ambient, motion.duration.ambient / 2);
  return (
    <View style={styles.liveDotWrap}>
      {ambient ? <Animated.View style={[styles.liveRing, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }] }]} /> : null}
      <View style={styles.liveDot} />
    </View>
  );
}

function nextLine(option: ConsultOption, t: ReturnType<typeof useT>): string {
  if (option.next === undefined) return t('m2.doc.slotChecking');
  if (option.next === null) return t('m2.doc.noSlot');
  const at = option.next.slotStart;
  return isToday(at) ? t('m2.doc.freeAt', { time: clockLabel(at) }) : t('m2.doc.freeOn', { day: dayLabel(at, t), time: clockLabel(at) });
}

function DoctorCard({ option, index, onBook, wide = false }: { option: ConsultOption; index: number; onBook: () => void; wide?: boolean }) {
  const t = useT();
  const hue = SERVICE_HUES[AVATAR_HUES[index % AVATAR_HUES.length] ?? 'blue'];
  const who = option.service.brand || option.service.name;
  const line = nextLine(option, t);
  const label = `${who}, ${option.service.name}, ${t('m2.doc.from', { price: money(option.service.pricePaise) })}. ${line}. ${t('m2.doc.book')}`;
  const lift = useLift();
  return (
    <Pressable role="link" accessibilityRole="link" accessibilityLabel={label} aria-label={label} onPress={onBook} testID={`m2-doc-${option.service.id}`}
      style={(state: PressState) => [styles.doctor, wide ? styles.doctorWide : null, lift(state)]}>
      <View style={styles.doctorTop}>
        <View style={[styles.docAvatar, { backgroundColor: hue.soft }]}><Text style={[styles.docInitials, { color: hue.ink }]}>{initials(who.replace(/^dr\.?\s+/i, ''))}</Text></View>
        <View style={styles.grow}>
          <Text numberOfLines={1} style={m2Text.cardTitle}>{who}</Text>
          <Text numberOfLines={2} style={m2Text.meta}>{option.service.name}</Text>
        </View>
      </View>
      {option.service.pricePaise > 0 ? (
        <View style={styles.chipRow}><View style={styles.infoChip}><Text style={styles.infoChipText}>{t('m2.doc.from', { price: money(option.service.pricePaise) })}</Text></View></View>
      ) : null}
      <View style={styles.doctorFoot}>
        <Text style={[styles.free, option.next ? null : styles.noFree]}>{line}</Text>
        <View style={styles.bookBtn}><Text style={styles.bookText}>{t('m2.doc.book')}</Text></View>
      </View>
    </Pressable>
  );
}

export const M2ConsultsView = observer(function M2ConsultsView({ vm, links, wide = false }: { vm: ConsultsViewModel; links: M2ConsultsLinks; /** Laid out wide in the desktop web shell (parity phase 2). */ wide?: boolean }) {
  const t = useT();
  useOwnPhoneChrome();
  const [chip, setChip] = useState<string | null>(null);
  const [open, setOpen] = useState<number>(0);
  const soonest = vm.soonest;
  const from = vm.fromPaise;
  const mind = CHIPS.find((c) => c.key === chip)?.mind === true;
  const plusPrice = getSetting('billing.student_plus.monthly_inr');

  // Wide, the shell's page column gives the gutter.
  const gutter = wide ? undefined : styles.gutter;
  const board = (
    <>
      <Rise>
        <Gradient colors={heroStops('blue')} angle={160} style={[styles.hero, wide ? styles.heroWide : null]}>
          <View pointerEvents="none" style={styles.heroRing} />
          <View style={styles.heroHead}>
            <RoundButton icon="arrow-left" label={t('m2.backHome')} onPress={links.back} onHero testID="m2-doc-back" />
            <Text style={styles.heroEyebrow}>{t('m2.doc.eyebrow')}</Text>
            {vm.openToday > 0 ? (
              <View style={styles.live} testID="m2-doc-open-today"><LiveDot /><Text style={styles.liveText}>{t(vm.openToday === 1 ? 'm2.doc.openTodayOne' : 'm2.doc.openToday', { count: vm.openToday })}</Text></View>
            ) : null}
            <M2HeaderSos push />
          </View>
          <Wave />
          <M2Heading level={1} style={styles.heroTitle}>{t('m2.doc.title')}</M2Heading>
          <Text style={styles.heroBody}>{t('m2.doc.body')}</Text>
          {soonest ? (
            <Pressable role="link" accessibilityRole="link" testID="m2-doc-now" onPress={() => links.book(soonest.service)}
              accessibilityLabel={from !== null ? t('m2.doc.nowFrom', { price: money(from) }) : t('m2.doc.now')} aria-label={from !== null ? t('m2.doc.nowFrom', { price: money(from) }) : t('m2.doc.now')}
              style={({ focused }: PressState) => [styles.now, focused ? focusRing : null]}>
              <Text style={styles.nowText}>{from !== null ? t('m2.doc.nowFrom', { price: money(from) }) : t('m2.doc.now')}</Text>
              <Icon name="arrow-right" size={16} color={color.onHeroCurrent} strokeWidth={2.6} />
            </Pressable>
          ) : null}
        </Gradient>
      </Rise>

      <Rise index={1} style={[gutter, styles.row3]}>
        <M2Card style={styles.feature} testID="m2-doc-video">
          <SoftIcon icon="video-2" hue="blue" tile={34} iconSize={18} />
          <Text style={m2Text.cardTitle}>{t('m2.doc.video')}</Text>
        </M2Card>
        <NotYetTile icon="refresh" title={t('m2.doc.followUp')} note={t('m2.notYet')} style={styles.feature} testID="m2-doc-follow-up" />
        <M2Card style={styles.feature} testID="m2-doc-erx">
          <SoftIcon icon="file-check" hue="amber" tile={34} iconSize={18} />
          <Text style={m2Text.cardTitle}>{t('m2.doc.erx')}</Text>
        </M2Card>
      </Rise>

      {links.plus ? (
      <Rise index={2} style={gutter}>
        <LiftCard label={`${t('m2.doc.plus')}. ${t('m2.doc.plusBody', { price: plusPrice })}`} onPress={links.plus} testID="m2-doc-plus" style={styles.plus}>
          <Gradient colors={[color.serviceIndigo, color.brandNavy]} style={styles.plusIcon}><Icon name="shield" size={20} color={color.onHero} strokeWidth={2.1} /></Gradient>
          <View style={styles.grow}>
            <Text style={m2Text.cardTitle}>{t('m2.doc.plus')}</Text>
            <Text style={m2Text.meta}>{t('m2.doc.plusBody', { price: plusPrice })}</Text>
          </View>
          <Icon name="chevron-right" size={16} color={color.action} strokeWidth={2.6} />
        </LiftCard>
      </Rise>
      ) : null}

      <Rise index={3} style={gutter}>
        <M2Heading style={m2Text.section}>{t('m2.doc.concerns')}</M2Heading>
        <Text style={[m2Text.meta, styles.concernSub]}>{t('m2.doc.concernsSub')}</Text>
        <View style={styles.chips}>
          {CHIPS.map((c) => {
            const on = chip === c.key;
            return (
              <Pressable key={c.key} role="button" accessibilityRole="button" accessibilityLabel={t(c.label)} aria-label={t(c.label)} aria-pressed={on}
                accessibilityState={{ selected: on }} onPress={() => setChip(on ? null : c.key)} testID={`m2-doc-chip-${c.key}`}
                style={({ focused }: PressState) => [styles.chip, on ? styles.chipOn : null, focused ? focusRing : null]}>
                <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{t(c.label)}</Text>
              </Pressable>
            );
          })}
        </View>
        {mind ? (
          <Rise>
            <View style={styles.mind} testID="m2-doc-mind">
              <View style={styles.mindRow}>
                <Icon name="heart-3" size={20} color={color.positive} strokeWidth={2.1} />
                <Text style={styles.mindText}>{t('m2.doc.mindNote')}</Text>
              </View>
              <CrisisLinks titleKey="m2.doc.mindLines" testID="m2-doc-crisis" />
            </View>
          </Rise>
        ) : null}
      </Rise>

      <Rise index={4}>
        <View style={gutter}><M2SectionHead title={t('m2.doc.doctors')} /></View>
        <View style={gutter}>
          {vm.phase === 'loading' ? <Skeleton label={t('m2.doc.loading')} lines={['100%', '80%']} /> : null}
          {vm.phase === 'error' ? <ErrorState title={t('m2.doc.failedTitle')} body={t('m2.doc.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}
          {vm.phase === 'ready' && vm.options.length === 0 ? (
            <View style={styles.emptyArt} testID="m2-doc-empty">
              <AnimatedIllustration name="scene-medical-workers" size="sm" />
              <Text style={m2Text.body}>{t('m2.doc.empty')}</Text>
            </View>
          ) : null}
        </View>
        {vm.options.length > 0 && wide ? (
          <M2Grid columns={{ tablet: 2, desktop: 3 }} testID="m2-doc-rail">
            {vm.options.map((o, i) => <DoctorCard key={o.service.id} option={o} index={i} wide onBook={() => links.book(o.service)} />)}
          </M2Grid>
        ) : null}
        {vm.options.length > 0 && !wide ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} testID="m2-doc-rail">
            {vm.options.map((o, i) => <DoctorCard key={o.service.id} option={o} index={i} onBook={() => links.book(o.service)} />)}
          </ScrollView>
        ) : null}
      </Rise>

      <Rise index={5} style={gutter}>
        <M2Card style={styles.faq} testID="m2-doc-faq">
          <View style={styles.faqHead}><M2Heading style={m2Text.cardTitle}>{t('m2.doc.faq')}</M2Heading></View>
          {FAQ.map((f, i) => {
            const isOpen = open === i;
            return (
              <View key={f.key} style={styles.faqItem}>
                <Pressable role="button" accessibilityRole="button" accessibilityLabel={t(f.q)} aria-label={t(f.q)} aria-expanded={isOpen}
                  accessibilityState={{ expanded: isOpen }} onPress={() => setOpen(isOpen ? -1 : i)} testID={`m2-doc-faq-${f.key}`}
                  style={({ focused }: PressState) => [styles.faqQ, focused ? focusRing : null]}>
                  <Text style={styles.faqQText}>{t(f.q)}</Text>
                  <View style={[styles.chev, isOpen ? styles.chevOpen : null]}><Icon name="chevron-down" size={16} color={color.text} strokeWidth={2.4} /></View>
                </Pressable>
                {isOpen ? <Text style={[m2Text.body, styles.faqA]}>{t(f.a)}</Text> : null}
              </View>
            );
          })}
        </M2Card>
      </Rise>
    </>
  );
  if (wide) return <M2WideColumn testID="m2-consults">{board}</M2WideColumn>;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-consults">{board}</ScrollView>;
});

const styles = StyleSheet.create({
  emptyArt: { alignItems: 'center', gap: space.s12 },
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center', overflow: 'hidden' },
  gutter: { paddingHorizontal: space.gutterPhone },
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  heroWide: { borderRadius: 36, paddingHorizontal: space.s32 },
  hero: { paddingTop: space.s16, paddingHorizontal: space.gutterPhone, paddingBottom: space.s24, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden', gap: space.s6 },
  heroRing: { position: 'absolute', right: -70, top: 40, width: 230, height: 230, borderRadius: radius.full, borderWidth: 30, borderColor: color.onHeroRule },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: space.s12, marginBottom: space.s14 },
  heroEyebrow: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.onHero2 },
  live: { flexDirection: 'row', alignItems: 'center', gap: space.s6, paddingHorizontal: space.s10, paddingVertical: space.s6, borderRadius: radius.full, backgroundColor: color.onHeroVeil },
  liveText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  liveDotWrap: { width: 8, height: 8 },
  liveDot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: color.onHeroPositive },
  liveRing: { position: 'absolute', width: 8, height: 8, borderRadius: radius.full, backgroundColor: color.onHeroPositive },
  wave: {
    position: 'absolute', right: 22, top: 84, width: 86, height: 86, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space.s4, backgroundColor: color.onHeroVeil,
  },
  bar: { width: 5, borderRadius: radius.full, backgroundColor: color.onHero },
  heroTitle: { maxWidth: 250, fontFamily: font.family.sans, fontSize: font.size.heading, lineHeight: 32, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.8, color: color.onHero },
  heroBody: { maxWidth: 250, fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: 20, fontWeight: fontWeight(font.weight.strong), color: color.onHero2 },
  now: {
    marginTop: space.s14, minHeight: 52, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s8,
    backgroundColor: color.heroCurrent,
  },
  nowText: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.onHeroCurrent },
  row3: { flexDirection: 'row', gap: space.s10 },
  feature: { flex: 1, minWidth: 0, borderRadius: radius.xl, padding: space.s12, gap: space.s8 },
  plus: { borderRadius: 22, paddingVertical: space.s14, paddingHorizontal: space.s16, flexDirection: 'row', alignItems: 'center', gap: space.s12, backgroundColor: color.surface3 },
  plusIcon: { width: 42, height: 42, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  concernSub: { marginTop: space.s4, marginBottom: space.s12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  chip: {
    minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, justifyContent: 'center', borderWidth: 1.5, borderColor: color.rule,
    backgroundColor: color.surface, ...webOnly({ transitionProperty: 'background-color, color', transitionDuration: `${motion.duration.fast}ms` }),
  },
  chipOn: { borderColor: color.serviceBlueDeep, backgroundColor: color.serviceBlueDeep, ...shadowStyle(shadow.hairline) },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  chipTextOn: { color: color.onHero },
  mind: { marginTop: space.s12, padding: space.s14, borderRadius: radius.xl, gap: space.s12, backgroundColor: color.positiveBg },
  mindRow: { flexDirection: 'row', gap: space.s10 },
  mindText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: 19, fontWeight: fontWeight(font.weight.strong), color: color.positive },
  rail: { paddingHorizontal: space.gutterPhone, paddingBottom: space.s8, gap: space.s12 },
  doctorWide: { width: 'auto', flexGrow: 1 },
  doctor: { width: 250, borderRadius: 26, padding: space.s16, gap: space.s10, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  doctorTop: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  docAvatar: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  docInitials: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy) },
  chipRow: { flexDirection: 'row', gap: space.s6, flexWrap: 'wrap' },
  infoChip: { paddingHorizontal: space.s8, paddingVertical: space.s4, borderRadius: radius.full, backgroundColor: color.surface2 },
  infoChipText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  doctorFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s8 },
  free: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  noFree: { color: color.text3 },
  bookBtn: { minHeight: 36, paddingHorizontal: space.s14, borderRadius: radius.full, justifyContent: 'center', backgroundColor: color.action },
  bookText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  faq: { borderRadius: 26, overflow: 'hidden' },
  faqHead: { paddingHorizontal: space.s16, paddingTop: space.s16, paddingBottom: space.s4 },
  faqItem: { borderTopWidth: 1, borderTopColor: color.ruleSoft },
  faqQ: { minHeight: size.touchTarget, paddingHorizontal: space.s16, paddingVertical: space.s12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s12 },
  faqQText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  chev: webOnly({ transitionProperty: 'transform', transitionDuration: `${motion.duration.fast}ms` }),
  chevOpen: { transform: [{ rotate: '180deg' }] },
  faqA: { paddingHorizontal: space.s16, paddingBottom: space.s14 },
});
