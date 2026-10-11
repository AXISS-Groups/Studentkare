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
import { useT } from '@/i18n';
import {
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

const Flow08ClinicianConsoleScreenUnwrapped: React.FC = () => {
  const t = useT();
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

  if (!selectedPatient) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Text accessibilityRole="alert" style={{ color: tokens.text }}>
            {t('partner.clin.console.notConnected')}
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      {vm.isSample && (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Badge label={t('partner.clin.console.sample')} variant="emergency" />
        </View>
      )}
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <NMCDoctorEPrescriptionScribe
          patientId={selectedPatient.id}
          patientName={selectedPatient.name}
          // No allergy record reaches this console yet. An invented list is
          // worse than none: it cross-checks prescriptions against fiction.
          patientAllergies={[]}
        />
      </View>
      <View style={styles.headerBox}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Badge
            label={
              vm.cdssSource === 'service'
                ? t('partner.clin.console.sourceService')
                : t('partner.clin.console.sourceLocal')
            }
            variant="mono"
          />
          {/* A "RULE K1 ISOLATED" badge used to sit here: a hardcoded, always-green
              isolation claim that nothing on this screen checks (guardrail 6). */}
        </View>
        <Text style={[styles.title, { color: tokens.text }]}>{t('partner.clin.console.title')}</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          {t('partner.clin.console.intro')}
        </Text>

        {/* Patient Switcher */}
        <View style={styles.patientTabs}>
          {patients.map((p) => {
            const active = p.id === selectedPatient.id;
            return (
              <TouchableOpacity
                key={p.id}
                accessibilityRole="button"
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
                <Text style={{ color: active ? tokens.onAction : tokens.text, fontWeight: '700', fontSize: 13 }}>
                  {t('partner.clin.console.patientPill', { name: p.name, age: p.age, gender: p.gender })}
                </Text>
                <Text style={{ color: active ? 'rgba(255,255,255,0.8)' : tokens.text3, fontSize: 11 }}>
                  {t('partner.clin.console.blood', { group: p.bloodGroup })}
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
            <Text style={[styles.sectionHeading, { color: tokens.text }]}>{t('partner.clin.console.vitalsHeading')}</Text>
            <View style={styles.vitalsGrid}>
              <View style={styles.vitalTile}>
                <Text style={[styles.vLabel, { color: tokens.text3 }]}>{t('partner.clin.console.bp')}</Text>
                <Text style={[styles.vVal, { color: tokens.text }]}>{selectedPatient.vitals.bp}</Text>
              </View>
              <View style={styles.vitalTile}>
                <Text style={[styles.vLabel, { color: tokens.text3 }]}>{t('partner.clin.console.pulse')}</Text>
                <Text style={[styles.vVal, { color: tokens.text }]}>{selectedPatient.vitals.pulse} bpm</Text>
              </View>
              <View style={styles.vitalTile}>
                <Text style={[styles.vLabel, { color: tokens.text3 }]}>{t('partner.clin.console.spo2')}</Text>
                <Text style={[styles.vVal, { color: tokens.text }]}>{selectedPatient.vitals.spo2}%</Text>
              </View>
              <View style={styles.vitalTile}>
                <Text style={[styles.vLabel, { color: tokens.text3 }]}>{t('partner.clin.console.temp')}</Text>
                <Text style={[styles.vVal, { color: tokens.text }]}>{selectedPatient.vitals.tempF}°F</Text>
              </View>
            </View>
          </Card>

          {/* AI Clinical Decision Support (CDSS) */}
          <Card variant="surface" style={styles.cdssCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Sparkles size={16} color={tokens.action} />
              <Text style={[styles.sectionHeading, { color: tokens.text }]}>
                {vm.cdssSource === 'service'
                  ? t('partner.clin.console.diffService')
                  : t('partner.clin.console.diffLocal')}
              </Text>
            </View>

            {cdssData.differentialDiagnoses.map((diff, idx) => (
              <View key={idx} style={[styles.diffItem, { backgroundColor: tokens.surface2 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={[styles.diffCondition, { color: tokens.text }]}>{diff.condition}</Text>
                  <Badge label={t('partner.clin.console.match', { n: diff.confidence })} variant="primary" size="sm" />
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
                    {t('partner.clin.console.interaction')}
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
            <Text style={[styles.sectionHeading, { color: tokens.text }]}>{t('partner.clin.console.timeline')}</Text>
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
            <Text style={[styles.sectionHeading, { color: tokens.text }]}>{t('partner.clin.console.noteHeading')}</Text>
            <Text style={[styles.sub, { color: tokens.text2 }]}>{t('partner.clin.console.noteNotSaved')}</Text>
            <Input
              label={t('partner.clin.console.noteTitle')}
              value={soapTitle}
              onChangeText={vm.setSoapTitle}
            />
            <Input
              label={t('partner.clin.console.noteBody')}
              value={soapNote}
              onChangeText={vm.setSoapNote}
              placeholder={t('partner.clin.console.notePlaceholder')}
              multiline
              numberOfLines={4}
            />
            <Button
              label={noteSaved ? t('partner.clin.console.noteAdded') : t('partner.clin.console.addNote')}
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
    minHeight: 44,
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
