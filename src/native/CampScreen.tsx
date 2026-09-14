import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useCampViewModel } from '@/features/camp/viewmodel/useCampViewModel';

/** Demonstration view; navigation and safe-area handling belong to the native shell. */
export const CampScreen = observer(function CampScreen({ onOpenProviders }: { onOpenProviders?: () => void }) {
  const vm = useCampViewModel();
  const camp = vm.camp;
  const nextStation = camp.stations.find(station => station.status !== 'COMPLETED');
  return <ScrollView contentContainerStyle={{ padding: 24, width: '100%', maxWidth: 800, alignSelf: 'center' }}>
    <Text style={{ marginBottom: 8 }}>Camp proof of concept · demonstration data</Text>
    {onOpenProviders && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open public vaccine directory" style={{ minHeight: 48, justifyContent: 'center', marginBottom: 16 }} onPress={onOpenProviders}><Text style={{ color: '#155e75', fontSize: 17, fontWeight: '700' }}>Browse public vaccine directory →</Text></TouchableOpacity>}
    <Text style={{ fontSize: 22, fontWeight: '800' }}>{camp.campName}</Text>
    <Text style={{ marginTop: 8 }}>Student: {vm.studentName}</Text>
    <Text style={{ marginTop: 4 }}>{camp.completedCount} of {camp.totalStations} stations · {vm.progressPercent}%</Text>
    <Text style={{ marginTop: 4 }}>{camp.location} · {camp.date}</Text>
    {camp.stations.map(station => <View key={station.id} style={{ marginTop: 8 }}><Text>{station.name} — {vm.stationStatus(station)}</Text></View>)}
    <View style={{ marginTop: 16 }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Complete next station" disabled={!nextStation} style={{ minHeight: 44, justifyContent: 'center', opacity: nextStation ? 1 : 0.5 }} onPress={() => nextStation && vm.openCompleteModal(nextStation)}><Text>Complete next station</Text></TouchableOpacity>
      {vm.activeModalStation && <Text>Selected: {vm.activeModalStation.name}</Text>}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Seal & award points" disabled={!vm.canConfirm} style={{ minHeight: 44, justifyContent: 'center', opacity: vm.canConfirm ? 1 : 0.5 }} onPress={() => vm.confirmComplete()}><Text>Seal & award points</Text></TouchableOpacity>
    </View>
  </ScrollView>;
});
