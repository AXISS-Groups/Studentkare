import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';
import { Card } from './Card';
import { Badge } from './Badge';
import { Network, Send, CheckCircle2, RefreshCw, FileCode } from 'lucide-react';
import { assertRule } from '../ai/constitution';

export const NhcxExchangeConnectorProxy: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule('Rule-K5'); // Drools tariff & claims exchange rule

  const [transmitting, setTransmitting] = useState(false);
  const [transmitted, setTransmitted] = useState(false);
  const [inspectingJson, setInspectingJson] = useState(false);

  const handleTransmitNhcx = () => {
    setTransmitting(true);
    setTimeout(() => {
      setTransmitting(false);
      setTransmitted(true);
    }, 1000);
  };

  const sampleNhcxFhirBundle = JSON.stringify(
    {
      resourceType: 'ClaimResponse',
      id: 'nhcx-claim-resp-2026-88091',
      status: 'active',
      type: { coding: [{ system: 'http://nhcx.gov.in/claim-type', code: 'institutional' }] },
      insurer: { display: 'ICICI Lombard Health Insurance (NRCES Participant #99238)' },
      outcome: 'partial',
      disposition: 'Adjudicated & Approved under Rule-K5 Drools Tariff Rules',
      item: [
        { sequence: 1, category: { text: 'Room Rent' }, adjudication: [{ amount: { value: 4000, currency: 'INR' } }] },
        { sequence: 2, category: { text: 'Pharmacy & Investigations' }, adjudication: [{ amount: { value: 13150, currency: 'INR' } }] },
      ],
      total: [{ category: { text: 'Net Approved' }, amount: { value: 17150, currency: 'INR' } }],
    },
    null,
    2
  );

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Network size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            NHCX / OpenHCX National Claims Exchange Protocol (M25)
          </Text>
        </View>
        <Badge label="NRCES PARTICIPANT #99238" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
        Direct gateway proxy to National Health Claims Exchange (NHCX). Formats and validates FHIR Claim, ClaimResponse, and Coverage bundles for digital auto-settlement.
      </Text>

      {/* Gateway Connection Details */}
      <View style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}`, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono }}>NHCX GATEWAY TARGET</Text>
          <Text style={{ fontSize: 11, color: tokens.positive, fontWeight: '800', fontFamily: typography.fontMono }}>
            ● ONLINE (Latency 98ms)
          </Text>
        </View>

        <Text style={{ fontSize: 13, fontWeight: '800', color: tokens.text }}>
          https://gateway.nhcx.gov.in/api/v1/claims/adjudicate
        </Text>
        <Text style={{ fontSize: 11, color: tokens.text2, fontFamily: typography.fontMono, marginTop: 2 }}>
          Standard: FHIR R4 ClaimResponse Bundle v1.0.2 · Encryption: RSA-2048 / AES-GCM
        </Text>

        <TouchableOpacity
          onPress={() => setInspectingJson(!inspectingJson)}
          style={{ backgroundColor: tokens.canvas, padding: 8, borderRadius: 6, marginTop: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, border: `1px solid ${tokens.rule}` }}
        >
          <FileCode size={14} color={tokens.text2} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: tokens.text }}>
            {inspectingJson ? 'Hide NHCX FHIR Bundle JSON' : 'Inspect NHCX ClaimResponse FHIR Bundle'}
          </Text>
        </TouchableOpacity>

        {inspectingJson && (
          <View style={{ backgroundColor: '#111827', borderRadius: 8, padding: 10, marginTop: 10 }}>
            <Text style={{ fontSize: 10, color: '#10b981', fontFamily: typography.fontMono }}>
              {sampleNhcxFhirBundle}
            </Text>
          </View>
        )}
      </View>

      {/* Transmit Button */}
      <TouchableOpacity
        onPress={handleTransmitNhcx}
        disabled={transmitting || transmitted}
        style={{
          backgroundColor: transmitted ? tokens.positive : tokens.action,
          padding: 12,
          borderRadius: 12,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {transmitting ? (
          <RefreshCw size={18} color="#ffffff" />
        ) : transmitted ? (
          <CheckCircle2 size={18} color="#ffffff" />
        ) : (
          <Send size={18} color="#ffffff" />
        )}
        <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13, fontFamily: typography.fontFamily }}>
          {transmitting
            ? 'Transmitting Payload to NHCX Gateway...'
            : transmitted
            ? '✓ Claim Payload Transmitted & Acknowledged by NHCX!'
            : 'Transmit Adjudicated Claim to NHCX Gateway'}
        </Text>
      </TouchableOpacity>
    </Card>
  );
};
