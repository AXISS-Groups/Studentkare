import { observer } from 'mobx-react-lite';
import { OfflineEmergencyHealthCard } from '../../components/OfflineEmergencyHealthCard';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/tokens/theme';
import { color } from '@/design-system/theme';
import { useStudentStore, useEmergencyStore } from '../../store/AppStores';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { navigate } from '../../lib/utils/workflowRouting';
import { useT } from '@/i18n';
import {
  ShieldAlert,
  PhoneCall,
  Heart,
  Droplet,
} from 'lucide-react';

const Flow06EmergencyScreenUnwrapped: React.FC = () => {
  const t = useT();
  const { tokens, radius, typography } = useTheme();
  const { student } = useStudentStore();
  const { emergencyActive, triggerEmergency, cancelEmergency } = useEmergencyStore();

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
      <OfflineEmergencyHealthCard />
      {/* Red Alert Header */}
      <View
        style={[
          styles.emergencyHeaderBox,
          {
            backgroundColor: tokens.surface,
            borderColor: emergencyActive ? tokens.emergencyFill : tokens.rule,
            borderRadius: radius.r2xl,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ShieldAlert size={28} color={emergencyActive ? tokens.emergency : tokens.text2} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.alertTitle, { color: emergencyActive ? tokens.emergency : tokens.text }]}>
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
              icon={<ShieldAlert size={18} color={tokens.onAction} />}
              accessibilityLabel="Trigger 1-Tap 108 Emergency Ambulance SOS Rescue"
              accessibilityRole="button"
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
              accessibilityLabel="Cancel active 108 Emergency SOS dispatch"
              accessibilityRole="button"
            />
          )}
        </View>
      </View>

      {/* LifeShare Hospital Resource & Blood Exchange Shortcut */}
      <Card variant="surface" style={{ marginBottom: 16, padding: 16, borderColor: color.dangerRule, backgroundColor: tokens.emergencyBg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 240 }}>
            <Droplet size={24} color={tokens.emergencyFill} />
            <View>
              {/* No hospital or blood-bank feed exists, so no network size or live
                  search is claimed (it used to say "30,273 hospitals & 2,947 blood banks"). */}
              <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.emergency }}>{t('member.lifeshare.title')}</Text>
              <Text style={{ fontSize: 12, color: tokens.emergency, marginTop: 2 }}>
                {t('member.lifeshare.sub')}
              </Text>
            </View>
          </View>
          <Button
            label="Open LifeShare Exchange"
            variant="primary"
            onPress={() => navigate('lifeshare')}
          />
        </View>
      </Card>

      {/* No ambulance-dispatch integration exists, so no ETA, unit or GPS is shown.
          This card used to invent "ETA 7 Minutes", a named ALS unit and coordinates. */}

      {/* Critical Medical ID Card (Offline Lockscreen Accessible) */}
      <View style={styles.cardContainer}>
        <Card variant="surface" style={styles.medicalIdCard} accessibilityLabel={`Offline Emergency Medical ID for ${student.fullName}, blood group ${student.bloodGroup}`}>
          <View style={styles.cardTop}>
            <View>
              <Badge label="OFFLINE EMERGENCY MEDICAL ID" variant="primary" />
              <Text accessibilityRole="header" style={[styles.nameHeading, { color: tokens.text }]}>{student.fullName}</Text>
              <Text style={[styles.studentSub, { color: tokens.text2 }]}>
                {student.institutionName} · Roll: {student.rollNumber}
              </Text>
            </View>
            <View style={[styles.bloodPill, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}>
              <Heart size={16} color={tokens.text2} />
              <Text style={[styles.bloodText, { color: tokens.text }]}>{student.bloodGroup}</Text>
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
              icon={<PhoneCall size={13} color={tokens.onAction} />}
              accessibilityLabel={`Call ${student.emergencyContactName} at ${student.emergencyContactPhone}`}
              accessibilityRole="button"
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

export const Flow06EmergencyScreen: React.FC = observer(Flow06EmergencyScreenUnwrapped);
