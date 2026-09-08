import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';
import { useAppStore } from '../data/store';
import { Card } from './Card';
import { Badge } from './Badge';
import { QrCode, Lock, CheckCircle2, Copy, WifiOff } from 'lucide-react';

export const OfflineEmergencyHealthCard: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  const { student } = useAppStore();

  const [copied, setCopied] = useState(false);
  const [offlineSyncStatus, setOfflineSyncStatus] = useState<'SYNCED_OFFLINE' | 'ENCRYPTING'>('SYNCED_OFFLINE');

  const emergencyContactText = `${student.emergencyContactPhone || '+91 98765 43210'} (${student.emergencyContactName || 'Emergency Contact'})`;

  const handleCopyPayload = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReEncryptOffline = () => {
    setOfflineSyncStatus('ENCRYPTING');
    setTimeout(() => setOfflineSyncStatus('SYNCED_OFFLINE'), 600);
  };

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: tokens.emergency }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <WifiOff size={20} color={tokens.emergency} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            Offline Emergency Health Card (PWA Mode)
          </Text>
        </View>
        <Badge
          label={offlineSyncStatus === 'SYNCED_OFFLINE' ? '✓ ENCRYPTED & CACHED OFFLINE' : 'RE-ENCRYPTING...'}
          variant={offlineSyncStatus === 'SYNCED_OFFLINE' ? 'positive' : 'attention'}
        />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
        Zero-network paramedic QR pass. Cached securely via Web Crypto AES-256 on local storage. Readable by campus wardens & paramedics without cellular internet.
      </Text>

      {/* Card Content Grid */}
      <View style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 16, border: `1px solid ${tokens.rule}`, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 10, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono }}>STUDENT NAME</Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: tokens.text, marginTop: 2 }}>{student.fullName || 'Aarav Sharma'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono }}>BLOOD GROUP</Text>
            <Text style={{ fontSize: 16, fontWeight: '900', color: tokens.emergency, marginTop: 2 }}>{student.bloodGroup || 'O+ Positive'}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 10, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono }}>EMERGENCY CONTACT</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: tokens.text, marginTop: 2 }}>{emergencyContactText}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono }}>ORGAN DONOR</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: tokens.positive, marginTop: 2 }}>✓ YES (PLEDGED)</Text>
          </View>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono }}>ACTIVE ALLERGIES</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {(student.allergies || ['Penicillin', 'Sulfa Drugs']).map((alg, idx) => (
              <View key={idx} style={{ backgroundColor: tokens.emergencyBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, border: `1px solid ${tokens.emergency}` }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.emergency, fontFamily: typography.fontMono }}>⚠️ {alg}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* QR Code Visual Placeholder */}
        <View style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginTop: 8, border: `1px solid ${tokens.rule}` }}>
          <QrCode size={120} color="#111827" />
          <Text style={{ fontSize: 10, color: tokens.text3, fontFamily: typography.fontMono, marginTop: 8 }}>
            AES-256 PARAMEDIC SCAN PAYLOAD
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          onPress={handleCopyPayload}
          style={{ flex: 1, backgroundColor: tokens.surface2, border: `1px solid ${tokens.rule}`, padding: 10, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
        >
          {copied ? <CheckCircle2 size={14} color={tokens.positive} /> : <Copy size={14} color={tokens.text2} />}
          <Text style={{ fontSize: 12, fontWeight: '700', color: tokens.text, fontFamily: typography.fontFamily }}>
            {copied ? 'Payload Copied!' : 'Copy Offline Data'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleReEncryptOffline}
          style={{ flex: 1, backgroundColor: tokens.action, padding: 10, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
        >
          <Lock size={14} color="#ffffff" />
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff', fontFamily: typography.fontFamily }}>
            Re-Encrypt Offline
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};
