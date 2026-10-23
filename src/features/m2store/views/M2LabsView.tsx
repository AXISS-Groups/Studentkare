import React, { useEffect, useRef, useState } from 'react';
import { Animated, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedIllustration, Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { ErrorState, Rise, Skeleton, useReducedMotion } from '@/design-system';
import {
  cardLabel, Gradient, GradientHeroCard, LiftCard, M2Card, M2Header, M2SearchField, M2SectionHead, M2_NAV_CLEARANCE, NotYetTile, SERVICE_HUES, SoftIcon,
  heroStops, m2Text, tileStops, useAmbientMotion, useLift, useLoop, useOwnPhoneChrome,
} from '@/design-system/m2';
import type { PressState, ServiceHue } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, motion, radius, shadow, shadowStyle, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { money } from '@/data/types/workflowTypes';
import type { LabPackage } from '@/features/labBooking/data/LabBookingRepository';
import { labArt } from '../data/storeArt';
import { orderLinePhone } from '../data/orderLine';
import { biggestPackage, matchPackages } from '../data/useLabPackages';
import type { LabsPhase } from '../data/useLabPackages';

/**
 * Mobile 2.0 Lab tests (canvas page 9 M2Labs, Tier 2; replaces LabPackages on
 * the phone). The bookable tests from the catalogue, with booking through the
 * existing lab booking flow (slot, address, pay).
 *
 * Rule L: no personal health data here; the doctor-ordered repeat test and
 * past bookings live on My health. Left out, with no backend: "Most booked on
 * campus", the audience tabs (Women · Men · Fitness · By concern: packages
 * carry no audience) and "Book again" (it would list the student's own tests).
 * "Call to book" is not available until an order line is configured.
 */
export interface M2LabsLinks {
  back: () => void;
  /** My reports (the vault). */
  reports: () => void;
  /** Upload a prescription. */
  rx: () => void;
  /** Open the booking flow for one package. */
  book: (pkg: LabPackage) => void;
}

export interface M2LabsViewProps {
  links: M2LabsLinks;
  phase: LabsPhase;
  packages: readonly LabPackage[];
  retry: () => void;
  /** The student's hostel block, for "Sample collected at …" ('' when not set). */
  block: string;
}

const STEPS: readonly MessageKey[] = ['m2.labs.step1', 'm2.labs.step2', 'm2.labs.step3', 'm2.labs.step4'];

function packageMeta(p: LabPackage, t: ReturnType<typeof useT>): string {
  const tests = t(p.includes.length === 1 ? 'm2.labs.testsOne' : 'm2.labs.tests', { count: p.includes.length });
  const fasting = p.fastingHours > 0 ? t('m2.labs.fasting', { hours: p.fastingHours }) : t('m2.labs.noFasting');
  return `${tests} · ${fasting}`;
}

function TestTube() {
  const ambient = useAmbientMotion();
  const rise = useLoop(ambient, motion.duration.ambient / 2);
  const rise2 = useLoop(ambient, motion.duration.ambient / 2, motion.duration.base * 2);
  const bubble = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -46] }) }],
  });
  return (
    <View pointerEvents="none" style={styles.tube}>
      <View style={styles.tubeFill} />
      {ambient ? <Animated.View style={[styles.bubble, styles.bubbleA, bubble(rise)]} /> : null}
      {ambient ? <Animated.View style={[styles.bubble, styles.bubbleB, bubble(rise2)]} /> : null}
    </View>
  );
}

function QuickTile({ icon, hue, label, onPress, testID }: { icon: SkIconName; hue: ServiceHue; label: string; onPress: () => void; testID: string }) {
  return (
    <LiftCard label={label} onPress={onPress} testID={testID} style={styles.quick}>
      <Gradient colors={tileStops(hue)} gloss style={styles.quickTile}><Icon name={icon} size={22} color={color.onHero} /></Gradient>
      <Text style={styles.quickText}>{label}</Text>
    </LiftCard>
  );
}

/** The collection steps with the line that fills across them once (full at once under reduced motion). */
function Steps() {
  const t = useT();
  const reduced = useReducedMotion();
  const fill = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) { fill.setValue(1); return undefined; }
    const anim = Animated.timing(fill, { toValue: 1, duration: motion.duration.sheet * 5, delay: motion.duration.base, useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [reduced, fill]);
  const width = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '76%'] });
  return (
    <M2Card style={styles.how} testID="m2-labs-how">
      <M2SectionHead title={t('m2.labs.how')} />
      <View style={styles.steps}>
        <View pointerEvents="none" style={styles.track} />
        <Animated.View pointerEvents="none" style={[styles.trackFill, { width }]} />
        {STEPS.map((key, i) => (
          <View key={key} style={styles.step}>
            <Gradient colors={heroStops('violet')} style={styles.stepNo}><Text style={styles.stepNoText}>{i + 1}</Text></Gradient>
            <Text style={styles.stepText}>{t(key)}</Text>
          </View>
        ))}
      </View>
    </M2Card>
  );
}

