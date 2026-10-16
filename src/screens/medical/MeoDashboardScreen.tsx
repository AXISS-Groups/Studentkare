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
import { AlertTriangle } from 'lucide-react';
import { MedicalIncident, MedicalSeverity } from '../../data/medicalIncidentData';
import { color } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

const isIncidentStatus = (value: string): value is MedicalIncident['status'] =>
  value === 'REPORTED' || value === 'TRIAGED_BY_DOCTOR' || value === 'AMBULANCE_DISPATCHED' || value === 'RESOLVED';

const MeoDashboardScreenUnwrapped: React.FC = () => {
  const t = useT();
  const { tokens } = useTheme();
  const medicalStore = useMedicalIncidentStore();

  const [selectedIncident, setSelectedIncident] = useState<MedicalIncident | null>(null);
  const [triageStatus, setTriageStatus] = useState<MedicalIncident['status']>('TRIAGED_BY_DOCTOR');
  const [assignedOfficer, setAssignedOfficer] = useState('');
  const [advisoryText, setAdvisoryText] = useState('');
  /** Id of the incident whose triage was just saved locally; the notice says nobody was told. */
  const [savedIncidentId, setSavedIncidentId] = useState<string | null>(null);

  const totalIncidents = medicalStore.incidents.length;
  const criticalCount = medicalStore.incidents.filter((i) => i.severity === 'CRITICAL_1').length;
  const activeOutbreaks = medicalStore.outbreakAlerts.length;

  const handleApplyTriage = () => {
    if (!selectedIncident) return;
    medicalStore.triageIncident(
      selectedIncident.id,
      triageStatus,
      assignedOfficer,
      advisoryText
    );

    setSavedIncidentId(selectedIncident.id);
    setSelectedIncident(null);
    setAdvisoryText('');
    setTimeout(() => setSavedIncidentId(null), 5000);
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
          <Badge label={t('campus.meo.badgeVertical')} variant="cyan" />
          <Badge label={t('campus.meo.badgeConsole')} variant="mono" />
        </View>
        <Text style={[styles.title, { color: tokens.text }]}>{t('campus.meo.title')}</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          {t('campus.meo.lead')}
        </Text>
      </View>

      {/*
        Without this, an empty queue reads as "no student needs help". It is not:
        nothing a student files reaches this console, because the incident store
        is in-memory and no incident endpoint exists. An officer treating zero as
        all-quiet is the whole risk of a disconnected queue.
      */}
      <Card variant="alert" style={styles.disconnectedCard}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={20} color={tokens.attention} aria-hidden="true" />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.disconnectedTitle, { color: tokens.text }]}>
              {t('campus.meo.disconnectedTitle')}
            </Text>
            <Text style={[styles.disconnectedBody, { color: tokens.text2 }]}>
              {t('campus.meo.disconnectedBody')}
            </Text>
          </View>
        </View>
      </Card>

      {/* Saved-locally notice: an attention state, not a success — nobody was told. */}
      {savedIncidentId && (
        <View style={styles.toastBox} accessibilityRole="alert">
          <AlertTriangle size={18} color={color.attention} aria-hidden="true" />
          <Text style={styles.toastText}>{t('campus.meo.triageSaved', { id: savedIncidentId })}</Text>
        </View>
      )}

      {/* Campus Outbreak Cluster Radar Banner */}
      {activeOutbreaks > 0 && (
        <View style={styles.outbreakBanner}>
          <AlertTriangle size={24} color={color.danger} aria-hidden="true" />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={styles.outbreakTitle}>{t('campus.meo.outbreakTitle')}</Text>
              <Badge label={t('campus.meo.outbreakBadge')} variant="emergency" />
            </View>
            <Text style={styles.outbreakSub}>
              {t('campus.meo.outbreakBody', { count: medicalStore.outbreakAlerts[0].affectedCount, location: medicalStore.outbreakAlerts[0].location })}
            </Text>
          </View>
        </View>
      )}

      {/* Metric Cards Row */}
      <View style={styles.metricRow}>
        <Card variant="surface" style={styles.metricCard}>
          <Text style={[styles.metricLabel, { color: tokens.text2 }]}>{t('campus.meo.metric.queue')}</Text>
          <Text style={[styles.metricValue, { color: tokens.text }]}>{t('campus.meo.metric.queueValue', { count: totalIncidents })}</Text>
          <Text style={[styles.metricSub, { color: tokens.text3 }]}>{t('campus.meo.metric.queueSub')}</Text>
        </Card>

        <Card variant="surface" style={styles.metricCard}>
          <Text style={[styles.metricLabel, { color: tokens.text2 }]}>{t('campus.meo.metric.critical')}</Text>
          <Text style={[styles.metricValue, { color: color.danger }]}>{t('campus.meo.metric.criticalValue', { count: criticalCount })}</Text>
          <Text style={[styles.metricSub, { color: tokens.text3 }]}>{t('campus.meo.metric.criticalSub')}</Text>
        </Card>

        <Card variant="surface" style={styles.metricCard}>
          <Text style={[styles.metricLabel, { color: tokens.text2 }]}>{t('campus.meo.metric.outbreaks')}</Text>
          <Text style={[styles.metricValue, { color: color.attention }]}>{t('campus.meo.metric.outbreaksValue', { count: activeOutbreaks })}</Text>
          <Text style={[styles.metricSub, { color: tokens.text3 }]}>{t('campus.meo.metric.outbreaksSub')}</Text>
        </Card>

        <Card variant="surface" style={styles.metricCard}>
          <Text style={[styles.metricLabel, { color: tokens.text2 }]}>{t('campus.meo.metric.roster')}</Text>
          <Text style={[styles.metricValue, { color: tokens.action }]}>
            {t('campus.meo.metric.rosterValue', { count: medicalStore.meoOfficers.length })}
          </Text>
          {/* With no roster source, "0 officers" must not read as "nobody is on call". */}
          <Text style={[styles.metricSub, { color: tokens.text3 }]}>
            {medicalStore.meoOfficers.length === 0 ? t('campus.meo.metric.rosterNone') : t('campus.meo.metric.rosterSub')}
          </Text>
        </Card>
      </View>

      {/* Main Triage Queue Table / List */}
      <Card variant="surface" style={styles.queueCard}>
        <Text style={[styles.sectionHeading, { color: tokens.text }]}>
          {t('campus.meo.queueHeading')}
        </Text>

        {medicalStore.incidents.map((inc) => (
          <View key={inc.id} style={styles.queueItem}>
            <View style={styles.queueTop}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Badge label={inc.id} variant="mono" />
                <Badge label={t(`campus.meo.severity.${inc.severity}` as MessageKey)} variant={getSeverityBadgeVariant(inc.severity)} />
                <Badge label={t(`campus.meo.status.${inc.status}` as MessageKey)} variant={getStatusBadgeVariant(inc.status)} />
                <Badge label={t('campus.meo.bloodGroup', { value: inc.bloodGroup || t('campus.meo.notRecorded') })} variant="cyan" />
                {inc.allergies.length > 0 && (
                  <Badge label={t('campus.meo.allergies', { list: inc.allergies.join(', ') })} variant="attention" />
                )}
              </View>
              <Text style={[styles.timeText, { color: tokens.text3 }]}>{inc.timestamp}</Text>
            </View>

            <View style={{ gap: 4, marginTop: 4 }}>
              <Text style={[styles.incTitle, { color: tokens.text }]}>{inc.title}</Text>
              <Text style={[styles.incDesc, { color: tokens.text2 }]}>{inc.description}</Text>
              <Text style={[styles.incLocation, { color: tokens.text3 }]}>
                {t('campus.meo.studentLine', { name: inc.studentName, id: inc.studentId, block: inc.hostelBlock, room: inc.roomNumber, pincode: inc.pincode })}
              </Text>
            </View>

            {inc.medicalAdvisory && (
              <View style={styles.currentAdvisoryBox}>
                <Text style={styles.currentAdvisoryHeader}>{t('campus.meo.currentAdvisory', { officer: inc.assignedOfficerName ?? '' })}</Text>
                <Text style={styles.currentAdvisoryText}>{inc.medicalAdvisory}</Text>
              </View>
            )}

            <View style={styles.queueActions}>
              <Button
                label={t('campus.meo.triageButton')}
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
          title={t('campus.meo.modalTitle', { id: selectedIncident.id })}
          visible={true}
          onClose={() => setSelectedIncident(null)}
        >
          <View style={{ gap: 16 }}>
            <View style={styles.modalHeaderBox}>
              <Text style={styles.modalHeaderTitle}>{selectedIncident.studentName} ({selectedIncident.studentId})</Text>
              <Text style={styles.modalHeaderSub}>
                {t('campus.meo.modalLocation', { block: selectedIncident.hostelBlock, room: selectedIncident.roomNumber, blood: selectedIncident.bloodGroup || t('campus.meo.notRecorded') })}
              </Text>
              <Text style={styles.modalHeaderAllergies}>{t('campus.meo.modalAllergies', { list: selectedIncident.allergies.join(', ') || t('campus.meo.noneRecorded') })}</Text>
            </View>

            <View>
              <Text style={[styles.label, { color: tokens.text2 }]}>{t('campus.meo.statusLabel')}</Text>
              <div className="wf-select-wrapper" style={{ marginTop: 4 }}>
                <select
                  aria-label={t('campus.meo.statusLabel')}
                  value={triageStatus}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { if (isIncidentStatus(e.target.value)) setTriageStatus(e.target.value); }}
                  style={selectStyle}
                >
                  <option value="TRIAGED_BY_DOCTOR">{t('campus.meo.option.TRIAGED_BY_DOCTOR')}</option>
                  <option value="AMBULANCE_DISPATCHED">{t('campus.meo.option.AMBULANCE_DISPATCHED')}</option>
                  <option value="RESOLVED">{t('campus.meo.option.RESOLVED')}</option>
                </select>
              </div>
            </View>

            <View>
              <Text style={[styles.label, { color: tokens.text2 }]}>{t('campus.meo.officerLabel')}</Text>
              <div className="wf-select-wrapper" style={{ marginTop: 4 }}>
                <select
                  aria-label={t('campus.meo.officerLabel')}
                  value={assignedOfficer}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssignedOfficer(e.target.value)}
                  style={selectStyle}
                >
                  {medicalStore.meoOfficers.length === 0 && <option value="">{t('campus.meo.noOfficers')}</option>}
                  {medicalStore.meoOfficers.map((o) => (
                    <option key={o.id} value={`${o.name} (${o.role.replace('_', ' ')})`}>
                      {o.name} — {t(`campus.meo.officerRole.${o.role}` as MessageKey)} ({t(`campus.meo.officerStatus.${o.status}` as MessageKey)})
                    </option>
                  ))}
                </select>
              </div>
            </View>

            <Input
              label={t('campus.meo.advisoryLabel')}
              value={advisoryText}
              onChangeText={setAdvisoryText}
              placeholder={t('campus.meo.advisoryPlaceholder')}
            />

            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
              <Button label={t('common.cancel')} variant="secondary" onPress={() => setSelectedIncident(null)} />
              <Button label={t('campus.meo.save')} variant="primary" onPress={handleApplyTriage} />
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--sk-color-rule-strong)',
  background: 'var(--sk-color-surface)',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--sk-color-text)',
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
    backgroundColor: color.attentionBg,
    borderWidth: 1,
    borderColor: color.attention,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  toastText: {
    flex: 1,
    color: color.text,
    fontSize: 13,
    fontWeight: '600',
  },
  outbreakBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: color.dangerBg,
    borderWidth: 1,
    borderColor: color.danger,
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
  },
  outbreakTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: color.danger,
  },
  outbreakSub: {
    fontSize: 13,
    color: color.text,
    marginTop: 4,
    lineHeight: 18,
  },
  disconnectedCard: {
    padding: 18,
    marginBottom: 20,
  },
  disconnectedTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  disconnectedBody: {
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 720,
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
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.rule,
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
    backgroundColor: color.actionSoft,
    borderWidth: 1,
    borderColor: color.rule,
    borderRadius: 8,
    padding: 12,
    gap: 2,
  },
  currentAdvisoryHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: color.action,
  },
  currentAdvisoryText: {
    fontSize: 13,
    color: color.text,
  },
  queueActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  modalHeaderBox: {
    backgroundColor: color.surface2,
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: color.text,
  },
  modalHeaderSub: {
    fontSize: 12,
    color: color.text2,
  },
  modalHeaderAllergies: {
    fontSize: 12,
    fontWeight: '600',
    color: color.danger,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export const MeoDashboardScreen = observer(MeoDashboardScreenUnwrapped);
