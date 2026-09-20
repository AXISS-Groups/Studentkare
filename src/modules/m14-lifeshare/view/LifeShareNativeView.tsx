import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useLifeShareViewModel } from '../viewmodel/useLifeshareViewModel';
import type { DonorProfile } from '../domain/LifeShare';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const LifeShareNativeView: React.FC = observer(() => {
  const { state, actions } = useLifeShareViewModel();

  const filteredDonors = state.donors.filter((d: DonorProfile) => d.bloodGroup === state.selectedBloodGroup);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>LifeShare Blood Network</Text>
      <Text style={styles.subtitle}>Select blood group to find compatible donors:</Text>

      <View style={styles.bgStrip}>
        {BLOOD_GROUPS.map((bg) => (
          <TouchableOpacity
            key={bg}
            style={[styles.bgPill, state.selectedBloodGroup === bg && styles.activePill]}
            onPress={() => actions.setBloodGroup(bg)}
          >
            <Text style={[styles.bgText, state.selectedBloodGroup === bg && styles.activeText]}>{bg}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionHeader}>Compatible Campus Donors ({state.compatibleDonorsCount})</Text>

      {filteredDonors.map((item: DonorProfile) => (
        <View key={item.id} style={styles.donorCard}>
          <Text style={styles.bgBadge}>{item.bloodGroup}</Text>
          <View style={styles.donorInfo}>
            <Text style={styles.donorName}>{item.name}</Text>
            <Text style={styles.donorMeta}>Last donated {item.lastDonatedDaysAgo} days ago</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  bgStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  bgPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  activePill: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  bgText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  activeText: { color: '#ffffff' },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  donorCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  bgBadge: { fontSize: 12, fontWeight: '800', color: '#dc2626', backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  donorInfo: { flex: 1 },
  donorName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  donorMeta: { fontSize: 11, color: '#64748b' },
});
