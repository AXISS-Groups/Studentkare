import { NhcxExchangeConnectorProxy } from '../../components/NhcxExchangeConnectorProxy';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAppStore } from '../../data/store';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Send, CheckCircle2, Network } from 'lucide-react';

export const M25ExchangeConnectorScreen: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  const { claimAdjudications } = useAppStore();

  const [transmitted, setTransmitted] = useState(false);
  const claim = claimAdjudications[0];

  const fhirClaimPayload = {
    resourceType: 'ClaimResponse',
    id: `cr-${claim.claimNumber.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    status: 'active',
    type: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/claim-type',
          code: 'institutional',
        },
      ],
    },
    use: 'claim',
    patient: {
      reference: `Patient/${claim.patientName.replace(' ', '-').toLowerCase()}`,
      display: claim.patientName,
    },
    insurer: {
      display: 'ICICI Lombard Health Insurance (NRCES Participant #99238)',
    },
    outcome: 'partial',
    total: [
      {
        category: { text: 'Submitted' },
        amount: { value: claim.totalBilled, currency: 'INR' },
      },
      {
        category: { text: 'Benefit' },
        amount: { value: claim.totalApproved, currency: 'INR' },
      },
    ],
  };

  const handleTransmit = () => {
    setTransmitted(true);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.headerBox}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Badge label="VERTICAL D · CLAIMS INTELLIGENCE" variant="reward" />
          <Badge label="M25 EXCHANGE CONNECTOR" variant="mono" />
          <Badge label="OPENHCX / NHCX PROTOCOL" variant="cyan" />
        </View>
        <Text style={[styles.title, { color: tokens.text }]}>National Health Claims Exchange Connector</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          Transmit FHIR R4 ClaimResponse packages to NHCX (NHA) & OpenHCX protocols using ABDM NRCES profiles.
        </Text>
      </View>

      <View style={styles.contentGrid}>
        <NhcxExchangeConnectorProxy />
        <Card variant="surface">
          <View style={styles.cardHeader}>
            <Network size={20} color={tokens.action} />
            <Text style={[styles.cardTitle, { color: tokens.text }]}>
              FHIR R4 ClaimResponse Payload
            </Text>
          </View>

          <View style={[styles.codeBox, { backgroundColor: tokens.ink, borderRadius: radius.md }]}>
            <Text style={[styles.jsonText, { color: '#b1a6f6', fontFamily: typography.fontMono }]}>
              {JSON.stringify(fhirClaimPayload, null, 2)}
            </Text>
          </View>

          <View style={styles.transmitActions}>
            {!transmitted ? (
              <Button
                label="Transmit to OpenHCX Gateway"
                onPress={handleTransmit}
                size="lg"
                icon={<Send size={16} color="#ffffff" />}
              />
            ) : (
              <View style={[styles.successBanner, { backgroundColor: tokens.positiveBg }]}>
                <CheckCircle2 size={20} color={tokens.positive} />
                <View>
                  <Text style={[styles.successTitle, { color: tokens.positive }]}>
                    Dispatched to NHCX / OpenHCX Node
                  </Text>
                  <Text style={[styles.successSub, { color: tokens.text2 }]}>
                    Transaction Ack: TX-HCX-2026-99120482 · Status: 200 OK
                  </Text>
                </View>
              </View>
            )}
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
    maxWidth: 960,
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
  contentGrid: {
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: 40,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  codeBox: {
    padding: 16,
    marginVertical: 10,
  },
  jsonText: {
    fontSize: 12,
    lineHeight: 18,
  },
  transmitActions: {
    marginTop: 14,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 10,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  successSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
