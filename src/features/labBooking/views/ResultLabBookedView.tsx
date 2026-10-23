import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useLanguage, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { ErrorState, ResultMomentCard, ResultMomentScreen, Skeleton, Toast } from '@/design-system';
import { money } from '@/data/types/workflowTypes';
import type { LabBooking } from '../data/LabBookingRepository';
import type { LabBookingViewModel } from '../viewmodel/LabBookingViewModel';
import { bookingRef, slotLabel } from './labFormat';

function addressLine(t: ReturnType<typeof useT>, booking: LabBooking): string {
  const a = booking.order.collectionAddress;
  if (a?.kind === 'HOSTEL') return t('labbook.sheet.metaHostel', { block: a.hostelBlock ?? '', room: a.room ?? '' });
  return t('labbook.result.home');
}

/**
 * Result — lab test booked (canvas page 2 "ResultLabBooked", SK-036, Tier 2),
 * drawn with the shared result moment (design-system/ResultMoment).
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

  const more = booking ? {
    showLabel: t('labbook.result.more'),
    hideLabel: t('labbook.result.less'),
    rows: [
      { k: t('labbook.result.fasting'), v: booking.booking.fastingHours > 0
        ? t('labbook.result.fastingValue', { hours: booking.booking.fastingHours }) : t('labbook.result.noFasting') },
      { k: t('labbook.result.collector'), v: t('labbook.result.collectorValue') },
      { k: t('labbook.result.report'), v: booking.booking.reportHours > 0
        ? t('labbook.result.reportValue', { hours: booking.booking.reportHours }) : t('labbook.result.reportNoHours') },
    ],
  } : undefined;

  return (
    <View style={styles.screen} testID="lab-result">
      <ResultMomentScreen title={t('labbook.title')} backLabel={t('labbook.back')} onBack={onBack} replayLabel={t('labbook.result.replay')}>
        {vm.outcome === 'loading' ? <Skeleton label={t('labbook.result.loading')} lines={['50%', '80%', '100%', '100%']} /> : null}

        {vm.outcome === 'error' ? (
          <ErrorState title={t('labbook.errorTitle')} body={t('labbook.errorBody')} retryLabel={t('labbook.retry')}
            onRetry={() => void vm.showResult()} reference={ref ? { label: t('labbook.reference'), code: ref } : undefined} />
        ) : null}

        {vm.outcome === 'booked' && booking ? (
          <ResultMomentCard
            testID="lab-result-booked"
            moment={{ kind: 'success', context: 'booking' }}
            title={t('labbook.result.title')}
            sub={t('labbook.result.sub', { name: booking.booking.packageName, when })}
            share={{ label: t('labbook.result.copy'), onPress: () => void copy(), testID: 'lab-copy' }}
            receipt={{ label: t('labbook.result.receipt'), accessibilityLabel: t('labbook.result.receiptSoon'), onPress: () => undefined, disabled: true }}
            parties={[
              { label: t('labbook.result.to'), name: booking.booking.labName, line: booking.booking.accreditation,
                mono: t('labbook.result.booking', { ref }) },
              { label: t('labbook.result.from'), name: studentName, line: addressLine(t, booking),
                mono: amount ? t(testMode ? 'labbook.result.paidTest' : 'labbook.result.paid', { amount }) : '' },
            ]}
            more={more}
            primary={{ label: t('labbook.result.view'), onPress: onViewBooking, testID: 'lab-view-booking' }}
            secondary={{ label: t('labbook.result.calendar'), onPress: calendar, testID: 'lab-calendar' }}
          />
        ) : null}

        {vm.outcome === 'pending' ? (
          <ResultMomentCard
            testID="lab-result-pending"
            moment={{ kind: 'pending' }}
            title={t('labbook.result.pendingTitle')}
            sub={t('labbook.result.pendingBody')}
            primary={{ label: t('labbook.pay.bookings'), onPress: onViewBooking }}
            secondary={{ label: t('labbook.result.check'), onPress: () => void vm.showResult(), testID: 'lab-check' }}
          />
        ) : null}

        {vm.outcome === 'failed' ? (
          <ResultMomentCard
            testID="lab-result-failed"
            moment={{ kind: 'failure' }}
            title={t('labbook.result.failedTitle')}
            sub={t('labbook.result.failedBody')}
            primary={{ label: t('labbook.result.again'), onPress: vm.startOver }}
          />
        ) : null}
      </ResultMomentScreen>
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

const styles = StyleSheet.create({ screen: { flex: 1 } });
