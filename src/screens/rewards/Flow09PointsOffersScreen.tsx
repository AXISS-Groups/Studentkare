import { TwoRoomPointsRewards } from '../../components/TwoRoomPointsRewards';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAppStore } from '../../data/store';
import { Card } from '../../components/Card';
import { MobileStepCounterSensor } from '../../components/MobileStepCounterSensor';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Award, Flame, Gift, CheckCircle2, Sparkles, Coffee, Shield } from 'lucide-react';

export const Flow09PointsOffersScreen: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  const { student, updateStudent } = useAppStore();

  const handleRedeem = (cost: number) => {
    if (student.pointsBalance >= cost) {
      updateStudent({ pointsBalance: student.pointsBalance - cost });
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.headerBox}>
        <Badge label="FLOW 09 · M12 POINTS LEDGER & M14 REWARDS" variant="mono" />
        <Text style={[styles.title, { color: tokens.text }]}>Wellness Milestones & Campus Offers</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          Earn points through verified health camp completions, uploading lab reports, and hydration streaks.
          Redeem for campus merchant discounts (RBI PPI compliant non-monetary benefit).
        </Text>

        {/* Balance Card */}
        <Card variant="dark" style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <View>
              <Text style={styles.balanceLabel}>AVAILABLE WELLNESS POINTS</Text>
              <Text style={styles.balanceVal}>{student.pointsBalance} PTS</Text>
            </View>
            <View style={[styles.streakBadge, { backgroundColor: tokens.surface3 }]}>
              <Flame size={20} color="#ffb020" />
              <Text style={[styles.streakText, { color: tokens.action }]}>5-Day Streak</Text>
            </View>
          </View>
          <View style={[styles.rbiNotice, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
            <Shield size={13} color="#00b1ff" />
            <Text style={styles.rbiNoticeText}>
              RBI PPI Compliant: Points represent non-stored-value campus rewards and cannot be converted to fiat currency.
            </Text>
          </View>
        </Card>
      </View>

      <TwoRoomPointsRewards />
      {/* Offers Grid */}
      <View style={styles.offersGrid}>
        <Text style={[styles.sectionHeading, { color: tokens.text }]}>Campus Merchant Vouchers</Text>

        <Card variant="surface" style={styles.offerCard}>
          <View style={styles.offerRow}>
            <View style={[styles.offerIconBox, { backgroundColor: tokens.rewardBg }]}>
              <Coffee size={24} color={tokens.reward} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.offerTitle, { color: tokens.text }]}>Campus CCD / Cafe Mocha 40% Off</Text>
              <Text style={[styles.offerSub, { color: tokens.text2 }]}>Valid at Student Centre Food Court</Text>
            </View>
            <Button
              label="Redeem 200 Pts"
              onPress={() => handleRedeem(200)}
              variant="reward"
              size="sm"
              disabled={student.pointsBalance < 200}
            />
          </View>
        </Card>

        <Card variant="surface" style={styles.offerCard}>
          <View style={styles.offerRow}>
            <View style={[styles.offerIconBox, { backgroundColor: tokens.surface3 }]}>
              <Gift size={24} color={tokens.action} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.offerTitle, { color: tokens.text }]}>Free Sports Complex Day Pass</Text>
              <Text style={[styles.offerSub, { color: tokens.text2 }]}>Badminton & Swimming Pool Access</Text>
            </View>
            <Button
              label="Redeem 350 Pts"
              onPress={() => handleRedeem(350)}
              variant="primary"
              size="sm"
              disabled={student.pointsBalance < 350}
            />
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
    maxWidth: 780,
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
  balanceCard: {
    padding: 20,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  balanceLabel: {
    fontSize: 11,
    color: '#b1a6f6',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  balanceVal: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '700',
  },
  rbiNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  rbiNoticeText: {
    color: '#d8d8e3',
    fontSize: 11,
    flex: 1,
  },
  offersGrid: {
    maxWidth: 780,
    alignSelf: 'center',
    width: '100%',
    gap: 12,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  offerCard: {
    padding: 16,
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  offerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  offerSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
