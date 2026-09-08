import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { useTheme } from "../theme/theme";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Stethoscope, Pill, Send, FileCheck, CheckCircle2, ShieldCheck } from "lucide-react";
import { assertRule } from "../ai/constitution";

export interface PrescriptionLine {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  janAushadhiGeneric: string;
  genericPrice: string;
}

export const ClinicalPrescriptionStudio: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule("Rule-A");
  assertRule("Rule-J1");

  const [diagnosis, setDiagnosis] = useState("Acute Viral Upper Respiratory Infection & Fever");
  const [prescriptions, setPrescriptions] = useState<PrescriptionLine[]>([
    { id: "p1", medicineName: "Dolo 650mg", dosage: "650mg", frequency: "1-0-1 (3 Days)", janAushadhiGeneric: "Paracetamol 650mg", genericPrice: "₹1.20 / strip (65% savings)" },
    { id: "p2", medicineName: "Mox 500mg", dosage: "500mg", frequency: "1-0-1 (5 Days)", janAushadhiGeneric: "Amoxicillin Trihydrate 500mg", genericPrice: "₹4.50 / strip (70% savings)" },
  ]);

  const [dispatched, setDispatched] = useState(false);

  const handleDispatchPharmacy = () => {
    setDispatched(true);
    setTimeout(() => setDispatched(false), 3000);
  };

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Stethoscope size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, fontFamily: typography.fontFamily }}>
            NMC Digital E-Prescription & Express Pharmacy Studio
          </Text>
        </View>
        <Badge label="NMC DIGITALLY SIGNED" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 14 }}>
        OPD consultation prescription studio. Auto-matches branded medicines to Jan Aushadhi generic bio-equivalents and dispatches to Hostel Express Pharmacy.
      </Text>

      {/* Clinical Notes Input */}
      <View style={{ backgroundColor: tokens.surface2, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}`, marginBottom: 14 }}>
        <Text style={{ fontSize: 11, fontWeight: "800", color: tokens.text3, fontFamily: typography.fontMono, marginBottom: 4 }}>CLINICAL DIAGNOSIS & TRIAGE</Text>
        <TextInput
          value={diagnosis}
          onChangeText={setDiagnosis}
          style={{ fontSize: 13, color: tokens.text, fontFamily: typography.fontFamily, padding: 0 }}
        />
      </View>

      {/* Prescription Lines */}
      <View style={{ gap: 10, marginBottom: 16 }}>
        {prescriptions.map((p) => (
          <View key={p.id} style={{ backgroundColor: tokens.canvas, borderRadius: radius.lg, padding: 14, border: `1px solid ${tokens.rule}` }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: "800", color: tokens.text }}>{p.medicineName}</Text>
                <Text style={{ fontSize: 12, color: tokens.text2, fontFamily: typography.fontMono, marginTop: 2 }}>
                  Dosage: {p.dosage} · Frequency: {p.frequency}
                </Text>
              </View>
              <Badge label="GENERIC AVAILABLE" variant="positive" />
            </View>

            <View style={{ backgroundColor: tokens.positiveBg, padding: 8, borderRadius: 6, marginTop: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: tokens.positive, fontFamily: typography.fontMono }}>
                🌱 Jan Aushadhi Generic: {p.janAushadhiGeneric} ({p.genericPrice})
              </Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={handleDispatchPharmacy}
        disabled={dispatched}
        style={{
          backgroundColor: dispatched ? tokens.positive : tokens.action,
          padding: 12,
          borderRadius: 12,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {dispatched ? <CheckCircle2 size={18} color="#ffffff" /> : <Send size={18} color="#ffffff" />}
        <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 13, fontFamily: typography.fontFamily }}>
          {dispatched ? "✓ E-Prescription Digitally Signed & Sent to Hostel Pharmacy!" : "Sign & Dispatch E-Prescription to Student & Hostel Pharmacy"}
        </Text>
      </TouchableOpacity>
    </Card>
  );
};
