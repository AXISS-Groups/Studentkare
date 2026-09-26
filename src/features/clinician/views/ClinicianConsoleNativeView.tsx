import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { ClinicianViewModel } from '../viewmodel/ClinicianViewModel';

interface ClinicianConsoleNativeViewProps {
  viewModel: ClinicianViewModel;
}

/**
 * Mobile (React Native) View Component for M18 Clinician Console & CDSS.
 * Binds reactively to `ClinicianViewModel` via MobX `observer`.
 */
export const ClinicianConsoleNativeView: React.FC<ClinicianConsoleNativeViewProps> = observer(({ viewModel }) => {
  const patient = viewModel.selectedPatient;
  const cdss = viewModel.cdssData;

  if (!patient) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Medical Officer Console</Text>
          <Text accessibilityRole="alert">This console is not connected to patient records yet. No patients are loaded.</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>M18 CLINICIAN EMR & DECISION SUPPORT</Text>
        <Text style={styles.title}>Medical Officer Console</Text>
      </View>

      {/* Patient Queue Selector */}
      <Text style={styles.sectionTitle}>Select Patient Queue ({viewModel.patients.length})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.patientRow}>
        {viewModel.patients.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.patientChip, p.id === patient.id && styles.patientChipActive]}
            onPress={() => viewModel.selectPatient(p.id)}
          >
            <Text style={[styles.patientChipText, p.id === patient.id && styles.chipTextActive]}>
              {p.name} ({p.age}y)
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Active Patient Vitals Card */}
      <View style={styles.card}>
        <Text style={styles.patientName}>{patient.name}</Text>
        <Text style={styles.complaintText}>Chief Complaint: {patient.chiefComplaint}</Text>

        <View style={styles.vitalsRow}>
          <View style={styles.vitalBox}>
            <Text style={styles.vitalLabel}>BP</Text>
            <Text style={styles.vitalVal}>{patient.vitals.bp}</Text>
          </View>
          <View style={styles.vitalBox}>
            <Text style={styles.vitalLabel}>Pulse</Text>
            <Text style={styles.vitalVal}>{patient.vitals.pulse}</Text>
          </View>
          <View style={styles.vitalBox}>
            <Text style={styles.vitalLabel}>SpO2</Text>
            <Text style={styles.vitalVal}>{patient.vitals.spo2}%</Text>
          </View>
          <View style={styles.vitalBox}>
            <Text style={styles.vitalLabel}>Temp</Text>
            <Text style={styles.vitalVal}>{patient.vitals.tempF}°F</Text>
          </View>
        </View>
      </View>

      {/* CDSS AI Recommendations */}
      <View style={styles.card}>
        <Text style={styles.cdssTitle}>AI Differential Diagnosis (CDSS)</Text>
        {cdss && cdss.differentialDiagnoses && (
          <View style={styles.diffContainer}>
            {cdss.differentialDiagnoses.map((d, i) => (
              <View key={i} style={styles.diffTag}>
                <Text style={styles.diffText}>{d.condition} ({d.confidence}%)</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* SOAP Note Form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Author SOAP Progress Note</Text>
        <TextInput
          style={styles.input}
          placeholder="Encounter Title"
          value={viewModel.soapTitle}
          onChangeText={(text: string) => viewModel.setSoapTitle(text)}
        />
        <TextInput
          style={[styles.input, styles.textarea]}
          multiline
          numberOfLines={4}
          placeholder="Subjective, Objective, Assessment, Plan..."
          value={viewModel.soapNote}
          onChangeText={(text: string) => viewModel.setSoapNote(text)}
        />

        <TouchableOpacity
          style={[styles.saveBtn, !viewModel.canSave && styles.btnDisabled]}
          onPress={() => viewModel.saveNote()}
          disabled={!viewModel.canSave}
        >
          <Text style={styles.saveBtnText}>Save Note to EMR</Text>
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
  header: {
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4f46e5',
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  patientRow: {
    maxHeight: 36,
  },
  patientChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  patientChipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4338ca',
  },
  patientChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  complaintText: {
    fontSize: 12,
    color: '#b45309',
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 12,
  },
  vitalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
  },
  vitalBox: {
    alignItems: 'center',
  },
  vitalLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '600',
  },
  vitalVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  cdssTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4338ca',
    marginBottom: 8,
  },
  diffContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  diffTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  diffText: {
    fontSize: 11,
    color: '#3730a3',
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    marginBottom: 8,
  },
  textarea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
