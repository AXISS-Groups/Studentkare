import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/theme';
import { Card } from './Card';
import { Badge } from './Badge';
import { Clock, CheckCircle2 } from 'lucide-react';
import { assertRule } from '../ai/constitution';

export interface ClinicStationQueue {
  id: string;
  stationName: string;
  dutyStaff: string;
  currentQueueLength: number;
  estimatedWaitMins: number;
  status: 'FAST_FLOW' | 'MODERATE_WAIT' | 'BUSY';
}

export const CampusClinicWaitTimeRadar: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule('Rule-J1'); // Provider routing and SLA rule

  const [ stations ] = useState<ClinicStationQueue[]>([
    { id: 'st-01', stationName: 'Station 1: Camp Registration & Vitals', dutyStaff: 'Nurse Anitha (Pod A)', currentQueueLength: 2, estimatedWaitMins: 3, status: 'FAST_FLOW' },
    { id: 'st-02', stationName: 'Station 2: NMC Physician Teleconsult', dutyStaff: 'Dr. Radhika Rao, MD', currentQueueLength: 4, estimatedWaitMins: 6, status: 'MODERATE_WAIT' },
    { id: 'st-03', stationName: 'Station 3: Express Hostel Pharmacy', dutyStaff: 'Pharmacist Ramesh', currentQueueLength: 3, estimatedWaitMins: 4, status: 'FAST_FLOW' },
    { id: 'st-04', stationName: 'Station 4: Student Mental Health Counsellor', dutyStaff: 'Dr. Vikram Sen (Peer Counsellor)', currentQueueLength: 0, estimatedWaitMins: 0, status: 'FAST_FLOW' },
  ]);

  const [bookedExpressSlot, setBookedExpressSlot] = useState<string | null>(null);

  const handleBookExpressSlot = (_stationId: string, stationName: string) => {
    setBookedExpressSlot(stationName);
    setTimeout(() => setBookedExpressSlot(null), 3000);
  };

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Clock size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            Campus OPD Clinic Real-Time Queue & Wait-Time Radar
          </Text>
        </View>
        <Badge label="LIVE WAIT TIME MONITOR" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
        Real-time station queue radar. Measures current wait times across campus OPD stations with 1-tap express slot booking & station load balancing.
      </Text>

      {/* Stations Queue List */}
      <View style={{ gap: 10, marginBottom: 14 }}>
        {stations.map((st) => (
          <View key={st.id} style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}` }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '800', color: tokens.text }}>{st.stationName}</Text>
                <Text style={{ fontSize: 11, color: tokens.text3, fontFamily: typography.fontMono, marginTop: 2 }}>{st.dutyStaff}</Text>
              </View>
              <Badge
                label={`${st.estimatedWaitMins} Min Wait`}
                variant={st.estimatedWaitMins > 10 ? 'emergency' : st.estimatedWaitMins > 5 ? 'attention' : 'positive'}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: tokens.canvas, padding: 10, borderRadius: 8, marginTop: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: tokens.text2, fontFamily: typography.fontMono }}>
                Queue Length: {st.currentQueueLength} Students Waiting
              </Text>
              <TouchableOpacity
                onPress={() => handleBookExpressSlot(st.id, st.stationName)}
                style={{ backgroundColor: tokens.action, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#ffffff' }}>Book Express Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {bookedExpressSlot && (
        <View style={{ backgroundColor: tokens.positiveBg, padding: 12, borderRadius: 10, border: `1px solid ${tokens.positive}`, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} color={tokens.positive} />
          <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.positive }}>
            ✓ Express Pass Confirmed for "{bookedExpressSlot}". Show QR at station counter.
          </Text>
        </View>
      )}
    </Card>
  );
};
