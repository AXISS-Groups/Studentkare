import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useEmergencySosViewModel } from '../viewmodel/useEmergencySosViewModel';

export const EmergencySosNativeView: React.FC = observer(() => {
  const { state, actions } = useEmergencySosViewModel();

  if (state.status === 'COUNTDOWN') {
    return (
      <View style={[styles.container, styles.countdownBg]}>
        <Text style={styles.countdownTitle}>TRIGGERING SOS</Text>
        <Text style={styles.countdownNumber}>{state.countdownSeconds}</Text>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => actions.cancelSos()}>
          <Text style={styles.cancelBtnText}>Cancel SOS</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state.status === 'DISPATCHED' && state.activeDispatch) {
    return (
      <View style={styles.container}>
        <Text style={styles.dispatchedTitle}>Ambulance Dispatched!</Text>
        <Text style={styles.dispatchedMeta}>Unit: {state.activeDispatch.unitId}</Text>
        <Text style={styles.dispatchedMeta}>ETA: {state.activeDispatch.etaMinutes} Mins</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={() => actions.reset()}>
          <Text style={styles.resetBtnText}>Reset Card</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency SOS</Text>
      <Text style={styles.subtitle}>Campus Ambulance & Security Dispatch</Text>

      <TouchableOpacity style={styles.sosButton} onPress={() => actions.triggerSos()}>
        <Text style={styles.sosText}>PRESS FOR SOS</Text>
        <Text style={styles.sosSubtext}>3s Countdown</Text>
      </TouchableOpacity>

      <Text style={styles.locationText}>Location: {state.userLocation}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', padding: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 30, textAlign: 'center' },
  sosButton: { width: 200, height: 200, borderRadius: 100, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center', borderWidth: 8, borderColor: '#fee2e2', marginBottom: 30 },
  sosText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  sosSubtext: { color: '#fef2f2', fontSize: 11, marginTop: 4 },
  locationText: { fontSize: 12, color: '#475569', textAlign: 'center' },
  countdownBg: { backgroundColor: '#fef2f2' },
  countdownTitle: { fontSize: 18, fontWeight: '800', color: '#991b1b', marginBottom: 12 },
  countdownNumber: { fontSize: 72, fontWeight: '900', color: '#dc2626', marginBottom: 30 },
  cancelBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  cancelBtnText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  dispatchedTitle: { fontSize: 22, fontWeight: '800', color: '#15803d', marginBottom: 8 },
  dispatchedMeta: { fontSize: 14, color: '#0f172a', marginBottom: 4 },
  resetBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 20 },
  resetBtnText: { color: '#334155', fontWeight: '700' },
});
