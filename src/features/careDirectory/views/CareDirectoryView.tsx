import React from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { ErrorState, Rise, Skeleton } from '@/design-system';
import {
  Gradient, LiftCard, M2Card, M2Heading, M2SectionHead, M2_NAV_CLEARANCE, RoundButton, SERVICE_HUES, SosButton, floatTransform, heroStops, m2Text,
  useAmbientMotion, useLoop, useOwnPhoneChrome,
} from '@/design-system/m2';
import type { PressState, ServiceHue } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, motion, radius, shadow, shadowStyle, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { money } from '@/data/types/workflowTypes';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { clockLabel, dayLabel, isToday } from '@/features/phoneboards/format';
import { initials } from '@/features/m2store/views/M2HomeView';
import type { DirectorySegment } from '../model/types';
import { DIRECTORY_SEGMENTS } from '../model/types';
import type { CareDirectoryViewModel, Department, DoctorOption } from '../viewmodel/CareDirectoryViewModel';
import { EmergencyStrip, FacilityCard, LocationCard } from './careDirectoryParts';
import { FacilityDetailView } from './FacilityDetailView';

/**
 * Find care near you (M2FindCare; WebFindCare above phone width). Tier 2, with
 * the Tier 1 parts of docs/plans/tier1-care-directory-2026-10-21.md: the 112 /
 * 108 strip is pinned under the hero in every state, and the campus SOS stays
 * one tap away (the hero's SOS pill; the Ambulance tab's "Alert your campus").
 *
 * Honest data only: verified listings, catalogue consultations and their real
 * slots. No beds, ratings, reviews, wait times or "open now"; distance only
 * from the device's own position, while the student shares it. No map view
 * (see the brief): every place with coordinates has Directions instead.
 */
export interface FindCareLinks {
  /** Back to where the student came from; left out where there is nowhere to go back to. */
  back?: () => void;
  /** The campus SOS flow (students with a session). */
  sos?: () => void;
  /** Book this consultation (the existing booking flow). */
  book: (service: LiveCatalogItem) => void;
}

const SEGMENT_STYLE: Readonly<Record<DirectorySegment, { icon: SkIconName; label: MessageKey }>> = {
  hospitals: { icon: 'hospital', label: 'fc.tab.hospitals' },
  pharmacies: { icon: 'pill', label: 'fc.tab.pharmacies' },
  ambulance: { icon: 'ambulance', label: 'fc.tab.ambulance' },
  doctors: { icon: 'doctor', label: 'fc.tab.doctors' },
};

const EMPTY: Readonly<Record<DirectorySegment, { title: MessageKey; body: MessageKey }>> = {
  hospitals: { title: 'fc.empty.hospitals', body: 'fc.empty.hospitalsBody' },
  pharmacies: { title: 'fc.empty.pharmacies', body: 'fc.empty.pharmaciesBody' },
  ambulance: { title: 'fc.empty.ambulance', body: 'fc.empty.ambulanceBody' },
  doctors: { title: 'fc.empty.doctors', body: 'fc.empty.doctorsBody' },
};

const AVATAR_HUES: readonly ServiceHue[] = ['blue', 'rose', 'green', 'violet', 'amber', 'teal'];

function FloatingPin() {
  const ambient = useAmbientMotion();
  const float = useLoop(ambient, motion.duration.ambient);
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.pin, { transform: floatTransform(float, space.s8) }]}>
      <Icon name="map-pin-2" size={34} color={color.onHero} strokeWidth={1.9} />
    </Animated.View>
  );
}

function slotLine(option: DoctorOption, signedIn: boolean, t: ReturnType<typeof useT>): string | null {
  if (!signedIn) return null;
  if (option.next === undefined) return t('fc.doc.checking');
  if (option.next === null) return t('fc.doc.noSlot');
  const at = option.next.slotStart;
  return isToday(at) ? t('fc.doc.freeAt', { time: clockLabel(at) }) : t('fc.doc.freeOn', { day: dayLabel(at, t), time: clockLabel(at) });
}

