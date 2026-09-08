import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';
import { useAppStore } from '../data/store';
import { Card } from './Card';
import { Badge } from './Badge';
import { Award, EyeOff } from 'lucide-react';
import { assertRule } from '../ai/constitution';

export const TwoRoomPointsRewards: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  const { student } = useAppStore();
  assertRule('Rule-L6'); // Two-Room points isolation rule
  assertRule('Rule-L8'); // Commerce Firewall: Partner offers default off

  const [activeRoom, setActiveRoom] = useState<'ROOM_1_HEALTH' | 'ROOM_2_REDEEM'>('ROOM_1_HEALTH');
  const [optInPartnerDeals, setOptInPartnerDeals] = useState(false); // Default OFF per Rule-L8

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Award size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            Two-Room Points & Commerce Firewall Model
          </Text>
        </View>
        <Badge label="RULE-L6 & L8 ISOLATED" variant="mono" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
        Strict architectural separation: Room 1 holds non-commercial health achievement points. Room 2 holds un-partnered merchant redemptions with zero data sharing.
      </Text>

      {/* Room Selection Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: tokens.surface2, borderRadius: 12, padding: 4, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={() => setActiveRoom('ROOM_1_HEALTH')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: activeRoom === 'ROOM_1_HEALTH' ? tokens.action : 'transparent',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: activeRoom === 'ROOM_1_HEALTH' ? '#ffffff' : tokens.text2 }}>
            Room 1: Health Achievements ({student.pointsBalance || 450} Pts)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveRoom('ROOM_2_REDEEM')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: activeRoom === 'ROOM_2_REDEEM' ? tokens.action : 'transparent',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: activeRoom === 'ROOM_2_REDEEM' ? '#ffffff' : tokens.text2 }}>
            Room 2: Merchant Redemptions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Room 1 Content */}
      {activeRoom === 'ROOM_1_HEALTH' && (
        <View style={{ backgroundColor: tokens.canvas, borderRadius: radius.lg, padding: 16, border: `1px solid ${tokens.rule}` }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: tokens.text }}>Verified Student Health Achievements</Text>
            <Badge label="NON-COMMERCIAL" variant="positive" />
          </View>

          {[
            { title: 'Monsoon Pyrexia Camp Checkup', pts: '+150 Pts', date: '14 Aug 2026', verified: true },
            { title: 'Full Hepatitis B Vaccine Series Completed', pts: '+200 Pts', date: '02 Jul 2026', verified: true },
            { title: 'Weekly 8,000 Step Goal Satisfied', pts: '+100 Pts', date: 'Yesterday', verified: true },
          ].map((item, idx) => (
            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: idx < 2 ? 1 : 0, borderBottomColor: tokens.ruleSoft }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: tokens.text }}>{item.title}</Text>
                <Text style={{ fontSize: 11, color: tokens.text3, marginTop: 2 }}>{item.date}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '900', color: tokens.positive }}>{item.pts}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Room 2 Content */}
      {activeRoom === 'ROOM_2_REDEEM' && (
        <View style={{ backgroundColor: tokens.canvas, borderRadius: radius.lg, padding: 16, border: `1px solid ${tokens.rule}` }}>
          <View style={{ backgroundColor: tokens.surface2, padding: 12, borderRadius: 10, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.text }}>Rule-L8 Directive: Commercial Partner Deals</Text>
              <Text style={{ fontSize: 11, color: tokens.text3, marginTop: 2 }}>Partner offers are strictly OPT-IN ONLY (Default OFF).</Text>
            </View>
            <TouchableOpacity
              onPress={() => setOptInPartnerDeals(!optInPartnerDeals)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: optInPartnerDeals ? tokens.positive : tokens.surface3 }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: optInPartnerDeals ? '#ffffff' : tokens.text2 }}>
                {optInPartnerDeals ? '✓ Opted In' : 'Opt In (Default OFF)'}
              </Text>
            </TouchableOpacity>
          </View>

          {optInPartnerDeals ? (
            <View style={{ gap: 10 }}>
              <View style={{ backgroundColor: tokens.surface2, padding: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: tokens.text }}>Campus Mess Healthy Smoothie Coupon</Text>
                  <Text style={{ fontSize: 11, color: tokens.text2 }}>Redeem 100 Pts · Un-partnered Local Mess</Text>
                </View>
                <TouchableOpacity style={{ backgroundColor: tokens.action, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#ffffff' }}>Redeem 100 Pts</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <EyeOff size={32} color={tokens.text3} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: tokens.text, marginTop: 8 }}>Partner Offers Are Sealed</Text>
              <Text style={{ fontSize: 11, color: tokens.text3, textAlign: 'center', marginTop: 4 }}>
                Under Rule-L8, commercial partner offers remain hidden until you explicitly opt in. Zero health data is ever shared with merchants.
              </Text>
            </View>
          )}
        </View>
      )}
    </Card>
  );
};
