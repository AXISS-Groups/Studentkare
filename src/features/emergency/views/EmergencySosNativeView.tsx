import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { observer } from 'mobx-react-lite';
import { color } from '@/design-system/theme';
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
    backgroundColor: color.surface2,
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
    color: color.text3,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: color.text,
  },
  sosCard: {
    backgroundColor: color.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: color.rule,
  },
  sosButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: color.dangerFill,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    elevation: 8,
  },
  sosButtonText: {
    color: color.onDangerFill,
    fontSize: 36,
    fontWeight: '900',
  },
  sosSubText: {
    color: color.onDangerFill,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  locationCard: {
    backgroundColor: color.surface2,
    padding: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 11,
    color: color.text3,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 12,
    color: color.text,
    fontWeight: '700',
    marginTop: 2,
  },
  countdownCard: {
    backgroundColor: color.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: color.ruleStrong,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: color.text,
  },
  countdownText: {
    fontSize: 64,
    fontWeight: '900',
    color: color.danger,
    marginVertical: 8,
  },
  alertSub: {
    fontSize: 12,
    color: color.text2,
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
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.ruleStrong,
  },
  cancelBtnText: {
    color: color.text2,
    fontWeight: '700',
    fontSize: 12,
  },
  dispatchBtn: {
    backgroundColor: color.dangerFill,
  },
  dispatchBtnText: {
    color: color.onDangerFill,
    fontWeight: '800',
    fontSize: 12,
  },
  dispatchedCard: {
    backgroundColor: color.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: color.positiveRule,
  },
  dispatchedBadge: {
    color: color.positive,
    fontWeight: '800',
    fontSize: 12,
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: color.positiveBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: color.positive,
  },
  infoEta: {
    fontSize: 16,
    fontWeight: '800',
    color: color.positive,
    marginVertical: 4,
  },
  infoDriver: {
    fontSize: 12,
    color: color.positive,
  },
  contactsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: color.text,
    marginBottom: 8,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: color.surface2,
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  contactName: {
    fontSize: 12,
    color: color.text2,
  },
  contactStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: color.positive,
  },
  resetBtn: {
    backgroundColor: color.surface2,
  },
  resetBtnText: {
    color: color.text2,
    fontSize: 12,
    fontWeight: '600',
  },
});