export function M2LabsView({ links, phase, packages, retry, block }: M2LabsViewProps): React.ReactElement {
  const t = useT();
  useOwnPhoneChrome();
  const lift = useLift();
  const [query, setQuery] = useState('');
  const phone = orderLinePhone();
  const featured = biggestPackage(packages);
  const shown = matchPackages(packages, query);

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-labs">
        <Gradient colors={[SERVICE_HUES.violet.soft, color.canvas]} radial={{ x: 0.5, y: 0.5 }} style={styles.glow} pointerEvents="none" />
        <Rise>
          <M2Header backLabel={t('m2.backHome')} onBack={links.back} title={t('m2.labs.title')}
            eyebrow={block ? t('m2.labs.collectedAt', { block }) : t('m2.labs.collectedHostel')}
            trailing={(
              <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.labs.myReports')} aria-label={t('m2.labs.myReports')} onPress={links.reports}
                testID="m2-labs-reports" style={({ focused }: PressState) => [styles.reportsPill, focused ? focusRing : null]}>
                <Text style={styles.reportsText}>{t('m2.labs.myReports')}</Text>
              </Pressable>
            )} />
        </Rise>

        <Rise index={1} style={styles.gutter}>
          <M2SearchField placeholder={t('m2.labs.search')} label={t('m2.labs.searchLabel')} value={query} onChangeText={setQuery} testID="m2-labs-search" />
        </Rise>

        <Rise index={2} style={[styles.gutter, styles.quickRow]}>
          {featured ? <QuickTile icon="person-badge" hue="violet" label={t('m2.labs.fullBody')} onPress={() => links.book(featured)} testID="m2-labs-full-body" /> : null}
          <QuickTile icon="doc-upload" hue="indigo" label={t('m2.labs.uploadRx')} onPress={links.rx} testID="m2-labs-rx" />
          {phone ? (
            <QuickTile icon="phone" hue="blue" label={t('m2.labs.call')} onPress={() => void Linking.openURL(`tel:${phone}`)} testID="m2-labs-call" />
          ) : (
            <NotYetTile icon="phone" title={t('m2.labs.call')} note={t('m2.notYet')} style={styles.quickMuted} centred testID="m2-labs-call-unavailable" />
          )}
          <QuickTile icon="chart-line-axes" hue="green" label={t('m2.labs.reports')} onPress={links.reports} testID="m2-labs-reports-tile" />
        </Rise>

        {featured ? (
          <Rise index={3} style={styles.gutter}>
            <GradientHeroCard
              testID="m2-labs-hero"
              stops={heroStops('violet')}
              chipFill={SERVICE_HUES.violet.end}
              eyebrow={t('m2.labs.heroEyebrow')}
              title={featured.name}
              body={t('m2.labs.heroMeta', { meta: packageMeta(featured, t), hours: featured.reportHours })}
              aside={money(featured.pricePaise)}
              cta={{ label: t('m2.labs.bookSlot'), ink: SERVICE_HUES.violet.end }}
              art={<TestTube />}
              height={196}
              onPress={() => links.book(featured)}
              label={`${featured.name}, ${money(featured.pricePaise)}. ${t('m2.labs.bookSlot')}`}
            />
          </Rise>
        ) : null}

        <Rise index={4} style={styles.gutter}>
          <M2SectionHead title={t('m2.labs.packages')} />
          {phase === 'loading' ? <Skeleton label={t('m2.labs.loading')} lines={['100%', '100%', '100%']} /> : null}
          {phase === 'error' ? <ErrorState title={t('m2.labs.failedTitle')} body={t('m2.labs.failedBody')} retryLabel={t('common.tryAgain')} onRetry={retry} /> : null}
          {phase === 'ready' && packages.length === 0 ? (
            <View style={styles.emptyArt} testID="m2-labs-empty">
              <AnimatedIllustration name="scene-lab-workers" size="sm" />
              <Text style={m2Text.body}>{t('m2.labs.empty')}</Text>
            </View>
          ) : null}
          {phase === 'ready' && packages.length > 0 && shown.length === 0 ? <Text style={m2Text.body} testID="m2-labs-no-match">{t('m2.labs.noMatch', { query: query.trim() })}</Text> : null}
          <View style={styles.list}>
            {shown.map((p) => {
              const art = labArt(p.name);
              return (
                <Pressable key={p.id} role="link" accessibilityRole="link" {...cardLabel(`${p.name}, ${packageMeta(p, t)}, ${money(p.pricePaise)}. ${t('m2.labs.book')}`)}
                  onPress={() => links.book(p)} testID={`m2-labs-pkg-${p.id}`} style={(state: PressState) => [styles.row, lift(state)]}>
                  <SoftIcon icon={art.icon} hue={art.hue} tile={46} iconSize={22} />
                  <View style={styles.grow}>
                    <Text style={m2Text.cardTitle}>{p.name}</Text>
                    <Text style={m2Text.meta}>{packageMeta(p, t)}</Text>
                  </View>
                  <View style={styles.rowEnd}>
                    <Text style={m2Text.price}>{money(p.pricePaise)}</Text>
                    <Text style={styles.rowBook}>{t('m2.labs.book')}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Rise>

        <Rise index={5} style={styles.gutter}><Steps /></Rise>

        <Rise index={6} style={styles.gutter}>
          <View style={styles.note}><Text style={m2Text.body}>{t('m2.labs.note')}</Text></View>
        </Rise>

        {phone ? (
          <View style={[styles.gutter, styles.callRow]}>
            <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.callBookSpoken', { number: phone })} aria-label={t('m2.callBookSpoken', { number: phone })}
              onPress={() => void Linking.openURL(`tel:${phone}`)} testID="m2-labs-call-fab" style={({ focused }: PressState) => [styles.call, focused ? focusRing : null]}>
              <Gradient colors={heroStops('violet')} style={styles.callIcon}><Icon name="phone" size={15} color={color.onHero} strokeWidth={2.4} /></Gradient>
              <Text style={styles.callText}>{t('m2.labs.call')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyArt: { alignItems: 'center', gap: space.s12 },
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', top: -140, right: -110, width: 330, height: 330, borderRadius: radius.full },
  gutter: { paddingHorizontal: space.gutterPhone },
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  reportsPill: { minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, justifyContent: 'center', backgroundColor: color.surface, ...shadowStyle(shadow.hairline) },
  reportsText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  quickRow: { flexDirection: 'row', gap: space.s10 },
  quick: { flex: 1, minWidth: 0, borderRadius: radius.xl, paddingVertical: space.s12, paddingHorizontal: space.s6, alignItems: 'center', gap: space.s8, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  quickMuted: { flex: 1, minWidth: 0, borderRadius: radius.xl, paddingVertical: space.s12, paddingHorizontal: space.s6, gap: space.s6 },
  quickTile: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  quickText: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption + space.s2, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center' },
  tube: {
    position: 'absolute', right: 28, top: 34, width: 54, height: 86, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md,
    borderBottomLeftRadius: 27, borderBottomRightRadius: 27, borderWidth: 3, borderColor: color.onHero2, overflow: 'hidden',
  },
  tubeFill: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '46%', backgroundColor: color.serviceRose },
  bubble: { position: 'absolute', borderRadius: radius.full, backgroundColor: color.onHero },
  bubbleA: { left: 14, bottom: 10, width: 8, height: 8 },
  bubbleB: { left: 28, bottom: 6, width: 6, height: 6 },
  list: { gap: space.s10 },
  row: { borderRadius: 22, padding: space.s14, flexDirection: 'row', alignItems: 'center', gap: space.s12, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  rowEnd: { alignItems: 'flex-end', gap: space.s4 },
  rowBook: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  how: { borderRadius: 26, padding: space.s16 },
  steps: { flexDirection: 'row', gap: space.s6 },
  track: { position: 'absolute', left: '12%', right: '12%', top: 19, height: 3, borderRadius: radius.full, backgroundColor: color.surface3 },
  trackFill: { position: 'absolute', left: '12%', top: 19, height: 3, borderRadius: radius.full, backgroundColor: color.serviceVioletDeep },
  step: { flex: 1, alignItems: 'center', gap: space.s8 },
  stepNo: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: color.surface },
  stepNoText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  stepText: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption + space.s2, fontWeight: fontWeight(font.weight.strong), color: color.text, textAlign: 'center' },
  note: { borderRadius: 18, paddingVertical: space.s12, paddingHorizontal: space.s14, backgroundColor: color.surface2 },
  callRow: { alignItems: 'flex-end' },
  call: { minHeight: 48, paddingLeft: space.s12, paddingRight: space.s16, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: space.s8, backgroundColor: color.surface, ...shadowStyle(shadow.float) },
  callIcon: { width: 30, height: 30, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  callText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.serviceVioletInk },
});

