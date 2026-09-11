import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../theme/theme';
import { Card } from './Card';
import { Badge } from './Badge';
import { Stethoscope, CheckCircle2, Send, Trash2 } from 'lucide-react';
import { performAllergyCrossCheck, StudentAllergyRecord } from '../ai/allergyCrossCheck';

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

  const [ nmcRegId ] = useState('NMC-TS-2024-88401');
  const [ physicianName ] = useState('Dr. Radhika Rao, MD (General Medicine)');
  
  const [prescriptions, setPrescriptions] = useState<PrescribedDrug[]>([
    {
      id: 'rx-01',
      brandName: 'Dolo 650',
      molecule: 'Paracetamol',
      dose: '650mg',
      frequency: 'TDS (Every 8 Hours)',
      durationDays: 5,
      nlem: true,
      janAushadhiEquivalent: 'Paracetamol 650mg Generic (Jan Aushadhi)',
      janAushadhiPriceSavings: 'Save 74% (₹12 vs ₹46)',
    },
    {
      id: 'rx-02',
      brandName: 'Pantocid 40',
      molecule: 'Pantoprazole',
      dose: '40mg',
      frequency: 'OD (Before Food)',
      durationDays: 5,
      nlem: true,
      janAushadhiEquivalent: 'Pantoprazole 40mg Generic (Jan Aushadhi)',
      janAushadhiPriceSavings: 'Save 68% (₹18 vs ₹58)',
    },
  ]);

  const [newBrandName, setNewBrandName] = useState('');
  const [newMolecule, setNewMolecule] = useState('');
  const [ newDose ] = useState('500mg');
  const [dispatched, setDispatched] = useState(false);
  const [allergyWarnings, setAllergyWarnings] = useState<string[]>([]);

  const handleAddDrug = () => {
    if (!newBrandName.trim() || !newMolecule.trim()) return;

    const studentAllergiesFormatted: StudentAllergyRecord[] = (patientAllergies || ['Penicillin']).map((alg) => ({
      substanceCode: alg.toUpperCase(),
      allergyName: alg,
    }));

    const check = performAllergyCrossCheck(`SUB_${newMolecule.toUpperCase()}`, newMolecule, studentAllergiesFormatted);
    if (check.hasConflict && check.warningFlagText) {
      setAllergyWarnings((prev) => [...prev, check.warningFlagText!]);
    }

    const newRx: PrescribedDrug = {
      id: `rx-${Date.now()}`,
      brandName: newBrandName.trim(),
      molecule: newMolecule.trim(),
      dose: newDose,
      frequency: 'BD (After Food)',
      durationDays: 3,
      nlem: false,
    };

    setPrescriptions((prev) => [...prev, newRx]);
    setNewBrandName('');
    setNewMolecule('');
  };

  const handleRemoveDrug = (id: string) => {
    setPrescriptions((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDispatchExpressPharmacy = () => {
    setDispatched(true);
    setTimeout(() => setDispatched(false), 3000);
  };

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Stethoscope size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily }}>
            NMC Digital E-Prescription & Scribe Tool
          </Text>
        </View>
        <Badge label="NMC ACT 2019 COMPLIANT" variant="positive" />
      </View>

      {/* Physician Info Box */}
      <View style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}`, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono }}>ATTENDING PHYSICIAN</Text>
          <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.positive, fontFamily: typography.fontMono }}>✓ NMC SIGNATURE VERIFIED</Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: '800', color: tokens.text }}>{physicianName}</Text>
        <Text style={{ fontSize: 11, color: tokens.text2, fontFamily: typography.fontMono, marginTop: 2 }}>
          NMC Reg ID: {nmcRegId} · Patient: {patientName} ({patientId})
        </Text>
      </View>

      {/* Allergy Conflict Alerts */}
      {allergyWarnings.map((warn, idx) => (
        <View key={idx} style={{ backgroundColor: tokens.emergencyBg, border: `1px solid ${tokens.emergency}`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: tokens.emergency, fontFamily: typography.fontMono }}>
            🚨 DETERMINISTIC ALLERGY CONFLICT DETECTED
          </Text>
          <Text style={{ fontSize: 12, color: tokens.text, marginTop: 4 }}>{warn}</Text>
        </View>
      ))}

      {/* Prescribed Medications List */}
      <Text style={{ fontSize: 13, fontWeight: '800', color: tokens.text, fontFamily: typography.fontFamily, marginBottom: 10 }}>
        CDCI Clinical Drug Prescriptions ({prescriptions.length})
      </Text>

      {prescriptions.map((rx) => (
        <View key={rx.id} style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}`, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: tokens.text }}>{rx.brandName}</Text>
                <Text style={{ fontSize: 12, color: tokens.text3, fontFamily: typography.fontMono }}>({rx.molecule})</Text>
                {rx.nlem && <Badge label="NLEM ESSENTIAL" variant="mono" />}
              </View>
              <Text style={{ fontSize: 12, color: tokens.text2, marginTop: 4, fontFamily: typography.fontMono }}>
                Dose: {rx.dose} · {rx.frequency} · Duration: {rx.durationDays} Days
              </Text>
              {rx.janAushadhiEquivalent && (
                <Text style={{ fontSize: 11, color: tokens.positive, marginTop: 4, fontWeight: '700' }}>
                  💡 Jan Aushadhi Alternative: {rx.janAushadhiEquivalent} ({rx.janAushadhiPriceSavings})
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => handleRemoveDrug(rx.id)}>
              <Trash2 size={16} color={tokens.emergency} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Add Medication Quick Form */}
      <View style={{ backgroundColor: tokens.canvas, borderRadius: radius.lg, padding: 14, border: `1px dashed ${tokens.rule}`, marginBottom: 16 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: tokens.text3, fontFamily: typography.fontMono, marginBottom: 8 }}>
          ADD CDCI CLINICAL DRUG TO PRESCRIPTION
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <TextInput
            placeholder="Brand Name (e.g. Augmentin 625)"
            value={newBrandName}
            onChangeText={setNewBrandName}
            style={{ flex: 1, minWidth: 140, backgroundColor: tokens.surface2, borderRadius: 8, padding: 8, fontSize: 12, color: tokens.text, border: `1px solid ${tokens.rule}` }}
          />
          <TextInput
            placeholder="Molecule / Active Salt (e.g. Amoxicillin)"
            value={newMolecule}
            onChangeText={setNewMolecule}
            style={{ flex: 1, minWidth: 140, backgroundColor: tokens.surface2, borderRadius: 8, padding: 8, fontSize: 12, color: tokens.text, border: `1px solid ${tokens.rule}` }}
          />
          <TouchableOpacity
            onPress={handleAddDrug}
            style={{ backgroundColor: tokens.action, borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 12 }}>+ Add Drug</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dispatch Action */}
      <TouchableOpacity
        onPress={handleDispatchExpressPharmacy}
        disabled={dispatched}
        style={{
          backgroundColor: dispatched ? tokens.positive : tokens.action,
          padding: 12,
          borderRadius: 12,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {dispatched ? <CheckCircle2 size={18} color="#ffffff" /> : <Send size={18} color="#ffffff" />}
        <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13, fontFamily: typography.fontFamily }}>
          {dispatched ? 'Prescription Digitally Signed & Dispatched to Campus Express Pharmacy!' : 'Sign & Auto-Dispatch to Campus Express Pharmacy'}
        </Text>
      </TouchableOpacity>
    </Card>
  );
};