function DoctorRow({ option, index, signedIn, onBook }: { option: DoctorOption; index: number; signedIn: boolean; onBook: () => void }) {
  const t = useT();
  const hue = SERVICE_HUES[AVATAR_HUES[index % AVATAR_HUES.length] ?? 'blue'];
  const who = option.service.brand || option.service.name;
  const slot = slotLine(option, signedIn, t);
  const cta = signedIn ? t('fc.doc.book') : t('fc.doc.signInToBook');
  const price = option.service.pricePaise > 0 ? t('fc.doc.from', { price: money(option.service.pricePaise) }) : null;
  const label = [who, option.service.name, price, slot, cta].filter(Boolean).join('. ');
  return (
    <LiftCard label={label} onPress={onBook} testID={`fc-doc-${option.service.id}`} style={styles.doctor}>
      <View style={[styles.avatar, { backgroundColor: hue.soft }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={[styles.avatarText, { color: hue.ink }]}>{initials(who.replace(/^dr\.?\s+/i, ''))}</Text>
      </View>
      <View style={styles.grow}>
        <Text numberOfLines={1} style={m2Text.cardTitle}>{who}</Text>
        <Text numberOfLines={2} style={m2Text.meta}>{option.service.name}</Text>
        {price ? <Text style={styles.price}>{price}</Text> : null}
        {slot ? (
          <View style={styles.slotRow}>
            <Icon name="clock" size={12} color={option.next ? color.positive : color.text3} strokeWidth={2.4} />
            <Text style={[styles.slot, option.next ? null : styles.noSlot]}>{slot}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.bookBtn}><Text style={styles.bookText}>{cta}</Text></View>
    </LiftCard>
  );
}

function DepartmentBlock({ department, signedIn, onBook }: { department: Department; signedIn: boolean; onBook: (service: LiveCatalogItem) => void }) {
  const t = useT();
  return (
    <View style={styles.department} testID={`fc-dept-${department.key}`}>
      <View style={styles.deptHead}>
        <View style={styles.deptIcon}><Icon name="stethoscope" size={16} color={SERVICE_HUES.blue.ink} strokeWidth={2.2} /></View>
        <M2Heading style={m2Text.cardTitle}>{t('fc.doc.department', { name: department.name, count: department.options.length })}</M2Heading>
      </View>
      {department.options.map((option, i) => (
        <DoctorRow key={option.service.id} option={option} index={i} signedIn={signedIn} onBook={() => onBook(option.service)} />
      ))}
    </View>
  );
}

const Tabs = observer(function Tabs({ vm }: { vm: CareDirectoryViewModel }) {
  const t = useT();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} role="tablist" accessibilityRole="tablist"
      aria-label={t('fc.tabsLabel')} accessibilityLabel={t('fc.tabsLabel')} testID="fc-tabs">
      {DIRECTORY_SEGMENTS.map((segment) => {
        const on = vm.segment === segment;
        const style = SEGMENT_STYLE[segment];
        return (
          <Pressable key={segment} role="tab" accessibilityRole="tab" aria-selected={on} accessibilityState={{ selected: on }}
            accessibilityLabel={t(style.label)} aria-label={t(style.label)} onPress={() => vm.select(segment)} testID={`fc-tab-${segment}`}
            style={({ focused }: PressState) => [styles.tab, on ? styles.tabOn : null, focused ? focusRing : null]}>
            <Icon name={style.icon} size={17} color={on ? color.onAction : color.text2} strokeWidth={2.2} />
            <Text style={[styles.tabText, on ? styles.tabTextOn : null]}>{t(style.label)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

const Results = observer(function Results({ vm, links, wide }: { vm: CareDirectoryViewModel; links: FindCareLinks; wide: boolean }) {
  const t = useT();
  const segment = vm.segment;
  const phase = vm.placePhase;
  if (phase === 'loading' || phase === 'idle') return <Skeleton label={t('fc.loading')} lines={['100%', '86%', '92%']} />;
  if (phase === 'error') {
    return <ErrorState title={t('fc.failedTitle')} body={t('fc.failedBody')} retryLabel={t('common.tryAgain')} onRetry={vm.retry} reference={{ label: t('fc.reference'), code: 'FC-LIST' }} />;
  }
  const empty = segment === 'doctors' ? vm.doctors.length === 0 : vm.listed.length === 0;
  if (empty) {
    return (
      <M2Card style={styles.empty} testID={`fc-empty-${segment}`}>
        <Icon name={SEGMENT_STYLE[segment].icon} size={28} color={color.text3} strokeWidth={1.9} />
        <Text style={m2Text.cardTitle}>{t(EMPTY[segment].title)}</Text>
        <Text style={[m2Text.body, styles.center]}>{t(EMPTY[segment].body)}</Text>
      </M2Card>
    );
  }
  if (segment === 'doctors') {
    return (
      <View style={styles.list} testID="fc-doctors">
        {!vm.signedIn ? <Text style={m2Text.body}>{t('fc.doc.signedOutNote')}</Text> : null}
        {vm.departments.map((d) => <DepartmentBlock key={d.key} department={d} signedIn={vm.signedIn} onBook={links.book} />)}
      </View>
    );
  }
  return (
    <View style={[styles.list, wide ? styles.listWide : null]} testID={`fc-list-${segment}`}>
      {vm.listed.map((place) => (
        <FacilityCard key={place.facility.id} place={place} onOpen={() => vm.open(place.facility)} style={wide ? styles.cardWide : undefined} />
      ))}
    </View>
  );
});

export const CareDirectoryView = observer(function CareDirectoryView({ vm, links, wide = false }: { vm: CareDirectoryViewModel; links: FindCareLinks; wide?: boolean }) {
  const t = useT();
  useOwnPhoneChrome();
  const placeTab = vm.segment !== 'doctors';
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, wide ? styles.contentWide : null]} testID="fc-directory">
      <Rise>
        <Gradient colors={heroStops('blue')} angle={160} style={[styles.hero, wide ? styles.heroWide : null]}>
          <View pointerEvents="none" style={styles.heroRing} />
          <View style={styles.heroHead}>
            {links.back ? <RoundButton icon="arrow-left" label={t('fc.back')} onPress={links.back} onHero testID="fc-back" /> : null}
            <Text style={styles.heroEyebrow}>{t('fc.eyebrow')}</Text>
            {links.sos ? <SosButton label={t('m2.sos')} spoken={t('m2.sosSpoken')} onPress={links.sos} testID="fc-sos" /> : null}
          </View>
          <FloatingPin />
          <M2Heading level={1} style={styles.heroTitle}>{t('fc.title')}</M2Heading>
          <Text style={styles.heroBody}>{t('fc.body')}</Text>
        </Gradient>
      </Rise>

      <View style={[styles.gutter, styles.stripWrap]}>
        <EmergencyStrip />
      </View>

      <Rise index={1}><Tabs vm={vm} /></Rise>

      {vm.segment === 'ambulance' && links.sos ? (
        <Rise index={2} style={styles.gutter}>
          <LiftCard label={`${t('fc.sosCard')}. ${t('fc.sosCardBody')}`} onPress={links.sos} testID="fc-sos-card" style={styles.sosCard}>
            <View style={styles.sosIcon}><Icon name="shield-alert" size={20} color={color.onDangerFill} strokeWidth={2.2} /></View>
            <View style={styles.grow}>
              <Text style={m2Text.cardTitle}>{t('fc.sosCard')}</Text>
              <Text style={m2Text.body}>{t('fc.sosCardBody')}</Text>
            </View>
          </LiftCard>
        </Rise>
      ) : null}

      {placeTab ? <Rise index={2} style={styles.gutter}><LocationCard vm={vm} /></Rise> : null}

      <Rise index={3} style={styles.gutter}>
        <M2SectionHead title={t(placeTab && vm.location === 'on' ? 'fc.nearest' : SEGMENT_STYLE[vm.segment].label)} />
        <Results vm={vm} links={links} wide={wide} />
      </Rise>

      <Rise index={4} style={styles.gutter}>
        <View style={styles.how} testID="fc-how">
          <Icon name="info" size={16} color={color.info} strokeWidth={2.2} />
          <View style={styles.grow}>
            <Text style={m2Text.cardTitle}>{t('fc.howTitle')}</Text>
            <Text style={m2Text.body}>{t('fc.howBody')}</Text>
          </View>
        </View>
      </Rise>
    </ScrollView>
  );
});

/** The directory, or one place's page while one is open. */
export const FindCare = observer(function FindCare({ vm, links, wide = false }: { vm: CareDirectoryViewModel; links: FindCareLinks; wide?: boolean }) {
  if (vm.detailPhase !== 'idle') return <FacilityDetailView vm={vm} onBack={vm.closeDetail} wide={wide} />;
  return <CareDirectoryView vm={vm} links={links} wide={wide} />;
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center', overflow: 'hidden' },
  contentWide: { maxWidth: size.webContentMax - size.webSidebar * 2, paddingBottom: space.s40 },
  gutter: { paddingHorizontal: space.gutterPhone },
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  center: { textAlign: 'center' },
  hero: {
    paddingTop: space.s16, paddingHorizontal: space.gutterPhone, paddingBottom: space.s40 + space.s12, borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    overflow: 'hidden', gap: space.s6,
  },
  heroWide: { borderRadius: 32, marginTop: space.s16, marginHorizontal: space.gutterPhone },
  heroRing: { position: 'absolute', right: -70, top: 30, width: 230, height: 230, borderRadius: radius.full, borderWidth: 30, borderColor: color.onHeroRule },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: space.s12, marginBottom: space.s14, minHeight: size.touchTarget },
  heroEyebrow: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.onHero2 },
  pin: {
    position: 'absolute', right: 26, top: 82, width: 78, height: 78, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil,
  },
  heroTitle: { maxWidth: 240, fontFamily: font.family.sans, fontSize: font.size.heading, lineHeight: 32, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.8, color: color.onHero },
  heroBody: { maxWidth: 250, fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: 20, fontWeight: fontWeight(font.weight.strong), color: color.onHero2 },
  stripWrap: { marginTop: -(space.s40 + space.s4) },
  tabs: { paddingHorizontal: space.gutterPhone, gap: space.s8 },
  tab: {
    minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: space.s6,
    borderWidth: 1.5, borderColor: color.rule, backgroundColor: color.surface,
  },
  tabOn: { borderColor: color.action, backgroundColor: color.action, ...shadowStyle(shadow.hairline) },
  tabText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  tabTextOn: { color: color.onAction },
  sosCard: { borderRadius: 22, padding: space.s14, flexDirection: 'row', alignItems: 'center', gap: space.s12, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  sosIcon: { width: 42, height: 42, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: color.dangerFill },
  list: { gap: space.s12, marginTop: space.s12 },
  listWide: { flexDirection: 'row', flexWrap: 'wrap' },
  cardWide: { flexBasis: '48%', flexGrow: 1 },
  empty: { borderRadius: 24, padding: space.s20, marginTop: space.s12, alignItems: 'center', gap: space.s8 },
  department: { gap: space.s10 },
  deptHead: { flexDirection: 'row', alignItems: 'center', gap: space.s8, marginTop: space.s4 },
  deptIcon: { width: 30, height: 30, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: SERVICE_HUES.blue.soft },
  doctor: { borderRadius: 22, padding: space.s14, flexDirection: 'row', alignItems: 'center', gap: space.s12, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy) },
  price: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  slot: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  noSlot: { color: color.text3 },
  bookBtn: { minHeight: 36, paddingHorizontal: space.s12, borderRadius: radius.full, justifyContent: 'center', backgroundColor: color.action, maxWidth: 120 },
  bookText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onAction, textAlign: 'center' },
  how: { flexDirection: 'row', gap: space.s10, padding: space.s14, borderRadius: radius.xl, backgroundColor: color.surface3 },
});
