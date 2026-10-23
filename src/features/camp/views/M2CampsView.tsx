import React from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { Button, ConfirmDialog, EmptyState, ErrorState, OfflineBanner, Rise, Skeleton, Toast, useOnline } from '@/design-system';
import {
  Gradient, M2Card, M2Heading, M2_NAV_CLEARANCE, RoundButton, SERVICE_HUES, floatTransform, heroStops, m2Text, useAmbientMotion, useLoop, useOwnPhoneChrome,
} from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, motion, radius, size, space, webOnly } from '@/design-system/theme';
import { getSetting } from '@/data/services/config';
import { useLanguage, useT } from '@/i18n';
import { rupees } from '@/features/phoneboards/format';
import { INELIGIBLE_KEYS, SERVICE_KEYS, groupCode } from '../data/campsApi';
import type { CampBookingView, CampListing, CampSlotView } from '../data/campsApi';
import type { CampsBookingViewModel } from '../viewmodel/CampsBookingViewModel';

/**
 * Health camps (M2Camps): find the camps your campus runs, book a slot, wait
 * for a full one, change or cancel it, open the camp day. A new screen with no
 * canvas board, drawn in the Mobile 2.0 language (gradient hero, lifting cards,
 * soft tiles; design/screens/briefs/M2Camps.md). React Native, so the web
 * phone frame, the desktop page column and Expo draw the same thing.
 *
 * Tier 2: a booking. Not here (Tier 1, docs/plans/tier1-health-camps-2026-10-23.md):
 * a scannable pass, results, vaccination and blood donation drives. A booking
 * may be confirmed warmly; nothing about the body is celebrated.
 */
export interface M2CampsLinks {
  back: () => void;
  /** The camp day (CampDay): stations and the student's own check-in. */
  campDay: (campId: string) => void;
  verifyCampus: () => void;
  findCare: () => void;
}

const SKY = SERVICE_HUES.sky;

function useDates() {
  const { lang } = useLanguage();
  const locale = lang === 'en' ? 'en-IN' : `${lang}-IN`;
  const at = (iso: string) => new Date(`${iso}T00:00:00`);
  return {
    day: (iso: string) => (Number.isNaN(at(iso).getTime()) ? '' : at(iso).toLocaleDateString(locale, { day: 'numeric' })),
    month: (iso: string) => (Number.isNaN(at(iso).getTime()) ? '' : at(iso).toLocaleDateString(locale, { month: 'short' })),
    long: (iso: string) => (Number.isNaN(at(iso).getTime()) ? iso : at(iso).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })),
    time: (epochSeconds: number) => new Date(epochSeconds * 1000).toLocaleString(locale, { weekday: 'short', hour: 'numeric', minute: '2-digit' }),
  };
}

