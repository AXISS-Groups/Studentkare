import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { AppointmentBookingViewModel, ModalityType } from '../viewmodel/AppointmentBookingViewModel';

interface AppointmentBookingNativeViewProps {
  viewModel: AppointmentBookingViewModel;
}

const modalityLabels: Record<ModalityType, string> = {
  WALK_IN: '🏥 Walk-In Clinic',
  HOME_COLLECTION: '🏡 Home Collection',
  TELECONSULT: '📹 Video Consult',
};

/**
 * React Native / Mobile View for Appointment & Lab Slot Booking.
 *
 * Consumes the exact same `AppointmentBookingViewModel` as the web app.
 */
export const AppointmentBookingNativeView: React.FC<AppointmentBookingNativeViewProps> = observer(({ viewModel }) => {
  if (viewModel.confirmation) {
    return (
      <View style={styles.confirmationContainer}>
        <Text style={styles.confirmBadge}>✓ CONFIRMED</Text>
        <Text style={styles.confirmTitle}>Appointment Booked!</Text>
        <Text style={styles.confirmId}>Ref: {viewModel.confirmation.bookingId}</Text>

        <View style={styles.confirmBox}>
          <Text style={styles.confirmLabel}>PROVIDER</Text>
          <Text style={styles.confirmVal}>{viewModel.confirmation.providerName}</Text>

          <Text style={[styles.confirmLabel, styles.marginTop]}>DATE & TIME</Text>
          <Text style={styles.confirmVal}>
            {viewModel.confirmation.date} at {viewModel.confirmation.timeSlot}
          </Text>

          <Text style={[styles.confirmLabel, styles.marginTop]}>MODALITY</Text>
          <Text style={styles.confirmVal}>{modalityLabels[viewModel.confirmation.modality]}</Text>
        </View>

        <TouchableOpacity style={styles.btnPrimary} onPress={() => viewModel.reset()}>
          <Text style={styles.btnPrimaryText}>Book Another Appointment</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>CAMPUS CARE & LABS</Text>
      <Text style={styles.title}>Book Appointment</Text>

      {viewModel.error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{viewModel.error}</Text>
        </View>
      )}

      {/* Step 1: Provider */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. Select Care Provider</Text>
        {viewModel.providers.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[styles.providerItem, viewModel.selectedProviderId === p.id && styles.providerSelected]}
            onPress={() => viewModel.selectProvider(p.id)}
          >
            <Text style={styles.providerName}>{p.name}</Text>
            <Text style={styles.providerSub}>{p.specialty}</Text>
            <Text style={styles.providerStation}>📍 {p.campusStation}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Step 2: Modality & Date */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Modality & Date ({viewModel.formattedSelectedDate})</Text>

        {viewModel.selectedProvider && (
          <View style={styles.pillRow}>
            {viewModel.selectedProvider.availableModality.map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.modalityPill, viewModel.modality === m && styles.modalityActive]}
                onPress={() => viewModel.setModality(m)}
              >
                <Text style={[styles.modalityText, viewModel.modality === m && styles.modalityTextActive]}>
                  {modalityLabels[m]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Step 3: Slot Picker */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>3. Time Slot</Text>
        <View style={styles.slotsGrid}>
          {viewModel.availableSlots.map(slot => (
            <TouchableOpacity
              key={slot.id}
              disabled={!slot.available}
              style={[
                styles.slotPill,
                viewModel.selectedTimeSlot === slot.time && styles.slotSelected,
                !slot.available && styles.slotDisabled,
              ]}
              onPress={() => viewModel.setTimeSlot(slot.time)}
            >
              <Text
                style={[
                  styles.slotText,
                  viewModel.selectedTimeSlot === slot.time && styles.slotTextSelected,
                  !slot.available && styles.slotTextDisabled,
                ]}
              >
                {slot.time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Step 4: Notes & Submit */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>4. Symptoms / Patient Notes</Text>
        <TextInput
          style={styles.notesInput}
          multiline
          numberOfLines={3}
          placeholder="Describe symptoms or reasons for visit..."
          value={viewModel.patientNotes}
          onChangeText={(text: string) => viewModel.setNotes(text)}
        />

        <TouchableOpacity
          style={[styles.btnPrimary, !viewModel.canSubmit && styles.btnDisabled]}
          disabled={!viewModel.canSubmit}
          onPress={() => viewModel.submitBooking()}
        >
          <Text style={styles.btnPrimaryText}>
            {viewModel.submitting ? 'Confirming...' : 'Confirm Appointment'}
          </Text>
        </TouchableOpacity>
      </View>
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
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4f46e5',
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  providerItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  providerSelected: {
    backgroundColor: '#eef2ff',
    borderColor: '#4f46e5',
  },
  providerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  providerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  providerStation: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalityPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  modalityActive: {
    backgroundColor: '#4f46e5',
  },
  modalityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  modalityTextActive: {
    color: '#ffffff',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    minWidth: 80,
    alignItems: 'center',
  },
  slotSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  slotDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  slotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  slotTextSelected: {
    color: '#ffffff',
  },
  slotTextDisabled: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    backgroundColor: '#ffffff',
    textAlignVertical: 'top',
  },
  btnPrimary: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: '#94a3b8',
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmationContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  confirmBadge: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16a34a',
    marginBottom: 8,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  confirmId: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  confirmBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginVertical: 24,
  },
  confirmLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  confirmVal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 2,
  },
  marginTop: {
    marginTop: 12,
  },
});
