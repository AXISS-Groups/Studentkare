import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { color } from '@/design-system/theme';
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
              <Text
                style={[
                  styles.pillText,
                  viewModel.severity === sev && styles.pillTextActive,
                  sev === 'CRITICAL' && viewModel.severity === sev && styles.pillTextCritical,
                ]}
              >
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
          <Text
            style={[
              styles.btnPrimaryText,
              viewModel.isEmergencySOS && styles.btnCriticalText,
              !viewModel.canSubmit && styles.btnDisabledText,
            ]}
          >
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
    backgroundColor: color.surface2,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  sosHero: {
    backgroundColor: color.dangerBg,
    borderColor: color.dangerRule,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  sosTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: color.danger,
  },
  sosSub: {
    fontSize: 12,
    color: color.danger,
  },
  sosBtn: {
    backgroundColor: color.dangerFill,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  sosBtnText: {
    color: color.onDangerFill,
    fontWeight: '800',
    fontSize: 12,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: color.action,
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: color.text,
  },
  errorBox: {
    backgroundColor: color.dangerBg,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.dangerRule,
  },
  errorText: {
    color: color.danger,
    fontSize: 12,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: color.rule,
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: color.text,
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
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.ruleStrong,
  },
  pillActive: {
    backgroundColor: color.action,
    borderColor: color.action,
  },
  pillCritical: {
    backgroundColor: color.dangerFill,
    borderColor: color.dangerFill,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: color.text2,
  },
  pillTextActive: {
    color: color.onAction,
  },
  pillTextCritical: {
    color: color.onDangerFill,
  },
  textArea: {
    borderWidth: 1,
    borderColor: color.ruleStrong,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    backgroundColor: color.surface,
    color: color.text,
    textAlignVertical: 'top',
  },
  input: {
    borderWidth: 1,
    borderColor: color.ruleStrong,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    backgroundColor: color.surface,
    color: color.text,
  },
  btnPrimary: {
    backgroundColor: color.action,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  btnCritical: {
    backgroundColor: color.dangerFill,
  },
  btnDisabled: {
    backgroundColor: color.actionSoft,
  },
  btnPrimaryText: {
    color: color.onAction,
    fontSize: 14,
    fontWeight: '700',
  },
  btnCriticalText: {
    color: color.onDangerFill,
  },
  btnDisabledText: {
    color: color.text2,
  },
  outcomeContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
  },
  outcomeSos: {
    backgroundColor: color.dangerBg,
  },
  outcomeBadge: {
    fontSize: 14,
    fontWeight: '800',
    color: color.positive,
    marginBottom: 8,
  },
  outcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: color.text,
  },
  outcomeId: {
    fontSize: 12,
    color: color.text3,
    marginTop: 4,
  },
  guidanceCard: {
    width: '100%',
    backgroundColor: color.surface2,
    padding: 16,
    borderRadius: 12,
    marginVertical: 24,
    borderWidth: 1,
    borderColor: color.rule,
  },
  guidanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: color.text3,
  },
  guidanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: color.text,
    marginTop: 4,
  },
  dispatchText: {
    fontSize: 12,
    fontWeight: '700',
    color: color.info,
    marginTop: 10,
  },
});