function Art() {
  const ambient = useAmbientMotion();
  const float = useLoop(ambient, motion.duration.ambient);
  return (
    <Animated.View pointerEvents="none" style={[styles.art, { transform: floatTransform(float, space.s8) }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Icon name="calendar" size={50} color={color.onHero} strokeWidth={1.6} />
    </Animated.View>
  );
}

/** The date tile on every card: the day number on the sky gradient, the month under it. */
function DateTile({ iso }: { iso: string }) {
  const dates = useDates();
  return (
    <Gradient colors={heroStops('sky')} angle={160} style={styles.dateTile}>
      <Text style={styles.dateDay}>{dates.day(iso)}</Text>
      <Text style={styles.dateMonth}>{dates.month(iso)}</Text>
    </Gradient>
  );
}

function Services({ camp }: { camp: Pick<CampListing, 'services'> }) {
  const t = useT();
  if (!camp.services.length) return null;
  return (
    <View style={styles.chips} accessibilityLabel={t('camps.services')} aria-label={t('camps.services')} role="list">
      {camp.services.map((code) => (
        <View key={code} role="listitem" style={styles.chip}><Text style={styles.chipText}>{t(SERVICE_KEYS[code])}</Text></View>
      ))}
    </View>
  );
}

function Place({ text }: { text: string }) {
  return (
    <View style={styles.metaRow}>
      <Icon name="map-pin" size={14} color={color.text3} strokeWidth={2.2} />
      <Text style={[m2Text.meta, styles.grow]}>{text}</Text>
    </View>
  );
}

const BookingCard = observer(function BookingCard({ b, vm, links, online }: { b: CampBookingView; vm: CampsBookingViewModel; links: M2CampsLinks; online: boolean }) {
  const t = useT();
  const dates = useDates();
  const waitlisted = b.status === 'WAITLISTED';
  const when = b.slot ? t('camps.slotRange', { start: b.slot.slotStart, end: b.slot.slotEnd }) : '';
  return (
    <M2Card style={styles.card} testID={`camps-booking-${b.camp.id}`}>
      <View style={styles.cardHead}>
        <DateTile iso={b.camp.date} />
        <View style={styles.grow}>
          <Text style={m2Text.cardTitle}>{b.camp.name}</Text>
          <Text style={m2Text.meta}>{[dates.long(b.camp.date), when].filter(Boolean).join(' · ')}</Text>
          <Place text={b.camp.location || t('care.campus')} />
        </View>
        <View style={[styles.pill, waitlisted ? styles.pillWait : styles.pillOn]}>
          <Text style={[styles.pillText, waitlisted ? styles.pillTextWait : styles.pillTextOn]}>
            {waitlisted ? t('camps.status.waitlisted', { n: b.waitlistPosition ?? 1 }) : t('camps.status.booked')}
          </Text>
        </View>
      </View>
      {b.bookingCode ? (
        <View style={styles.code} testID={`camps-code-${b.camp.id}`}>
          <Text style={m2Text.meta}>{waitlisted ? t('camps.waitRef') : t('camps.bookingRef')}</Text>
          <Text style={styles.codeText} accessibilityLabel={b.bookingCode.split('').join(' ')}>{groupCode(b.bookingCode)}</Text>
        </View>
      ) : null}
      {waitlisted ? <Text style={m2Text.body}>{t('camps.waitBody')}</Text> : null}
      {b.canChange ? (
        <View style={styles.actions}>
          <Button label={t('camps.change')} variant="secondary" onPress={() => vm.open(b.camp.id, b)} disabled={!online || vm.busy} testID={`camps-change-${b.camp.id}`} />
          <Button label={waitlisted ? t('camps.leaveWaitlist') : t('camps.cancel')} variant="ghost" onPress={() => vm.askCancel(b)} disabled={!online || vm.busy} testID={`camps-cancel-${b.camp.id}`} />
        </View>
      ) : (
        <Text style={m2Text.meta}>{b.checkedIn ? t('camps.checkedIn') : t('camps.tooLate', { hours: getSetting('camps.change_cutoff_hours') })}</Text>
      )}
      {b.canChange && b.changeableUntil ? <Text style={m2Text.meta}>{t('camps.changeUntil', { when: dates.time(b.changeableUntil) })}</Text> : null}
      {!waitlisted ? (
        <Pressable role="link" accessibilityRole="link" aria-label={t('camps.openDay')} accessibilityLabel={t('camps.openDay')} onPress={() => links.campDay(b.camp.id)}
          testID={`camps-day-${b.camp.id}`} style={({ focused }: PressState) => [styles.textLink, focused ? focusRing : null]}>
          <Text style={m2Text.link}>{t('camps.openDay')}</Text>
          <Icon name="chevron-right" size={16} color={color.action} strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </M2Card>
  );
});

const SlotPicker = observer(function SlotPicker({ vm, online }: { vm: CampsBookingViewModel; online: boolean }) {
  const t = useT();
  const res = vm.slots;
  if (!res) return null;
  if (res.phase === 'loading') return <Skeleton label={t('camps.slotsLoading')} lines={['100%', '100%']} />;
  if (res.phase === 'error') return <ErrorState title={t('camps.slotsFailed')} body={t('camps.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void res.load()} />;
  const slots = res.data ?? [];
  if (!slots.length) return <Text style={m2Text.body}>{t('camps.noSlots')}</Text>;
  const label = (s: CampSlotView) => {
    if (s.started) return t('camps.slot.started');
    if (s.available) return t('camps.slot.left', { n: s.remaining });
    return s.waitlistOpen ? t('camps.slot.fullWait') : t('camps.slot.full');
  };
  return (
    <View role="radiogroup" accessibilityRole="radiogroup" aria-label={t('camps.pickSlot')} accessibilityLabel={t('camps.pickSlot')} style={styles.slots}>
      {slots.map((s) => {
        const on = vm.chosenSlotId === s.id;
        const mine = vm.changing?.slot?.id === s.id;
        const off = s.started || mine || (!s.available && (!s.waitlistOpen || Boolean(vm.changing)));
        const spoken = `${t('camps.slotRange', { start: s.slotStart, end: s.slotEnd })}, ${mine ? t('camps.slot.yours') : label(s)}`;
        return (
          <Pressable key={s.id} role="radio" accessibilityRole="radio" aria-checked={on} accessibilityState={{ checked: on, disabled: off || !online }}
            aria-label={spoken} accessibilityLabel={spoken} disabled={off || !online} onPress={() => vm.choose(s.id)} testID={`camps-slot-${s.id}`}
            style={({ focused }: PressState) => [styles.slot, on ? styles.slotOn : null, off ? styles.slotOff : null, focused ? focusRing : null]}>
            <Text style={[styles.slotTime, on ? styles.slotTimeOn : null]}>{t('camps.slotRange', { start: s.slotStart, end: s.slotEnd })}</Text>
            <Text style={[styles.slotMeta, on ? styles.slotTimeOn : null]}>{mine ? t('camps.slot.yours') : label(s)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const CampCard = observer(function CampCard({ c, vm, links, online }: { c: CampListing; vm: CampsBookingViewModel; links: M2CampsLinks; online: boolean }) {
  const t = useT();
  const dates = useDates();
  const open = vm.openCampId === c.id;
  const kind = open ? vm.submitKind : null;
  const price = c.pricePaise > 0 ? rupees(c.pricePaise) : t('camps.free');
  const places = c.remaining > 0 ? t('camps.placesLeft', { n: c.remaining }) : t('camps.full');
  const held = c.myStatus === 'BOOKED' || c.myStatus === 'WAITLISTED' || c.myStatus === 'REGISTERED';
  return (
    <M2Card style={[styles.card, open ? styles.cardOpen : null]} testID={`camps-camp-${c.id}`}>
      <View style={styles.cardHead}>
        <DateTile iso={c.date} />
        <View style={styles.grow}>
          <Text style={m2Text.cardTitle}>{c.name}</Text>
          <Text style={m2Text.meta}>{dates.long(c.date)}</Text>
          <Place text={c.location || t('care.campus')} />
        </View>
        <Text style={m2Text.price}>{price}</Text>
      </View>
      <Services camp={c} />
      <View style={styles.metaRow}>
        <Icon name="users" size={14} color={c.remaining > 0 ? SKY.ink : color.attention} strokeWidth={2.2} />
        <Text style={[m2Text.meta, c.remaining > 0 ? null : styles.attention]}>{places}</Text>
      </View>
      {c.ineligibleReason ? (
        <View style={styles.note} testID={`camps-ineligible-${c.id}`}>
          <Icon name="info" size={16} color={color.info} strokeWidth={2.2} />
          <View style={styles.grow}>
            <Text style={m2Text.body}>{t(INELIGIBLE_KEYS[c.ineligibleReason])}</Text>
            {c.ineligibleReason === 'NOT_VERIFIED' ? (
              <Pressable role="link" accessibilityRole="link" aria-label={t('camps.verifyNow')} accessibilityLabel={t('camps.verifyNow')} onPress={links.verifyCampus}
                style={({ focused }: PressState) => [styles.textLink, focused ? focusRing : null]}>
                <Text style={m2Text.link}>{t('camps.verifyNow')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : c.pricePaise > 0 ? (
        <Text style={m2Text.meta}>{t('camps.err.PAYMENT_NOT_AVAILABLE')}</Text>
      ) : held ? (
        <Text style={[m2Text.meta, styles.heldText]}>{t('camps.alreadyHave')}</Text>
      ) : open ? null : (
        <Button label={t('camps.seeSlots')} onPress={() => vm.open(c.id)} disabled={!online} testID={`camps-open-${c.id}`} />
      )}
      {open ? (
        <View style={styles.detail} aria-live="polite">
          {vm.changing ? <M2Heading style={m2Text.section}>{t('camps.changeTitle')}</M2Heading> : null}
          {c.whatToBring ? <Text style={m2Text.body}>{t('camps.bring', { items: c.whatToBring })}</Text> : null}
          <SlotPicker vm={vm} online={online} />
          {kind === 'waitlist' ? <Text style={m2Text.meta}>{t('camps.waitExplain')}</Text> : null}
          <View style={styles.actions}>
            <Button label={kind === 'waitlist' ? t('camps.joinWaitlist') : kind === 'change' ? t('camps.moveHere') : t('camps.book')}
              onPress={() => void vm.submit()} disabled={!kind || !online} busy={vm.busy} testID="camps-submit" />
            <Button label={t('camps.notNow')} variant="ghost" onPress={vm.close} disabled={vm.busy} testID="camps-close" />
          </View>
        </View>
      ) : null}
    </M2Card>
  );
});

export const M2CampsView = observer(function M2CampsView({ vm, links }: { vm: CampsBookingViewModel; links: M2CampsLinks }) {
  const t = useT();
  const online = useOnline();
  useOwnPhoneChrome();
  const camps = vm.camps;
  const bookings = vm.bookings;
  // A camp opened to change a booking may not be in the list any more (it can be today, or full): show it from the booking.
  const changingCamp = vm.changing && !(camps.data ?? []).some((c) => c.id === vm.changing?.camp.id)
    ? { ...vm.changing.camp, capacity: 0, remaining: 0, slotCount: 0, ineligibleReason: null, myStatus: null } : null;
  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-camps">
        <Rise>
          <Gradient colors={heroStops('sky')} angle={160} style={styles.hero}>
            <View pointerEvents="none" style={styles.heroRing} />
            <View style={styles.heroHead}>
              <RoundButton icon="arrow-left" label={t('m2.backHome')} onPress={links.back} onHero testID="camps-back" />
              <Text style={styles.heroEyebrow}>{t('camps.eyebrow')}</Text>
            </View>
            <Art />
            <M2Heading level={1} style={styles.heroTitle}>{t('camps.title')}</M2Heading>
            <Text style={styles.heroBody}>{t('camps.body', { hours: getSetting('camps.change_cutoff_hours') })}</Text>
          </Gradient>
        </Rise>

        {!online ? <View style={styles.gutter}><OfflineBanner message={t('camps.offline')} /></View> : null}

        <Rise index={1} style={styles.gutter}>
          <M2Heading style={[m2Text.section, styles.sectionTitle]}>{t('camps.yours')}</M2Heading>
          {bookings.phase === 'loading' ? <Skeleton label={t('camps.bookingsLoading')} lines={['100%', '70%']} /> : null}
          {bookings.phase === 'error' ? <ErrorState title={t('camps.bookingsFailed')} body={t('camps.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void bookings.load()} /> : null}
          {bookings.phase === 'ready' && vm.active.length === 0 ? <Text style={m2Text.body} testID="camps-no-bookings">{t('camps.noBookings')}</Text> : null}
          <View style={styles.list}>
            {vm.active.map((b) => <BookingCard key={b.id} b={b} vm={vm} links={links} online={online} />)}
            {changingCamp ? <CampCard c={changingCamp} vm={vm} links={links} online={online} /> : null}
          </View>
        </Rise>

        <Rise index={2} style={styles.gutter}>
          <M2Heading style={[m2Text.section, styles.sectionTitle]}>{t('camps.upcoming')}</M2Heading>
          {camps.phase === 'loading' ? <Skeleton label={t('camps.loading')} lines={['100%', '90%', '100%']} /> : null}
          {camps.phase === 'error' ? <ErrorState title={t('camps.failed')} body={t('camps.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void camps.load()} /> : null}
          {camps.phase === 'ready' && !(camps.data ?? []).length ? (
            <EmptyState title={t('camps.emptyTitle')} body={t('camps.emptyBody')} animation="anim-calendar" action={{ label: t('camps.findCare'), onPress: links.findCare }} />
          ) : null}
          <View style={styles.list}>
            {(camps.data ?? []).map((c) => <CampCard key={c.id} c={c} vm={vm} links={links} online={online} />)}
          </View>
        </Rise>

        {vm.ended.length ? (
          <Rise index={3} style={styles.gutter}>
            <M2Heading style={[m2Text.section, styles.sectionTitle]}>{t('camps.ended')}</M2Heading>
            <View style={styles.list}>
              {vm.ended.map((b) => (
                <View key={b.id} style={styles.ended} testID={`camps-ended-${b.camp.id}`}>
                  <Icon name="calendar-x" size={18} color={color.text3} strokeWidth={2} />
                  <View style={styles.grow}>
                    <Text style={m2Text.cardTitle}>{b.camp.name}</Text>
                    <Text style={m2Text.meta}>{b.campCancelled ? t('camps.calledOff', { reason: b.cancelReason ?? '' }) : t('camps.youCancelled')}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Rise>
        ) : null}

        <Rise index={4} style={styles.gutter}>
          <View style={styles.privacy}>
            <Icon name="lock" size={16} color={color.text3} strokeWidth={2} />
            <Text style={[m2Text.meta, styles.grow]}>{t('camps.privacy')}</Text>
          </View>
        </Rise>
      </ScrollView>

      <ConfirmDialog
        open={Boolean(vm.cancelTarget)}
        title={vm.cancelTarget?.status === 'WAITLISTED' ? t('camps.confirm.leaveTitle') : t('camps.confirm.title')}
        body={vm.cancelTarget?.status === 'WAITLISTED' ? t('camps.confirm.leaveBody') : t('camps.confirm.body')}
        confirmLabel={vm.cancelTarget?.status === 'WAITLISTED' ? t('camps.leaveWaitlist') : t('camps.cancel')}
        cancelLabel={t('camps.confirm.keep')}
        busyLabel={t('camps.confirm.busy')}
        tone="danger"
        icon="cancel-booking"
        busy={vm.busy}
        onConfirm={() => void vm.confirmCancel()}
        onCancel={vm.dismissCancel}
        testID="camps-confirm"
      />
      {vm.notice ? (
        <Toast message={t(vm.notice.key)} tone={vm.notice.tone} onDone={vm.clearNotice} onDismiss={vm.notice.tone === 'error' ? vm.clearNotice : undefined} testID="camps-toast" />
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s20, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center', overflow: 'hidden' },
  gutter: { paddingHorizontal: space.gutterPhone },
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  hero: { paddingTop: space.s16, paddingHorizontal: space.gutterPhone, paddingBottom: space.s24, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden' },
  heroRing: { position: 'absolute', left: -60, bottom: -90, width: 240, height: 240, borderRadius: radius.full, borderWidth: 30, borderColor: color.onHeroRule },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  heroEyebrow: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  art: { position: 'absolute', right: 18, top: 72, width: 92, height: 92, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil },
  heroTitle: { marginTop: space.s16, maxWidth: 220, fontFamily: font.family.sans, fontSize: 27, lineHeight: 32, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.8, color: color.onHero },
  heroBody: { marginTop: space.s6, maxWidth: 230, fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: 20, fontWeight: fontWeight(font.weight.strong), color: color.onHero },
  sectionTitle: { marginBottom: space.s12 },
  list: { gap: space.s12 },
  card: { borderRadius: 26, padding: space.s16, gap: space.s10 },
  cardOpen: { borderWidth: 1.5, borderColor: SKY.deep },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12 },
  dateTile: { width: 52, minHeight: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingVertical: space.s6 },
  dateDay: { fontFamily: font.family.sans, fontSize: font.size.title, lineHeight: 24, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  dateMonth: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), textTransform: 'uppercase', color: color.onHero },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.s6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6 },
  chip: { paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full, backgroundColor: SKY.soft },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: SKY.ink },
  attention: { color: color.attention, fontWeight: fontWeight(font.weight.heavy) },
  heldText: { color: SKY.ink, fontWeight: fontWeight(font.weight.heavy) },
  pill: { paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full },
  pillOn: { backgroundColor: color.positiveBg },
  pillWait: { backgroundColor: color.attentionBg },
  pillText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  pillTextOn: { color: color.positive },
  pillTextWait: { color: color.attention },
  code: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s8, padding: space.s12, borderRadius: radius.lg, backgroundColor: color.surface2 },
  codeText: { fontFamily: font.family.mono, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1.5, color: color.clinicalValue },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  note: { flexDirection: 'row', gap: space.s8, padding: space.s12, borderRadius: radius.lg, backgroundColor: color.surface3 },
  detail: { gap: space.s12, paddingTop: space.s12, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  slot: {
    minHeight: size.touchTarget, minWidth: 140, flexGrow: 1, paddingHorizontal: space.s12, paddingVertical: space.s8, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: color.rule, backgroundColor: color.surface, gap: space.s2,
    ...webOnly({ transitionProperty: 'background-color, border-color', transitionDuration: `${motion.duration.fast}ms` }),
  },
  slotOn: { borderColor: color.action, backgroundColor: color.action },
  slotOff: { opacity: 0.55 },
  slotTime: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  slotTimeOn: { color: color.onAction },
  slotMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
  textLink: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s4, alignSelf: 'flex-start' },
  ended: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s12, borderRadius: radius.lg, backgroundColor: color.surface2 },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s8 },
});
