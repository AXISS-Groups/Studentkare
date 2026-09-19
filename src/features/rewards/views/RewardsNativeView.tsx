import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { RewardsViewModel } from '../viewmodel/RewardsViewModel';

interface RewardsNativeViewProps {
  viewModel: RewardsViewModel;
}

/**
 * Mobile (React Native) View Component for Student Health Rewards & LifePoints Engine.
 * Binds reactively to `RewardsViewModel` via MobX `observer`.
 */
export const RewardsNativeView: React.FC<RewardsNativeViewProps> = observer(({ viewModel }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>LIFEPOINTS & WELLNESS GAMIFICATION</Text>
        <Text style={styles.title}>Health Rewards Pass</Text>
      </View>

      {/* Points & Streak Row */}
      <View style={styles.dashRow}>
        <View style={styles.dashCard}>
          <Text style={styles.dashLabel}>LifePoints</Text>
          <Text style={styles.dashVal}>{viewModel.pointsBalance}</Text>
          <Text style={styles.dashSub}>Active Balance</Text>
        </View>

        <View style={styles.dashCard}>
          <Text style={styles.dashLabel}>Streak</Text>
          <Text style={styles.dashVal}>{viewModel.streakDays} Days</Text>
          <Text style={styles.dashSub}>Daily Logging</Text>
        </View>
      </View>

      {/* Success Notification */}
      {viewModel.redeemedSuccessMessage ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>✓ {viewModel.redeemedSuccessMessage}</Text>
        </View>
      ) : null}

      {/* Challenges List */}
      <Text style={styles.sectionTitle}>Active Health Challenges</Text>
      {viewModel.activeChallenges.map((ch) => (
        <View key={ch.id} style={[styles.challengeCard, ch.completed && styles.chCompleted]}>
          <View style={styles.chHeader}>
            <Text style={styles.chTitle}>{ch.title}</Text>
            <Text style={styles.chReward}>+{ch.pointsReward} Pts</Text>
          </View>
          <Text style={styles.chDesc}>{ch.description}</Text>

          {!ch.completed && (
            <TouchableOpacity style={styles.claimBtn} onPress={() => viewModel.completeChallenge(ch.id)}>
              <Text style={styles.claimBtnText}>Claim Reward</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {/* Vouchers Section */}
      <Text style={styles.sectionTitle}>Redeem Vouchers</Text>
      {viewModel.redemptionOptions.map((opt) => {
        const canAfford = viewModel.pointsBalance >= opt.pointsRequired;
        return (
          <View key={opt.id} style={styles.voucherCard}>
            <View style={styles.vHeader}>
              <Text style={styles.vTitle}>{opt.title}</Text>
              <Text style={styles.vDiscount}>{opt.discountValue}</Text>
            </View>
            <Text style={styles.vPartner}>Partner: {opt.partnerName}</Text>

            <View style={styles.vFooter}>
              <Text style={styles.vPts}>{opt.pointsRequired} Pts</Text>
              <TouchableOpacity
                style={[styles.redeemBtn, !canAfford && styles.btnDisabled]}
                onPress={() => viewModel.redeemOption(opt)}
                disabled={!canAfford}
              >
                <Text style={styles.redeemBtnText}>{canAfford ? 'Redeem' : 'Locked'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#d97706',
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  dashRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dashCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dashLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  dashVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginVertical: 4,
  },
  dashSub: {
    fontSize: 10,
    color: '#94a3b8',
  },
  successBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 12,
    borderRadius: 8,
  },
  successText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  challengeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chCompleted: {
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
  },
  chHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  chReward: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f59e0b',
  },
  chDesc: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
  },
  claimBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-end',
  },
  claimBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  voucherCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  vHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  vTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  vDiscount: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vPartner: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 10,
  },
  vFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vPts: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  redeemBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  btnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  redeemBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
