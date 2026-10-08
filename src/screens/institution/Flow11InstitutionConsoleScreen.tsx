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
          Campus-level aggregates appear here once real screening and clinic data exist.
        </Text>
      </View>

      <CampusEpidemicOutbreakRadar />
      {/* No campus aggregate source exists yet: no invented KPIs or block case counts. */}
      <View style={styles.sectionWrap}>
        <Card variant="surface">
          <View style={styles.cardHeader}>
            <AlertTriangle size={18} color={tokens.attention} />
            <Text style={[styles.sectionTitle, { color: tokens.text }]}>No campus health data yet</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: tokens.text2 }]}>
            Camp participation, clinic wait times and syndromic alerts will appear once they are recorded.
          </Text>
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
