import React, { useState } from 'react';
import { ResultMomentCard, ResultMomentScreen, Toast } from '@/design-system';
import { copyText } from '@/data/services/clipboard';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { groupCode } from '../data/campsApi';

/** A camp booking as the server confirmed it (POST /api/camps/{id}/book). */
export interface CampBooking {
  bookingId: string;
  /** The reference the student quotes at the camp desk (not a scannable pass: that is Tier 1). */
  bookingCode?: string;
  camp: { id: string; name: string; date: string; location: string; whatToBring: string };
  slot: { id: string; slotStart: string; slotEnd: string };
}

/**
 * "You're booked" for a health camp (canvas ResultCampBooked; the shared
 * result moment, success · booking). A booking may celebrate; what happens at
 * the camp is never shown here. Everything on the card is the server's
 * answer to the booking: the camp, the slot, the place, what to bring.
 *
 * The receipt link is drawn but not offered: a camp booking has no receipt.
 * Left out from the board: the provider running the camp, what the campus is
 * told and the change-or-cancel window (the booking response carries none of
 * them, so none is claimed).
 */
export function ResultCampBookedView({ booking, studentName, onBack, onSeeCamp, onCalendar, onCopy = copyText }: {
  booking: CampBooking;
  studentName: string;
  onBack: () => void;
  onSeeCamp: () => void;
  /** Web only (an .ics download); the phone app leaves it out. */
  onCalendar?: () => void;
  onCopy?: (text: string) => Promise<boolean>;
}): React.ReactElement {
  const t = useT();
  const [toast, setToast] = useState<MessageKey | ''>('');
  const when = t('phone.camp.when', { date: booking.camp.date, start: booking.slot.slotStart, end: booking.slot.slotEnd });
  const place = booking.camp.location || t('care.campus');
  const share = async () => {
    const ok = await onCopy(t('phone.camp.share', { camp: booking.camp.name, when, place }));
    setToast(ok ? 'phone.result.copied' : 'phone.result.copyFailed');
  };
  return (
    <>
      <ResultMomentScreen title={t('phone.camp.hero')} backLabel={t('common.back')} onBack={onBack} replayLabel={t('pay.result.replay')} testID="result-camp">
        <ResultMomentCard
          testID="result-camp-card"
          moment={{ kind: 'success', context: 'booking' }}
          title={t('phone.camp.title', { camp: booking.camp.name })}
          sub={`${when} · ${place}`}
          share={{ label: t('pay.result.copy'), onPress: () => void share(), testID: 'camp-copy' }}
          receipt={{ label: t('pay.result.receipt'), accessibilityLabel: t('phone.camp.noReceipt'), onPress: () => undefined, disabled: true }}
          parties={[
            { label: t('pay.result.to'), name: booking.camp.name, line: place },
            { label: t('phone.result.from'), name: studentName, line: t('phone.camp.free') },
          ]}
          more={{
            rows: [
              ...(booking.bookingCode ? [{ k: t('camps.bookingRef'), v: groupCode(booking.bookingCode) }] : []),
              { k: t('phone.camp.bring'), v: booking.camp.whatToBring || t('care.camp.nothingToBring') },
              { k: t('phone.camp.whereLabel'), v: place },
            ],
            showLabel: t('pay.result.more'),
            hideLabel: t('pay.result.less'),
          }}
          primary={{ label: t('phone.camp.seeDay'), onPress: onSeeCamp, testID: 'camp-see-day' }}
          secondary={onCalendar ? { label: t('phone.camp.calendar'), onPress: onCalendar, testID: 'camp-calendar' } : undefined}
        />
      </ResultMomentScreen>
      {toast ? <Toast message={t(toast)} tone={toast === 'phone.result.copyFailed' ? 'error' : 'success'} onDone={() => setToast('')} /> : null}
    </>
  );
}
