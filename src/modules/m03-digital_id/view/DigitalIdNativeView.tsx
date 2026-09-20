import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useDigitalIdViewModel } from '../viewmodel/useDigitalIdViewModel';

export const DigitalIdNativeView: React.FC = observer(() => {
  const { state, actions } = useDigitalIdViewModel();
  const profile = state.profile;

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading Digital ID...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.brandTitle}>STUDENTKARE HEALTH ID</Text>
          <Text style={styles.badgeText}>{state.verificationBadgeText}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.fullName.charAt(0)}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{profile.fullName}</Text>
            <Text style={styles.univ}>{profile.university}</Text>
            <Text style={styles.roll}>Roll: {profile.rollNumber}</Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.bloodTag}>Blood Group: {profile.bloodGroup}</Text>
          <TouchableOpacity onPress={() => actions.refreshQrPass()}>
            <Text style={styles.refreshText}>{state.formattedExpiry}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', padding: 16 },
  loadingText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#1e1b4b', borderRadius: 16, padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)', paddingBottom: 10 },
  brandTitle: { fontSize: 11, fontWeight: '700', color: '#c7d2fe' },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#15803d', backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  cardBody: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  info: { flex: 1 },
  name: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  univ: { color: '#c7d2fe', fontSize: 12, marginTop: 2 },
  roll: { color: '#a5b4fc', fontSize: 11, marginTop: 4 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 10 },
  bloodTag: { color: '#fca5a5', fontSize: 12, fontWeight: '700' },
  refreshText: { color: '#a5b4fc', fontSize: 11 },
});
