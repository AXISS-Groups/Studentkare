import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';
import { Card } from './Card';
import { Badge } from './Badge';
import { Server, KeyRound, CheckCircle2, RefreshCw, FileCode, ShieldCheck, ArrowRight } from 'lucide-react';
import { assertRule } from '../ai/constitution';

export interface AbdmMilestoneState {
  m1AbhaCreated: boolean;
  m2HipLinked: boolean;
  m3HiuConsentVerified: boolean;
  oauthToken: string;
  gatewayLatencyMs: number;
}

export const AbdmSandboxGatewayProxy: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule('Rule-D'); // ABDM gateway consent strictness rule

  const [activeMilestone, setActiveMilestone] = useState<'M1' | 'M2' | 'M3'>('M1');
  const [testing, setTesting] = useState(false);
  
  const [abdmState, setAbdmState] = useState<AbdmMilestoneState>({
    m1AbhaCreated: true,
    m2HipLinked: true,
    m3HiuConsentVerified: true,
    oauthToken: 'Bearer abdm_sandbox_oauth2_token_991823904',
    gatewayLatencyMs: 142,
  });

  const [inspectingJson, setInspectingJson] = useState(false);

  const handleTestGatewayMilestone = (m: 'M1' | 'M2' | 'M3') => {
    setActiveMilestone(m);
    setTesting(true);
    setTimeout(() => setTesting(false), 800);
  };

  const sampleFhirBundleJson = JSON.stringify(
    {
      resourceType: 'Bundle',
      id: 'abdm-fhir-bundle-2026-9901',
      type: 'document',
      timestamp: new Date().toISOString(),
      entry: [
        { resource: { resourceType: 'Patient', id: 'ABHA-9918-2026', name: [{ text: 'Aarav Sharma' }] } },
        { resource: { resourceType: 'Observation', code: { coding: [{ code: '26453-1', display: 'Erythrocytes [#/volume] in Blood' }] }, valueQuantity: { value: 4.8, unit: '10*6/uL' } } },
      ],
    },
    null,
    2
  );

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Server size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            ABDM M1/M2/M3 Sandbox Gateway Proxy
          </Text>
        </View>
        <Badge label="NHA SANDBOX GATEWAY VERIFIED" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
        National Health Authority (NHA) ABDM Gateway proxy. Simulates statutory M1 (ABHA Creation), M2 (HIP Linking), and M3 (HIU Data Exchange) consent workflows.
      </Text>

      {/* Milestone Tabs */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'M1' as const, label: 'M1: ABHA Number Creation & Verification' },
          { id: 'M2' as const, label: 'M2: HIP Health Record Linking' },
          { id: 'M3' as const, label: 'M3: HIU Consent & FHIR View' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => handleTestGatewayMilestone(tab.id)}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 10,
              backgroundColor: activeMilestone === tab.id ? tokens.action : tokens.surface2,
              border: `1px solid ${tokens.rule}`,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: activeMilestone === tab.id ? '#ffffff' : tokens.text }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Gateway Payload Inspector */}
      <View style={{ backgroundColor: tokens.canvas, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}`, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono }}>
            OAUTH 2.0 GATEWAY TOKEN & LATENCY
          </Text>
          <Text style={{ fontSize: 11, color: tokens.positive, fontWeight: '800', fontFamily: typography.fontMono }}>
            {testing ? 'Testing Endpoint...' : `Latency: ${abdmState.gatewayLatencyMs}ms`}
          </Text>
        </View>

        <Text style={{ fontSize: 12, color: tokens.action, fontFamily: typography.fontMono, marginBottom: 10 }}>
          {abdmState.oauthToken}
        </Text>

        <TouchableOpacity
          onPress={() => setInspectingJson(!inspectingJson)}
          style={{ backgroundColor: tokens.surface2, padding: 8, borderRadius: 6, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
        >
          <FileCode size={14} color={tokens.text2} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: tokens.text }}>
            {inspectingJson ? 'Hide FHIR R4 Bundle JSON' : 'Inspect ABDM FHIR R4 Bundle Payload'}
          </Text>
        </TouchableOpacity>

        {inspectingJson && (
          <View style={{ backgroundColor: '#111827', borderRadius: 8, padding: 10, marginTop: 10 }}>
            <Text style={{ fontSize: 10, color: '#10b981', fontFamily: typography.fontMono }}>
              {sampleFhirBundleJson}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
};
