import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useLanguage, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Button, ErrorState, Rise, Skeleton, Toast, useReducedMotion } from '@/design-system';
import { Glyph, Icon, Illustration } from '@/design-system/icons';
import type { SkGlyphName, SkIconName } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { money } from '@/data/types/workflowTypes';
import type { LabBooking } from '../data/LabBookingRepository';
import type { LabBookingViewModel } from '../viewmodel/LabBookingViewModel';
import { bookingRef, slotLabel } from './labFormat';

// Confetti only because this is a booking (DESIGN.md §2.2: never for a result,
// a value or anything about the body). Placed, not animated: nothing moves, so
// reduced motion needs no special case beyond the entrance.
const CONFETTI: { name: SkGlyphName; left: `${number}%`; top: number }[] = [
  { name: 'confetti-arc', left: '8%', top: 18 }, { name: 'confetti-arc-2', left: '20%', top: 64 },
  { name: 'confetti-arc-3', left: '30%', top: 8 }, { name: 'confetti-arc-4', left: '70%', top: 12 },
  { name: 'confetti-arc-5', left: '82%', top: 58 }, { name: 'confetti-arc-6', left: '90%', top: 22 },
  { name: 'confetti-arc-7', left: '14%', top: 110 }, { name: 'confetti-wedge', left: '40%', top: 96 },
  { name: 'confetti-wedge-2', left: '60%', top: 100 }, { name: 'confetti-wedge-3', left: '76%', top: 118 },
  { name: 'confetti-wedge-4', left: '4%', top: 74 }, { name: 'confetti-zigzag', left: '24%', top: 30 },
  { name: 'confetti-zigzag-2', left: '64%', top: 44 }, { name: 'confetti-zigzag-3', left: '88%', top: 96 },
  { name: 'confetti-zigzag-4', left: '48%', top: 4 }, { name: 'confetti-zigzag-5', left: '34%', top: 128 },
];

function LinkButton({ icon, label, onPress, disabled = false, accessibilityLabel, testID, iconAfter = false, iconStyle }: {
  icon: SkIconName; label: string; onPress: () => void; disabled?: boolean; accessibilityLabel?: string; testID?: string;
  iconAfter?: boolean; iconStyle?: object;
}) {
  const glyph = <View style={iconStyle}><Icon name={icon} size={18} color={disabled ? color.text3 : color.action} /></View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.link, focused ? focusRing : null]}
    >
      {iconAfter ? null : glyph}
      <Text style={[styles.linkText, disabled ? styles.linkTextOff : null]}>{label}</Text>
      {iconAfter ? glyph : null}
    </Pressable>
  );
}

function Party({ label, line1, line2, line3 }: { label: string; line1: string; line2: string; line3: string }) {
  return (
    <View style={styles.party}>
      <Text style={styles.partyLabel}>{label}</Text>
      <Text style={styles.partyName}>{line1}</Text>
      {line2 ? <Text style={styles.partyLine}>{line2}</Text> : null}
      {line3 ? <Text style={styles.partyMono}>{line3}</Text> : null}
    </View>
  );
}

function addressLine(t: ReturnType<typeof useT>, booking: LabBooking): string {
  const a = booking.order.collectionAddress;
  if (a?.kind === 'HOSTEL') return t('labbook.sheet.metaHostel', { block: a.hostelBlock ?? '', room: a.room ?? '' });
  return t('labbook.result.home');
}

/**
 * Result — lab test booked (canvas page 2 "ResultLabBooked", SK-036, Tier 2).
 *
 * Shows what the server says about the booking after payment: booked (with
 * confetti, because it is a booking), still waiting for the bank, or no
 * longer active. Differences from the canvas: "Receipt" is drawn but not
 * offered (no receipt exists yet); "Phlebotomist · assigned by 6 am, live
 * tracking" is replaced by what is true (the lab assigns one of its own
 * collectors before the slot); and the report line says a doctor reviews it
 * before the student sees it.
 */
