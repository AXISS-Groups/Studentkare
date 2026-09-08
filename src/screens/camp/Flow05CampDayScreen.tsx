import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAppStore } from '../../data/store';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import {
  QrCode,
  CheckCircle2,
  Award,
  Activity,
  Smile,
  Eye,
  UserCheck,
  Sparkles,
} from 'lucide-react';

export const Flow05CampDayScreen: React.FC = () => {
  const { tokens, typography } = useTheme();
  const { camp, completeStation, student } = useAppStore();

  const [activeModalStation, setActiveModalStation] = useState<any>(null);
  const [doctorNoteInput, setDoctorNoteInput] = useState('');

  const getStationIcon = (iconName: string) => {
    switch (iconName) {
      case 'Activity':
        return <Activity size={20} color={tokens.action} />;
      case 'Smile':
        return <Smile size={20} color={tokens.action} />;
      case 'UserCheck':
        return <UserCheck size={20} color={tokens.action} />;
      case 'Eye':
        return <Eye size={20} color={tokens.action} />;
      case 'Award':
      default:
        return <Award size={20} color={tokens.action} />;
    }
  };

  const handleOpenCompleteModal = (station: any) => {
    setActiveModalStation(station);
    setDoctorNoteInput(
      station.id === 'st-4'
        ? 'Visual acuity 6/6 right eye, 6/6 left eye. Color vision normal.'
        : 'All 5 stations reviewed. Student health passport certified.'
    );
  };

  const handleConfirmStationComplete = () => {
    if (activeModalStation) {
      completeStation(activeModalStation.id, doctorNoteInput);
      setActiveModalStation(null);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.headerBox}>
        <Badge label="FLOW 05 · M8 HEALTH CAMPS & CLINIC OPS" variant="mono" />
        <Text style={[styles.title, { color: tokens.text }]}>Monsoon Term Campus Health Camp</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          {camp.institution} · {camp.location} · {camp.date}
        </Text>

        {/* Camp Progress Bar & QR */}
        <View style={[styles.campPassportBanner, { backgroundColor: tokens.surface, borderColor: tokens.rule }]}>
          <View style={styles.qrSide}>
            <View style={[styles.qrBox, { backgroundColor: tokens.surface2, borderColor: tokens.veil }]}>
              <QrCode size={42} color={tokens.action} />
            </View>
            <View>
              <Text style={[styles.qrTitle, { color: tokens.text }]}>Check-In QR Active</Text>
              <Text style={[styles.qrCodeText, { color: tokens.data, fontFamily: typography.fontMono }]}>
                {camp.qrCode}
              </Text>
            </View>
          </View>

          <View style={styles.progressSide}>
            <View style={styles.progressTop}>
              <Text style={[styles.progressCount, { color: tokens.text }]}>
                {camp.completedCount} of {camp.totalStations} Stations Completed
              </Text>
              <Badge
                label={camp.digitalBadgeEarned ? 'Passport Sealed' : 'Camp In Progress'}
                variant={camp.digitalBadgeEarned ? 'positive' : 'attention'}
              />
            </View>

            <View style={[styles.progressBarBg, { backgroundColor: tokens.surface2 }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${(camp.completedCount / camp.totalStations) * 100}%`,
                    backgroundColor: camp.digitalBadgeEarned ? tokens.positive : tokens.action,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* 5 Stations Grid */}
      <View style={styles.stationsList}>
        {camp.stations.map((station, idx) => {
          const isDone = station.status === 'COMPLETED';
          const isNext = station.status === 'IN_QUEUE';

          return (
            <Card
              key={station.id}
              variant="surface"
              style={[
                styles.stationCard,
                isDone && { borderLeftColor: tokens.positive, borderLeftWidth: 4 },
                isNext && { borderLeftColor: tokens.action, borderLeftWidth: 4 },
              ]}
            >
              <View style={styles.stationTopRow}>
                <View style={styles.stationIconAndTitle}>
                  <View
                    style={[
                      styles.stationIconBox,
                      {
                        backgroundColor: isDone ? tokens.positiveBg : tokens.surface3,
                      },
                    ]}
                  >
                    {isDone ? <CheckCircle2 size={20} color={tokens.positive} /> : getStationIcon(station.iconName)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stationName, { color: tokens.text }]}>{station.name}</Text>
                    <Text style={[styles.stationDesc, { color: tokens.text2 }]}>{station.description}</Text>
                  </View>
                </View>

                <Badge
                  label={isDone ? 'Completed' : isNext ? `In Queue (${station.queueWaitMinutes}m wait)` : 'Pending'}
                  variant={isDone ? 'positive' : isNext ? 'primary' : 'mono'}
                  size="sm"
                />
              </View>

              {/* Station Readings if completed */}
              {isDone && (
                <View style={[styles.readingsBox, { backgroundColor: tokens.surface2 }]}>
                  {station.readings.map((r, rIdx) => (
                    <View key={rIdx} style={styles.readingItem}>
                      <Text style={[styles.rLabel, { color: tokens.text3 }]}>{r.label}</Text>
                      <Text style={[styles.rVal, { color: tokens.text }]}>{r.value}</Text>
                    </View>
                  ))}
                  {station.doctorNote && (
                    <Text style={[styles.docNote, { color: tokens.text2 }]}>
                      Doctor Seal: "{station.doctorNote}"
                    </Text>
                  )}
                </View>
              )}

              {/* Interactive Station Action */}
              {!isDone && (
                <View style={styles.stationActionRow}>
                  <Button
                    label={`Simulate Check-In & Complete ${station.name.split('·')[0]}`}
                    onPress={() => handleOpenCompleteModal(station)}
                    size="sm"
                    variant={isNext ? 'primary' : 'secondary'}
                  />
                </View>
              )}
            </Card>
          );
        })}
      </View>

      {/* Completion Modal */}
      {activeModalStation && (
        <Modal
          visible={!!activeModalStation}
          onClose={() => setActiveModalStation(null)}
          title={`Complete ${activeModalStation.name}`}
          subtitle="Record station officer findings and digital seal"
        >
          <View style={{ gap: 14 }}>
            <Text style={{ fontSize: 13, color: tokens.text2 }}>
              Enter the officer / clinician findings to seal this station into {student.fullName}'s digital health passport.
            </Text>
            <Input
              label="Station Clinician Notes"
              value={doctorNoteInput}
              onChangeText={setDoctorNoteInput}
              multiline
              numberOfLines={3}
            />
            <Button
              label="Seal Station & Award 100 Points"
              onPress={handleConfirmStationComplete}
              icon={<Sparkles size={16} color="#ffffff" />}
            />
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  headerBox: {
    maxWidth: 880,
    alignSelf: 'center',
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    marginBottom: 16,
  },
  campPassportBanner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qrSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qrBox: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  qrCodeText: {
    fontSize: 11,
    marginTop: 2,
  },
  progressSide: {
    flex: 1,
    minWidth: 260,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  stationsList: {
    maxWidth: 880,
    alignSelf: 'center',
    width: '100%',
    gap: 12,
    paddingBottom: 40,
  },
  stationCard: {
    padding: 16,
  },
  stationTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stationIconAndTitle: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  stationIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationName: {
    fontSize: 15,
    fontWeight: '700',
  },
  stationDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  readingsBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  readingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rLabel: {
    fontSize: 12,
  },
  rVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  docNote: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  stationActionRow: {
    marginTop: 12,
    flexDirection: 'row',
  },
});
