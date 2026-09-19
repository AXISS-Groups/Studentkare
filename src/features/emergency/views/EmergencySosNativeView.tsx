import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { EmergencySosViewModel } from '../viewmodel/EmergencySosViewModel';

interface EmergencySosNativeViewProps {
  viewModel: EmergencySosViewModel;
}

/**
 * Mobile (React Native) View Component for Emergency SOS & Campus Dispatch.
 * Binds reactively to `EmergencySosViewModel` via MobX `observer`.
 */
export const EmergencySosNativeView: React.FC<EmergencySosNativeViewProps> = observer(({ viewModel }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>24/7 CAMPUS EMERGENCY SOS DISPATCH</Text>
        <Text style={styles.title}>Emergency Medical Response</Text>
      </View>

      {viewModel.status === 'IDLE' && (
        <View style={styles.sosCard}>
          <TouchableOpacity style={styles.sosButton} onPress={() => viewModel.triggerSos()}>
            <Text style={styles.sosButtonText}>SOS</Text>
            <Text style={styles.sosSubText}>PRESS FOR EMERGENCY</Text>
          </TouchableOpacity>

          <View style={styles.locationCard}>
            <Text style={styles.locationLabel}>Current GPS Location:</Text>
            <Text style={styles.locationText}>{viewModel.userLocation}</Text>
          </View>
        </View>
      )}

      {viewModel.status === 'COUNTDOWN' && (
        <View style={styles.countdownCard}>
          <Text style={styles.alertTitle}>DISPATCHING IN</Text>
          <Text style={styles.countdownText}>{viewModel.countdownSeconds}</Text>
          <Text style={styles.alertSub}>Campus Security and Medical Officers responding.</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => viewModel.cancelSos()}>
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.dispatchBtn]} onPress={() => viewModel.dispatchEmergency()}>
              <Text style={styles.dispatchBtnText}>DISPATCH NOW</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {viewModel.status === 'DISPATCHED' && (
        <View style={styles.dispatchedCard}>
          <Text style={styles.dispatchedBadge}>● LIVE AMBULANCE DISPATCHED</Text>
          {viewModel.activeDispatch && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Unit: {viewModel.activeDispatch.unitId}</Text>
              <Text style={styles.infoEta}>ETA: {viewModel.activeDispatch.etaMinutes} minutes</Text>
              <Text style={styles.infoDriver}>Paramedic: {viewModel.activeDispatch.driverName} ({viewModel.activeDispatch.driverPhone})</Text>
            </View>
          )}

          <Text style={styles.contactsTitle}>Contacts Automated SMS Alert:</Text>
          {viewModel.emergencyContacts.map(c => (
            <View key={c.id} style={styles.contactItem}>
              <Text style={styles.contactName}>{c.name} ({c.relation})</Text>
              <Text style={styles.contactStatus}>SENT</Text>
            </View>
          ))}

          <TouchableOpacity style={[styles.btn, styles.resetBtn, { marginTop: 16 }]} onPress={() => viewModel.reset()}>
            <Text style={styles.resetBtnText}>Reset SOS Status</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dc2626',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  sosCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  sosButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    elevation: 8,
  },
  sosButtonText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
  },
  sosSubText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  locationCard: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  locationText: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '700',
    marginTop: 2,
  },
  countdownCard: {
    backgroundColor: '#fff5f5',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991b1b',
  },
  countdownText: {
    fontSize: 64,
    fontWeight: '900',
    color: '#dc2626',
    marginVertical: 8,
  },
  alertSub: {
    fontSize: 12,
    color: '#7f1d1d',
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  dispatchBtn: {
    backgroundColor: '#dc2626',
  },
  dispatchBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  dispatchedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  dispatchedBadge: {
    color: '#16a34a',
    fontWeight: '800',
    fontSize: 12,
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14532d',
  },
  infoEta: {
    fontSize: 16,
    fontWeight: '800',
    color: '#166534',
    marginVertical: 4,
  },
  infoDriver: {
    fontSize: 12,
    color: '#15803d',
  },
  contactsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  contactName: {
    fontSize: 12,
    color: '#334155',
  },
  contactStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  resetBtn: {
    backgroundColor: '#f1f5f9',
  },
  resetBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
});
