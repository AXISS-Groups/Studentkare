import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useCampViewModel } from '@/features/camp/viewmodel/useCampViewModel';
import { Button, EmptyState } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { useT, type MessageKey } from '@/i18n';

/**
 * The student's health camp on the phone. Navigation and safe-area handling
 * belong to the native shell.
 *
 * Nothing loads a camp into the store on the phone yet, so in practice this
 * shows the empty state. It used to read "demonstration data" and offer
 * "Complete next station" and "Seal & award points" — controls that could
 * never be enabled (there is no note field) and that turned a health check
 * into points.
 */
export const CampScreen = observer(function CampScreen({ onOpenProviders }: { onOpenProviders?: () => void }) {
  const t = useT();
  const vm = useCampViewModel();
  const camp = vm.camp;
  const directory = onOpenProviders
    ? <Button label={t('care.campNative.directory')} accessibilityLabel={t('care.campNative.directorySpoken')} variant="secondary" onPress={onOpenProviders} />
    : null;

  if (!camp.id) {
    return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <EmptyState title={t('care.campNative.emptyTitle')} body={t('care.campNative.emptyBody')} />
      {directory}
    </ScrollView>;
  }

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    {directory}
    <Text accessibilityRole="header" style={styles.title}>{camp.campName}</Text>
    <Text style={styles.body}>{t('care.campNative.progress', { done: camp.completedCount, total: camp.totalStations, percent: vm.progressPercent })}</Text>
    {camp.location || camp.date ? <Text style={styles.body}>{[camp.location, camp.date].filter(Boolean).join(' · ')}</Text> : null}
    {camp.stations.map(station => <View key={station.id}>
      <Text style={styles.body}>{station.name} — {t(`care.campNative.station.${vm.stationStatus(station)}` as MessageKey)}</Text>
    </View>)}
  </ScrollView>;
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, width: '100%', maxWidth: 800, alignSelf: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text },
});
