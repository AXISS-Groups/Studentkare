import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { DigitalIdViewModel, DigitalIdTab } from '../viewmodel/DigitalIdViewModel';

interface DigitalIdNativeViewProps {
  viewModel: DigitalIdViewModel;
}

/**
 * React Native / Mobile View for Digital Campus ID & Access Pass.
 *
 * Consumes the exact same `DigitalIdViewModel` as the web app.
 */
export const DigitalIdNativeView: React.FC<DigitalIdNativeViewProps> = observer(({ viewModel }) => {
  if (viewModel.loading) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.loadingText}>Verifying Digital Campus Credentials...</Text>
      </View>
    );
  }

  const profile = viewModel.profile;
  if (!profile) {
    return (
      <View style={styles.centerBox} accessibilityRole="alert">
        <Text style={styles.loadingText}>
          {viewModel.error ?? 'Your campus ID is not available right now.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>CAMPUS DIGITAL IDENTITY</Text>
      <Text style={styles.title}>Digital ID & Access Pass</Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[
          { id: 'card', label: 'ID Card' },
          { id: 'qr', label: 'QR Pass' },
          { id: 'verification', label: 'Audit Trail' },
        ].map(({ id, label }) => (
          <TouchableOpacity
            key={id}
            style={[styles.tabBtn, viewModel.activeTab === id && styles.tabActive]}
            onPress={() => viewModel.setActiveTab(id as DigitalIdTab)}
          >
            <Text style={[styles.tabText, viewModel.activeTab === id && styles.tabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab 1: Card View */}
      {viewModel.activeTab === 'card' && (
        <View style={styles.idCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.brandTitle}>Studentkare Campus Identity</Text>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>{viewModel.verificationBadgeText}</Text>
            </View>
          </View>

          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.fullName.charAt(0)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.fullName}>{profile.fullName}</Text>
              <Text style={styles.univText}>{profile.university}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>ROLL NUMBER</Text>
              <Text style={styles.metaVal}>{profile.rollNumber}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>BLOOD GROUP</Text>
              <Text style={[styles.metaVal, styles.bloodVal]}>{profile.bloodGroup || 'Not recorded'}</Text>
            </View>
          </View>

          <View style={styles.emergencyBox}>
            <Text style={styles.emergencyTitle}>
              🚨 Emergency Contact: {profile.emergencyContactName} ({profile.emergencyContactRelation})
            </Text>
            <Text style={styles.emergencyPhone}>Phone: {profile.emergencyContactPhone}</Text>
          </View>
        </View>
      )}

      {/* Tab 2: QR Pass */}
      {viewModel.activeTab === 'qr' && (
        <View style={styles.qrCard}>
          <Text style={styles.qrHeader}>Dynamic Clinic Check-in Pass</Text>
          <Text style={styles.qrSub}>Scan at campus pharmacy or health center desk.</Text>

          <View style={styles.qrBox}>
            <Text style={styles.qrCodeVal}>[ QR CODE MATRIX ]</Text>
            <Text style={styles.qrTokenText}>{viewModel.qrToken}</Text>
          </View>

          <View style={styles.qrStatusRow}>
            <Text style={styles.expiryText}>{viewModel.formattedExpiry}</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={() => viewModel.refreshQrPass()}>
              <Text style={styles.refreshText}>Refresh QR</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tab 3: Verification */}
      {viewModel.activeTab === 'verification' && (
        <View style={styles.auditCard}>
          <Text style={styles.auditTitle}>Verification Audit Trail</Text>
          <View style={styles.auditItem}>
            <Text style={styles.auditItemTitle}>✓ University Student Affiliation</Text>
            <Text style={styles.auditItemSub}>
              {profile.isVerifiedStudent ? 'Verified via SSO domain authentication' : 'Pending verification'}
            </Text>
          </View>
          <View style={styles.auditItem}>
            <Text style={styles.auditItemTitle}>✓ Age & Identity Evidence</Text>
            <Text style={styles.auditItemSub}>
              {profile.ageVerified ? 'Verified via campus registrar records' : 'Self-reported'}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 16 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { fontSize: 13, color: '#64748b' },
  eyebrow: { fontSize: 10, fontWeight: '700', color: '#4f46e5', letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  tabRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 4, borderRadius: 10, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#ffffff' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#4f46e5', fontWeight: '700' },
  idCard: { backgroundColor: '#1e1b4b', borderRadius: 16, padding: 20, gap: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)', paddingBottom: 10 },
  brandTitle: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  badgePill: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 8, fontWeight: '800', color: '#15803d' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  profileInfo: { flex: 1 },
  fullName: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  univText: { fontSize: 11, color: '#c7d2fe', marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 24 },
  metaItem: { gap: 2 },
  metaLabel: { fontSize: 9, color: '#a5b4fc', fontWeight: '700' },
  metaVal: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  bloodVal: { color: '#fca5a5' },
  emergencyBox: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 8, gap: 2 },
  emergencyTitle: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  emergencyPhone: { fontSize: 11, color: '#cbd5e1' },
  qrCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  qrHeader: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  qrSub: { fontSize: 12, color: '#64748b' },
  qrBox: { backgroundColor: '#f8fafc', padding: 24, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', marginVertical: 12, width: '100%' },
  qrCodeVal: { fontSize: 14, fontWeight: '800', color: '#4f46e5' },
  qrTokenText: { fontSize: 10, color: '#64748b', marginTop: 8 },
  qrStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  expiryText: { fontSize: 11, color: '#475569' },
  refreshBtn: { backgroundColor: '#e0e7ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  refreshText: { fontSize: 11, fontWeight: '600', color: '#4338ca' },
  auditCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 12 },
  auditTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  auditItem: { padding: 12, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  auditItemTitle: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  auditItemSub: { fontSize: 11, color: '#64748b' },
});
