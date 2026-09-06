import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Layers, Code2, Wallet, Copy, CheckCircle2, Shield, Key } from 'lucide-react';

export const M21PartnerOpsScreen: React.FC = () => {
  const { tokens, radius, typography } = useTheme();

  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [partnerBalance, setPartnerBalance] = useState(48500); // INR prepaid float
  const [widgetPincode, setWidgetPincode] = useState('502285');

  const handleCopyKey = () => {
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

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
            <Badge label="Prepaid Credit" variant="positive" />
          </View>

          <Text style={[styles.balanceNum, { color: tokens.action, fontFamily: typography.fontMono }]}>
            ₹{partnerBalance.toLocaleString('en-IN')}
          </Text>

          <View style={[styles.rbiBox, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}>
            <Shield size={14} color={tokens.action} />
            <Text style={[styles.rbiText, { color: tokens.text2 }]}>
              Prepaid balance represents credit limit against partner's B2B contract; does not constitute an RBI PPI instrument. Student points ledger is strictly non-monetary: nothing loaded, nothing withdrawable, nothing transferable (Rule L8).
            </Text>
          </View>
        </Card>

        {/* API Keys & Webhook Config */}
        <Card variant="surface" style={styles.cardItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Key size={18} color={tokens.action} />
            <Text style={[styles.cardHead, { color: tokens.text }]}>Sandbox API Credentials</Text>
          </View>

          <Input
            label="Partner Public Key (Sandboxed)"
            value="pk_live_axiss_fabric_998124018294"
            onChangeText={() => {}}
            mono
          />

          <Button
            label={apiKeyCopied ? 'Copied Key to Clipboard!' : 'Copy API Key'}
            onPress={handleCopyKey}
            variant="secondary"
            size="sm"
            icon={<Copy size={13} color={tokens.action} />}
          />
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
              Powered by AXISS Fabric · 6h TAT
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
  balanceNum: {
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 10,
  },
  rbiBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  rbiText: {
    fontSize: 11,
    flex: 1,
  },
  widgetBox: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
});
