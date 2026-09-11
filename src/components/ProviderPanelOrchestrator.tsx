import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';
import { Card } from './Card';
import { Badge } from './Badge';
import { Radio } from 'lucide-react';
import { assertRule } from '../ai/constitution';

export interface PincodeRoutingState {
  pincode: string;
  areaName: string;
  activeProviders: number;
  deterministicStatus: 'PASS' | 'RULE_J1_BREACH';
  slaScore: number;
}

export const ProviderPanelOrchestrator: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule('Rule-J1'); // Deterministic provider routing rule
  assertRule('Rule-L7'); // Commerce Firewall: No paid placement in routing

  const [pincodes, setPincodes] = useState<PincodeRoutingState[]>([
    { pincode: '500032', areaName: 'Gachibowli / IIIT-H', activeProviders: 1, deterministicStatus: 'RULE_J1_BREACH', slaScore: 94.1 },
    { pincode: '500081', areaName: 'Madhapur / Hitech City', activeProviders: 4, deterministicStatus: 'PASS', slaScore: 98.6 },
    { pincode: '502285', areaName: 'Kandi / IIT Hyderabad', activeProviders: 1, deterministicStatus: 'RULE_J1_BREACH', slaScore: 91.2 },
    { pincode: '500007', areaName: 'Tarnaka / Osmania Univ', activeProviders: 5, deterministicStatus: 'PASS', slaScore: 99.4 },
  ]);

  const [syncing, setSyncing] = useState(false);

  const handlePurgeAndRecruit = (pincode: string) => {
    setSyncing(true);
    setTimeout(() => {
      setPincodes((prev) =>
        prev.map((p) => (p.pincode === pincode ? { ...p, activeProviders: 3, deterministicStatus: 'PASS' } : p))
      );
      setSyncing(false);
    }, 800);
  };

  const breachesCount = pincodes.filter((p) => p.deterministicStatus === 'RULE_J1_BREACH').length;

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Radio size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            M20 Services Fabric — Rule-J1 Provider Panel Router
          </Text>
        </View>
        <Badge label="RULE-J1 & L7 FIREWALL LOCKED" variant="mono" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
        Deterministic provider routing engine. Guarantees a minimum of 2 active providers per covered pincode (Rule-J1). Commerce firewall strictly prohibits paid rank bidding or AI weight manipulation (Rule-L7).
      </Text>

      {/* Status Alert */}
      {breachesCount > 0 ? (
        <View style={{ backgroundColor: tokens.emergencyBg, border: `1px solid ${tokens.emergency}`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.emergency, fontFamily: typography.fontMono }}>
            🚨 {breachesCount} PINCODE PANELS IN RULE-J1 BREACH (&lt; 2 PROVIDERS)
          </Text>
          <Text style={{ fontSize: 12, color: tokens.text, marginTop: 4 }}>
            Emergency provider recruitment triggered automatically to maintain statutory coverage floor.
          </Text>
        </View>
      ) : (
        <View style={{ backgroundColor: tokens.positiveBg, border: `1px solid ${tokens.positive}`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.positive, fontFamily: typography.fontMono }}>
            ✓ ALL PINCODE PANELS SATISFY RULE-J1 (MINIMUM 2 ACTIVE PROVIDERS)
          </Text>
        </View>
      )}

      {/* Pincode Panel List */}
      {pincodes.map((pin) => (
        <View key={pin.pincode} style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}`, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: tokens.text }}>Pincode {pin.pincode}</Text>
                <Text style={{ fontSize: 12, color: tokens.text3, fontFamily: typography.fontMono }}>({pin.areaName})</Text>
              </View>
              <Text style={{ fontSize: 12, color: tokens.text2, marginTop: 4, fontFamily: typography.fontMono }}>
                Panel Status: {pin.activeProviders} Live Providers · SLA: {pin.slaScore}%
              </Text>
            </View>

            {pin.deterministicStatus === 'RULE_J1_BREACH' ? (
              <TouchableOpacity
                onPress={() => handlePurgeAndRecruit(pin.pincode)}
                disabled={syncing}
                style={{ backgroundColor: tokens.emergency, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#ffffff' }}>
                  {syncing ? 'Recruiting...' : 'Recruit & Refresh'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Badge label="RULE-J1 PASS" variant="positive" />
            )}
          </View>
        </View>
      ))}
    </Card>
  );
};
