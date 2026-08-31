import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAppStore } from '../../data/store';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import {
  ShieldAlert,
  PhoneCall,
  MapPin,
  AlertTriangle,
  Heart,
  CheckCircle2,
  Share2,
  Navigation,
} from 'lucide-react';

export const Flow06EmergencyScreen: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  const { student, emergencyActive, triggerEmergency, cancelEmergency } = useAppStore();

  const [dispatchStatus, setDispatchStatus] = useState<'IDLE' | 'LOCATING' | 'DISPATCHED'>(
    emergencyActive ? 'DISPATCHED' : 'IDLE'
  );

  useEffect(() => {
    if (emergencyActive && dispatchStatus === 'IDLE') {
      setDispatchStatus('DISPATCHED');
    }
  }, [emergencyActive]);

  const handleTriggerSos = () => {
    triggerEmergency();
    setDispatchStatus('LOCATING');
    setTimeout(() => {
      setDispatchStatus('DISPATCHED');
    }, 1000);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      {/* Red Alert Header */}
      <View
        style={[
          styles.emergencyHeaderBox,
          {
            backgroundColor: tokens.emergencyBg,
            borderColor: tokens.emergency,
            borderRadius: radius.r2xl,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ShieldAlert size={28} color={tokens.emergency} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.alertTitle, { color: tokens.emergency }]}>
              {emergencyActive ? '108 EMERGENCY SOS ACTIVE' : '108 Priority Emergency Dispatch'}
            </Text>
            <Text style={[styles.alertSub, { color: tokens.text }]}>
              National 108 protocol takes precedence over all private dispatch. Available offline.
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {!emergencyActive ? (
            <Button
              label="TRIGGER 1-TAP SOS RESCUE"
              onPress={handleTriggerSos}
              variant="danger"
              size="lg"
              icon={<ShieldAlert size={18} color="#ffffff" />}
              style={{ flex: 1 }}
            />
          ) : (
            <Button
              label="Cancel SOS (Accidental Trigger)"
              onPress={() => {
                cancelEmergency();
                setDispatchStatus('IDLE');
              }}
              variant="outline"
              size="md"
            />
          )}
        </View>
      </View>

      {/* Real-time Dispatch Telemetry if Active */}
      {emergencyActive && (
        <Card variant="alert" style={{ marginBottom: 16 }}>
          <View style={styles.telemetryHeader}>
            <Navigation size={18} color={tokens.emergency} />
            <Text style={[styles.telemetryTitle, { color: tokens.emergency }]}>
              Ambulance En Route · ETA 7 Minutes
            </Text>
          </View>
          <Text style={[styles.telemetryText, { color: tokens.text }]}>
            Unit: GVK EMRI Advanced Life Support (ALS-09) · Dispatch Source: Campus Health Centre Annex
          </Text>
          <View style={styles.gpsRow}>
            <MapPin size={14} color={tokens.emergency} />
            <Text style={[styles.gpsText, { color: tokens.text2, fontFamily: typography.fontMono }]}>
              GPS: 17.5950° N, 78.1235° E (Academic Block A, IIT Hyderabad)
            </Text>
          </View>
        </Card>
      )}

      {/* Critical Medical ID Card (Offline Lockscreen Accessible) */}
      <View style={styles.cardContainer}>
        <Card variant="surface" style={styles.medicalIdCard}>
          <View style={styles.cardTop}>
            <View>
              <Badge label="OFFLINE EMERGENCY MEDICAL ID" variant="emergency" />
              <Text style={[styles.nameHeading, { color: tokens.text }]}>{student.fullName}</Text>
              <Text style={[styles.studentSub, { color: tokens.text2 }]}>
                {student.institutionName} · Roll: {student.rollNumber}
              </Text>
            </View>
            <View style={[styles.bloodPill, { backgroundColor: tokens.emergencyBg, borderColor: tokens.emergency }]}>
              <Heart size={16} color={tokens.emergency} />
              <Text style={[styles.bloodText, { color: tokens.emergency }]}>{student.bloodGroup}</Text>
            </View>
          </View>

          <View style={styles.criticalGrid}>
            <View style={[styles.critItem, { backgroundColor: tokens.surface2 }]}>
              <Text style={[styles.critLabel, { color: tokens.text3 }]}>ALLERGIES & CONTRAINDICATIONS</Text>
              {student.allergies.map((allg, idx) => (
                <Text key={idx} style={[styles.critVal, { color: tokens.emergency, fontWeight: '700' }]}>
                  ⚠️ {allg}
                </Text>
              ))}
            </View>

            <View style={[styles.critItem, { backgroundColor: tokens.surface2 }]}>
              <Text style={[styles.critLabel, { color: tokens.text3 }]}>CHRONIC CONDITIONS</Text>
              {student.chronicConditions.map((cond, idx) => (
                <Text key={idx} style={[styles.critVal, { color: tokens.text }]}>
                  • {cond}
                </Text>
              ))}
            </View>
          </View>

          {/* ICE Emergency Contact */}
          <View style={[styles.iceBox, { backgroundColor: tokens.surface3, borderColor: tokens.veil }]}>
            <PhoneCall size={18} color={tokens.action} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.iceLabel, { color: tokens.data }]}>PRIMARY EMERGENCY CONTACT (ICE)</Text>
              <Text style={[styles.iceName, { color: tokens.text }]}>{student.emergencyContactName}</Text>
              <Text style={[styles.icePhone, { color: tokens.action, fontFamily: typography.fontMono }]}>
                {student.emergencyContactPhone}
              </Text>
            </View>
            <Button
              label="Call ICE"
              onPress={() => {}}
              size="sm"
              icon={<PhoneCall size={13} color="#ffffff" />}
            />
          </View>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  emergencyHeaderBox: {
    padding: 20,
    borderWidth: 1.5,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
    marginBottom: 16,
    gap: 14,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  alertSub: {
    fontSize: 13,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  telemetryTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  telemetryText: {
    fontSize: 13,
    marginVertical: 4,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  gpsText: {
    fontSize: 12,
  },
  cardContainer: {
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  medicalIdCard: {
    padding: 20,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  nameHeading: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  studentSub: {
    fontSize: 13,
    marginTop: 2,
  },
  bloodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  bloodText: {
    fontSize: 15,
    fontWeight: '800',
  },
  criticalGrid: {
    gap: 10,
    marginBottom: 16,
  },
  critItem: {
    padding: 12,
    borderRadius: 8,
  },
  critLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  critVal: {
    fontSize: 13,
    marginVertical: 2,
  },
  iceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  iceLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  iceName: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  icePhone: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
});
