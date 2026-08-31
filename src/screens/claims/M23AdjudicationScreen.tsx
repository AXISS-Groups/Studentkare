import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAppStore } from '../../data/store';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { FileSpreadsheet, ShieldCheck, CheckCircle2, AlertTriangle, FileCode } from 'lucide-react';

export const M23AdjudicationScreen: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  const { claimAdjudications } = useAppStore();

  const claim = claimAdjudications[0];

  const rulesApplied = [
    {
      code: 'RULE-POL-04',
      title: 'Room Rent Proportionate Deduction',
      description: 'Standard AC Room billed at ₹2,250/day. Base policy SI caps room rent at 1% (₹2,000/day). ₹500 excess deducted.',
      status: 'DEDUCTION_APPLIED',
      deductionAmount: 500,
    },
    {
      code: 'RULE-IRDAI-NME-01',
      title: 'IRDAI Standard Non-Medical Expense Exclusions',
      description: 'Item 14 (Sanitizer dispensers) and Item 29 (Admission files) are classified as non-payable administrative charges.',
      status: 'DEDUCTION_APPLIED',
      deductionAmount: 850,
    },
    {
      code: 'RULE-POL-WAITING-PERIOD',
      title: 'Initial 30-Day Waiting Period Check',
      description: 'Policy active since August 2024. Waiting period satisfied.',
      status: 'PASSED_NO_DEDUCTION',
      deductionAmount: 0,
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.headerBox}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Badge label="VERTICAL D · CLAIMS INTELLIGENCE" variant="reward" />
          <Badge label="M23 ADJUDICATION RULES ENGINE" variant="mono" />
        </View>
        <Text style={[styles.title, { color: tokens.text }]}>Deterministic Adjudication & Tariff Rules</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          Rules as versioned data, never code. Deductions are calculated deterministically under Rule K5;
          models extract and flag, but do not compute money.
        </Text>
      </View>

      <View style={styles.rulesList}>
        <Card variant="surface" style={styles.summaryCard}>
          <Text style={[styles.versionTitle, { color: tokens.text3, fontFamily: typography.fontMono }]}>
            RULESET PINNED: {claim.ruleVersionsPinned}
          </Text>
          <Text style={[styles.claimContext, { color: tokens.text }]}>
            Claim: {claim.claimNumber} · Total Billed: ₹{claim.totalBilled} · Calculated Deductions: ₹
            {claim.totalDeductions}
          </Text>
        </Card>

        {rulesApplied.map((rule) => {
          const isDeducted = rule.deductionAmount > 0;

          return (
            <Card
              key={rule.code}
              variant="surface"
              style={[
                styles.ruleCard,
                isDeducted && { borderLeftColor: tokens.emergency, borderLeftWidth: 4 },
              ]}
            >
              <View style={styles.ruleTop}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <Badge label={rule.code} variant="mono" size="sm" />
                    <Badge
                      label={isDeducted ? `Deduction: -₹${rule.deductionAmount}` : 'Rule Passed'}
                      variant={isDeducted ? 'emergency' : 'positive'}
                      size="sm"
                    />
                  </View>
                  <Text style={[styles.ruleTitle, { color: tokens.text }]}>{rule.title}</Text>
                </View>
              </View>

              <Text style={[styles.ruleDesc, { color: tokens.text2 }]}>{rule.description}</Text>
            </Card>
          );
        })}
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
  rulesList: {
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
    gap: 14,
    paddingBottom: 40,
  },
  summaryCard: {
    padding: 14,
  },
  versionTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  claimContext: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  ruleCard: {
    padding: 16,
  },
  ruleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ruleTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  ruleDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
});
