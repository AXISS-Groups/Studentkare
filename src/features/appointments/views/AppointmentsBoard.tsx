import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ErrorState, Note, Skeleton, useOnline } from '@/design-system';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardArt, BoardRow, BoardScreen, BoardSection, FirstTime, OfflinePanel, Pill, TextLink, boardText } from '@/design-system/board/BoardKit';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
import { apiRequest } from '@/data/services/http';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { clockLabel, dayLabel, shortDate, toDate } from '@/features/phoneboards/format';

export interface BoardAppointment { id: string; catalogItemId: string; slotStart: string; slotEnd: string; status: string; createdAt: number }

export interface AppointmentsBoardLinks {
  /** Book a consult (web: the booking dialog; Expo: the booking screen). */
  book: () => void;
  /** Back to Your Care, where the board is opened from. */
  back?: () => void;
  /** Join a confirmed consult's waiting room. */
  join?: (appointment: BoardAppointment) => void;
  /** Signed visit notes, for a finished consult. */
  notes?: () => void;
  emergencyCard?: () => void;
  pass?: () => void;
  crisis?: () => void;
}

const UPCOMING = new Set(['REQUESTED', 'CONFIRMED']);
const KNOWN_STATUS = new Set(['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);

/**
 * Appointments (canvas page 2, Appointments, Tier 2): the next consult, what is
 * coming up and what has happened. Names come from the consult catalogue, times
 * from the slot. A request is called a request until the provider confirms it.
 * The board's "Move your consult" sheet is not drawn: there is no reschedule
 * endpoint, and a request can be cancelled and booked again instead.
 */
export function AppointmentsBoard({ links, reloadKey = 0 }: { links: AppointmentsBoardLinks; reloadKey?: number }): React.ReactElement {
  const t = useT();
  const online = useOnline();
  const appts = useApiResource<{ items: BoardAppointment[] }>(`/appointments?v=${reloadKey}`);
  const catalog = useApiResource<{ items: { id: string; name: string }[] }>('/catalog?kind=consultation&limit=50');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const names = new Map((catalog.data?.items ?? []).map((item) => [item.id, item.name]));
  const nameOf = (a: BoardAppointment) => names.get(a.catalogItemId) ?? t('pb.appt.consultation');
  const statusOf = (s: string) => (KNOWN_STATUS.has(s) ? t(`care.appts.status.${s}` as MessageKey) : s);
  const now = Date.now();
  const startOf = (a: BoardAppointment) => toDate(a.slotStart)?.getTime() ?? 0;
  const items = appts.data?.items ?? [];
  const upcoming = items.filter((a) => UPCOMING.has(a.status) && startOf(a) > now).sort((a, b) => startOf(a) - startOf(b));
  const past = items.filter((a) => !upcoming.includes(a)).sort((a, b) => startOf(b) - startOf(a));
  const next = upcoming[0];

  const cancel = (a: BoardAppointment) => {
    setBusyId(a.id);
    setError('');
    apiRequest(`/appointments/${encodeURIComponent(a.id)}`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) })
      .then(() => appts.reload(), (reason: Error) => setError(reason.message))
      .finally(() => setBusyId(''));
  };

  return (
    <BoardScreen testID="appointments">
      <BoardHeader
        title={t('pb.appt.title')}
        backIcon="arrow-left"
        backLabel={t('common.back')}
        onBack={links.back}
        trailingKey="book"
        trailing={<TextLink label={t('pb.appt.book')} onPress={links.book} testID="appointments-book" />}
      />

      {!online ? (
        <OfflinePanel
          title={t('pb.offline.title')} body={t('pb.offline.body')} retryLabel={t('pb.offline.retry')} onRetry={appts.reload}
          stillWorksLabel={t('pb.offline.stillWorks')} tickIcon="check"
          links={[
            ...(links.emergencyCard ? [{ label: t('pb.offline.emergencyCard'), onPress: links.emergencyCard }] : []),
            ...(links.pass ? [{ label: t('pb.offline.pass'), onPress: links.pass }] : []),
            ...(links.crisis ? [{ label: t('pb.offline.crisis'), onPress: links.crisis }] : []),
          ]}
        />
      ) : null}

      {appts.loading ? <Skeleton label={t('pb.appt.loading')} lines={['100%', '70%', '100%', '70%']} /> : null}
      {appts.error && !appts.loading ? <ErrorState title={t('pb.appt.failedTitle')} body={t('pb.yc.failedBody')} retryLabel={t('common.tryAgain')} onRetry={appts.reload} /> : null}
      {error ? <Note tone="danger">{error}</Note> : null}

      {appts.data && items.length === 0 ? (
        <FirstTime testID="appointments-first" tile="calendar-alt--p4" title={t('pb.appt.firstTitle')} body={t('pb.appt.firstBody')}
          actions={[{ label: t('pb.appt.talk'), onPress: links.book }]} />
      ) : null}

      {next ? (
        <View style={styles.hero} testID="appointments-next">
          <View style={styles.heroWords}>
            <Text style={boardText.eyebrow}>{t('pb.appt.nextUp')}</Text>
            <Text accessibilityRole="header" style={styles.heroWhen}>{`${dayLabel(next.slotStart, t)}, ${clockLabel(next.slotStart)}`}</Text>
            <Text style={boardText.body}>{`${nameOf(next)} · ${statusOf(next.status)}`}</Text>
          </View>
          <BoardArt name="a-doctor-on-a-video-consult-460112.png" width={132} height={104} />
        </View>
      ) : null}

      {upcoming.length ? (
        <BoardSection label={t('pb.appt.upcoming')}>
          {upcoming.map((a) => (
            <View key={a.id} style={styles.upcoming} testID={`appointment-${a.id}`}>
              <View style={styles.when}>
                <Text style={styles.whenDay}>{dayLabel(a.slotStart, t)}</Text>
                <Text style={styles.whenTime}>{clockLabel(a.slotStart)}</Text>
              </View>
              <View style={styles.what}>
                <Text style={boardText.strong}>{nameOf(a)}</Text>
                <Text style={boardText.meta}>{t('pb.appt.endsAt', { time: clockLabel(a.slotEnd) })}</Text>
                <View style={styles.actions}>
                  {a.status === 'CONFIRMED' && links.join ? <TextLink label={t('care.appts.checkIn')} onPress={() => links.join?.(a)} /> : null}
                  {a.status === 'REQUESTED' ? (
                    <TextLink label={busyId === a.id ? t('pb.appt.cancelling') : t('care.appts.cancel')} tone="danger" onPress={() => { if (!busyId) cancel(a); }} />
                  ) : null}
                </View>
              </View>
              <Pill label={statusOf(a.status)} tone={a.status === 'CONFIRMED' ? 'action' : 'neutral'} dot={a.status === 'CONFIRMED'} />
            </View>
          ))}
        </BoardSection>
      ) : null}

      {past.length ? (
        <BoardSection label={t('pb.appt.past')}>
          {past.map((a) => (
            <BoardRow
              key={a.id}
              title={nameOf(a)}
              meta={`${shortDate(a.slotStart)} · ${statusOf(a.status)}`}
              onPress={a.status === 'COMPLETED' ? links.notes : undefined}
              trailing={a.status === 'COMPLETED' && links.notes ? <Text style={styles.cta}>{t('pb.appt.notes')}</Text> : null}
            />
          ))}
        </BoardSection>
      ) : null}
    </BoardScreen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.s12, backgroundColor: color.surface3, borderRadius: radius.sheet, padding: space.s20 },
  heroWords: { flex: 1, gap: space.s4 },
  heroWhen: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  upcoming: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12, paddingVertical: space.s12, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  when: { width: 76, gap: space.s2 },
  whenDay: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  whenTime: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2 },
  what: { flex: 1, minWidth: 0, gap: space.s2 },
  actions: { flexDirection: 'row', gap: space.s12 },
  cta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
});
