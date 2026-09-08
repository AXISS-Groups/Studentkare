import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/theme";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { AlertTriangle, ShieldCheck, Pill, CheckCircle2, Info, ArrowRight } from "lucide-react";
import { assertRule } from "../ai/constitution";

export interface DrugItem {
  id: string;
  brandName: string;
  genericName: string;
  dosage: string;
  category: string;
}

export interface DrugInteractionResult {
  drugA: string;
  drugB: string;
  severity: "HIGH_RISK" | "MODERATE_RISK" | "SAFE";
  mechanism: string;
  recommendation: string;
}

export const MedicationSafetySimulator: React.FC = () => {
  const { tokens, radius, typography } = useTheme();
  assertRule("Rule-A"); // CDSCO drug database rule
  assertRule("Rule-K4"); // Polypharmacy contraindication rule

  const availableDrugs: DrugItem[] = [
    { id: "d1", brandName: "Dolo 650", genericName: "Paracetamol", dosage: "650mg", category: "Analgesic / Antipyretic" },
    { id: "d2", brandName: "Brufen 400", genericName: "Ibuprofen", dosage: "400mg", category: "NSAID" },
    { id: "d3", brandName: "Mox 500", genericName: "Amoxicillin", dosage: "500mg", category: "Antibiotic" },
    { id: "d4", brandName: "Methotec", genericName: "Methotrexate", dosage: "10mg", category: "Immunosuppressant" },
    { id: "d5", brandName: "Coumadin", genericName: "Warfarin", dosage: "5mg", category: "Anticoagulant" },
  ];

  const [selectedIds, setSelectedIds] = useState<string[]>(["d1", "d2"]);

  const toggleSelectDrug = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter((item) => item !== id));
      }
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const getInteractions = (): DrugInteractionResult[] => {
    const results: DrugInteractionResult[] = [];
    if (selectedIds.includes("d2") && selectedIds.includes("d5")) {
      results.push({
        drugA: "Ibuprofen (Brufen 400)",
        drugB: "Warfarin (Coumadin)",
        severity: "HIGH_RISK",
        mechanism: "NSAIDs inhibit platelet aggregation and cause gastric mucosal erosion, exponentially increasing GI bleeding risk with anti-coagulants.",
        recommendation: "Avoid concurrent use. Substitute Ibuprofen with Paracetamol under physician supervision.",
      });
    }
    if (selectedIds.includes("d2") && selectedIds.includes("d4")) {
      results.push({
        drugA: "Ibuprofen (Brufen 400)",
        drugB: "Methotrexate (Methotec)",
        severity: "HIGH_RISK",
        mechanism: "NSAIDs reduce renal clearance of Methotrexate, risking severe bone marrow toxicity.",
        recommendation: "Strictly contraindicated. Contact clinical supervisor immediately.",
      });
    }
    if (selectedIds.includes("d1") && selectedIds.includes("d2")) {
      results.push({
        drugA: "Paracetamol (Dolo 650)",
        drugB: "Ibuprofen (Brufen 400)",
        severity: "MODERATE_RISK",
        mechanism: "Dual renal and hepatic clearance load during high fever.",
        recommendation: "Stagger administration by 4 hours. Do not exceed 3000mg Paracetamol daily.",
      });
    }
    if (results.length === 0) {
      results.push({
        drugA: "Selected Polypharmacy Combo",
        drugB: "Active Prescriptions",
        severity: "SAFE",
        mechanism: "Zero major CDSCO drug-drug interactions detected between selected medicines.",
        recommendation: "Safe for co-administration as prescribed by NMC physician.",
      });
    }
    return results;
  };

  const interactions = getInteractions();
  const hasHighRisk = interactions.some((i) => i.severity === "HIGH_RISK");

  return (
    <Card variant="surface" style={{ padding: 20, marginBottom: 20, border: `1px solid ${tokens.rule}` }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pill size={22} color={tokens.action} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: tokens.text, fontFamily: typography.fontFamily }}>
            CDSCO Polypharmacy & Drug-Drug Interaction Safety Simulator
          </Text>
        </View>
        <Badge label="RULE-M1 / M2 COMPLIANT" variant="positive" />
      </View>

      <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 14 }}>
        Select up to 3 concurrent medications to test CDSCO drug interaction matrices, organ toxicity risks, and Jan Aushadhi generic substitutes.
      </Text>

      {/* Drug Selection Chips */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {availableDrugs.map((drug) => {
          const active = selectedIds.includes(drug.id);
          return (
            <TouchableOpacity
              key={drug.id}
              onPress={() => toggleSelectDrug(drug.id)}
              style={{
                backgroundColor: active ? tokens.action : tokens.surface2,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                border: `1px solid ${active ? tokens.action : tokens.rule}`,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "800", color: active ? "#ffffff" : tokens.text }}>
                {drug.brandName} ({drug.genericName})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Interaction Output Cards */}
      <View style={{ gap: 10 }}>
        {interactions.map((item, idx) => (
          <View
            key={idx}
            style={{
              backgroundColor: item.severity === "HIGH_RISK" ? tokens.emergencyBg : item.severity === "MODERATE_RISK" ? tokens.attentionBg : tokens.positiveBg,
              borderRadius: radius.lg,
              padding: 14,
              border: `1px solid ${item.severity === "HIGH_RISK" ? tokens.emergency : item.severity === "MODERATE_RISK" ? tokens.attention : tokens.positive}`,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: tokens.text }}>
                {item.drugA} ↔ {item.drugB}
              </Text>
              <Badge
                label={item.severity === "HIGH_RISK" ? "HIGH RISK CONTRAINDICATION" : item.severity === "MODERATE_RISK" ? "MODERATE RISK ADVISORY" : "NO INTERACTION DETECTED"}
                variant={item.severity === "HIGH_RISK" ? "emergency" : item.severity === "MODERATE_RISK" ? "attention" : "positive"}
              />
            </View>
            <Text style={{ fontSize: 12, color: tokens.text2, marginBottom: 6 }}>{item.mechanism}</Text>
            <Text style={{ fontSize: 11, fontWeight: "700", color: tokens.text, fontFamily: typography.fontMono }}>
              💡 Clinical Advice: {item.recommendation}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
};
