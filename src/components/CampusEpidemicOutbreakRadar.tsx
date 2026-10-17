import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/theme';
import { Card } from './Card';
import { Badge } from './Badge';
import { AlertTriangle } from 'lucide-react';
import { useT } from '@/i18n';

/** The shape a cluster will take once a syndromic-surveillance source exists. */
export interface OutbreakCluster {
  id: string;
  hostelBlockName: string;
  syndrome: 'VIRAL_PYREXIA' | 'DENGUE_SUSPECT' | 'GASTROENTERITIS' | 'TYPHOID_SUSPECT';
  cohortSize: number; // Must satisfy k >= 20
  threeDayEscalationRate: string;
  severity: 'HIGH_ALERT' | 'MONITORED' | 'STABLE';
  waterSanitationCheckCompleted: boolean;
}

/**
 * No syndromic-surveillance feed is connected, so this shows only that fact.
 *
 * It used to render a cluster list from an always-empty local state, with a
 * "Dispatch Mess Water/Food Audit" button that sent nothing and then said
 * "Water Audit Dispatched", and a "K≥20 ANONYMITY ENFORCED" badge although
 * nothing here enforced anything. When a real source exists, the list comes
 * back with suppression done server-side and a dispatch that reaches someone.
 */
export const CampusEpidemicOutbreakRadar: React.FC = () => {
  const t = useT();
  const { tokens, typography } = useTheme();

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={22} color={tokens.attention} aria-hidden="true" />
          <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            {t('campus.epidemicRadar.title')}
          </Text>
        </View>
        <Badge label={t('campus.epidemicRadar.badge')} variant="mono" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
        {t('campus.epidemicRadar.lead')}
      </Text>

      <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.text, marginBottom: 4 }}>
        {t('campus.radar.noSourceTitle')}
      </Text>
      <Text style={{ fontSize: 13, color: tokens.text2 }}>
        {t('campus.radar.noSourceBody')}
      </Text>
    </Card>
  );
};
