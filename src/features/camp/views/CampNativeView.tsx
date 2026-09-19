import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { CampViewModel } from '../viewmodel/CampViewModel';

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
    backgroundColor: '#f8fafc',
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
    color: '#0d9488',
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  subTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
  },
  progressTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  studentName: {
    color: '#94a3b8',
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
    backgroundColor: '#2dd4bf',
  },
  percentText: {
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: '700',
  },
  qrCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 12,
  },
  qrPlaceholder: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
  },
  qrCodeText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 2,
  },
  qrInfo: {
    flex: 1,
  },
  qrPassHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  qrPassSub: {
    fontSize: 11,
    color: '#64748b',
    marginVertical: 2,
  },
  checkedInBadge: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '700',
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  stationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stationCardDone: {
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
  },
  stationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stationName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  stationDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  doctorNoteText: {
    fontSize: 11,
    color: '#334155',
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  badgePending: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  },
  checkInBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  checkInBtnText: {
    color: '#ffffff',
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
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
    color: '#64748b',
    fontSize: 12,
  },
  modalConfirmBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  confirmText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
