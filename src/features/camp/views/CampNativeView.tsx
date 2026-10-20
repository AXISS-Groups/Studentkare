import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { CampViewModel } from '../viewmodel/CampViewModel';
import { color } from '@/design-system/theme';

interface CampNativeViewProps {
  viewModel: CampViewModel;
}

/**
 * Mobile (React Native) View Component for Campus Health Camp & QR Station Check-in.
 * Binds reactively to `CampViewModel` via MobX `observer`.
 */
export const CampNativeView: React.FC<CampNativeViewProps> = observer(({ viewModel }) => {
  const camp = viewModel.camp;
  const activeStation = viewModel.activeModalStation;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ANNUAL CAMPUS HEALTH DIAGNOSTIC CAMP</Text>
        <Text style={styles.title}>{camp.campName}</Text>
        <Text style={styles.subTitle}>{camp.institution} — {camp.location}</Text>
      </View>

      {/* Progress Card */}
      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>Overall Camp Completion</Text>
        <Text style={styles.studentName}>Student: {viewModel.studentName}</Text>

        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${viewModel.progressPercent}%` }]} />
        </View>

        <Text style={styles.percentText}>{viewModel.progressPercent}% ({camp.completedCount} of {camp.totalStations} Stations)</Text>
      </View>

      {/* QR Code Pass */}
      <View style={styles.qrCard}>
        <View style={styles.qrPlaceholder}>
          <Text style={styles.qrTitle}>QR PASS</Text>
          <Text style={styles.qrCodeText}>{camp.qrCode}</Text>
        </View>
        <View style={styles.qrInfo}>
          <Text style={styles.qrPassHeader}>Fast-Track QR Station Pass</Text>
          <Text style={styles.qrPassSub}>Show at station desk for queue placement.</Text>
          <Text style={styles.checkedInBadge}>✓ Checked In at {camp.checkInTime || '09:15 AM'}</Text>
        </View>
      </View>

      {/* Stations List */}
      <Text style={styles.sectionHeader}>Diagnostic & Clinical Stations</Text>
      {camp.stations.map((st) => {
        const statusType = viewModel.stationStatus(st);
        return (
          <View key={st.id} style={[styles.stationCard, statusType === 'done' && styles.stationCardDone]}>
            <View style={styles.stationTop}>
              <Text style={styles.stationName}>{st.name}</Text>
              <Text style={[styles.statusBadge, statusType === 'done' ? styles.badgeDone : styles.badgePending]}>
                {statusType === 'done' ? 'DONE' : 'PENDING'}
              </Text>
            </View>
            <Text style={styles.stationDesc}>{st.description}</Text>

            {st.doctorNote ? (
              <Text style={styles.doctorNoteText}>Note: {st.doctorNote}</Text>
            ) : null}

            {statusType !== 'done' && (
              <TouchableOpacity
                style={styles.checkInBtn}
                onPress={() => viewModel.openCompleteModal(st)}
              >
                <Text style={styles.checkInBtnText}>Record Station Result</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Record Station Modal */}
      <Modal visible={!!activeStation} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record Result — {activeStation?.name}</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder="Clinical observation notes..."
              value={viewModel.doctorNoteInput}
              onChangeText={(text: string) => viewModel.setDoctorNote(text)}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => viewModel.closeModal()}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={() => viewModel.confirmComplete()}>
                <Text style={styles.confirmText}>Mark Completed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.canvas,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: color.action,
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: color.text,
  },
  subTitle: {
    fontSize: 12,
    color: color.text3,
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: color.heroBg,
    borderRadius: 12,
    padding: 16,
  },
  progressTitle: {
    color: color.onHero,
    fontSize: 14,
    fontWeight: '700',
  },
  studentName: {
    color: color.onHero2,
    fontSize: 12,
    marginTop: 2,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: color.onHeroPositive,
  },
  percentText: {
    color: color.onHeroPositive,
    fontSize: 12,
    fontWeight: '700',
  },
  qrCard: {
    flexDirection: 'row',
    backgroundColor: color.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: color.rule,
    alignItems: 'center',
    gap: 12,
  },
  qrPlaceholder: {
    backgroundColor: color.surface2,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: color.text,
  },
  qrCodeText: {
    fontSize: 11,
    color: color.text3,
    fontWeight: '700',
    marginTop: 2,
  },
  qrInfo: {
    flex: 1,
  },
  qrPassHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: color.text,
  },
  qrPassSub: {
    fontSize: 11,
    color: color.text3,
    marginVertical: 2,
  },
  checkedInBadge: {
    fontSize: 11,
    color: color.positive,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: color.text,
  },
  stationCard: {
    backgroundColor: color.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: color.rule,
  },
  stationCardDone: {
    borderLeftWidth: 4,
    borderLeftColor: color.positive,
  },
  stationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stationName: {
    fontSize: 13,
    fontWeight: '700',
    color: color.text,
  },
  stationDesc: {
    fontSize: 11,
    color: color.text3,
    marginTop: 2,
  },
  doctorNoteText: {
    fontSize: 11,
    color: color.text2,
    backgroundColor: color.surface2,
    padding: 6,
    borderRadius: 4,
    marginTop: 8,
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeDone: {
    backgroundColor: color.positiveBg,
    color: color.positive,
  },
  badgePending: {
    backgroundColor: color.neutralBg,
    color: color.text2,
  },
  checkInBtn: {
    backgroundColor: color.action,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  checkInBtnText: {
    color: color.onAction,
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: color.surface,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: color.text,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: color.ruleStrong,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    color: color.text3,
    fontSize: 12,
  },
  modalConfirmBtn: {
    backgroundColor: color.action,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  confirmText: {
    color: color.onAction,
    fontSize: 12,
    fontWeight: '700',
  },
});
