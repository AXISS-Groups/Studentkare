import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useMedicalIncidentStore, useStudentStore } from '../../store/AppStores';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import {
  ShieldAlert,
  CheckCircle2,
  Stethoscope,
  Info,
  Send,
} from 'lucide-react';
import {
  IncidentCategory,
  MedicalSeverity,
  FIRST_AID_PROTOCOLS,
  MedicalIncident,
} from '../../data/medicalIncidentData';
import { evaluateCrisisGate } from '../../ai/crisisGate';
import { apiRequest } from '../../data/http';

const MedicalIncidentScreenUnwrapped: React.FC = () => {
  const { tokens } = useTheme();
  const medicalStore = useMedicalIncidentStore();
  const { student } = useStudentStore();

  const [category, setCategory] = useState<IncidentCategory>('FOOD_POISONING');
  const [severity, setSeverity] = useState<MedicalSeverity>('URGENT_2');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hostelBlock, setHostelBlock] = useState('Hostel Block 4');
  const [roomNumber, setRoomNumber] = useState('B-214');
  const [submittedToast, setSubmittedToast] = useState<string | null>(null);
  const [crisisMessage, setCrisisMessage] = useState<string | null>(null);

  const handleReportSubmit = () => {
    if (!description.trim() && !title.trim()) return;

    // Crisis Gate Interception check
    const crisisCheck = evaluateCrisisGate(description || title);
    if (crisisCheck.kind !== 'CLEAR') {
      setCrisisMessage(crisisCheck.message);
      // This one path does reach somebody. Send the kind only — never what
      // was written — so the follow-up queue sees this student. Not awaited:
      // the support contacts on screen must not wait on a network call.
      void apiRequest('/care/crisis-signal', {
        method: 'POST',
        body: JSON.stringify({ kind: crisisCheck.kind, surface: 'medical_incident' }),
      }).catch(() => { /* the contacts on screen are what matter */ });
    } else {
      setCrisisMessage(null);
    }

    const newInc = medicalStore.reportIncident({
      studentId: student.id,
      studentName: student.fullName,
      // Recorded as absent when absent. This used to substitute 'O+' and
      // ['Sulfa'] — a blood group and an allergy invented for whoever read
      // the report, on the one document a responder would act on.
      bloodGroup: student.bloodGroup || '',
      allergies: student.allergies ?? [],
      category,
      severity,
      title: title || `${category.replace('_', ' ')} Incident`,
      description,
      hostelBlock,
      roomNumber,
      // StudentProfile has no pincode field; the original reached past the
      // type with `as any` and fell back to a fixed '502285'.
      pincode: '',
    });

    // reportIncident appends to an in-memory list. Nothing is transmitted and
    // no medical officer is notified, so this must not say one was. It used to
    // read "dispatched to Chief Medical Officer (MEO)", which could persuade a
    // student in trouble that help was already coming.
    setSubmittedToast(
      `Saved on this device as ${newInc.id}. It has not been sent — there is no incident service yet. ` +
      `For anything urgent, call 112 or use the crisis bar.`
    );
    setTitle('');
    setDescription('');
    setTimeout(() => setSubmittedToast(null), 6000);
  };

  const getSeverityBadgeVariant = (sev: MedicalSeverity) => {
    if (sev === 'CRITICAL_1') return 'emergency';
    if (sev === 'URGENT_2') return 'attention';
    if (sev === 'MODERATE_3') return 'cyan';
    return 'mono';
  };

  const getStatusBadgeVariant = (st: MedicalIncident['status']) => {
    if (st === 'AMBULANCE_DISPATCHED' || st === 'RESOLVED') return 'positive';
    if (st === 'TRIAGED_BY_DOCTOR') return 'cyan';
    return 'mono';
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      {/* Header Banner */}
      <View style={styles.headerBox}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge label="VERTICAL D · EXTENSION & COMMUNITY CARE" variant="cyan" />
          <Badge label="M27 MEDICAL INCIDENT PORTAL" variant="mono" />
          <Badge label="24x7 MEO TRIAGE ACTIVE" variant="positive" />
        </View>
        <Text style={[styles.title, { color: tokens.text }]}>Campus Medical Incident & Health Portal</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          Report food poisoning outbreaks, acute injuries, high fevers, and health emergencies for instant AI first-aid
          guidance and Chief Medical Officer (MEO) triage dispatch.
        </Text>
      </View>

      {/* Submission Success Toast */}
      {submittedToast && (
        <View style={styles.toastBox}>
          <CheckCircle2 size={18} color="#059669" />
          <Text style={styles.toastText}>{submittedToast}</Text>
        </View>
      )}

      {/* Crisis Interception Alert */}
      {crisisMessage && (
        <View style={styles.crisisBox}>
          <ShieldAlert size={20} color="#b3241a" />
          <View style={{ flex: 1 }}>
            <Text style={styles.crisisTitle}>Confidential Emergency & Crisis Support Intercept</Text>
            <Text style={styles.crisisText}>{crisisMessage}</Text>
          </View>
        </View>
      )}

      <View style={styles.mainGrid}>
        {/* Incident Reporting Card */}
        <Card variant="surface" style={styles.formCard}>
          <Text style={[styles.cardTitle, { color: tokens.text }]}>Report Medical Emergency / Health Incident</Text>

          {/* Category Selector */}
          <View style={{ gap: 6 }}>
            <Text style={[styles.label, { color: tokens.text2 }]}>Medical Incident Category</Text>
            <div className="wf-select-wrapper">
              <select
                aria-label="Medical Incident Category"
                value={category}
                onChange={(e) => setCategory(e.target.value as IncidentCategory)}
                style={selectStyle}
              >
                <option value="FOOD_POISONING">🤢 Food Poisoning / Mess Outbreak</option>
                <option value="INJURY_ACCIDENT">🩹 Physical Injury / Sports Accident</option>
                <option value="ALLERGIC_REACTION">⚠️ Acute Allergic Reaction</option>
                <option value="HIGH_FEVER">🤒 High Fever / Viral Infection</option>
                <option value="RESPIRATORY_DISTRESS">🫁 Severe Breathing / Asthma Attack</option>
                <option value="MENTAL_HEALTH_DISTRESS">🧠 Acute Stress / Mental Health Crisis</option>
              </select>
            </div>
          </View>

          {/* Severity Meter */}
          <View style={{ gap: 6 }}>
            <Text style={[styles.label, { color: tokens.text2 }]}>Emergency Severity Level</Text>
            <div className="wf-select-wrapper">
              <select
                aria-label="Emergency Severity Level"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as MedicalSeverity)}
                style={selectStyle}
              >
                <option value="CRITICAL_1">🔴 CRITICAL 1 — Immediate Ambulance Needed</option>
                <option value="URGENT_2">🟠 URGENT 2 — Severe Symptoms (Nurse Visit Needed)</option>
                <option value="MODERATE_3">🔵 MODERATE 3 — Doctor Advice & Prescription Required</option>
                <option value="ROUTINE_4">⚪ ROUTINE 4 — Vitals & Symptom Monitoring</option>
              </select>
            </div>
          </View>

          {/* Location Inputs */}
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 150 }}>
              <Input label="Hostel / Campus Building" value={hostelBlock} onChangeText={setHostelBlock} />
            </View>
            <View style={{ width: 120 }}>
              <Input label="Room / Area" value={roomNumber} onChangeText={setRoomNumber} />
            </View>
          </View>

          <Input
            label="Brief Incident Title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Nausea and severe cramps after dinner"
          />

          <Input
            label="Detailed Symptoms & Notes"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe symptoms, onset time, and if other roomates have similar issues..."
          />

          <Button
            label="Submit Medical Incident Report"
            variant="primary"
            onPress={handleReportSubmit}
            icon={<Send size={16} color="#ffffff" />}
          />
        </Card>

        {/* AI Pre-Hospital First-Aid Guidance & Active Reports */}
        <View style={{ flex: 1, minWidth: 300, gap: 20 }}>
          {/* AI First-Aid Guide Banner */}
          <Card variant="surface" style={styles.firstAidCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Stethoscope size={20} color="#059669" />
              <Text style={styles.firstAidTitle}>AI Pre-Hospital First-Aid Protocol</Text>
            </View>
            <Text style={styles.firstAidSub}>
              Automated guidance for <strong>{category.replace('_', ' ')}</strong> while campus medical responders arrive:
            </Text>
            <View style={styles.protocolBox}>
              <Info size={16} color="#047857" style={{ marginTop: 2 }} />
              <Text style={styles.protocolText}>{FIRST_AID_PROTOCOLS[category]}</Text>
            </View>
          </Card>

          {/* Active Student Medical Reports */}
          <Text style={[styles.sectionHeading, { color: tokens.text }]}>
            Your Active Medical Incident Reports ({medicalStore.incidents.length})
          </Text>

          {medicalStore.incidents.map((inc) => (
            <Card key={inc.id} variant="surface" style={styles.reportCard}>
              <View style={styles.reportTop}>
                <Badge label={inc.id} variant="mono" />
                <Badge label={inc.severity} variant={getSeverityBadgeVariant(inc.severity)} />
                <Badge label={inc.status} variant={getStatusBadgeVariant(inc.status)} />
              </View>

              <Text style={[styles.reportTitle, { color: tokens.text }]}>{inc.title}</Text>
              <Text style={[styles.reportSub, { color: tokens.text2 }]}>
                {inc.hostelBlock}, Room {inc.roomNumber} · Reported: {inc.timestamp}
              </Text>

              {inc.medicalAdvisory && (
                <View style={styles.advisoryBox}>
                  <Text style={styles.advisoryHeader}>MEO Doctor Advisory & Prescription:</Text>
                  <Text style={styles.advisoryBody}>{inc.medicalAdvisory}</Text>
                  {inc.assignedOfficerName && (
                    <Text style={styles.advisoryOfficer}>Assigned Officer: {inc.assignedOfficerName}</Text>
                  )}
                </View>
              )}
            </Card>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #d8d8e3',
  background: '#ffffff',
  fontSize: '13px',
  fontWeight: 600,
  color: '#16165c',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  headerBox: {
    marginBottom: 24,
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 820,
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  toastText: {
    color: '#065f46',
    fontSize: 13,
    fontWeight: '600',
  },
  crisisBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  crisisTitle: {
    color: '#991b1b',
    fontSize: 14,
    fontWeight: '700',
  },
  crisisText: {
    color: '#b91c1c',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  mainGrid: {
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap',
  },
  formCard: {
    flex: 1.2,
    minWidth: 320,
    padding: 24,
    gap: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  firstAidCard: {
    padding: 20,
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  firstAidTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
  },
  firstAidSub: {
    fontSize: 13,
    color: '#15803d',
    marginBottom: 10,
  },
  protocolBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  protocolText: {
    fontSize: 13,
    color: '#14532d',
    lineHeight: 18,
    flex: 1,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
  },
  reportCard: {
    padding: 16,
    gap: 10,
  },
  reportTop: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  reportSub: {
    fontSize: 12,
  },
  advisoryBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 12,
    gap: 4,
    marginTop: 4,
  },
  advisoryHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e40af',
  },
  advisoryBody: {
    fontSize: 13,
    color: '#1e3a8a',
  },
  advisoryOfficer: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '600',
    marginTop: 2,
  },
});

export const MedicalIncidentScreen = observer(MedicalIncidentScreenUnwrapped);
