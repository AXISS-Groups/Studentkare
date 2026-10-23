import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, EmptyState, ErrorState, Skeleton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { color, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useT, type MessageKey } from '@/i18n';
import { campDayView, checkInToCamp, completeCampStation, loadMyCampDay } from '@/features/camp/day/campDay';
import type { CampDayData, CampDayStationView } from '@/features/camp/day/campDay';

/**
 * CampDay on the phone (design page 6, Tier 2): the camp the student is
 * registered for, their slot and stations, read from the same endpoints as
 * the web panel (see features/camp/day/campDay.ts). Booking a slot happens on
 * the Camps screen (M2Camps); with no booking this says so and opens it. The board's token, "students ahead" and live queue have
 * no endpoint: the queue says it isn't connected, and no number is invented.
 * Navigation and safe-area handling belong to the native shell.
 */
type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; data: CampDayData | null };

export function CampScreen({ onOpenProviders, onFindCamps, onSeeResults, onBack }: { onOpenProviders?: () => void; onFindCamps?: () => void; onSeeResults?: () => void; onBack?: () => void }) {
  const t = useT();
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoad({ state: 'loading' });
    loadMyCampDay(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setLoad({ state: 'ready', data }); },
      () => { if (!controller.signal.aborted) setLoad({ state: 'error' }); },
    );
    return () => controller.abort();
  }, [version]);

  const act = async (run: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try { await run(); reload(); } catch (reason) { setError(reason instanceof Error ? reason.message : t('pc.home.decideFailed')); } finally { setBusy(false); }
  };

  if (load.state === 'loading') return <View style={styles.screen}><Skeleton lines={['70%', '90%', '60%', '80%']} label={t('pc.day.loading')} /></View>;
  if (load.state === 'error') {
    return <View style={styles.screen}><ErrorState title={t('pc.day.errorTitle')} body={t('console.error.body')} retryLabel={t('common.tryAgain')} onRetry={reload} reference={{ label: t('pc.day.refLabel'), code: t('pc.day.ref') }} /></View>;
  }
  const data = load.data;
  if (!data) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <EmptyState title={t('care.campNative.emptyTitle')} body={t('care.campNative.emptyBody')} action={onFindCamps ? { label: t('camps.findCamp'), onPress: onFindCamps } : onOpenProviders ? { label: t('care.campNative.directory'), onPress: onOpenProviders } : undefined} />
      </ScrollView>
    );
  }

  const view = campDayView(data, new Date());
  const meta = [data.camp.location || t('care.campus'), data.camp.date, t('pc.day.stations', { count: view.stations.length })].join(' · ');
  return (
    <ScrollView style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.heroBar}>
          {onBack ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t('pc.day.back')} onPress={onBack} style={styles.back}>
              <Icon name="arrow-left" size={20} color={color.onHero} />
            </Pressable>
          ) : null}
          <Text style={styles.kicker}>{t('pc.day.kicker')}</Text>
          {view.isToday ? <Text style={styles.today}>{t('pc.day.today')}</Text> : null}
        </View>
        <Text accessibilityRole="header" style={styles.title}>{data.camp.name}</Text>
        <Text style={styles.meta}>{meta}</Text>
        <View style={styles.slot}>
          <Text style={styles.slotTitle}>{data.slot ? t('pc.day.slot', { start: data.slot.slotStart, end: data.slot.slotEnd }) : t('pc.day.noSlot')}</Text>
          <Text style={styles.meta}>{data.status.checkedIn ? t('pc.day.checkedIn') : t('pc.day.notCheckedIn')}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {!data.status.checkedIn ? <Button label={t('pc.day.checkIn')} size="cta" busy={busy} onPress={() => { void act(() => checkInToCamp(data.camp.id)); }} /> : null}

        <Text accessibilityRole="header" style={styles.eyebrow}>{t('pc.day.yourStations')}</Text>
        {view.stations.length ? view.stations.map((station) => (
          <StationRow key={station.id} station={station} busy={busy} onComplete={() => { void act(() => completeCampStation(data.camp.id, station.id)); }} />
        )) : <Text style={styles.muted}>{t('pc.day.noStations')}</Text>}
        {view.allDone ? <Text style={styles.muted}>{t('pc.day.allDone')}</Text> : null}

        <Text accessibilityRole="header" style={styles.eyebrow}>{t('pc.day.queue')}</Text>
        <Text style={styles.queue}>{t('pc.day.queueUnconnected')}</Text>

        <View style={styles.privacy}>
          <Icon name="lock-3" size={18} color={color.positive} />
          <Text style={styles.privacyText}>{t('pc.day.privacy')}</Text>
        </View>
        {onSeeResults ? <Button label={t('pc.day.seeResults')} size="cta" fullWidth onPress={onSeeResults} /> : null}
      </View>
    </ScrollView>
  );
}

function StationRow({ station, busy, onComplete }: { station: CampDayStationView; busy: boolean; onComplete: () => void }) {
  const t = useT();
  const marked = station.state !== 'next';
  return (
    <View style={styles.station} accessible accessibilityLabel={`${station.name}, ${t(`pc.day.state.${station.state}` as MessageKey)}`}>
      <View style={[styles.mark, marked ? styles.markOn : null]}>
        {station.state === 'done' ? <Icon name="check" size={14} strokeWidth={3} color={color.onAction} /> : null}
      </View>
      <View style={styles.stationWords}>
        <Text style={[styles.stationName, marked ? null : styles.stationNext]}>{station.name}</Text>
        {station.state === 'now' ? <Button label={t('pc.day.markDone')} variant="ghost" disabled={busy} onPress={onComplete} /> : null}
      </View>
      {station.state === 'done' ? <Text style={[styles.tag, styles.tagDone]}>{t('pc.day.done')}</Text> : null}
      {station.state === 'now' ? <Text style={[styles.tag, styles.tagNow]}>{t('pc.day.now')}</Text> : null}
    </View>
  );
}

const MARK = 28;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center' },
  hero: { backgroundColor: color.heroBg, padding: space.gutterPhone, gap: space.s6 },
  heroBar: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  back: { width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, backgroundColor: color.onHeroVeil, alignItems: 'center', justifyContent: 'center' },
  kicker: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  today: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onHero, backgroundColor: color.onHeroVeil, borderRadius: radius.full, paddingHorizontal: space.s10, paddingVertical: space.s4 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.onHero, marginTop: space.s10 },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.onHero2 },
  slot: { marginTop: space.s12, padding: space.s14, borderRadius: radius.xl, backgroundColor: color.onHeroVeil, gap: space.s2 },
  slotTitle: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text2, letterSpacing: 1, textTransform: 'uppercase' },
  muted: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
  error: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.danger },
  station: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s14, minHeight: size.touchTarget },
  mark: { width: MARK, height: MARK, borderRadius: radius.full, borderWidth: 2, borderColor: color.ruleStrong, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  markOn: { borderColor: color.action, backgroundColor: color.action },
  stationWords: { flex: 1, gap: space.s2 },
  stationName: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  stationNext: { color: color.text2 },
  tag: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), borderRadius: radius.full, paddingHorizontal: space.s10, paddingVertical: space.s4, overflow: 'hidden' },
  tagDone: { color: color.positive, backgroundColor: color.positiveBg },
  tagNow: { color: color.action, backgroundColor: color.surface3 },
  queue: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, backgroundColor: color.surface, borderRadius: radius.xl, padding: space.s16 },
  privacy: { flexDirection: 'row', gap: space.s10, padding: space.s14, borderRadius: radius.xl, backgroundColor: color.positiveBg },
  privacyText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.positive },
});
