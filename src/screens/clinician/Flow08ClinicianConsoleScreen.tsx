import { observer } from 'mobx-react-lite';
import { NMCDoctorEPrescriptionScribe } from '../../components/NMCDoctorEPrescriptionScribe';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useClinicianViewModel } from '../../features/clinician/viewmodel/useClinicianViewModel';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import {
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

const Flow08ClinicianConsoleScreenUnwrapped: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  const vm = useClinicianViewModel();
  const selectedPatient = vm.selectedPatient;
  const patients = vm.patients;
  const cdssData = vm.cdssData;
  const soapTitle = vm.soapTitle;
  const soapNote = vm.soapNote;
  const noteSaved = vm.noteSaved;

  const handleSaveNote = () => {
    vm.saveNote();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <NMCDoctorEPrescriptionScribe
          patientId={selectedPatient.id}
          patientName={selectedPatient.name || "Aarav Sharma"}
          patientAllergies={["Penicillin"]}
        />
      </View>
      <View style={styles.headerBox}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Badge
            label={
              vm.cdssSource === 'service'
                ? 'M18 CLINICAL INTELLIGENCE — CLINICIAN-FACING ONLY'
                : 'M18 UNAVAILABLE — SHOWING ON-DEVICE RULES'
            }
            variant="mono"
          />
          <Badge label="RULE K1 ISOLATED" variant="positive" />
        </View>
        <Text style={[styles.title, { color: tokens.text }]}>Clinician EMR & Diagnostic Decision Support</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          Licensed physician workspace with FHIR R4 patient timeline, ICMR guideline differential prompts, and drug-drug interaction alerts.
        </Text>

        {/* Patient Switcher */}
        <View style={styles.patientTabs}>
          {patients.map((p) => {
            const active = p.id === selectedPatient.id;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => vm.selectPatient(p.id)}
                style={[
                  styles.patientPill,
                  {
                    backgroundColor: active ? tokens.action : tokens.surface,
                    borderColor: active ? tokens.action : tokens.rule,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <Text style={{ color: active ? '#ffffff' : tokens.text, fontWeight: '700', fontSize: 13 }}>
                  {p.name} ({p.age}y {p.gender})
                </Text>
                <Text style={{ color: active ? 'rgba(255,255,255,0.8)' : tokens.text3, fontSize: 11 }}>
                  Blood: {p.bloodGroup}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.workspaceGrid}>
        {/* Left Column: Vitals & AI CDSS Alerts */}
        <View style={styles.leftCol}>
          {/* Vitals Ribbon */}
          <Card variant="surface" style={styles.vitalsCard}>
            <Text style={[styles.sectionHeading, { color: tokens.text }]}>Patient Baseline Vitals</Text>
            <View style={styles.vitalsGrid}>
              <View style={styles.vitalTile}>
                <Text style={[styles.vLabel, { color: tokens.text3 }]}>Blood Pressure</Text>
                <Text style={[styles.vVal, { color: tokens.text }]}>{selectedPatient.vitals.bp}</Text>
                <Badge label="Normal" variant="positive" size="sm" />
              </View>
              <View style={styles.vitalTile}>
                <Text style={[styles.vLabel, { color: tokens.text3 }]}>Pulse Rate</Text>
                <Text style={[styles.vVal, { color: tokens.text }]}>{selectedPatient.vitals.pulse} bpm</Text>
                <Badge label="Normal" variant="positive" size="sm" />
              </View>
              <View style={styles.vitalTile}>
                <Text style={[styles.vLabel, { color: tokens.text3 }]}>SpO2</Text>
                <Text style={[styles.vVal, { color: tokens.text }]}>{selectedPatient.vitals.spo2}%</Text>
                <Badge label="Optimal" variant="positive" size="sm" />
              </View>
              <View style={styles.vitalTile}>
                <Text style={[styles.vLabel, { color: tokens.text3 }]}>Body Temp</Text>
                <Text style={[styles.vVal, { color: tokens.emergency }]}>{selectedPatient.vitals.tempF}°F</Text>
                <Badge label="Pyrexia" variant="emergency" size="sm" />
              </View>
            </View>
          </Card>

          {/* AI Clinical Decision Support (CDSS) */}
          <Card variant="surface" style={styles.cdssCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Sparkles size={16} color={tokens.action} />
              <Text style={[styles.sectionHeading, { color: tokens.text }]}>
                {vm.cdssSource === 'service'
                  ? 'Differential suggestions (M18)'
                  : 'Differential suggestions (on-device rules)'}
              </Text>
            </View>

            {cdssData.differentialDiagnoses.map((diff, idx) => (
              <View key={idx} style={[styles.diffItem, { backgroundColor: tokens.surface2 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={[styles.diffCondition, { color: tokens.text }]}>{diff.condition}</Text>
                  <Badge label={`${diff.confidence}% Match`} variant="primary" size="sm" />
                </View>
                <Text style={[styles.diffEvidence, { color: tokens.text2 }]}>{diff.evidence}</Text>
              </View>
            ))}

            {/* Drug Interaction Alert if Any */}
            {selectedPatient.drugInteractions.length > 0 && (
              <View
                style={[
                  styles.alertBox,
                  { backgroundColor: tokens.emergencyBg, borderColor: tokens.emergency },
                ]}
              >
                <AlertTriangle size={18} color={tokens.emergency} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertHead, { color: tokens.emergency }]}>
                    HIGH RISK INTERACTION WARNING
                  </Text>
                  <Text style={[styles.alertDesc, { color: tokens.text }]}>
                    {selectedPatient.drugInteractions[0].warning}
                  </Text>
                </View>
              </View>
            )}
          </Card>
        </View>

        {/* Right Column: Timeline & SOAP Note Writer */}
        <View style={styles.rightCol}>
          {/* Patient Timeline */}
          <Card variant="surface" style={{ marginBottom: 14 }}>
            <Text style={[styles.sectionHeading, { color: tokens.text }]}>Patient Encounters Timeline</Text>
            <View style={styles.timelineList}>
              {selectedPatient.timeline.map((item, idx) => (
                <View key={idx} style={styles.tlItem}>
                  <View style={[styles.tlDot, { backgroundColor: tokens.action }]} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[styles.tlTitle, { color: tokens.text }]}>{item.title}</Text>
                      <Text style={[styles.tlDate, { color: tokens.text3, fontFamily: typography.fontMono }]}>
                        {item.date}
                      </Text>
                    </View>
                    <Text style={[styles.tlNotes, { color: tokens.text2 }]}>{item.notes}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>

          {/* SOAP Clinical Note Input */}
          <Card variant="surface">
            <Text style={[styles.sectionHeading, { color: tokens.text }]}>Record Clinical SOAP Note</Text>
            <Input
              label="Encounter Summary / Title"
              value={soapTitle}
              onChangeText={vm.setSoapTitle}
            />
            <Input
              label="Subjective / Objective / Assessment / Plan"
              value={soapNote}
              onChangeText={vm.setSoapNote}
              placeholder="Patient presents with acute onset fever. Recommended repeat CBC in 24h, prescribed Paracetamol 650mg TDS..."
              multiline
              numberOfLines={4}
            />
            <Button
              label={noteSaved ? 'Note Recorded & Signed!' : 'Sign & Add Clinical Note'}
              onPress={handleSaveNote}
              variant={noteSaved ? 'secondary' : 'primary'}
            />
          </Card>
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
  headerBox: {
    maxWidth: 1040,
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
  patientTabs: {
    flexDirection: 'row',
    gap: 10,
  },
  patientPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  workspaceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: 1040,
    alignSelf: 'center',
    width: '100%',
    gap: 16,
  },
  leftCol: {
    flex: 1,
    minWidth: 320,
    gap: 14,
  },
  rightCol: {
    flex: 1.2,
    minWidth: 340,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  vitalsCard: {
    padding: 16,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vitalTile: {
    flex: 1,
    minWidth: 120,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
    gap: 4,
  },
  vLabel: {
    fontSize: 11,
  },
  vVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  cdssCard: {
    padding: 16,
  },
  diffItem: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  diffCondition: {
    fontSize: 13,
    fontWeight: '700',
  },
  diffEvidence: {
    fontSize: 11,
    lineHeight: 16,
  },
  alertBox: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginTop: 8,
  },
  alertHead: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  alertDesc: {
    fontSize: 11,
  },
  timelineList: {
    gap: 12,
  },
  tlItem: {
    flexDirection: 'row',
    gap: 10,
  },
  tlDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  tlTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  tlDate: {
    fontSize: 11,
  },
  tlNotes: {
    fontSize: 12,
    marginTop: 2,
  },
});

export const Flow08ClinicianConsoleScreen: React.FC = observer(Flow08ClinicianConsoleScreenUnwrapped);
