import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAppStore } from '../../data/store';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Shield, Lock, Trash2, Download, CheckCircle2, User, Phone, AlertCircle } from 'lucide-react';

export const Flow04ProfileScreen: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  const { student, updateStudent } = useAppStore();

  const [emergencyContact, setEmergencyContact] = useState(student.emergencyContactName);
  const [emergencyPhone, setEmergencyPhone] = useState(student.emergencyContactPhone);
  const [bloodGroup, setBloodGroup] = useState(student.bloodGroup);

  // Consent Toggles (M4 DPDP Act compliance)
  const [consentAbdmSync, setConsentAbdmSync] = useState(true);
  const [consentCampusEmergency, setConsentCampusEmergency] = useState(true);
  const [consentCampAutoCheckIn, setConsentCampAutoCheckIn] = useState(true);
  const [consentZeroTraining, setConsentZeroTraining] = useState(true);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveProfile = () => {
    updateStudent({
      emergencyContactName: emergencyContact,
      emergencyContactPhone: emergencyPhone,
      bloodGroup,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.headerBox}>
        <Badge label="FLOW 04 · PROFILE, EMERGENCY & DPDP CONSENT" variant="mono" />
        <Text style={[styles.title, { color: tokens.text }]}>Identity, Emergency & Privacy</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          Manage your verified student credentials, lockscreen emergency SOS contacts, and granular DPDP
          Act 2023 consent artifacts.
        </Text>
      </View>

      <View style={styles.contentGrid}>
        {/* Student ID & Emergency Card */}
        <Card variant="surface" style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <User size={18} color={tokens.action} />
            <Text style={[styles.cardTitle, { color: tokens.text }]}>Verified Student Credentials</Text>
          </View>

          <View style={[styles.idChip, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.idName, { color: tokens.text }]}>{student.fullName}</Text>
              <Text style={[styles.idSub, { color: tokens.text2 }]}>
                {student.institutionName} · {student.rollNumber}
              </Text>
              <Text style={[styles.idDob, { color: tokens.data, fontFamily: typography.fontMono }]}>
                DOB: {student.dob} · Age 22 (Aadhaar e-KYC Verified)
              </Text>
            </View>
            <Badge label="18+ Verified" variant="positive" />
          </View>

          <Text style={[styles.fieldHeading, { color: tokens.text }]}>Emergency SOS & Blood Group</Text>
          <Input
            label="Blood Group"
            value={bloodGroup}
            onChangeText={setBloodGroup}
            placeholder="O+ (Positive)"
          />
          <Input
            label="Emergency Contact Name & Relation"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            placeholder="Rajesh Sharma (Father)"
          />
          <Input
            label="Emergency Contact Phone"
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            placeholder="+91 98111 22334"
            keyboardType="phone-pad"
            mono
          />

          <Button
            label={savedSuccess ? 'Changes Saved!' : 'Save Emergency Details'}
            onPress={handleSaveProfile}
            variant={savedSuccess ? 'secondary' : 'primary'}
          />
        </Card>

        {/* DPDP Act Granular Consent Management (M4) */}
        <Card variant="surface" style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Shield size={18} color={tokens.action} />
            <Text style={[styles.cardTitle, { color: tokens.text }]}>
              Granular Consent & Audit (M4)
            </Text>
          </View>
          <Text style={[styles.consentDesc, { color: tokens.text2 }]}>
            Under DPDP Act 2023, you have absolute ownership of your data. You may grant or revoke
            access at any time.
          </Text>

          <View style={styles.toggleList}>
            <View style={styles.toggleItem}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: tokens.text }]}>ABDM Gateway Sync</Text>
                <Text style={[styles.toggleSub, { color: tokens.text3 }]}>
                  Exchange health records with national Ayushman Bharat network ({student.abhaAddress})
                </Text>
              </View>
              <Switch value={consentAbdmSync} onValueChange={setConsentAbdmSync} />
            </View>

            <View style={styles.toggleItem}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: tokens.text }]}>
                  Campus Clinic 108 SOS Dispatch
                </Text>
                <Text style={[styles.toggleSub, { color: tokens.text3 }]}>
                  Allow emergency responders to view allergies & blood group during active SOS
                </Text>
              </View>
              <Switch value={consentCampusEmergency} onValueChange={setConsentCampusEmergency} />
            </View>

            <View style={styles.toggleItem}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: tokens.text }]}>Camp Day Fast Check-In</Text>
                <Text style={[styles.toggleSub, { color: tokens.text3 }]}>
                  Pre-populate vitals stations during annual campus checkup camps
                </Text>
              </View>
              <Switch value={consentCampAutoCheckIn} onValueChange={setConsentCampAutoCheckIn} />
            </View>

            <View style={styles.toggleItem}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: tokens.text }]}>
                  Rule C: Zero Model Training Guarantee
                </Text>
                <Text style={[styles.toggleSub, { color: tokens.text3 }]}>
                  Strictly locked: Records are never used for AI model training or commercial targeting
                </Text>
              </View>
              <Switch value={consentZeroTraining} disabled />
            </View>
          </View>

          {/* Export & Data Erasure */}
          <View style={[styles.exportBox, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}>
            <Text style={[styles.exportHeading, { color: tokens.text }]}>Data Portability & Erasure</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Button
                label="Export FHIR Bundle"
                onPress={() => {}}
                variant="outline"
                size="sm"
                icon={<Download size={14} color={tokens.action} />}
              />
              <Button
                label="Erase Vault Data"
                onPress={() => {}}
                variant="danger"
                size="sm"
                icon={<Trash2 size={14} color="#ffffff" />}
              />
            </View>
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
  headerBox: {
    maxWidth: 880,
    alignSelf: 'center',
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    maxWidth: 620,
  },
  contentGrid: {
    maxWidth: 880,
    alignSelf: 'center',
    width: '100%',
    gap: 16,
  },
  sectionCard: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  idName: {
    fontSize: 16,
    fontWeight: '700',
  },
  idSub: {
    fontSize: 12,
    marginTop: 2,
  },
  idDob: {
    fontSize: 11,
    marginTop: 4,
  },
  fieldHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  consentDesc: {
    fontSize: 13,
    marginBottom: 16,
  },
  toggleList: {
    gap: 14,
    marginBottom: 18,
  },
  toggleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleSub: {
    fontSize: 11,
    marginTop: 2,
  },
  exportBox: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  exportHeading: {
    fontSize: 13,
    fontWeight: '700',
  },
});
