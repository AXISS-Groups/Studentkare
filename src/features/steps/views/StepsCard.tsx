import React from 'react';
import { StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Skeleton } from '@/design-system';
import { GradientHeroCard, M2Card, SERVICE_HUES, heroStops } from '@/design-system/m2';
import { space } from '@/design-system/theme';
import { useT } from '@/i18n';
import { CardError } from '@/features/m2health/HealthParts';
import type { Resource } from '@/features/m2health/resource';
import { SOURCE_LABEL, stepsText, todayFrom } from '../data/stepsApi';
import type { ActivityTrends } from '../data/stepsApi';

/**
 * The Mobile 2.0 Steps card on My health (M2Insights): today's steps from the
 * server and where they came from, or that there are none yet. One link to the
 * Steps screen. No goal, ring, streak or praise; no number when there is none.
 * `onPhone` is false on the web, where it says to open the phone app.
 */
export const StepsCard = observer(function StepsCard({ week, onPhone, onPress }: { week: Resource<ActivityTrends>; onPhone: boolean; onPress: () => void }) {
  const t = useT();
  if (week.phase === 'error') return <CardError title={t('steps.card.failed')} onRetry={() => void week.load()} testID="m2-ins-steps-error" />;
  if (!week.data) {
    return <M2Card style={styles.loading} testID="m2-ins-steps-loading"><Skeleton label={t('steps.card.loading')} lines={['40%', '70%', '50%']} /></M2Card>;
  }
  const today = todayFrom(week.data);
  const title = today.steps !== null ? t('steps.count', { count: stepsText(today.steps) }) : t('steps.card.none');
  const body = today.steps !== null && today.source ? t(SOURCE_LABEL[today.source]) : t(onPhone ? 'steps.card.connect' : 'steps.card.web');
  return (
    <GradientHeroCard
      stops={heroStops('teal')}
      chipFill={SERVICE_HUES.teal.end}
      eyebrow={t('steps.card.eyebrow')}
      title={title}
      body={body}
      cta={{ label: t('steps.card.open'), ink: SERVICE_HUES.teal.deep }}
      icon="walk"
      onPress={onPress}
      label={t('steps.card.label', { summary: `${title}, ${body}` })}
      height={188}
      testID="m2-ins-steps"
    />
  );
});

const styles = StyleSheet.create({
  loading: { padding: space.s16, borderRadius: 28 },
});
