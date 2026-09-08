import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAppStore } from '../../data/store';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';

export const M19ProviderRegistryScreen: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  const { fabricProviders } = useAppStore();

  const [pincodeSearch, setPincodeSearch] = useState('502285');

  const filteredProviders = pincodeSearch.trim()
    ? fabricProviders.filter((p) => p.coveredPincodes.includes(pincodeSearch.trim()))
    : fabricProviders;

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.headerBox}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Badge label="VERTICAL C · HEALTH SERVICES FABRIC" variant="cyan" />
          <Badge label="M19 PROVIDER REGISTRY" variant="mono" />
        </View>
        <Text style={[styles.title, { color: tokens.text }]}>Provider Network, Contracts & Coverage</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          19,000+ pincode supply network. NABL/NABH accreditation tracked with auto-delisting on expiry.
          LOINC and SNOMED catalogue normalization asset.
        </Text>

        {/* Pincode Search Filter */}
        <View style={styles.searchBarRow}>
          <View style={{ flex: 1 }}>
            <Input
              label="Check Serviceability by Pincode"
              value={pincodeSearch}
              onChangeText={setPincodeSearch}
              placeholder="e.g. 500081 or 502285"
              mono
            />
          </View>
          <Badge
            label={`${filteredProviders.length} Serviceable Providers in ${pincodeSearch || 'All'}`}
            variant="positive"
            style={{ marginTop: 22 }}
          />
        </View>
      </View>

      {/* Provider List */}
      <View style={styles.providersGrid}>
        {filteredProviders.map((prov) => (
          <Card key={prov.id} variant="surface" style={styles.provCard}>
            <View style={styles.provTop}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                  <Badge label={prov.type} variant="primary" size="sm" />
                  <Badge
                    label={`${prov.accreditation} Certified`}
                    variant={prov.isAccreditationValid ? 'positive' : 'emergency'}
                    size="sm"
                  />
                  <Text style={[styles.idText, { color: tokens.text3, fontFamily: typography.fontMono }]}>
                    {prov.id}
                  </Text>
                </View>
                <Text style={[styles.provName, { color: tokens.text }]}>{prov.name}</Text>
                <Text style={[styles.provExpiry, { color: tokens.text2 }]}>
                  Accreditation Valid Until: {prov.accreditationExpiry} (Auto-Delist Guard)
                </Text>
              </View>

              <Badge
                label={`${prov.activeContractRateDiscount}% Rate Card Discount`}
                variant="reward"
              />
            </View>

            {/* SLA & Metrics Ribbon */}
            <View style={[styles.metricsRibbon, { backgroundColor: tokens.surface2, borderRadius: radius.md }]}>
              <View style={styles.mTile}>
                <Text style={[styles.mLabel, { color: tokens.text3 }]}>Target SLA TAT</Text>
                <Text style={[styles.mVal, { color: tokens.text }]}>{prov.slaTatHours} Hours</Text>
              </View>
              <View style={styles.mTile}>
                <Text style={[styles.mLabel, { color: tokens.text3 }]}>Fulfilment Rate</Text>
                <Text style={[styles.mVal, { color: tokens.positive }]}>{prov.fulfilmentRate}%</Text>
              </View>
              <View style={styles.mTile}>
                <Text style={[styles.mLabel, { color: tokens.text3 }]}>Quality Score</Text>
                <Text style={[styles.mVal, { color: tokens.action }]}>★ {prov.qualityScore}/5.0</Text>
              </View>
            </View>

            {/* Covered Pincodes & Modalities */}
            <View style={styles.pincodeRow}>
              <Text style={[styles.pincodeLabel, { color: tokens.text3 }]}>Coverage Pincodes:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {prov.coveredPincodes.map((pc, idx) => (
                  <Badge key={idx} label={pc} variant="mono" size="sm" />
                ))}
              </View>
            </View>
          </Card>
        ))}
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
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    flexWrap: 'wrap',
  },
  providersGrid: {
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
    gap: 14,
    paddingBottom: 40,
  },
  provCard: {
    padding: 18,
  },
  provTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  idText: {
    fontSize: 11,
  },
  provName: {
    fontSize: 16,
    fontWeight: '700',
  },
  provExpiry: {
    fontSize: 12,
    marginTop: 2,
  },
  metricsRibbon: {
    flexDirection: 'row',
    padding: 12,
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  mTile: {
    alignItems: 'center',
  },
  mLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  mVal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  pincodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  pincodeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
