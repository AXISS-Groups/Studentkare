import { CampusEpidemicOutbreakRadar } from '../../components/CampusEpidemicOutbreakRadar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/theme';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { AlertTriangle } from 'lucide-react';

export const Flow11InstitutionConsoleScreen: React.FC = () => {
  const { tokens } = useTheme();
  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.headerBox}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Badge label="M15 INSTITUTION & CAMPUS CONSOLE" variant="mono" />
          <Badge label="ANONYMIZED AGGREGATE ONLY" variant="positive" />
        </View>
        <Text style={[styles.title, { color: tokens.text }]}>Campus Health Telemetry & Outbreak Monitor</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          Indian Institute of Technology, Hyderabad (Kandi Campus) · Total Enrolled: 4,850 Students
        </Text>
      </View>

      <CampusEpidemicOutbreakRadar />
      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        <Card variant="surface" style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { color: tokens.text3 }]}>CAMP PARTICIPATION RATE</Text>
          <Text style={[styles.kpiVal, { color: tokens.action }]}>84.2%</Text>
          <Text style={[styles.kpiSub, { color: tokens.positive }]}>+12% vs last monsoon cycle</Text>
        </Card>

        <Card variant="surface" style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { color: tokens.text3 }]}>AVG STATION WAIT TAT</Text>
          <Text style={[styles.kpiVal, { color: tokens.data }]}>4.2 Mins</Text>
          <Text style={[styles.kpiSub, { color: tokens.text3 }]}>Across 5 active clinic stations</Text>
        </Card>

        <Card variant="surface" style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { color: tokens.text3 }]}>ACTIVE SYNDROMIC ALERTS</Text>
          <Text style={[styles.kpiVal, { color: tokens.emergency }]}>1 Cluster</Text>
          <Text style={[styles.kpiSub, { color: tokens.emergency }]}>Hostel Block B (Viral Pyrexia)</Text>
        </Card>
      </View>

      {/* Epidemic / Outbreak Heatmap */}
      <View style={styles.sectionWrap}>
        <Card variant="surface">
          <View style={styles.cardHeader}>
            <AlertTriangle size={18} color={tokens.attention} />
            <Text style={[styles.sectionTitle, { color: tokens.text }]}>
              Campus Epidemic Heatmap (Monsoon Term)
            </Text>
          </View>
          <Text style={[styles.sectionDesc, { color: tokens.text2 }]}>
            Syndromic surveillance aggregation from campus clinic visits and self-reported fever markers.
          </Text>

          <View style={styles.hostelGrid}>
            {[
              { block: 'Hostel Block A', risk: 'LOW', cases: 2, status: 'Normal' },
              { block: 'Hostel Block B', risk: 'ELEVATED', cases: 14, status: 'Active Watch (Fever Cluster)' },
              { block: 'Hostel Block C', risk: 'LOW', cases: 3, status: 'Normal' },
              { block: 'Hostel Block D (PG)', risk: 'LOW', cases: 1, status: 'Normal' },
            ].map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.hostelItem,
                  {
                    backgroundColor: tokens.surface2,
                    borderColor: item.risk === 'ELEVATED' ? tokens.attention : tokens.ruleSoft,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hBlock, { color: tokens.text }]}>{item.block}</Text>
                  <Text style={[styles.hStatus, { color: tokens.text2 }]}>{item.status}</Text>
                </View>
                <Badge
                  label={`${item.cases} Cases`}
                  variant={item.risk === 'ELEVATED' ? 'attention' : 'positive'}
                />
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
    gap: 14,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: 260,
    padding: 18,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  kpiVal: {
    fontSize: 28,
    fontWeight: '800',
    marginVertical: 4,
  },
  kpiSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionWrap: {
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
    marginBottom: 40,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 14,
  },
  hostelGrid: {
    gap: 10,
  },
  hostelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  hBlock: {
    fontSize: 14,
    fontWeight: '700',
  },
  hStatus: {
    fontSize: 12,
    marginTop: 2,
  },
});
