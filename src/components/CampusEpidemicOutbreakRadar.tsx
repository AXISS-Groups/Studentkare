import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';
import { Card } from './Card';
import { Badge } from './Badge';
import { AlertTriangle, MapPin, CheckCircle2 } from 'lucide-react';
import { formatKAnonymityCount } from '../types/admin';

export interface OutbreakCluster {
  id: string;
  hostelBlockName: string;
  syndrome: 'VIRAL_PYREXIA' | 'DENGUE_SUSPECT' | 'GASTROENTERITIS' | 'TYPHOID_SUSPECT';
  cohortSize: number; // Must satisfy k >= 20
  threeDayEscalationRate: string;
  severity: 'HIGH_ALERT' | 'MONITORED' | 'STABLE';
  waterSanitationCheckCompleted: boolean;
}

export const CampusEpidemicOutbreakRadar: React.FC = () => {
  const { tokens, radius, typography } = useTheme();

  const [clusters, setClusters] = useState<OutbreakCluster[]>([
    {
      id: 'cluster-01',
      hostelBlockName: 'Hostel Block B (Kandi Campus)',
      syndrome: 'VIRAL_PYREXIA',
      cohortSize: 34, // Satisfies k >= 20
      threeDayEscalationRate: '+18% (3-Day Spike)',
      severity: 'HIGH_ALERT',
      waterSanitationCheckCompleted: false,
    },
    {
      id: 'cluster-02',
      hostelBlockName: 'Hostel Block F (PG Married Quarters)',
      syndrome: 'GASTROENTERITIS',
      cohortSize: 22, // Satisfies k >= 20
      threeDayEscalationRate: '+4% (Controlled)',
      severity: 'MONITORED',
      waterSanitationCheckCompleted: true,
    },
    {
      id: 'cluster-03',
      hostelBlockName: 'Hostel Block C (Undergrad Boys)',
      syndrome: 'DENGUE_SUSPECT',
      cohortSize: 28, // Satisfies k >= 20
      threeDayEscalationRate: '+12% (Monsoon Vector Spike)',
      severity: 'HIGH_ALERT',
      waterSanitationCheckCompleted: false,
    },
  ]);

  const handleDispatchSanitationCheck = (clusterId: string) => {
    setClusters((prev) =>
      prev.map((c) => (c.id === clusterId ? { ...c, waterSanitationCheckCompleted: true, severity: 'MONITORED' } : c))
    );
  };

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={22} color={tokens.attention} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            Campus Epidemic & Outbreak Radar
          </Text>
        </View>
        <Badge label="K≥20 ANONYMITY ENFORCED" variant="mono" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
        Hostel-level syndromic surveillance map for campus health wardens. Detects sudden pyrexia & vector-borne spikes while maintaining strict k=20 student anonymity.
      </Text>

      {/* Active Clusters List */}
      {clusters.map((cluster) => (
        <View key={cluster.id} style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}`, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MapPin size={16} color={tokens.text2} />
                <Text style={{ fontSize: 14, fontWeight: '800', color: tokens.text }}>{cluster.hostelBlockName}</Text>
              </View>
              <Text style={{ fontSize: 11, color: tokens.text3, fontFamily: typography.fontMono, marginTop: 4 }}>
                SYNDROME: {cluster.syndrome} · AGGREGATE COHORT: {formatKAnonymityCount(cluster.cohortSize)}
              </Text>
            </View>
            <Badge
              label={cluster.severity}
              variant={cluster.severity === 'HIGH_ALERT' ? 'emergency' : 'attention'}
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: tokens.canvas, padding: 10, borderRadius: 8, marginTop: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: tokens.emergency, fontFamily: typography.fontMono }}>
              📈 Escalation Trajectory: {cluster.threeDayEscalationRate}
            </Text>
            
            {!cluster.waterSanitationCheckCompleted ? (
              <TouchableOpacity
                onPress={() => handleDispatchSanitationCheck(cluster.id)}
                style={{ backgroundColor: tokens.action, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#ffffff' }}>Dispatch Mess Water/Food Audit</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={14} color={tokens.positive} />
                <Text style={{ fontSize: 11, color: tokens.positive, fontWeight: '700' }}>Water Audit Dispatched</Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </Card>
  );
};
