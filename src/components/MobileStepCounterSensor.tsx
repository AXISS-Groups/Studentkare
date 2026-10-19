import { observer } from 'mobx-react-lite';
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/tokens/theme';
import { Card } from './Card';
import { EmptyState } from '../design-system/States';
import { assertRule } from '../ai/core/constitution';

/**
 * Step counter card on the profile.
 *
 * No step source (Apple Health, Health Connect, a device pedometer) is wired to
 * this card yet. It used to start at a hard-coded 7,420 steps, add random steps
 * every two seconds, label itself "accelerometer active" and offer to sync
 * those invented numbers to the health record. DESIGN.md §6 forbids invented
 * numbers, so until a real source exists it says plainly that nothing is
 * connected and shows no count. Manual entries go through
 * POST /api/activity/entries; nothing here reads or estimates steps.
 */
const MobileStepCounterSensorUnwrapped: React.FC = () => {
  const { tokens, typography } = useTheme();
  assertRule('Rule-L8'); // Points ledger isolation: steps never earn points

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, borderWidth: 1, borderColor: tokens.rule }}>
      <View style={{ marginBottom: 8 }}>
        <Text
          accessibilityRole="header"
          style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}
        >
          Step counter
        </Text>
        <Text style={{ fontSize: 12, color: tokens.text2, marginTop: 6 }}>
          Steps are not used to set targets, burn estimates or reward points.
        </Text>
      </View>
      <EmptyState
        title="Step counter not connected"
        body="No step source is connected to this device, so no steps are shown. Nothing here is estimated."
      />
    </Card>
  );
};

export const MobileStepCounterSensor: React.FC = observer(MobileStepCounterSensorUnwrapped);
