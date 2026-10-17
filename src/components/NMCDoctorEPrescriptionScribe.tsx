import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../theme/theme';
import { Card } from './Card';
import { Badge } from './Badge';
import { Stethoscope, Send, Trash2 } from 'lucide-react';
import { performAllergyCrossCheck, StudentAllergyRecord } from '../ai/allergyCrossCheck';
import { useAuth } from '../data/AuthContext';
import { useT } from '@/i18n';

export interface PrescribedDrug {
  id: string;
  brandName: string;
  molecule: string;
  dose: string;
  frequency: string;
  durationDays: number;
  nlem: boolean;
  janAushadhiEquivalent?: string;
  janAushadhiPriceSavings?: string;
}

interface NMCDoctorEPrescriptionScribeProps {
  patientId: string;
  patientName: string;
  patientAllergies: string[];
}

export const NMCDoctorEPrescriptionScribe: React.FC<NMCDoctorEPrescriptionScribeProps> = ({
  patientId,
  patientName,
  patientAllergies,
}) => {
  const { tokens, radius, typography } = useTheme();
  const t = useT();

  // The attending physician is the signed-in account — never a hardcoded
  // name or registration number. NMC registration is not verified here, so
  // nothing on this card claims it is.
  const { user } = useAuth();
  const physicianName = user?.fullName || t('partner.core.erx.signedIn');

  // Starts empty: a prescription pad must never open pre-filled with drugs the
  // clinician did not add.
  const [prescriptions, setPrescriptions] = useState<PrescribedDrug[]>([]);

  const [newBrandName, setNewBrandName] = useState('');
  const [newMolecule, setNewMolecule] = useState('');
  // Dose, frequency and duration are typed by the clinician. They used to be
  // fixed at "500mg", "BD (After Food)" and 3 days for every drug added —
  // values nobody chose, shown on the pad as if prescribed.
  const [newDose, setNewDose] = useState('');
  const [newFrequency, setNewFrequency] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [allergyWarnings, setAllergyWarnings] = useState<string[]>([]);

  const durationDays = Number.parseInt(newDuration, 10);
  const canAdd = Boolean(newBrandName.trim() && newMolecule.trim() && newDose.trim() && newFrequency.trim())
    && Number.isInteger(durationDays) && durationDays > 0;

  const handleAddDrug = () => {
    if (!canAdd) return;

    // No invented allergies. This defaulted to ['Penicillin'] when the caller
    // passed nothing, so every prescriber was told the same allergy whether or
    // not the patient had one — and a real allergy that was never loaded was
    // silently replaced by a fictional one. An empty list cross-checks against
    // nothing, which is what "not recorded" has to mean here.
    const studentAllergiesFormatted: StudentAllergyRecord[] = (patientAllergies ?? []).map((alg) => ({
      substanceCode: alg.toUpperCase(),
      allergyName: alg,
    }));

    const check = performAllergyCrossCheck(`SUB_${newMolecule.toUpperCase()}`, newMolecule, studentAllergiesFormatted);
    const warning = check.warningFlagText;
    if (check.hasConflict && warning) {
      setAllergyWarnings((prev) => [...prev, warning]);
    }

    const newRx: PrescribedDrug = {
      id: `rx-${Date.now()}`,
      brandName: newBrandName.trim(),
      molecule: newMolecule.trim(),
      dose: newDose.trim(),
      frequency: newFrequency.trim(),
      durationDays,
      nlem: false,
    };

    setPrescriptions((prev) => [...prev, newRx]);
    setNewBrandName('');
    setNewMolecule('');
    setNewDose('');
    setNewFrequency('');
    setNewDuration('');
  };

  const handleRemoveDrug = (id: string) => {
    setPrescriptions((prev) => prev.filter((p) => p.id !== id));
  };

  const inputStyle = { flex: 1, minWidth: 140, minHeight: 44, backgroundColor: tokens.surface2, borderRadius: 8, padding: 8, fontSize: 12, color: tokens.text, border: `1px solid ${tokens.rule}` };

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Stethoscope size={22} color={tokens.action} aria-hidden="true" />
          <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            {t('partner.core.erx.title')}
          </Text>
        </View>
      </View>

      {/* Physician Info Box */}
      <View style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}`, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono }}>{t('partner.core.erx.physician')}</Text>
          <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono }}>{t('partner.core.erx.nmcNotVerified')}</Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: '800', color: tokens.text }}>{physicianName}</Text>
        <Text style={{ fontSize: 11, color: tokens.text2, fontFamily: typography.fontMono, marginTop: 2 }}>
          {t('partner.core.erx.patient', { name: patientName, id: patientId })}
        </Text>
      </View>

      {/* No allergy record loaded. Silence here would read as "no allergies",
          which is the one inference a prescriber must not draw from absence. */}
      {(patientAllergies ?? []).length === 0 && (
        <View
          accessibilityRole="alert"
          style={{ backgroundColor: tokens.attentionBg, border: `1px solid ${tokens.attention}`, borderRadius: 10, padding: 12, marginBottom: 12 }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.attention }}>
            {t('partner.core.erx.noAllergyTitle')}
          </Text>
          <Text style={{ fontSize: 12, color: tokens.text, marginTop: 4 }}>
            {t('partner.core.erx.noAllergyBody')}
          </Text>
        </View>
      )}

      {/* Allergy Conflict Alerts */}
      {allergyWarnings.map((warn, idx) => (
        <View key={idx} accessibilityRole="alert" style={{ backgroundColor: tokens.emergencyBg, border: `1px solid ${tokens.emergency}`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.emergency, fontFamily: typography.fontMono }}>
            {t('partner.core.erx.conflictTitle')}
          </Text>
          <Text style={{ fontSize: 12, color: tokens.text, marginTop: 4 }}>{warn}</Text>
        </View>
      ))}

      {/* Prescribed Medications List */}
      <Text style={{ fontSize: 13, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily, marginBottom: 10 }}>
        {t('partner.core.erx.listTitle', { count: prescriptions.length })}
      </Text>

      {prescriptions.length === 0 && (
        <Text style={{ fontSize: 12, color: tokens.text3, marginBottom: 10 }}>{t('partner.core.erx.empty')}</Text>
      )}

      {prescriptions.map((rx) => (
        <View key={rx.id} style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}`, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: tokens.text }}>{rx.brandName}</Text>
                <Text style={{ fontSize: 12, color: tokens.text3, fontFamily: typography.fontMono }}>({rx.molecule})</Text>
                {rx.nlem && <Badge label={t('partner.core.erx.nlem')} variant="mono" />}
              </View>
              <Text style={{ fontSize: 12, color: tokens.text2, marginTop: 4, fontFamily: typography.fontMono }}>
                {t('partner.core.erx.doseLine', { dose: rx.dose, frequency: rx.frequency, days: rx.durationDays })}
              </Text>
              {rx.janAushadhiEquivalent && (
                <Text style={{ fontSize: 11, color: tokens.positive, marginTop: 4, fontWeight: '700' }}>
                  {t('partner.core.erx.janAushadhi', { name: rx.janAushadhiEquivalent, savings: rx.janAushadhiPriceSavings ?? '' })}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => handleRemoveDrug(rx.id)}
              accessibilityRole="button"
              accessibilityLabel={t('partner.core.erx.removeAria', { drug: rx.brandName })}
              style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Trash2 size={16} color={tokens.emergency} aria-hidden="true" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Add Medication Quick Form */}
      <View style={{ backgroundColor: tokens.canvas, borderRadius: radius.lg, padding: 14, border: `1px dashed ${tokens.rule}`, marginBottom: 16 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono, marginBottom: 8 }}>
          {t('partner.core.erx.addTitle')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <TextInput
            placeholder={t('partner.core.erx.brandPh')}
            accessibilityLabel={t('partner.core.erx.brandPh')}
            value={newBrandName}
            onChangeText={setNewBrandName}
            style={inputStyle}
          />
          <TextInput
            placeholder={t('partner.core.erx.moleculePh')}
            accessibilityLabel={t('partner.core.erx.moleculePh')}
            value={newMolecule}
            onChangeText={setNewMolecule}
            style={inputStyle}
          />
          <TextInput
            placeholder={t('partner.core.erx.dosePh')}
            accessibilityLabel={t('partner.core.erx.dosePh')}
            value={newDose}
            onChangeText={setNewDose}
            style={inputStyle}
          />
          <TextInput
            placeholder={t('partner.core.erx.frequencyPh')}
            accessibilityLabel={t('partner.core.erx.frequencyPh')}
            value={newFrequency}
            onChangeText={setNewFrequency}
            style={inputStyle}
          />
          <TextInput
            placeholder={t('partner.core.erx.durationPh')}
            accessibilityLabel={t('partner.core.erx.durationPh')}
            value={newDuration}
            onChangeText={setNewDuration}
            keyboardType="number-pad"
            style={{ ...inputStyle, flex: 0, minWidth: 80 }}
          />
          <TouchableOpacity
            onPress={handleAddDrug}
            disabled={!canAdd}
            accessibilityRole="button"
            aria-disabled={!canAdd}
            style={{ backgroundColor: tokens.action, opacity: canAdd ? 1 : 0.5, borderRadius: 8, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ color: tokens.onAction, fontWeight: '800', fontSize: 12 }}>{t('partner.core.erx.add')}</Text>
          </TouchableOpacity>
        </View>
        {!canAdd && (
          <Text style={{ fontSize: 11, color: tokens.text2, marginTop: 8 }}>{t('partner.core.erx.addHint')}</Text>
        )}
      </View>

      {/* Signing and dispatch are not wired to any server. This button used to
          flip to "Prescription Digitally Signed & Dispatched to Campus Express
          Pharmacy!" on press with no request made. It stays disabled, and says
          so, until a real signing and dispatch call exists. */}
      <TouchableOpacity
        disabled
        accessibilityRole="button"
        aria-disabled
        style={{
          backgroundColor: tokens.action,
          opacity: 0.5,
          padding: 12,
          minHeight: 44,
          borderRadius: 12,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Send size={18} color={tokens.onAction} aria-hidden="true" />
        <Text style={{ color: tokens.onAction, fontWeight: '800', fontSize: 13, fontFamily: typography.fontFamily }}>
          {t('partner.core.erx.sign')}
        </Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 12, color: tokens.text2, marginTop: 8 }}>
        {t('partner.core.erx.signNote')}
      </Text>
    </Card>
  );
};
