import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useLifeShareStore, useStudentStore } from '../../store/AppStores';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import {
  Heart,
  Activity,
  ShieldCheck,
  PhoneCall,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Droplet,
} from 'lucide-react';
import { HospitalResourceNode, BLOOD_COMPATIBILITY_MAP } from '../../data/lifeshareData';

const LifeShareExchangeScreenUnwrapped: React.FC = () => {
  const { tokens } = useTheme();
  const lifeShareStore = useLifeShareStore();
  const { student } = useStudentStore();

  const [pincodeQuery, setPincodeQuery] = useState((student as any)?.pincode || '502285');
  const [selectedBloodType, setSelectedBloodType] = useState<string>('ALL');
  const [requestModalHospital, setRequestModalHospital] = useState<HospitalResourceNode | null>(null);
  const [selectedResourceType, setSelectedResourceType] = useState<'BLOOD_UNIT' | 'VENTILATOR' | 'ICU_BED' | 'ORGAN_KIDNEY'>('BLOOD_UNIT');
  const [requestDetails, setRequestDetails] = useState('');
  const [requestUrgency, setRequestUrgency] = useState<'HIGH' | 'CRITICAL' | 'LIFE_THREATENING'>('CRITICAL');
  const [requestSubmittedNotice, setRequestSubmittedNotice] = useState<string | null>(null);

  const filteredHospitals = lifeShareStore.searchHospitals(
    pincodeQuery,
    selectedBloodType === 'ALL' ? undefined : selectedBloodType
  );

  const totalIcuBeds = lifeShareStore.hospitals.reduce((acc, h) => acc + h.availableIcuBeds, 0);
  const totalVentilators = lifeShareStore.hospitals.reduce((acc, h) => acc + h.availableVentilators, 0);
  const totalBloodUnits = lifeShareStore.hospitals.reduce(
    (acc: number, h: HospitalResourceNode) => acc + Object.values(h.bloodUnits).reduce((sum: number, v: number) => sum + v, 0),
    0
  );

  const handleCreateRequest = () => {
    if (!requestModalHospital) return;
    const req = lifeShareStore.submitTransferRequest({
      requestingHospital: 'IIT Hyderabad Campus Health Centre',
      targetHospital: requestModalHospital.name,
      resourceType: selectedResourceType,
      details: requestDetails || `Emergency ${selectedResourceType} request dispatched to ${requestModalHospital.name}`,
      urgency: requestUrgency,
      status: 'PENDING',
    });

    setRequestSubmittedNotice(`Emergency dispatch request ${req.id} sent to ${requestModalHospital.name}. Hospital network notified.`);
    setRequestModalHospital(null);
    setRequestDetails('');
    setTimeout(() => setRequestSubmittedNotice(null), 5000);
  };

  const getUrgencyVariant = (urgency: string) => {
    if (urgency === 'LIFE_THREATENING') return 'emergency';
    if (urgency === 'CRITICAL') return 'attention';
    return 'cyan';
  };

  const getStatusVariant = (status: string) => {
    if (status === 'DISPATCHED' || status === 'DELIVERED') return 'positive';
    if (status === 'APPROVED') return 'cyan';
    return 'mono';
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      {/* Header Banner */}
      <View style={styles.headerBox}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge label="VERTICAL C · HEALTH SERVICES FABRIC" variant="cyan" />
          <Badge label="M26 LIFESHARE NETWORK" variant="mono" />
          <Badge label="30,273 CONNECTED HOSPITALS" variant="positive" />
        </View>
        <Text style={[styles.title, { color: tokens.text }]}>LifeShare — Emergency Hospital & Blood Network</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          Real-time network visibility for blood units, ICU beds, emergency ventilators, and life-critical organ dispatches
          across verified healthcare nodes.
        </Text>
      </View>

      {/* Metric Cards Row */}
      <View style={styles.metricRow}>
        <Card variant="surface" style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={[styles.metricLabel, { color: tokens.text2 }]}>Available ICU Beds</Text>
            <Activity size={18} color={tokens.action} />
          </View>
          <Text style={[styles.metricValue, { color: tokens.text }]}>{totalIcuBeds}</Text>
          <Text style={[styles.metricSub, { color: tokens.text3 }]}>Across network nodes</Text>
        </Card>

        <Card variant="surface" style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={[styles.metricLabel, { color: tokens.text2 }]}>Blood Stock (All Groups)</Text>
            <Droplet size={18} color="#e11d48" />
          </View>
          <Text style={[styles.metricValue, { color: tokens.text }]}>{totalBloodUnits} units</Text>
          <Text style={[styles.metricSub, { color: tokens.text3 }]}>2,947 blood banks linked</Text>
        </Card>

        <Card variant="surface" style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={[styles.metricLabel, { color: tokens.text2 }]}>Emergency Ventilators</Text>
            <Heart size={18} color="#059669" />
          </View>
          <Text style={[styles.metricValue, { color: tokens.text }]}>{totalVentilators} units</Text>
          <Text style={[styles.metricSub, { color: tokens.text3 }]}>Ready for dispatch</Text>
        </Card>

        <Card variant="surface" style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={[styles.metricLabel, { color: tokens.text2 }]}>Network Synergy Rating</Text>
            <ShieldCheck size={18} color="#7c3aed" />
          </View>
          <Text style={[styles.metricValue, { color: tokens.text }]}>4.92 / 5.0</Text>
          <Text style={[styles.metricSub, { color: tokens.text3 }]}>100% NABH verified</Text>
        </Card>
      </View>

      {/* Submission Success Toast */}
      {requestSubmittedNotice && (
        <View style={styles.noticeToast}>
          <CheckCircle2 size={18} color="#059669" />
          <Text style={styles.noticeText}>{requestSubmittedNotice}</Text>
        </View>
      )}

      {/* Filter & Search Toolbar */}
      <Card variant="surface" style={styles.filterCard}>
        <Text style={[styles.sectionTitle, { color: tokens.text }]}>Search Emergency Hospital Resources</Text>
        <View style={styles.filterRow}>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Input
              label="Pincode / Hospital / City"
              value={pincodeQuery}
              onChangeText={setPincodeQuery}
              placeholder="e.g. 502285 or Hyderabad"
              mono
            />
          </View>
          <View style={{ width: 180 }}>
            <Text style={[styles.filterLabel, { color: tokens.text2 }]}>Filter by Blood Group</Text>
            <div className="wf-select-wrapper" style={{ marginTop: 4 }}>
              <select
                aria-label="Filter by Blood Group"
                value={selectedBloodType}
                onChange={(e) => setSelectedBloodType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d8d8e3',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#16165c',
                }}
              >
                <option value="ALL">All Blood Groups</option>
                <option value="A+">A+ Positive</option>
                <option value="A-">A- Negative</option>
                <option value="B+">B+ Positive</option>
                <option value="B-">B- Negative</option>
                <option value="AB+">AB+ Positive</option>
                <option value="AB-">AB- Negative</option>
                <option value="O+">O+ Positive</option>
                <option value="O-">O- Negative (Universal)</option>
              </select>
            </div>
          </View>
        </View>

        {selectedBloodType !== 'ALL' && (
          <View style={styles.compatibilityBanner}>
            <Droplet size={15} color="#e11d48" />
            <Text style={styles.compatibilityText}>
              Showing hospitals with compatible donor types for <strong>{selectedBloodType}</strong>:{' '}
              {BLOOD_COMPATIBILITY_MAP[selectedBloodType]?.join(', ')}
            </Text>
          </View>
        )}
      </Card>

      {/* Main Grid: Hospital Roster & Live Dispatch Log */}
      <View style={styles.mainGrid}>
        {/* Hospital Resource Nodes */}
        <View style={{ flex: 2 }}>
          <Text style={[styles.sectionHeading, { color: tokens.text }]}>
            Hospital Resource Directory ({filteredHospitals.length})
          </Text>
          {filteredHospitals.length === 0 ? (
            <Card variant="surface" style={styles.emptyCard}>
              <AlertTriangle size={24} color="#8a5200" />
              <Text style={[styles.emptyText, { color: tokens.text2 }]}>
                No hospital resource nodes match pincode/city "{pincodeQuery}". Showing all connected nodes instead.
              </Text>
              <Button label="Clear Filters" variant="secondary" onPress={() => { setPincodeQuery(''); setSelectedBloodType('ALL'); }} />
            </Card>
          ) : (
            filteredHospitals.map((hospital) => (
              <Card key={hospital.id} variant="surface" style={styles.hospitalCard}>
                <View style={styles.hospitalTop}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.hospitalName, { color: tokens.text }]}>{hospital.name}</Text>
                      {hospital.isVerifiedNABH && <Badge label="NABH VERIFIED" variant="positive" />}
                    </View>
                    <Text style={[styles.hospitalSub, { color: tokens.text2 }]}>
                      {hospital.city}, {hospital.district} · Pincode: {hospital.pincode} · {hospital.distanceKm} km away
                    </Text>
                  </View>
                  <Badge label={`★ ${hospital.synergyRating}`} variant="cyan" />
                </View>

                {/* Resource Stats Bar */}
                <View style={styles.resourcePillRow}>
                  <View style={styles.resourcePill}>
                    <Activity size={14} color={tokens.action} />
                    <Text style={styles.resourcePillText}>
                      ICU Beds: <strong>{hospital.availableIcuBeds}</strong> / {hospital.totalIcuBeds}
                    </Text>
                  </View>
                  <View style={styles.resourcePill}>
                    <Heart size={14} color="#059669" />
                    <Text style={styles.resourcePillText}>
                      Ventilators: <strong>{hospital.availableVentilators}</strong>
                    </Text>
                  </View>
                  <View style={styles.resourcePill}>
                    <Clock size={14} color="#007a55" />
                    <Text style={styles.resourcePillText}>
                      Oxygen Reserve: <strong>{hospital.oxygenStockHours} hrs</strong>
                    </Text>
                  </View>
                </View>

                {/* Blood Stock Pills Grid */}
                <Text style={[styles.bloodTitle, { color: tokens.text2 }]}>Available Blood Units:</Text>
                <View style={styles.bloodGrid}>
                  {Object.entries(hospital.bloodUnits).map(([bt, count]) => (
                    <View key={bt} style={[styles.bloodBadge, count === 0 && styles.bloodBadgeZero]}>
                      <Text style={styles.bloodBadgeLabel}>{bt}</Text>
                      <Text style={styles.bloodBadgeCount}>{count}</Text>
                    </View>
                  ))}
                </View>

                {/* Action Row */}
                <View style={styles.hospitalActions}>
                  <Text style={[styles.helplineText, { color: tokens.text3 }]}>
                    Emergency: <PhoneCall size={12} style={{ display: 'inline' }} /> {hospital.emergencyHelpline}
                  </Text>
                  <Button
                    label="Request Resource Transfer"
                    variant="primary"
                    onPress={() => setRequestModalHospital(hospital)}
                  />
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Live Transfer & Dispatch Log */}
        <View style={{ flex: 1, minWidth: 280 }}>
          <Text style={[styles.sectionHeading, { color: tokens.text }]}>Live Transfer & Dispatch Log</Text>
          <Card variant="surface" style={styles.logCard}>
            {lifeShareStore.transferRequests.map((req) => (
              <View key={req.id} style={styles.logItem}>
                <View style={styles.logTop}>
                  <Badge label={req.id} variant="mono" />
                  <Badge label={req.status} variant={getStatusVariant(req.status)} />
                </View>
                <Text style={[styles.logTitle, { color: tokens.text }]}>{req.details}</Text>
                <Text style={[styles.logSub, { color: tokens.text2 }]}>
                  From: {req.requestingHospital} → To: {req.targetHospital}
                </Text>
                <View style={styles.logFooter}>
                  <Badge label={req.urgency} variant={getUrgencyVariant(req.urgency)} />
                  <Text style={[styles.logTime, { color: tokens.text3 }]}>{req.timestamp}</Text>
                </View>
              </View>
            ))}
          </Card>
        </View>
      </View>

      {/* Transfer Request Modal */}
      {requestModalHospital && (
        <Modal
          title={`Emergency Transfer Request — ${requestModalHospital.name}`}
          visible={true}
          onClose={() => setRequestModalHospital(null)}
        >
          <View style={{ gap: 16 }}>
            <Text style={[styles.modalSub, { color: tokens.text2 }]}>
              Submit a life-critical resource transfer request to {requestModalHospital.name} (Pincode: {requestModalHospital.pincode}).
            </Text>

            <View>
              <Text style={[styles.filterLabel, { color: tokens.text2 }]}>Resource Required</Text>
              <div className="wf-select-wrapper" style={{ marginTop: 4 }}>
                <select
                  aria-label="Resource Required"
                  value={selectedResourceType}
                  onChange={(e: any) => setSelectedResourceType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d8d8e3',
                    background: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <option value="BLOOD_UNIT">Blood Units (Emergency Donor Stock)</option>
                  <option value="VENTILATOR">ICU Ventilator Unit</option>
                  <option value="ICU_BED">Emergency ICU Bed Slot</option>
                  <option value="ORGAN_KIDNEY">Organ Match / Transport</option>
                </select>
              </div>
            </View>

            <View>
              <Text style={[styles.filterLabel, { color: tokens.text2 }]}>Urgency Priority</Text>
              <div className="wf-select-wrapper" style={{ marginTop: 4 }}>
                <select
                  aria-label="Urgency Priority"
                  value={requestUrgency}
                  onChange={(e: any) => setRequestUrgency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d8d8e3',
                    background: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <option value="LIFE_THREATENING">CRITICAL 1 — Life Threatening (Immediate Dispatch)</option>
                  <option value="CRITICAL">CRITICAL 2 — High Urgency (Within 1 Hour)</option>
                  <option value="HIGH">HIGH — Priority Transfer (Within 3 Hours)</option>
                </select>
              </div>
            </View>

            <Input
              label="Clinical Notes / Patient Details"
              value={requestDetails}
              onChangeText={setRequestDetails}
              placeholder="e.g. 2 Units O- Negative needed for acute surgical trauma patient"
            />

            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
              <Button label="Cancel" variant="secondary" onPress={() => setRequestModalHospital(null)} />
              <Button label="Submit & Dispatch Request" variant="primary" onPress={handleCreateRequest} />
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

export const LifeShareExchangeScreen = observer(LifeShareExchangeScreenUnwrapped);

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
  metricRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 200,
    padding: 16,
    gap: 6,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  noticeToast: {
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
  noticeText: {
    color: '#065f46',
    fontSize: 13,
    fontWeight: '600',
  },
  filterCard: {
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  compatibilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 8,
    padding: 10,
  },
  compatibilityText: {
    color: '#9f1239',
    fontSize: 12,
  },
  mainGrid: {
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  hospitalCard: {
    padding: 20,
    marginBottom: 16,
    gap: 14,
  },
  hospitalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  hospitalName: {
    fontSize: 17,
    fontWeight: '700',
  },
  hospitalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  resourcePillRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  resourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f4f4f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resourcePillText: {
    fontSize: 12,
    color: '#4a4a63',
  },
  bloodTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  bloodGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  bloodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fda4af',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bloodBadgeZero: {
    backgroundColor: '#f4f4f6',
    borderColor: '#e6e6ee',
    opacity: 0.6,
  },
  bloodBadgeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#be123c',
  },
  bloodBadgeCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  hospitalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e6e6ee',
  },
  helplineText: {
    fontSize: 12,
  },
  logCard: {
    padding: 16,
    gap: 16,
  },
  logItem: {
    gap: 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  logTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTitle: {
    fontSize: 13,
    fontWeight: '650',
  },
  logSub: {
    fontSize: 11,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  logTime: {
    fontSize: 10,
  },
  modalSub: {
    fontSize: 13,
    lineHeight: 18,
  },
});
