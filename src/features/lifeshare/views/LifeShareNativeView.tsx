import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { LifeShareViewModel } from '../viewmodel/LifeShareViewModel';

interface LifeShareNativeViewProps {
  viewModel: LifeShareViewModel;
}

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * React Native / Mobile View for LifeShare Blood & Plasma Exchange.
 *
 * Consumes the exact same `LifeShareViewModel` as the web app.
 */
export const LifeShareNativeView: React.FC<LifeShareNativeViewProps> = observer(({ viewModel }) => {
  if (viewModel.createdRequest) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successBadge}>🚨 EMERGENCY SOS DISPATCHED</Text>
        <Text style={styles.successTitle}>Request Broadcasted!</Text>
        <Text style={styles.reqId}>Ref: {viewModel.createdRequest.id}</Text>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>BLOOD GROUP & UNITS</Text>
          <Text style={styles.bloodText}>
            {viewModel.createdRequest.bloodGroup} ({viewModel.createdRequest.unitsNeeded} Units)
          </Text>

          <Text style={[styles.summaryLabel, styles.marginTop]}>HOSPITAL STATION</Text>
          <Text style={styles.summaryVal}>{viewModel.createdRequest.hospitalStation}</Text>

          <Text style={[styles.summaryLabel, styles.marginTop]}>STATUS</Text>
          <Text style={styles.openText}>{viewModel.createdRequest.status}</Text>
        </View>

        <TouchableOpacity style={styles.btnPrimary} onPress={() => viewModel.reset()}>
          <Text style={styles.btnPrimaryText}>Create Another Request</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>CAMPUS EMERGENCY NETWORK</Text>
      <Text style={styles.title}>LifeShare Blood Exchange</Text>

      {viewModel.error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{viewModel.error}</Text>
        </View>
      )}

      {/* Form Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Request Blood / Plasma</Text>

        <Text style={styles.fieldLabel}>Blood Group Required</Text>
        <View style={styles.bgGrid}>
          {bloodGroups.map(bg => (
            <TouchableOpacity
              key={bg}
              style={[styles.bgPill, viewModel.selectedBloodGroup === bg && styles.bgActive]}
              onPress={() => viewModel.setBloodGroup(bg)}
            >
              <Text style={[styles.bgText, viewModel.selectedBloodGroup === bg && styles.bgTextActive]}>
                {bg}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Units Required</Text>
        <View style={styles.stepperRow}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => viewModel.setUnits(viewModel.unitsNeeded - 1)}>
            <Text style={styles.stepBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.unitsCount}>{viewModel.unitsNeeded} Units</Text>
          <TouchableOpacity style={styles.stepBtn} onPress={() => viewModel.setUnits(viewModel.unitsNeeded + 1)}>
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>Hospital / Clinic Station</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Osmania Campus Health Center"
          value={viewModel.hospitalStation}
          onChangeText={(text: string) => viewModel.setHospitalStation(text)}
        />

        <TouchableOpacity
          style={[styles.btnPrimary, !viewModel.canSubmit && styles.btnDisabled]}
          disabled={!viewModel.canSubmit}
          onPress={() => viewModel.createEmergencyRequest()}
        >
          <Text style={styles.btnPrimaryText}>
            {viewModel.submitting ? 'Broadcasting...' : 'Broadcast Blood SOS'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Donor Pool */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Verified Donors ({viewModel.compatibleDonorsCount} Compatible)
        </Text>
        {viewModel.donors.map(donor => (
          <View key={donor.id} style={styles.donorRow}>
            <View style={styles.donorBadge}>
              <Text style={styles.donorBgText}>{donor.bloodGroup}</Text>
            </View>
            <View style={styles.donorInfo}>
              <Text style={styles.donorName}>{donor.name}</Text>
              <Text style={styles.donorSub}>{donor.totalDonations} Donations · {donor.campusYear}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 16 },
  eyebrow: { fontSize: 10, fontWeight: '700', color: '#dc2626', letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  errorBox: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5' },
  errorText: { color: '#b91c1c', fontSize: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155' },
  bgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bgPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  bgActive: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  bgText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  bgTextActive: { color: '#ffffff' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', padding: 6, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', width: 140 },
  stepBtn: { paddingHorizontal: 8 },
  stepBtnText: { fontSize: 16, fontWeight: '800', color: '#dc2626' },
  unitsCount: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 13, backgroundColor: '#ffffff' },
  btnPrimary: { backgroundColor: '#dc2626', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnDisabled: { backgroundColor: '#94a3b8' },
  btnPrimaryText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  donorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  donorBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  donorBgText: { fontSize: 12, fontWeight: '800', color: '#dc2626' },
  donorInfo: { flex: 1 },
  donorName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  donorSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  successContainer: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  successBadge: { fontSize: 14, fontWeight: '800', color: '#dc2626', marginBottom: 8 },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  reqId: { fontSize: 12, color: '#64748b', marginTop: 4 },
  summaryBox: { width: '100%', backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginVertical: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  summaryVal: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginTop: 2 },
  bloodText: { fontSize: 16, fontWeight: '800', color: '#dc2626', marginTop: 2 },
  openText: { fontSize: 14, fontWeight: '700', color: '#16a34a', marginTop: 2 },
  marginTop: { marginTop: 12 },
});
