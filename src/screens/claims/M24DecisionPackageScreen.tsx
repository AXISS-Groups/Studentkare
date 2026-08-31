import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAppStore } from '../../data/store';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { generateAdjudicationDecisionPackage } from '../../ai/claimsReviewer';
import { FileSpreadsheet, ShieldAlert, CheckCircle2, UserCheck, AlertTriangle, Sparkles, FileText } from 'lucide-react';

export const M24DecisionPackageScreen: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  const { claimAdjudications, signClaimAdjudication, dismissClaimAnomaly } = useAppStore();

  const claim = claimAdjudications[0];
  const decisionPackage = generateAdjudicationDecisionPackage(claim);

  const [reviewerName, setReviewerName] = useState(claim.assignedReviewerName || 'Sanjay Nair (Senior Adjudicator)');
  const [signedStatus, setSignedStatus] = useState(claim.decisionStatus === 'APPROVED');

  const handleSignOff = () => {
    signClaimAdjudication(claim.id, reviewerName);
    setSignedStatus(true);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.headerBox}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Badge label="VERTICAL D · CLAIMS INTELLIGENCE" variant="reward" />
          <Badge label="M24 FWA & DECISION PACKAGE" variant="mono" />
          <Badge label="RULE K2: HUMAN REVIEWER MANDATORY" variant="positive" />
        </View>
        <Text style={[styles.title, { color: tokens.text }]}>Adjudicator Review & Decision Package</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          Decision support for a named human adjudicator—never the adjudicator. AI flags billing
          anomalies and structures evidence; human signs the legal adjudication decision package.
        </Text>
      </View>

      <View style={styles.contentGrid}>
        {/* Fraud, Waste & Abuse (FWA) Flags */}
        <Card variant="surface" style={styles.fwaSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={18} color={tokens.attention} />
            <Text style={[styles.sectionTitle, { color: tokens.text }]}>
              Detected Billing Anomalies & FWA Flags ({claim.anomalyFlags.length})
            </Text>
          </View>

          <View style={styles.flagsList}>
            {claim.anomalyFlags.map((flag) => (
              <View
                key={flag.id}
                style={[
                  styles.flagCard,
                  {
                    backgroundColor: flag.dismissed ? tokens.surface2 : tokens.attentionBg,
                    borderColor: flag.dismissed ? tokens.rule : tokens.attention,
                  },
                ]}
              >
                <View style={styles.flagTop}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                      <Badge label={flag.code} variant="mono" size="sm" />
                      <Badge
                        label={`Severity: ${flag.severity}`}
                        variant={flag.severity === 'HIGH' ? 'emergency' : 'attention'}
                        size="sm"
                      />
                    </View>
                    <Text style={[styles.flagTitle, { color: tokens.text }]}>{flag.title}</Text>
                    <Text style={[styles.flagDesc, { color: tokens.text2 }]}>{flag.description}</Text>
                  </View>
                  <Text style={[styles.impactVal, { color: tokens.emergency }]}>
                    Impact: ₹{flag.impactAmount}
                  </Text>
                </View>

                {!flag.dismissed ? (
                  <Button
                    label="Dismiss Flag (Clinical Justification Verified)"
                    onPress={() => dismissClaimAnomaly(claim.id, flag.id, 'Verified on hospital chart')}
                    variant="outline"
                    size="sm"
                    style={{ alignSelf: 'flex-start', marginTop: 8 }}
                  />
                ) : (
                  <Badge label="Dismissed by Reviewer" variant="mono" size="sm" style={{ marginTop: 6 }} />
                )}
              </View>
            ))}
          </View>
        </Card>

        {/* Adjudication Decision Package for Human Sign-Off */}
        <Card variant="surface" style={styles.decisionCard}>
          <View style={styles.packageHeader}>
            <View>
              <Badge label="OFFICIAL DECISION PACKAGE" variant="primary" />
              <Text style={[styles.packageTitle, { color: tokens.text }]}>
                Adjudication Summary: {claim.claimNumber}
              </Text>
            </View>
            <Badge
              label={signedStatus ? 'Reviewer Signed' : 'Pending Reviewer Sign-Off'}
              variant={signedStatus ? 'positive' : 'attention'}
            />
          </View>

          <View style={[styles.calcTable, { backgroundColor: tokens.surface2, borderRadius: radius.md }]}>
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: tokens.text }]}>Total Billed Amount:</Text>
              <Text style={[styles.calcVal, { color: tokens.text }]}>₹{decisionPackage.totalBilled}</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: tokens.emergency }]}>
                Total Non-Medical & Tariff Deductions:
              </Text>
              <Text style={[styles.calcVal, { color: tokens.emergency }]}>
                -₹{decisionPackage.totalDeductions}
              </Text>
            </View>
            <View style={[styles.calcRow, styles.calcDivider, { borderTopColor: tokens.rule }]}>
              <Text style={[styles.calcFinalLabel, { color: tokens.text }]}>
                Final Net Payable Amount:
              </Text>
              <Text style={[styles.calcFinalVal, { color: tokens.positive }]}>
                ₹{decisionPackage.recommendedApproved}
              </Text>
            </View>
          </View>

          {/* Reviewer Legal Signature & Audit */}
          <View style={styles.signerBox}>
            <Input
              label="Named Human Adjudicator (Rule K2)"
              value={reviewerName}
              onChangeText={setReviewerName}
              disabled={signedStatus}
            />

            {!signedStatus ? (
              <Button
                label="Sign & Submit Final Adjudication Package"
                onPress={handleSignOff}
                size="lg"
                icon={<UserCheck size={16} color="#ffffff" />}
              />
            ) : (
              <View style={[styles.signedSuccess, { backgroundColor: tokens.positiveBg }]}>
                <CheckCircle2 size={18} color={tokens.positive} />
                <Text style={[styles.signedText, { color: tokens.positive }]}>
                  Adjudication Signed by {reviewerName} on {claim.reviewerSignedAt || 'Today'}
                </Text>
              </View>
            )}
          </View>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  headerBox: {
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    marginBottom: 16,
  },
  contentGrid: {
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
    gap: 16,
    paddingBottom: 40,
  },
  fwaSection: {
    padding: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  flagsList: {
    gap: 10,
  },
  flagCard: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  flagTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  flagTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  flagDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  impactVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  decisionCard: {
    padding: 18,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  calcTable: {
    padding: 14,
    gap: 8,
    marginBottom: 16,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calcLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  calcVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  calcDivider: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 4,
  },
  calcFinalLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  calcFinalVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  signerBox: {
    gap: 10,
  },
  signedSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  signedText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
