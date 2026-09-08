import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAppStore } from '../../data/store';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { ProvenancePointer } from '../../components/ProvenancePointer';

export const M22ClaimIntakeScreen: React.FC = () => {
  const { tokens, radius } = useTheme();
  const { claimAdjudications } = useAppStore();

  const claim = claimAdjudications[0];

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.headerBox}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Badge label="VERTICAL D · CLAIMS INTELLIGENCE" variant="reward" />
          <Badge label="M22 CLAIM INTAKE & STRUCTURING" variant="mono" />
          <Badge label="RULE K1 ISOLATED" variant="positive" />
        </View>
        <Text style={[styles.title, { color: tokens.text }]}>Document Extraction & Line-Item Structuring</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          Target 30+ validated core fields from messy Indian hospital bills and discharge summaries.
          Every extracted attribute carries a pixel provenance bounding box (Rule K4).
        </Text>
      </View>

      <View style={styles.mainGrid}>
        {/* Claim Summary Card */}
        <Card variant="surface" style={styles.claimOverviewCard}>
          <View style={styles.overviewHeader}>
            <View>
              <Text style={[styles.claimNum, { color: tokens.text }]}>{claim.claimNumber}</Text>
              <Text style={[styles.hospitalName, { color: tokens.text2 }]}>
                {claim.hospitalName} · Policy: {claim.policyNumber}
              </Text>
            </View>
            <Badge label={claim.decisionStatus.replace('_', ' ')} variant="attention" />
          </View>

          <View style={[styles.statsRow, { backgroundColor: tokens.surface2, borderRadius: radius.md }]}>
            <View style={styles.statTile}>
              <Text style={[styles.statLabel, { color: tokens.text3 }]}>TOTAL BILLED</Text>
              <Text style={[styles.statVal, { color: tokens.text }]}>₹{claim.totalBilled}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={[styles.statLabel, { color: tokens.text3 }]}>DEDUCTIONS (RULES)</Text>
              <Text style={[styles.statVal, { color: tokens.emergency }]}>-₹{claim.totalDeductions}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={[styles.statLabel, { color: tokens.text3 }]}>NET RECOMMENDED</Text>
              <Text style={[styles.statVal, { color: tokens.positive }]}>₹{claim.totalApproved}</Text>
            </View>
          </View>
        </Card>

        {/* Structured Line Items Table */}
        <Card variant="surface">
          <Text style={[styles.sectionHeading, { color: tokens.text }]}>
            Categorized Bill Line Items ({claim.lineItems.length})
          </Text>

          <View style={styles.itemsList}>
            {claim.lineItems.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: tokens.surface2,
                    borderColor: item.deductionAmount > 0 ? tokens.emergency : tokens.ruleSoft,
                  },
                ]}
              >
                <View style={styles.itemTop}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                      <Badge label={item.category} variant="primary" size="sm" />
                      {item.isNmeExclusion && (
                        <Badge label="IRDAI Non-Medical Exclusion" variant="emergency" size="sm" />
                      )}
                    </View>
                    <Text style={[styles.itemTitle, { color: tokens.text }]}>{item.itemDescription}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.billedPrice, { color: tokens.text }]}>₹{item.billedAmount}</Text>
                    {item.deductionAmount > 0 && (
                      <Text style={[styles.deductPrice, { color: tokens.emergency }]}>
                        Deduction: -₹{item.deductionAmount}
                      </Text>
                    )}
                  </View>
                </View>

                {item.deductionReason && (
                  <Text style={[styles.deductReason, { color: tokens.text2 }]}>
                    Reason: {item.deductionReason} ({item.ruleCodeApplied})
                  </Text>
                )}

                {/* Provenance Box Inspector */}
                <ProvenancePointer provenance={item.provenance} confidence={item.confidence} />
              </View>
            ))}
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
  mainGrid: {
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
    gap: 16,
    paddingBottom: 40,
  },
  claimOverviewCard: {
    padding: 18,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  claimNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  hospitalName: {
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 14,
    justifyContent: 'space-around',
  },
  statTile: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  statVal: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  itemsList: {
    gap: 12,
  },
  itemCard: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  billedPrice: {
    fontSize: 15,
    fontWeight: '800',
  },
  deductPrice: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  deductReason: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
