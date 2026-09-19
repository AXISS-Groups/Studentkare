import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { IncidentTriageViewModel, IncidentSeverity, IncidentCategory } from '../viewmodel/IncidentTriageViewModel';

interface IncidentTriageNativeViewProps {
  viewModel: IncidentTriageViewModel;
}

const severityLabels: Record<IncidentSeverity, string> = {
  LOW: 'Minor',
  MEDIUM: 'Moderate',
  HIGH: 'High Priority',
  CRITICAL: 'CRITICAL / SOS',
};

const categoryLabels: Record<IncidentCategory, string> = {
  FEVER_FLU: '🌡️ Fever / Flu',
  SURGICAL_TRAUMA: '🩹 Injury',
  MENTAL_WELLBEING: '🧠 Stress',
  GASTRO: '🍲 Gastro',
  OTHER: '📋 General',
};

/**
 * React Native / Mobile View for Health Incident & Emergency Triage.
 *
 * Consumes the exact same `IncidentTriageViewModel` as the web app.
 */
export const IncidentTriageNativeView: React.FC<IncidentTriageNativeViewProps> = observer(({ viewModel }) => {
  if (viewModel.triageOutcome) {
    return (
      <View style={[styles.outcomeContainer, viewModel.triageOutcome.sosTriggered && styles.outcomeSos]}>
        <Text style={styles.outcomeBadge}>
          {viewModel.triageOutcome.sosTriggered ? '🚨 EMERGENCY DISPATCHED' : '✓ TRIAGE REGISTERED'}
        </Text>
        <Text style={styles.outcomeTitle}>Incident Report Saved</Text>
        <Text style={styles.outcomeId}>Ref: {viewModel.triageOutcome.incidentId}</Text>

        <View style={styles.guidanceCard}>
          <Text style={styles.guidanceLabel}>RECOMMENDED CARE ACTION</Text>
          <Text style={styles.guidanceText}>{viewModel.triageOutcome.recommendedAction}</Text>

          {viewModel.triageOutcome.dispatchAssigned && (
            <Text style={styles.dispatchText}>
              🚑 Dispatched: {viewModel.triageOutcome.dispatchAssigned} (ETA ~{viewModel.triageOutcome.etaMinutes}m)
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.btnPrimary} onPress={() => viewModel.reset()}>
          <Text style={styles.btnPrimaryText}>Report Another Incident</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* SOS Hero */}
      <View style={styles.sosHero}>
        <Text style={styles.sosTitle}>🚨 Campus Emergency Hotkey</Text>
        <Text style={styles.sosSub}>Immediate ambulance & medical dispatch to your location.</Text>
        <TouchableOpacity style={styles.sosBtn} onPress={() => viewModel.triggerImmediateSOS()}>
          <Text style={styles.sosBtnText}>TRIGGER 112 SOS</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.eyebrow}>STUDENT SAFETY CONSOLE</Text>
      <Text style={styles.title}>Incident & Symptom Triage</Text>

      {viewModel.error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{viewModel.error}</Text>
        </View>
      )}

      {/* Category */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. Incident Category</Text>
        <View style={styles.pillRow}>
          {(Object.keys(categoryLabels) as IncidentCategory[]).map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, viewModel.category === cat && styles.pillActive]}
              onPress={() => viewModel.setCategory(cat)}
            >
              <Text style={[styles.pillText, viewModel.category === cat && styles.pillTextActive]}>
                {categoryLabels[cat]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Severity */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Severity Level</Text>
        <View style={styles.pillRow}>
          {(Object.keys(severityLabels) as IncidentSeverity[]).map(sev => (
            <TouchableOpacity
              key={sev}
              style={[
                styles.pill,
                viewModel.severity === sev && styles.pillActive,
                sev === 'CRITICAL' && viewModel.severity === sev && styles.pillCritical,
              ]}
              onPress={() => viewModel.setSeverity(sev)}
            >
              <Text style={[styles.pillText, viewModel.severity === sev && styles.pillTextActive]}>
                {severityLabels[sev]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Symptoms */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>3. Symptoms & Location</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          placeholder="Describe your symptoms in detail..."
          value={viewModel.symptoms}
          onChangeText={(text: string) => viewModel.setSymptoms(text)}
        />

        <TextInput
          style={styles.input}
          placeholder="Campus Location (e.g. Hostel C Room 304)"
          value={viewModel.location}
          onChangeText={(text: string) => viewModel.setLocation(text)}
        />

        <TouchableOpacity
          style={[
            styles.btnPrimary,
            viewModel.isEmergencySOS && styles.btnCritical,
            !viewModel.canSubmit && styles.btnDisabled,
          ]}
          disabled={!viewModel.canSubmit}
          onPress={() => viewModel.submitIncident()}
        >
          <Text style={styles.btnPrimaryText}>
            {viewModel.submitting ? 'Submitting...' : 'Submit Triage Report'}
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
  sosHero: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  sosTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991b1b',
  },
  sosSub: {
    fontSize: 12,
    color: '#b91c1c',
  },
  sosBtn: {
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  sosBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  pillActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  pillCritical: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    backgroundColor: '#ffffff',
    textAlignVertical: 'top',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    backgroundColor: '#ffffff',
  },
  btnPrimary: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  btnCritical: {
    backgroundColor: '#dc2626',
  },
  btnDisabled: {
    backgroundColor: '#94a3b8',
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  outcomeContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  outcomeSos: {
    backgroundColor: '#fff5f5',
  },
  outcomeBadge: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16a34a',
    marginBottom: 8,
  },
  outcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  outcomeId: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  guidanceCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginVertical: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  guidanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  guidanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 4,
  },
  dispatchText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369a1',
    marginTop: 10,
  },
});
