import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/tokens/theme';
import { useT } from '../i18n';
import { Card } from './Card';
import { EmptyState } from '../design-system/States';
import { assertRule } from '../ai/core/constitution';
import { readWeek, SOURCE_LABEL, stepsText, todayFrom } from '../features/steps/data/stepsApi';
import type { ActivityTrends, StepsToday } from '../features/steps/data/stepsApi';

/**
 * Step counter card on the profile.
 *
 * It used to start at a hard-coded 7,420 steps, add random steps every two
 * seconds and label itself "accelerometer active". Now it shows only what the
 * server has for today (GET /activity/trends) and where that number came from
 * (Apple Health, Health Connect, the phone's motion sensor, or typed by the
 * student). With no number for today, or if the read fails, it says no step
 * source has sent steps and shows no count. Steps are counted by the phone app
 * (src/features/steps); nothing here reads a sensor or estimates steps.
 * Copy: `wellness.stepCounter.*`, `steps.*`; sizes: tokens.
 */
type Read = () => Promise<ActivityTrends>;

const MobileStepCounterSensorUnwrapped: React.FC<{ read?: Read }> = ({ read = readWeek }) => {
  const { tokens, typography, spacing } = useTheme();
  const t = useT();
  assertRule('Rule-L8'); // Points ledger isolation: steps never earn points
  const [today, setToday] = useState<StepsToday | null>(null);

  useEffect(() => {
    let live = true;
    read().then((week) => { if (live) setToday(todayFrom(week)); }).catch(() => { if (live) setToday(null); });
    return () => { live = false; };
  }, [read]);

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
      {today && today.steps !== null ? (
        <View accessible testID="profile-steps-today">
          <Text style={{ ...typography.subheading, color: tokens.text, fontFamily: typography.fontFamily }}>
            {t('steps.profile.today', { count: stepsText(today.steps) })}
          </Text>
          {today.source ? (
            <Text style={{ ...typography.caption, color: tokens.text2, marginTop: spacing.s4 }} testID="profile-steps-source">
              {t(SOURCE_LABEL[today.source])}
            </Text>
          ) : null}
        </View>
      ) : (
        <EmptyState
          title={t('wellness.stepCounter.notConnectedTitle')}
          body={t('wellness.stepCounter.notConnectedBody')}
        />
      )}
    </Card>
  );
};

export const MobileStepCounterSensor: React.FC<{ read?: Read }> = observer(MobileStepCounterSensorUnwrapped);
