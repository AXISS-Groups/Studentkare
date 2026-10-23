import React, { useCallback, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { navigate } from '@/lib/utils/workflowRouting';
import { useAuth } from '@/data/contexts/AuthContext';
import { useT } from '@/i18n';
import { ErrorState, Skeleton } from '@/design-system';
import { CampDayView } from '../day/CampDayView';
import { checkInToCamp, completeCampStation, loadCampDay } from '../day/campDay';
import type { CampDayData } from '../day/campDay';
import { addBookingToCalendar } from '../data/calendar';
import { CampsBookingViewModel } from '../viewmodel/CampsBookingViewModel';
import { M2CampsView } from './M2CampsView';
import { ResultCampBookedView } from './ResultCampBookedView';

type Day = { state: 'loading' } | { state: 'error' } | { state: 'ready'; data: CampDayData | null };

/**
 * Health camps on the web (/health-camp): the phone board at phone width and the
 * same board in the desktop page column. A booking made here shows the booking
 * result first (canvas ResultCampBooked); "Open camp day" shows the camp day
 * (canvas CampDay) with the student's own check-in and stations, as before.
 */
export const M2CampsRoute = observer(function M2CampsRoute({ wide = false }: { wide?: boolean }): React.ReactElement {
  const t = useT();
  const { user } = useAuth();
  const [vm] = useState(() => new CampsBookingViewModel());
  const [dayCampId, setDayCampId] = useState<string | null>(null);
  const [day, setDay] = useState<Day>({ state: 'loading' });
  const [dayBusy, setDayBusy] = useState(false);
  const [dayError, setDayError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    vm.load();
    return () => vm.dispose();
  }, [vm]);

  useEffect(() => {
    if (!dayCampId) return undefined;
    const controller = new AbortController();
    setDay({ state: 'loading' });
    loadCampDay(dayCampId, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setDay({ state: 'ready', data }); },
      () => { if (!controller.signal.aborted) setDay({ state: 'error' }); },
    );
    return () => controller.abort();
  }, [dayCampId, version]);

  const act = useCallback(async (run: () => Promise<unknown>) => {
    setDayBusy(true);
    setDayError('');
    try { await run(); setVersion((v) => v + 1); } catch (reason) { setDayError(reason instanceof Error ? reason.message : t('camps.err.generic')); } finally { setDayBusy(false); }
  }, [t]);

  const booked = vm.confirmation;
  if (booked) {
    return (
      <ResultCampBookedView booking={booked} studentName={user?.fullName ?? ''}
        onBack={vm.clearConfirmation} onSeeCamp={() => { const id = booked.camp.id; vm.clearConfirmation(); setDayCampId(id); }}
        onCalendar={() => addBookingToCalendar(booked, t)} />
    );
  }

  if (dayCampId) {
    const back = () => { setDayCampId(null); vm.load(); };
    if (day.state === 'loading') return <Skeleton lines={['70%', '90%', '60%', '80%']} label={t('pc.day.loading')} />;
    if (day.state === 'error' || !day.data) {
      return <ErrorState title={t('pc.day.errorTitle')} body={t('console.error.body')} retryLabel={t('common.tryAgain')} onRetry={() => setVersion((v) => v + 1)} />;
    }
    const data = day.data;
    const slot = data.slot;
    return (
      <CampDayView data={data} busy={dayBusy} error={dayError} onBack={back}
        onCheckIn={() => void act(() => checkInToCamp(data.camp.id))}
        onCompleteStation={(stationId) => void act(() => completeCampStation(data.camp.id, stationId))}
        onSeeResults={() => navigate('records')}
        onAddToCalendar={slot ? () => addBookingToCalendar({ bookingId: `${data.camp.id}:${slot.id}`, camp: { ...data.camp, whatToBring: data.camp.whatToBring ?? '' }, slot }, t) : undefined} />
    );
  }

  return (
    <M2CampsView wide={wide} vm={vm} links={{
      back: () => navigate('health'),
      campDay: (campId) => setDayCampId(campId),
      verifyCampus: () => navigate('verify'),
      findCare: () => navigate('find-care'),
    }} />
  );
});
