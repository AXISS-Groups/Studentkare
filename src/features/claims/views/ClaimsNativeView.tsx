import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { ClaimsViewModel } from '../viewmodel/ClaimsViewModel';
import { color } from '@/design-system/theme';

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
    backgroundColor: color.canvas,
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
    color: color.action,
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: color.text,
  },
  subTitle: {
    fontSize: 12,
    color: color.text3,
    marginTop: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    backgroundColor: color.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.rule,
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: color.text3,
    fontWeight: '600',
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    color: color.text,
    marginTop: 2,
  },
  greenText: { color: color.positive },
  amberText: { color: color.attention },
  card: {
    backgroundColor: color.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: color.rule,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: color.text,
    marginBottom: 8,
  },
  infoRow: {
    fontSize: 12,
    color: color.text2,
    marginBottom: 4,
  },
  noAnomalyText: {
    fontSize: 12,
    color: color.positive,
    fontWeight: '600',
  },
  anomalyItem: {
    backgroundColor: color.attentionBg,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.attention,
    marginBottom: 8,
  },
  anomalyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: color.attention,
  },
  anomalyDesc: {
    fontSize: 11,
    color: color.attention,
    marginVertical: 4,
  },
  dismissBtn: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.attention,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  dismissBtnText: {
    fontSize: 10,
    color: color.attention,
    fontWeight: '600',
  },
  dpSummary: {
    fontSize: 12,
    color: color.text2,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: color.ruleStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 12,
  },
  signBtn: {
    backgroundColor: color.action,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  signBtnText: {
    color: color.onAction,
    fontSize: 13,
    fontWeight: '700',
  },
  signedBanner: {
    backgroundColor: color.positiveBg,
    borderWidth: 1,
    borderColor: color.positiveRule,
    padding: 12,
    borderRadius: 8,
  },
  signedText: {
    color: color.positive,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: color.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: color.rule,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: color.text,
  },
  emptySub: {
    fontSize: 12,
    color: color.text3,
    marginTop: 4,
  },
});
