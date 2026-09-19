import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { TeleconsultViewModel } from '../viewmodel/TeleconsultViewModel';

interface TeleconsultNativeViewProps {
  viewModel: TeleconsultViewModel;
}

/**
 * Mobile (React Native) View Component for Teleconsult Video & Digital E-Prescription Scribe.
 *
 * Binds reactively to `TeleconsultViewModel` via MobX `observer`.
 * Uses native primitives (`View`, `Text`, `TouchableOpacity`, `TextInput`, `ScrollView`).
 */
export const TeleconsultNativeView: React.FC<TeleconsultNativeViewProps> = observer(({ viewModel }) => {
  if (viewModel.sessionStatus === 'ENDED' && viewModel.ePrescription) {
    const rx = viewModel.ePrescription;
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View className="rx-card" style={styles.rxCard}>
          <Text style={styles.rxBadge}>DIGITAL E-PRESCRIBED</Text>
          <Text style={styles.rxTitle}>Prescription #{rx.prescriptionId}</Text>
          <Text style={styles.rxSubText}>Prescribed by: {rx.doctorName}</Text>
          <Text style={styles.rxSubText}>Diagnosis: {rx.diagnosis}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionHeader}>Prescribed Medications:</Text>
          {rx.medicines.map((m, i) => (
            <View key={i} style={styles.medItem}>
              <Text style={styles.medName}>• {m.name}</Text>
              <Text style={styles.medDosage}>{m.dosage} — {m.durationDays} Days</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <Text style={styles.sectionHeader}>Clinical Advice:</Text>
          <Text style={styles.notesText}>{rx.clinicalNotes}</Text>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { marginTop: 24 }]}
            onPress={() => viewModel.reset()}
          >
            <Text style={styles.primaryButtonText}>Start New Consultation</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>TELEHEALTH VIDEO OP-ROOM</Text>
        <Text style={styles.title}>Doctor Video Teleconsultation</Text>
      </View>

      {/* Error Alert */}
      {viewModel.error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{viewModel.error}</Text>
        </View>
      ) : null}

      {/* Idle State */}
      {viewModel.sessionStatus === 'IDLE' && (
        <View style={styles.idleCard}>
          <Text style={styles.idleTitle}>Ready to connect with {viewModel.activeDoctorName}</Text>
          <Text style={styles.idleSub}>Encrypted WebRTC Video Consultation</Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => viewModel.startCall()}
          >
            <Text style={styles.primaryButtonText}>Start Video Call Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active Call / Connecting State */}
      {(viewModel.sessionStatus === 'CONNECTING' || viewModel.sessionStatus === 'CONNECTED') && (
        <View style={styles.activeCallContainer}>
          {/* Video Feed Placeholder */}
          <View style={styles.videoBox}>
            <View style={styles.videoOverlay}>
              <Text style={styles.statusBadge}>
                ● {viewModel.sessionStatus === 'CONNECTING' ? 'CONNECTING...' : `LIVE (${viewModel.formattedCallDuration})`}
              </Text>
              <Text style={styles.doctorBadge}>{viewModel.activeDoctorName}</Text>
            </View>

            <View style={styles.videoContent}>
              <Text style={styles.videoText}>
                {viewModel.isVideoOff ? 'Camera Paused' : 'Encrypted Video Stream Active'}
              </Text>
            </View>

            {/* In-Call Controls */}
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={[styles.controlBtn, viewModel.isMuted && styles.controlBtnActive]}
                onPress={() => viewModel.toggleMute()}
              >
                <Text style={styles.controlBtnText}>{viewModel.isMuted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlBtn, viewModel.isVideoOff && styles.controlBtnActive]}
                onPress={() => viewModel.toggleVideo()}
              >
                <Text style={styles.controlBtnText}>{viewModel.isVideoOff ? 'Cam On' : 'Cam Off'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlBtn, styles.endCallBtn]}
                onPress={() => viewModel.endCall()}
              >
                <Text style={styles.endCallText}>End Call</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Chat Section */}
          <View style={styles.chatBox}>
            <Text style={styles.chatTitle}>In-Call Clinical Chat</Text>
            <ScrollView style={styles.chatScrollView}>
              {viewModel.chatMessages.map(msg => (
                <View
                  key={msg.id}
                  style={[
                    styles.chatBubble,
                    msg.sender === 'DOCTOR' ? styles.doctorBubble : styles.patientBubble,
                  ]}
                >
                  <Text style={styles.chatSender}>{msg.sender === 'DOCTOR' ? 'Dr. Radhika' : 'You'}</Text>
                  <Text style={msg.sender === 'DOCTOR' ? styles.doctorMsgText : styles.patientMsgText}>
                    {msg.text}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Ask prescription question..."
                value={viewModel.chatInput}
                onChangeText={(text: string) => viewModel.setChatInput(text)}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={() => viewModel.sendChatMessage()}>
                <Text style={styles.sendBtnText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
  },
  idleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  idleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  idleSub: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  activeCallContainer: {
    flex: 1,
    gap: 16,
  },
  videoBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    height: 240,
    position: 'relative',
    justifyContent: 'space-between',
  },
  videoOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  statusBadge: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '700',
  },
  doctorBadge: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  videoContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  controlBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  controlBtnActive: {
    backgroundColor: '#dc2626',
  },
  controlBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  endCallBtn: {
    backgroundColor: '#ef4444',
  },
  endCallText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  chatBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  chatTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  chatScrollView: {
    maxHeight: 160,
    marginBottom: 8,
  },
  chatBubble: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
    maxWidth: '85%',
  },
  doctorBubble: {
    backgroundColor: '#f1f5f9',
    alignSelf: 'flex-start',
  },
  patientBubble: {
    backgroundColor: '#4f46e5',
    alignSelf: 'flex-end',
  },
  chatSender: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 2,
  },
  doctorMsgText: {
    color: '#0f172a',
    fontSize: 12,
  },
  patientMsgText: {
    color: '#ffffff',
    fontSize: 12,
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
  },
  sendBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  rxCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rxBadge: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  rxTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  rxSubText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  medItem: {
    marginBottom: 4,
  },
  medName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  medDosage: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 10,
  },
  notesText: {
    fontSize: 13,
    color: '#334155',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
  },
});
