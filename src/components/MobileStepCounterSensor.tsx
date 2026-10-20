import { observer } from 'mobx-react-lite';
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/tokens/theme';
import { useT } from '../i18n';
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
 * Copy: `wellness.stepCounter.*` (src/i18n/areas/wellness.ts); sizes: tokens.
 */
const MobileStepCounterSensorUnwrapped: React.FC = () => {
  const { tokens, typography, spacing } = useTheme();
  const t = useT();
  assertRule('Rule-L8'); // Points ledger isolation: steps never earn points

  return (
    <Card
      variant="surface"
      style={{ padding: spacing.s20, marginBottom: spacing.s20, borderWidth: 1, borderColor: tokens.rule }}
    >
      <View style={{ marginBottom: spacing.s8 }}>
        <Text
          accessibilityRole="header"
          style={{ ...typography.subheading, color: tokens.text, fontFamily: typography.fontFamily }}
        >
          {t('wellness.stepCounter.title')}
        </Text>
        <Text style={{ ...typography.caption, color: tokens.text2, marginTop: spacing.s8 }}>
          {t('wellness.stepCounter.note')}
        </Text>
      </View>
      <EmptyState
        title={t('wellness.stepCounter.notConnectedTitle')}
        body={t('wellness.stepCounter.notConnectedBody')}
      />
    </Card>
  );
};

export const MobileStepCounterSensor: React.FC = observer(MobileStepCounterSensorUnwrapped);
