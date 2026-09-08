import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';
import { Card } from './Card';
import { Badge } from './Badge';
import { KeyRound, AlertTriangle, CheckCircle2, Trash2, RefreshCw } from 'lucide-react';
import { assertRule } from '../ai/constitution';

export interface ConsentScopeState {
  clinicalCare: boolean;
  emergencySOS: boolean;
  anonymizedResearch: boolean;
  partnerOffers: boolean; // Must default to FALSE
}

export const DpdpConsentManagerSimulator: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule('Rule-L8'); // Commerce Firewall: Partner offers default off

  const [consentScopes, setConsentScopes] = useState<ConsentScopeState>({
    clinicalCare: true,
    emergencySOS: true,
    anonymizedResearch: false,
    partnerOffers: false, // Default OFF per DPDP Rules 2025
  });

  const [erasureStatus, setErasureStatus] = useState<'IDLE' | 'RECONCILING_ABDM' | 'ERASED'>('IDLE');
  const [breachAlertVisible, setBreachAlertVisible] = useState(false);

  const handleToggleConsent = (key: keyof ConsentScopeState) => {
    setConsentScopes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSimulateErasureRequest = () => {
    setErasureStatus('RECONCILING_ABDM');
    setTimeout(() => setErasureStatus('ERASED'), 1200);
  };

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <KeyRound size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            DPDP Act 2023 Consent Manager Simulator
          </Text>
        </View>
        <Badge label="MEITY RULES 2025 COMPLIANT" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
        MeitY notified DPDP Rules 2025 compliance simulator. Demonstrates granular consent management, statutory SLA countdowns, 72-hour breach notices, and ABDM HIP data reconciliation.
      </Text>

      {/* Granular Consent Toggles */}
      <View style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}`, marginBottom: 16 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono, marginBottom: 10 }}>
          GRANULAR CONSENT SCOPES (RULE-L8 DIRECTIVE)
        </Text>

        {[
          { key: 'clinicalCare' as const, label: 'Direct Clinical Teleconsult & EMR Access', desc: 'Allows duty NMC physicians to view lab & prescription timeline.' },
          { key: 'emergencySOS' as const, label: '108 Emergency SOS & Paramedic Access', desc: 'Allows 108 paramedics to decrypt offline health card during emergency.' },
          { key: 'anonymizedResearch' as const, label: 'K-Anonymized Campus Epidemic Analytics', desc: 'Aggregates fever trends with k≥20 anonymity floor.' },
          { key: 'partnerOffers' as const, label: 'Partner Offers & Commercial Discounts (DEFAULT OFF)', desc: 'Rule-L8 Mandate: Commercial partner offers must default to OFF.' },
        ].map((item) => (
          <View key={item.key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: tokens.ruleSoft }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: tokens.text }}>{item.label}</Text>
              <Text style={{ fontSize: 11, color: tokens.text3, marginTop: 2 }}>{item.desc}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleToggleConsent(item.key)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                backgroundColor: consentScopes[item.key] ? tokens.positive : tokens.surface3,
                justifyContent: 'center',
                paddingHorizontal: 2,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: '#ffffff',
                  alignSelf: consentScopes[item.key] ? 'flex-end' : 'flex-start',
                }}
              />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* ABDM HIP Data Erasure Reconciliation Handler */}
      <View style={{ backgroundColor: tokens.canvas, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}`, marginBottom: 16 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono, marginBottom: 6 }}>
          STATUTORY DATA ERASURE & ABDM HIP RECONCILIATION
        </Text>
        <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 10 }}>
          Deleting local health records triggers an ABDM gateway notification to external HIPs (Hospital Information Providers) to mark gateway tokens revoked.
        </Text>

        {erasureStatus === 'IDLE' && (
          <TouchableOpacity
            onPress={handleSimulateErasureRequest}
            style={{ backgroundColor: tokens.emergencyBg, border: `1px solid ${tokens.emergency}`, padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Trash2 size={14} color={tokens.emergency} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.emergency }}>Simulate Statutory Erasure Request</Text>
          </TouchableOpacity>
        )}

        {erasureStatus === 'RECONCILING_ABDM' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: tokens.surface2, borderRadius: 8 }}>
            <RefreshCw size={14} color={tokens.action} />
            <Text style={{ fontSize: 12, color: tokens.action, fontWeight: '700' }}>Reconciling with ABDM Gateway Tokens & HIP Nodes...</Text>
          </View>
        )}

        {erasureStatus === 'ERASED' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: tokens.positiveBg, borderRadius: 8 }}>
            <CheckCircle2 size={14} color={tokens.positive} />
            <Text style={{ fontSize: 12, color: tokens.positive, fontWeight: '800' }}>
              ✓ Data Erased Locally & ABDM Gateway Tokens Revoked (SLA Compliant)
            </Text>
          </View>
        )}
      </View>

      {/* 72-Hour Breach Notification Preview */}
      <TouchableOpacity
        onPress={() => setBreachAlertVisible(!breachAlertVisible)}
        style={{ backgroundColor: tokens.surface2, padding: 10, borderRadius: 8, border: `1px solid ${tokens.rule}`, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
      >
        <AlertTriangle size={14} color={tokens.emergency} />
        <Text style={{ fontSize: 12, fontWeight: '700', color: tokens.text }}>
          {breachAlertVisible ? 'Hide 72h Statutory Breach Notice Preview' : 'Preview 72-Hour Data Protection Board Breach Notice'}
        </Text>
      </TouchableOpacity>

      {breachAlertVisible && (
        <View style={{ backgroundColor: tokens.emergencyBg, border: `1px solid ${tokens.emergency}`, borderRadius: 10, padding: 14, marginTop: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.emergency, fontFamily: typography.fontMono }}>
            ⚠️ STATUTORY DPDP BREACH NOTIFICATION (MUST DELIVER WITHIN 72 HOURS)
          </Text>
          <Text style={{ fontSize: 12, color: tokens.text, marginTop: 4 }}>
            "To the Data Protection Board of India & Data Principal: Notice of security incident detected on system telemetry. Safeguards engaged immediately under DPDP 2023 Section 8(6)."
          </Text>
        </View>
      )}
    </Card>
  );
};
