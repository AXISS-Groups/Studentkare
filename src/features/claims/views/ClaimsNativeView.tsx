import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { ClaimsViewModel } from '../viewmodel/ClaimsViewModel';

interface ClaimsNativeViewProps {
  viewModel: ClaimsViewModel;
}

/**
 * Mobile (React Native) View Component for Claims Adjudication & Insurance Review.
 * Binds reactively to `ClaimsViewModel` via MobX `observer`.
 */
export const ClaimsNativeView: React.FC<ClaimsNativeViewProps> = observer(({ viewModel }) => {
  const claim = viewModel.claim;

  if (!claim) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No Pending Adjudication Claims</Text>
          <Text style={styles.emptySub}>All active insurance claims have been reviewed.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>AUTOMATED AI ADJUDICATION & CLINICAL SIGN-OFF</Text>
        <Text style={styles.title}>Cashless Insurance Claim</Text>
        <Text style={styles.subTitle}>ID: {claim.id} — {claim.patientName}</Text>
      </View>

      {/* Summary Box */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.statLabel}>Claimed</Text>
          <Text style={styles.statVal}>₹{claim.totalBilled.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.statLabel}>Approved Base</Text>
          <Text style={[styles.statVal, styles.greenText]}>₹{claim.totalApproved.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.statLabel}>Deductions</Text>
          <Text style={[styles.statVal, styles.amberText]}>₹{claim.totalDeductions.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Hospital & Admission Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Medical & Provider Details</Text>
        <Text style={styles.infoRow}>Hospital: {claim.hospitalName}</Text>
        <Text style={styles.infoRow}>Admission: {claim.admissionDate} to {claim.dischargeDate}</Text>
        <Text style={styles.infoRow}>Protocol: {claim.exchangeProtocol}</Text>
      </View>

      {/* Anomalies */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Anomaly Flags</Text>
        {viewModel.anomalyFlags.length === 0 ? (
          <Text style={styles.noAnomalyText}>✓ Zero billing anomalies detected.</Text>
        ) : (
          viewModel.anomalyFlags.map(flag => (
            <View key={flag.id} style={styles.anomalyItem}>
              <Text style={styles.anomalyTitle}>{flag.title}</Text>
              <Text style={styles.anomalyDesc}>{flag.description}</Text>
              <TouchableOpacity style={styles.dismissBtn} onPress={() => viewModel.dismissFlag(flag.id)}>
                <Text style={styles.dismissBtnText}>Dismiss & Verify</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* AI Decision Summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>AI Adjudication Rationale</Text>
        <Text style={styles.dpSummary}>{viewModel.decisionPackage.reviewerGuidanceNote}</Text>
      </View>

      {/* Signoff Action */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Adjudicator Sign-off</Text>
        <TextInput
          style={styles.input}
          placeholder="Senior Adjudicator Name"
          value={viewModel.reviewerName}
          onChangeText={(text: string) => viewModel.setReviewerName(text)}
          editable={!viewModel.signedStatus}
        />

        {viewModel.signedStatus ? (
          <View style={styles.signedBanner}>
            <Text style={styles.signedText}>✓ Claim Approved & Signed by {viewModel.reviewerName}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.signBtn} onPress={() => viewModel.signOff()}>
            <Text style={styles.signBtnText}>Sign & Authorize Claim</Text>
          </TouchableOpacity>
        )}
      </View>
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
    gap: 16,
  },
  header: {
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  subTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  greenText: { color: '#16a34a' },
  amberText: { color: '#d97706' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  infoRow: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
  },
  noAnomalyText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
  },
  anomalyItem: {
    backgroundColor: '#fffbeb',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
    marginBottom: 8,
  },
  anomalyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },
  anomalyDesc: {
    fontSize: 11,
    color: '#b45309',
    marginVertical: 4,
  },
  dismissBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d97706',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  dismissBtnText: {
    fontSize: 10,
    color: '#b45309',
    fontWeight: '600',
  },
  dpSummary: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 12,
  },
  signBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  signBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  signedBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 12,
    borderRadius: 8,
  },
  signedText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
});
