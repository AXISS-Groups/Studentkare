import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useRecordsStore } from '../../store/AppStores';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ProvenancePointer } from '../../components/ProvenancePointer';
import { Plus, CheckCircle2 } from 'lucide-react';

interface VaultTimelineProps {
  onAddNew: () => void;
}

const VaultTimelineScreenUnwrapped: React.FC<VaultTimelineProps> = ({ onAddNew }) => {
  const { tokens, radius, typography } = useTheme();
  const { records } = useRecordsStore();
  const [selectedCat, setSelectedCat] = useState<string>('ALL');

  const categories = [
    { id: 'ALL', label: 'All Records' },
    { id: 'LAB', label: 'Lab Reports' },
    { id: 'CAMP_REPORT', label: 'Camp Summaries' },
    { id: 'VACCINE', label: 'Vaccines' },
  ];

  const filteredRecords =
    selectedCat === 'ALL' ? records : records.filter((r) => r.category === selectedCat);

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.headerRow}>
        <View>
          <Badge label="M2 HEALTH RECORD VAULT" variant="mono" />
          <Text style={[styles.title, { color: tokens.text }]}>Your Health Record Vault</Text>
          <Text style={[styles.sub, { color: tokens.text2 }]}>
            All historical reports, camp results, and vaccines indexed on one timeline. 100% offline cached.
          </Text>
        </View>
        <Button
          label="Add Record"
          onPress={onAddNew}
          icon={<Plus size={16} color="#ffffff" />}
          size="md"
        />
      </View>

      {/* Offline Status Bar */}
      <View style={[styles.offlineBanner, { backgroundColor: tokens.surface3, borderColor: tokens.veil }]}>
        <CheckCircle2 size={15} color={tokens.action} />
        <Text style={[styles.offlineText, { color: tokens.data, fontFamily: typography.fontMono }]}>
          OFFLINE VAULT READY · {records.length} RECORDS ENCRYPTED LOCALLY
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {categories.map((cat) => {
          const active = selectedCat === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCat(cat.id)}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active ? tokens.action : tokens.surface,
                  borderColor: active ? tokens.action : tokens.rule,
                  borderRadius: radius.full,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: active ? '#ffffff' : tokens.text2, fontWeight: '600' },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Records Timeline with Continuous Vertical Spine */}
      <View style={styles.spineContainer}>
        {/* Continuous 1px Vertical Spine Rule */}
        <View style={[styles.verticalSpineLine, { backgroundColor: tokens.rule }]} />

        <View style={styles.timelineList}>
          {filteredRecords.map((rec) => (
            <View key={rec.id} style={styles.spineRow}>
              {/* Spine Node Marker */}
              <View style={[styles.spineDot, { backgroundColor: tokens.action, borderColor: tokens.canvas }]} />
              
              <Card variant="surface" style={styles.recordCard}>
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                      <Badge label={rec.category} variant="primary" size="sm" />
                      <Text style={[styles.dateText, { color: tokens.text3, fontFamily: typography.fontMono }]}>
                        {rec.date}
                      </Text>
                    </View>
                    <Text style={[styles.recTitle, { color: tokens.text }]}>{rec.title}</Text>
                    <Text style={[styles.facilityText, { color: tokens.text2 }]}>
                      {rec.facilityName} {rec.doctorName ? `· ${rec.doctorName}` : ''}
                    </Text>
                  </View>
                  <Badge label="FHIR R4 Indexed" variant="positive" size="sm" />
                </View>

                {/* Observations Preview */}
                {rec.observations.length > 0 && (
                  <View style={[styles.obsContainer, { backgroundColor: tokens.surface2, borderRadius: radius.md }]}>
                    {rec.observations.map((obs) => (
                      <View key={obs.id} style={styles.obsItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.obsDisplay, { color: tokens.text }]}>{obs.display}</Text>
                          {obs.referenceRange && (
                            <Text style={[styles.obsRef, { color: tokens.text3, fontFamily: typography.fontMono }]}>
                              Ref: {obs.referenceRange} {obs.unit}
                            </Text>
                          )}
                          {obs.provenance && (
                            <ProvenancePointer provenance={obs.provenance} confidence={obs.confidenceScore} />
                          )}
                        </View>
                        {/* Amber for out-of-range per Build Doc v4 §3.5 Rule E5 & Design Doc v1 §2 Rule 2 */}
                        <Text
                          style={[
                            styles.obsValText,
                            {
                              color: obs.isAbnormal ? tokens.attention : tokens.text,
                              fontFamily: typography.fontMono,
                            },
                          ]}
                        >
                          {obs.value} {obs.unit} {obs.isAbnormal ? '⚠️' : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    maxWidth: 880,
    alignSelf: 'center',
    width: '100%',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    maxWidth: 540,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    maxWidth: 880,
    alignSelf: 'center',
    width: '100%',
    marginBottom: 16,
  },
  offlineText: {
    fontSize: 11,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    maxWidth: 880,
    alignSelf: 'center',
    width: '100%',
    marginBottom: 16,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
  },
  timelineList: {
    maxWidth: 880,
    alignSelf: 'center',
    width: '100%',
    gap: 16,
    paddingBottom: 40,
  },
  spineContainer: {
    maxWidth: 880,
    alignSelf: 'center',
    width: '100%',
    position: 'relative',
  },
  verticalSpineLine: {
    position: 'absolute',
    left: 11,
    top: 0,
    bottom: 40,
    width: 2,
    zIndex: 1,
  },
  spineRow: {
    position: 'relative',
    paddingLeft: 32,
  },
  spineDot: {
    position: 'absolute',
    left: 4,
    top: 20,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    zIndex: 2,
  },
  recordCard: {
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 11,
  },
  recTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  facilityText: {
    fontSize: 12,
    marginTop: 2,
  },
  obsContainer: {
    padding: 12,
    gap: 10,
  },
  obsItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  obsDisplay: {
    fontSize: 13,
    fontWeight: '600',
  },
  obsRef: {
    fontSize: 11,
    marginTop: 2,
  },
  obsValText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export const VaultTimelineScreen: React.FC<VaultTimelineProps> = observer(VaultTimelineScreenUnwrapped);
