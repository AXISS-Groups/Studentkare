import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useMedicalIncidentStore } from '../../store/AppStores';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import {
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { MedicalIncident, MedicalSeverity } from '../../data/medicalIncidentData';

const MeoDashboardScreenUnwrapped: React.FC = () => {
  const { tokens } = useTheme();
  const medicalStore = useMedicalIncidentStore();

  const [selectedIncident, setSelectedIncident] = useState<MedicalIncident | null>(null);
  const [triageStatus, setTriageStatus] = useState<MedicalIncident['status']>('TRIAGED_BY_DOCTOR');
  const [assignedOfficer, setAssignedOfficer] = useState('Dr. Sharma (Chief Medical Officer)');
  const [advisoryText, setAdvisoryText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const totalIncidents = medicalStore.incidents.length;
  const criticalCount = medicalStore.incidents.filter((i) => i.severity === 'CRITICAL_1').length;
  const activeOutbreaks = medicalStore.outbreakAlerts.length;

  const handleApplyTriage = () => {
    if (!selectedIncident) return;
    medicalStore.triageIncident(
      selectedIncident.id,
      triageStatus,
      assignedOfficer,
      advisoryText || `Triage advisory issued by ${assignedOfficer}. Vitals & protocol logged.`
    );

    setToastMessage(`Triage update saved for incident ${selectedIncident.id}. Student and Hostel Warden notified.`);
    setSelectedIncident(null);
    setAdvisoryText('');
    setTimeout(() => setToastMessage(null), 5000);
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
          <Badge label="VERTICAL D · COMMUNITY HEALTH & CLINICAL GOVERNANCE" variant="cyan" />
          <Badge label="MEO EMERGENCY CONSOLE" variant="mono" />
          <Badge label="CHIEF MEDICAL OFFICER" variant="positive" />
        </View>
        <Text style={[styles.title, { color: tokens.text }]}>Medical Extension Officer (MEO) Triage Console</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          Emergency triage queue, spatial campus outbreak cluster radar, paramedic ambulance dispatches, and clinical advisories.
        </Text>
      </View>

      {/* Success Toast */}
      {toastMessage && (
        <View style={styles.toastBox}>
          <CheckCircle2 size={18} color="#059669" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Campus Outbreak Cluster Radar Banner */}
      {activeOutbreaks > 0 && (
        <View style={styles.outbreakBanner}>
          <AlertTriangle size={24} color="#b3241a" />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.outbreakTitle}>CAMPUS EPIDEMIC OUTBREAK ALERT DETECTED</Text>
              <Badge label="AUTOMATED SPATIAL CLUSTER" variant="emergency" />
            </View>
            <Text style={styles.outbreakSub}>
              {medicalStore.outbreakAlerts[0].summary} — Sanitary inspection & dining advisory dispatched to campus warden.
            </Text>
          </View>
        </View>
      )}

      {/* Metric Cards Row */}
      <View style={styles.metricRow}>
        <Card variant="surface" style={styles.metricCard}>
          <Text style={[styles.metricLabel, { color: tokens.text2 }]}>Emergency Queue</Text>
          <Text style={[styles.metricValue, { color: tokens.text }]}>{totalIncidents} Reports</Text>
          <Text style={[styles.metricSub, { color: tokens.text3 }]}>Active campus incidents</Text>
        </Card>

        <Card variant="surface" style={styles.metricCard}>
          <Text style={[styles.metricLabel, { color: tokens.text2 }]}>Critical ESI-1 Incidents</Text>
          <Text style={[styles.metricValue, { color: '#b3241a' }]}>{criticalCount} Critical</Text>
          <Text style={[styles.metricSub, { color: tokens.text3 }]}>Immediate dispatch required</Text>
        </Card>

        <Card variant="surface" style={styles.metricCard}>
          <Text style={[styles.metricLabel, { color: tokens.text2 }]}>Outbreak Clusters</Text>
          <Text style={[styles.metricValue, { color: '#8a5200' }]}>{activeOutbreaks} Clusters</Text>
          <Text style={[styles.metricSub, { color: tokens.text3 }]}>Spatial detection active</Text>
        </Card>

        <Card variant="surface" style={styles.metricCard}>
          <Text style={[styles.metricLabel, { color: tokens.text2 }]}>MEO Roster On-Call</Text>
          <Text style={[styles.metricValue, { color: tokens.action }]}>
            {medicalStore.meoOfficers.length} Officers
          </Text>
          <Text style={[styles.metricSub, { color: tokens.text3 }]}>Doctors & Paramedics</Text>
        </Card>
      </View>

      {/* Main Triage Queue Table / List */}
      <Card variant="surface" style={styles.queueCard}>
        <Text style={[styles.sectionHeading, { color: tokens.text }]}>
          Emergency Triage Queue — ESI Severity Sorted
        </Text>

        {medicalStore.incidents.map((inc) => (
          <View key={inc.id} style={styles.queueItem}>
            <View style={styles.queueTop}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Badge label={inc.id} variant="mono" />
                <Badge label={inc.severity} variant={getSeverityBadgeVariant(inc.severity)} />
                <Badge label={inc.status} variant={getStatusBadgeVariant(inc.status)} />
                <Badge label={`Blood Group: ${inc.bloodGroup}`} variant="cyan" />
                {inc.allergies.length > 0 && (
                  <Badge label={`Allergies: ${inc.allergies.join(', ')}`} variant="attention" />
                )}
              </View>
              <Text style={[styles.timeText, { color: tokens.text3 }]}>{inc.timestamp}</Text>
            </View>

            <View style={{ gap: 4, marginTop: 4 }}>
              <Text style={[styles.incTitle, { color: tokens.text }]}>{inc.title}</Text>
              <Text style={[styles.incDesc, { color: tokens.text2 }]}>{inc.description}</Text>
              <Text style={[styles.incLocation, { color: tokens.text3 }]}>
                Student: <strong>{inc.studentName}</strong> ({inc.studentId}) · Location: <strong>{inc.hostelBlock}, Room {inc.roomNumber}</strong> (Pincode: {inc.pincode})
              </Text>
            </View>

            {inc.medicalAdvisory && (
              <View style={styles.currentAdvisoryBox}>
                <Text style={styles.currentAdvisoryHeader}>Current Advisory ({inc.assignedOfficerName}):</Text>
                <Text style={styles.currentAdvisoryText}>{inc.medicalAdvisory}</Text>
              </View>
            )}

            <View style={styles.queueActions}>
              <Button
                label="Triage & Issue Advisory"
                variant="primary"
                onPress={() => {
                  setSelectedIncident(inc);
                  setAdvisoryText(inc.medicalAdvisory || '');
                }}
              />
            </View>
          </View>
        ))}
      </Card>

      {/* Triage Action Modal */}
      {selectedIncident && (
        <Modal
          title={`MEO Doctor Triage — ${selectedIncident.id}`}
          visible={true}
          onClose={() => setSelectedIncident(null)}
        >
          <View style={{ gap: 16 }}>
            <View style={styles.modalHeaderBox}>
              <Text style={styles.modalHeaderTitle}>{selectedIncident.studentName} ({selectedIncident.studentId})</Text>
              <Text style={styles.modalHeaderSub}>
                Location: {selectedIncident.hostelBlock}, Room {selectedIncident.roomNumber} · Blood: {selectedIncident.bloodGroup}
              </Text>
              <Text style={styles.modalHeaderAllergies}>Known Allergies: {selectedIncident.allergies.join(', ') || 'None'}</Text>
            </View>

            <View>
              <Text style={[styles.label, { color: tokens.text2 }]}>Update Incident Status</Text>
              <div className="wf-select-wrapper" style={{ marginTop: 4 }}>
                <select
                  aria-label="Update Incident Status"
                  value={triageStatus}
                  onChange={(e: any) => setTriageStatus(e.target.value)}
                  style={selectStyle}
                >
                  <option value="TRIAGED_BY_DOCTOR">TRIAGED BY DOCTOR — Advisory Issued</option>
                  <option value="AMBULANCE_DISPATCHED">AMBULANCE DISPATCHED — Paramedic En Route</option>
                  <option value="RESOLVED">RESOLVED — Patient Treated & Cleared</option>
                </select>
              </div>
            </View>

            <View>
              <Text style={[styles.label, { color: tokens.text2 }]}>Assign MEO Officer / Doctor</Text>
              <div className="wf-select-wrapper" style={{ marginTop: 4 }}>
                <select
                  aria-label="Assign MEO Officer / Doctor"
                  value={assignedOfficer}
                  onChange={(e: any) => setAssignedOfficer(e.target.value)}
                  style={selectStyle}
                >
                  {medicalStore.meoOfficers.map((o) => (
                    <option key={o.id} value={`${o.name} (${o.role.replace('_', ' ')})`}>
                      {o.name} — {o.role.replace('_', ' ')} ({o.status})
                    </option>
                  ))}
                </select>
              </div>
            </View>

            <Input
              label="MEO Clinical Advisory & Prescription Note"
              value={advisoryText}
              onChangeText={setAdvisoryText}
              placeholder="e.g. Administer ORS 500ml + Paracetamol 500mg. Nurse Priya dispatched to room for vitals."
            />

            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
              <Button label="Cancel" variant="secondary" onPress={() => setSelectedIncident(null)} />
              <Button label="Save Triage & Dispatch Advisory" variant="primary" onPress={handleApplyTriage} />
            </View>
          </View>
        </Modal>
      )}
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
  outbreakBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
  },
  outbreakTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991b1b',
  },
  outbreakSub: {
    fontSize: 13,
    color: '#b91c1c',
    marginTop: 4,
    lineHeight: 18,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 200,
    padding: 18,
    gap: 6,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  metricSub: {
    fontSize: 11,
  },
  queueCard: {
    padding: 24,
    gap: 20,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
  },
  queueItem: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  queueTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
  },
  incTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  incDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  incLocation: {
    fontSize: 12,
    marginTop: 2,
  },
  currentAdvisoryBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 12,
    gap: 2,
  },
  currentAdvisoryHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  currentAdvisoryText: {
    fontSize: 13,
    color: '#1e3a8a',
  },
  queueActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  modalHeaderBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalHeaderSub: {
    fontSize: 12,
    color: '#334155',
  },
  modalHeaderAllergies: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b91c1c',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export const MeoDashboardScreen = observer(MeoDashboardScreenUnwrapped);
