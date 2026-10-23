import React, { useState } from 'react';
import { useT } from '@/i18n';
import { EmptyState } from '@/design-system';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/tokens/theme';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Code2, Key } from 'lucide-react';

export const M21PartnerOpsScreen: React.FC = () => {
  const { tokens } = useTheme();
  const t = useT();
  // No partner wallet or key service exists yet (no backend for either), so this
  // console shows neither a balance nor a key. It used to show a made-up ₹48,500
  // float, a made-up live key, an "RBI PPI" compliance statement (AGENTS.md
  // guardrail 6) and a default pincode that was not the student's.
  const [widgetPincode, setWidgetPincode] = useState('');

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.headerBox}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Badge label="VERTICAL C · HEALTH SERVICES FABRIC" variant="cyan" />
          <Badge label="M21 PARTNER API & OPS CONSOLE" variant="mono" />
        </View>
        <Text style={[styles.title, { color: tokens.text }]}>Partner API, Widgets & Prepaid Wallet</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          Integrate diagnostic bookings, teleconsults, and emergency dispatch into third-party fintech,
          insurer, and campus apps via single RESTful SDK.
        </Text>
      </View>

      <View style={styles.gridContainer}>
        {/* Partner Remote Wallet */}
        <Card variant="surface" style={styles.cardItem}>
          <View style={styles.cardTop}>
            <View>
              <Text style={[styles.cardHead, { color: tokens.text }]}>Partner Prepaid Float Balance</Text>
              <Text style={[styles.cardSub, { color: tokens.text2 }]}>
                Debited on order completion. Reconciled against wholesale provider rate cards.
              </Text>
            </View>
          </View>

          <EmptyState title={t('partner.ops.balanceUnavailableTitle')} body={t('partner.ops.balanceUnavailableBody')} />
        </Card>

        {/* API Keys & Webhook Config */}
        <Card variant="surface" style={styles.cardItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Key size={18} color={tokens.action} />
            <Text style={[styles.cardHead, { color: tokens.text }]}>Sandbox API Credentials</Text>
          </View>

          <EmptyState title={t('partner.ops.keyUnavailableTitle')} body={t('partner.ops.keyUnavailableBody')} />
        </Card>

        {/* Embeddable Booking Widget Preview */}
        <Card variant="surface" style={styles.cardItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Code2 size={18} color={tokens.cyan} />
            <Text style={[styles.cardHead, { color: tokens.text }]}>
              Embeddable Widget Preview (Zero-Code)
            </Text>
          </View>
          <Text style={[styles.cardSub, { color: tokens.text2, marginBottom: 12 }]}>
            Drop-in iframe or React Native component for partner platforms with no front-end engineering capacity.
          </Text>

          <View style={[styles.widgetBox, { backgroundColor: tokens.surface2, borderColor: tokens.veil }]}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.text }}>
              Book CBC Blood Test at Home
            </Text>
            <Text style={{ fontSize: 12, color: tokens.text2, marginVertical: 4 }}>
              Powered by AXISS Fabric
            </Text>
            <Input label="Enter Pincode" value={widgetPincode} onChangeText={setWidgetPincode} mono />
            <Button
              label="Check Slot & Book (₹550)"
              onPress={() => {}}
              size="sm"
              style={{ marginTop: 8 }}
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
  gridContainer: {
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
    gap: 16,
    paddingBottom: 40,
  },
  cardItem: {
    padding: 18,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHead: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  widgetBox: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
});
