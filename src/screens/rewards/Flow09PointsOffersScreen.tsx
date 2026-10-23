import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { Card, EmptyState, ErrorState, Eyebrow, Note, Skeleton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { color, font, fontWeight, size, space } from '@/design-system/theme';
import { useApiResource } from '../../hooks/api/useApiResource';
import type { PointsSummary } from '@/features/rewards/viewmodel/RewardsViewModel';

/**
 * Points balance (Flow 09).
 *
 * The balance is the student's own ledger total from GET /api/points/me
 * (backend/services/rewards_api.py); nothing here adds, spends or estimates
 * points. This screen used to show a local balance with made-up campus
 * vouchers ("40% off", "day pass") that "redeemed" by subtracting from it, a
 * "5-Day Streak" badge, a points-for-steps list, and an "RBI PPI compliant"
 * claim (AGENTS.md guardrail 6: no hard-coded compliance claims). None of it
 * existed on the server: points have no cash value and nothing can be
 * redeemed yet, which is what the note below says.
 */
export const Flow09PointsOffersScreen: React.FC = () => {
  const t = useT();
  const points = useApiResource<PointsSummary>('/points/me');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>{t('rewards.eyebrow')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t('rewards.points.title')}</Text>

      {points.loading ? <Skeleton label={t('rewards.loading')} lines={['40%', '100%']} /> : null}

      {!points.loading && points.error ? (
        <ErrorState
          title={t('rewards.failedTitle')}
          body={t('rewards.failedBody')}
          retryLabel={t('common.tryAgain')}
          onRetry={points.reload}
        />
      ) : null}

      {!points.loading && !points.error && points.data && points.data.balance === 0 ? (
        <EmptyState title={t('rewards.points.emptyTitle')} body={t('rewards.points.emptyBody')} />
      ) : null}

      {!points.loading && !points.error && points.data && points.data.balance > 0 ? (
        <Card>
          <View
            style={styles.balanceRow}
            accessible
            accessibilityLabel={t('rewards.points.balanceSpoken', { balance: points.data.balance })}
          >
            <Icon name="star" size={space.s24} color={color.action} />
            <Text style={styles.balance}>{points.data.balance}</Text>
            <Text style={styles.meta}>{t('rewards.points.balance')}</Text>
          </View>
        </Card>
      ) : null}

      {!points.loading && !points.error && points.data ? <Note tone="info">{t('rewards.points.note')}</Note> : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: size.panelMax },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  balance: { fontFamily: font.family.mono, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
});