export const ResultLabBookedView = observer(function ResultLabBookedView({
  viewModel: vm, studentName, onBack, onViewBooking, onCopy, onCalendar,
}: {
  viewModel: LabBookingViewModel;
  studentName: string;
  onBack: () => void;
  onViewBooking: () => void;
  /** Copies text to the clipboard; resolves false when it could not. */
  onCopy: (text: string) => Promise<boolean>;
  /** Saves an .ics file; false when the platform can't. */
  onCalendar: (ics: string, filename: string) => boolean;
}) {
  const t = useT();
  const { lang } = useLanguage();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [replay, setReplay] = useState(0);
  const [toast, setToast] = useState<MessageKey | ''>('');
  const booking = vm.result;
  const testMode = vm.payment?.testMode === true;

  const when = booking ? slotLabel(t, lang, booking.order.slotStart, booking.booking.slotEnd) : '';
  const ref = booking ? bookingRef(booking.order.id) : '';
  const amount = booking?.booking.amountPaise != null ? money(booking.booking.amountPaise) : '';

  const copy = async () => {
    if (!booking) return;
    const ok = await onCopy(t('labbook.result.share', { ref, lab: booking.booking.labName, when }));
    setToast(ok ? 'labbook.result.copied' : 'labbook.result.copyFailed');
  };
  const calendar = () => {
    if (!booking) return;
    const saved = onCalendar(icsFor(t('labbook.result.calendarTitle'), booking.order.slotStart, booking.booking.slotEnd, ref),
      `${ref}.ics`);
    if (saved) setToast('labbook.result.calendarDone');
  };

  const more: { k: string; v: string }[] = booking ? [
    { k: t('labbook.result.fasting'), v: booking.booking.fastingHours > 0
      ? t('labbook.result.fastingValue', { hours: booking.booking.fastingHours }) : t('labbook.result.noFasting') },
    { k: t('labbook.result.collector'), v: t('labbook.result.collectorValue') },
    { k: t('labbook.result.report'), v: booking.booking.reportHours > 0
      ? t('labbook.result.reportValue', { hours: booking.booking.reportHours }) : t('labbook.result.reportNoHours') },
  ] : [];

  return (
    <View style={styles.screen} testID="lab-result">
      <View style={styles.hero}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('labbook.back')}
          onPress={onBack}
          style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.heroBack, focused ? focusRing : null]}
        >
          <Icon name="arrow-left" size={18} color={color.onHero} />
        </Pressable>
        <Text style={styles.heroTitle}>{t('labbook.title')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('labbook.result.replay')}
          onPress={() => setReplay(n => n + 1)}
          style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.replay, focused ? focusRing : null]}
        >
          <Icon name="rotate-ccw" size={16} color={color.action} />
          <Text style={styles.replayText}>{t('labbook.result.replay')}</Text>
        </Pressable>
      </View>

      <View style={styles.cardWrap}>
        <View style={styles.card} accessibilityLiveRegion="polite" role="status" key={replay}>
          {vm.outcome === 'loading' ? <Skeleton label={t('labbook.result.loading')} lines={['50%', '80%', '100%', '100%']} /> : null}

          {vm.outcome === 'error' ? (
            <ErrorState title={t('labbook.errorTitle')} body={t('labbook.errorBody')} retryLabel={t('labbook.retry')}
              onRetry={() => void vm.showResult()} reference={ref ? { label: t('labbook.reference'), code: ref } : undefined} />
          ) : null}

          {vm.outcome === 'booked' && booking ? (
            <Rise>
              {reduced ? null : (
                <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.confetti}>
                  {CONFETTI.map(c => (
                    <View key={c.name} style={[styles.confettiPiece, { left: c.left, top: c.top }]}>
                      <Glyph name={c.name} size={14} />
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.top}>
                <Illustration name="illustration-result-success" size={72} />
                <Text accessibilityRole="header" style={styles.title}>{t('labbook.result.title')}</Text>
                <Text style={styles.sub}>{t('labbook.result.sub', { name: booking.booking.packageName, when })}</Text>
              </View>
              <View style={styles.actions}>
                <LinkButton icon="copy" label={t('labbook.result.copy')} onPress={() => void copy()} testID="lab-copy" />
                <LinkButton icon="download" label={t('labbook.result.receipt')} accessibilityLabel={t('labbook.result.receiptSoon')}
                  onPress={() => undefined} disabled />
              </View>
              <View style={styles.details}>
                <Party label={t('labbook.result.to')} line1={booking.booking.labName} line2={booking.booking.accreditation}
                  line3={t('labbook.result.booking', { ref })} />
                <Party label={t('labbook.result.from')} line1={studentName} line2={addressLine(t, booking)}
                  line3={amount ? t(testMode ? 'labbook.result.paidTest' : 'labbook.result.paid', { amount }) : ''} />
                {open ? (
                  <View style={styles.more} testID="lab-more">
                    {more.map(m => (
                      <View key={m.k} style={styles.moreRow}>
                        <Text style={styles.moreKey}>{m.k}</Text>
                        <Text style={styles.moreValue}>{m.v}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <LinkButton icon="chevron-down" iconAfter label={open ? t('labbook.result.less') : t('labbook.result.more')}
                  onPress={() => setOpen(o => !o)} iconStyle={open ? styles.flip : undefined} testID="lab-toggle-more" />
              </View>
              <View style={styles.ctas}>
                <Button label={t('labbook.result.view')} onPress={onViewBooking} size="cta" fullWidth testID="lab-view-booking" />
                <LinkButton icon="repeat" label={t('labbook.result.calendar')} onPress={calendar} testID="lab-calendar" />
              </View>
            </Rise>
          ) : null}

          {vm.outcome === 'pending' ? (
            <View style={styles.top} testID="lab-result-pending">
              <Illustration name="illustration-result-pending" size={96} />
              <Text accessibilityRole="header" style={styles.title}>{t('labbook.result.pendingTitle')}</Text>
              <Text style={styles.sub}>{t('labbook.result.pendingBody')}</Text>
              <Button label={t('labbook.result.check')} onPress={() => void vm.showResult()} fullWidth />
            </View>
          ) : null}

          {vm.outcome === 'failed' ? (
            <View style={styles.top} testID="lab-result-failed">
              <Illustration name="illustration-result-failure" size={96} />
              <Text accessibilityRole="header" style={styles.title}>{t('labbook.result.failedTitle')}</Text>
              <Text style={styles.sub}>{t('labbook.result.failedBody')}</Text>
              <Button label={t('labbook.result.again')} onPress={vm.startOver} fullWidth />
            </View>
          ) : null}
        </View>
      </View>
      {toast ? <Toast message={t(toast)} tone={toast === 'labbook.result.copyFailed' ? 'error' : 'success'} onDone={() => setToast('')} /> : null}
    </View>
  );
});

/** A calendar entry for the collection. Generic on purpose: no test name leaves the app (Rule L). */
export function icsFor(title: string, start: string, end: string, ref: string): string {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const now = stamp(new Date().toISOString());
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Student Kare//Lab booking//EN', 'BEGIN:VEVENT',
    `UID:${ref}@studentkare`, `DTSTAMP:${now}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end || start)}`,
    `SUMMARY:${title} (${ref})`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: space.s12, backgroundColor: color.heroBg,
    paddingHorizontal: space.s16, paddingTop: space.s16, paddingBottom: space.s40 + space.s32,
  },
  heroBack: { width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  replay: {
    minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s8, paddingHorizontal: space.s10,
    borderRadius: radius.md, backgroundColor: color.surface,
  },
  replayText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  cardWrap: { marginTop: -(space.s40 + space.s16), paddingHorizontal: space.s12, alignItems: 'center' },
  card: {
    width: '100%', maxWidth: 560, borderRadius: radius.sheet, backgroundColor: color.surface, padding: space.s20,
    gap: space.s20, overflow: 'hidden',
  },
  confetti: { position: 'absolute', left: 0, right: 0, top: 0, height: 160 },
  confettiPiece: { position: 'absolute' },
  top: { alignItems: 'center', gap: space.s12, paddingTop: space.s8 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center' },
  sub: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, fontWeight: fontWeight(font.weight.strong), color: color.text2, textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: space.s20, marginTop: space.s16 },
  link: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s8, paddingHorizontal: space.s4 },
  linkText: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  linkTextOff: { color: color.text3 },
  details: { borderWidth: 1, borderColor: color.rule, borderRadius: radius.xl, padding: space.s16, gap: space.s16, marginTop: space.s16 },
  party: { gap: space.s4 },
  partyLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  partyName: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  partyLine: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  partyMono: { fontFamily: font.family.mono, fontSize: font.size.caption, color: color.text3 },
  more: { gap: space.s10, paddingTop: space.s14, borderTopWidth: 1, borderTopColor: color.rule, borderStyle: 'dashed' },
  moreRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.s16 },
  moreKey: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  moreValue: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text, textAlign: 'right' },
  flip: { transform: [{ rotate: '180deg' }] },
  ctas: { gap: space.s14, marginTop: space.s16 },
});
